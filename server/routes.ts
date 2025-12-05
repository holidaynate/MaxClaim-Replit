import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeClaimItem } from "./pricing-data";
import { getRegionalContext, calculateInflationMultiplier, getBLSInflationData } from "./external-apis";
import { performOCR, parseInsuranceDocument } from "./ocr-service";
import { insertPartnerSchema, insertPartnershipLOISchema, insertPartnerLeadSchema } from "@shared/schema";
import { auditClaimItem, auditBatch, getAllItems, getMarketData, type AuditResult, type BatchAuditResult } from "@shared/priceAudit";
import { asyncHandler, validateClaimInput, validateFileUpload, validateAdminLogin, sanitizeString } from "./utils/validation";
import { priceDBCache } from "./utils/priceDBCache";
import { validateBatchSize } from "./utils/batchProcessor";
import { getCoarseLocation, getAreaCodeFromZip } from "./utils/location";
import { matchPartnersToUser, MATCHING_EXPLANATION } from "./controllers/partnerMatching";
import { PROMO_PARTNERS } from "@shared/partners";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Extend Express session type
declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

const claimAnalysisSchema = z.object({
  zipCode: z.string().min(5),
  propertyAddress: z.string().optional(),
  items: z.array(z.object({
    category: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    unit: z.string().default("EA"),
    quotedPrice: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
  }).refine(data => 
    (data.quotedPrice !== undefined && data.quotedPrice > 0) || 
    (data.unitPrice !== undefined && data.unitPrice > 0), {
    message: "Either quotedPrice or unitPrice must be provided and must be greater than zero"
  }))
});

// Middleware to verify admin authentication
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin login endpoint
  app.post("/api/admin/login", validateAdminLogin, asyncHandler(async (req, res) => {
    const { password } = req.body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      res.status(500).json({ error: "Server configuration error: ADMIN_PASSWORD not set" });
      return;
    }

    if (password === adminPassword) {
      req.session.isAdmin = true;
      res.json({ success: true, message: "Logged in successfully" });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  }));

  // Admin logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Check admin session status
  app.get("/api/admin/status", (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  // Helper to normalize claim items - derive both unitPrice and quotedPrice (subtotal)
  // Throws error if quantity is invalid
  function normalizeClaimItem(item: {
    category: string;
    description: string;
    quantity: number;
    unit: string;
    quotedPrice?: number;
    unitPrice?: number;
  }): { category: string; description: string; quantity: number; unit: string; unitPrice: number; subtotal: number } {
    // Reject invalid quantities - do not silently default
    if (!item.quantity || item.quantity <= 0 || !Number.isFinite(item.quantity)) {
      throw new Error(`Invalid quantity for item "${item.description}": quantity must be > 0`);
    }
    
    const qty = item.quantity;
    let unitPrice: number;
    let subtotal: number;
    
    if (item.unitPrice !== undefined && item.unitPrice > 0) {
      unitPrice = item.unitPrice;
      subtotal = unitPrice * qty;
    } else if (item.quotedPrice !== undefined && item.quotedPrice > 0) {
      subtotal = item.quotedPrice;
      unitPrice = subtotal / qty;
    } else {
      throw new Error(`Invalid pricing for item "${item.description}": either unitPrice or quotedPrice must be provided and must be greater than zero`);
    }
    
    return {
      category: item.category,
      description: item.description,
      quantity: qty,
      unit: item.unit || 'EA',
      unitPrice,
      subtotal
    };
  }

  // Analyze claim and calculate FMV with external API enrichment
  app.post("/api/claims/analyze", validateClaimInput, asyncHandler(async (req, res) => {
    const data = claimAnalysisSchema.parse(req.body);
      
    // Validate batch size to prevent DoS
    validateBatchSize(data.items.length, 100);
      
    // Normalize items to consistent format - will throw on invalid quantities
    let normalizedItems: Array<ReturnType<typeof normalizeClaimItem>>;
    try {
      normalizedItems = data.items.map(normalizeClaimItem);
    } catch (normError: any) {
      return res.status(400).json({ 
        error: "Invalid item data", 
        details: normError.message 
      });
    }
      
      // Fetch BLS inflation data, regional context, and location in parallel
      const blsApiKey = process.env.BLS_API_KEY; // Optional - works without it but with rate limits
      const [blsData, regionalContext, detectedLocation] = await Promise.all([
        getBLSInflationData(blsApiKey),
        getRegionalContext(data.zipCode, blsApiKey),
        getCoarseLocation(data.zipCode)
      ]);

      // Match partners to user's location
      const userLocation = {
        zip: data.zipCode,
        areaCode: detectedLocation.areaCode,
        metro: detectedLocation.metro
      };
      const matchedPartners = matchPartnersToUser(userLocation, PROMO_PARTNERS, undefined, 3);

      // Calculate inflation multiplier from BLS data
      const inflationMultiplier = calculateInflationMultiplier(blsData);
      
      const zipPrefix = data.zipCode.substring(0, 3);
      
      const results = await Promise.all(normalizedItems.map(async (item) => {
        // Try to get pricing stats for this category/unit
        const pricingStats = await storage.getPricingStats(item.category, item.unit, zipPrefix).catch(() => null);
        
        const analysis = analyzeClaimItem(
          item.category,
          item.description,
          item.quantity,
          item.subtotal,
          data.zipCode,
          inflationMultiplier,
          pricingStats
        );
        
        return {
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          insuranceOffer: item.subtotal,
          fmvPrice: analysis.fmvPrice,
          additionalAmount: analysis.additionalAmount,
          percentageIncrease: analysis.percentageIncrease,
          status: analysis.status
        };
      }));

      const totalInsuranceOffer = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const totalFMV = results.reduce((sum, item) => sum + item.fmvPrice, 0);
      const totalAdditional = totalFMV - totalInsuranceOffer;
      // Guard against divide-by-zero
      const overallIncrease = totalInsuranceOffer > 0 
        ? (totalAdditional / totalInsuranceOffer) * 100 
        : 0;

      // Create a session to track this analysis
      const session = await storage.createSession({
        zipCode: data.zipCode,
        propertyAddress: data.propertyAddress,
      });

      // Create claim record with line items
      const claim = await storage.createClaim({
        sessionId: session.id,
        status: "completed",
        totalQuoted: totalInsuranceOffer,
        totalFmv: totalFMV,
        additionalAmount: totalAdditional,
        variancePct: overallIncrease,
      });

      // Add line items and pricing data points
      await Promise.all(results.map(async (item) => {
        await storage.addClaimLineItem({
          claimId: claim.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          quotedPrice: item.insuranceOffer,
          fmvPrice: item.fmvPrice,
          variancePct: item.percentageIncrease,
          fromOcr: 0,
        });

        // Track pricing data point for continuous improvement
        await storage.addPricingDataPoint({
          category: item.category,
          unit: item.unit,
          zipCode: data.zipCode,
          propertyAddress: data.propertyAddress,
          quotedPrice: item.insuranceOffer,
          fmvPrice: item.fmvPrice,
          quantity: item.quantity,
          sessionId: session.id,
          source: "user_upload",
        });
      }));

    res.json({
      zipCode: data.zipCode,
      items: results,
      summary: {
        totalInsuranceOffer: Math.round(totalInsuranceOffer * 100) / 100,
        totalFMV: Math.round(totalFMV * 100) / 100,
        totalAdditional: Math.round(totalAdditional * 100) / 100,
        overallIncrease: Math.round(overallIncrease * 10) / 10
      },
      regionalContext: {
        femaClaimCount: regionalContext.femaClaimCount,
        avgFEMAPayment: regionalContext.avgFEMAPayment,
        inflationAdjustment: Math.round((inflationMultiplier - 1) * 100 * 10) / 10,
        topComplaints: regionalContext.topInsuranceComplaints.slice(0, 3)
      },
      detectedLocation: {
        areaCode: detectedLocation.areaCode,
        metro: detectedLocation.metro,
        description: detectedLocation.description
      },
      matchedPartners: matchedPartners.map(partner => ({
        id: partner.id,
        companyName: partner.name,
        type: partner.businessType,
        tier: partner.tier,
        phone: partner.phone,
        website: partner.website,
        licenseNumber: partner.licenseNumber,
        score: partner.matchScore,
        matchReasons: partner.matchReasons
      }))
    });
  }));

  // Get regional statistics (for future analytics dashboard)
  app.get("/api/stats/regional", async (req, res) => {
    try {
      const stats = await storage.getRegionalStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching regional stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Session Management - Create session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = z.object({
        zipCode: z.string().optional(),
        locale: z.string().optional(),
        textSize: z.string().optional(),
        highContrast: z.boolean().optional(),
      }).parse(req.body);

      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Log session event
  app.post("/api/sessions/:sessionId/events", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const eventData = z.object({
        eventType: z.enum([
          "session_start",
          "page_view",
          "form_submit",
          "button_click",
          "file_upload",
          "calculation_complete",
          "export_pdf",
          "export_email"
        ]),
        payload: z.any().optional(),
      }).parse(req.body);

      const event = await storage.logEvent({
        sessionId,
        ...eventData,
      });
      res.json(event);
    } catch (error) {
      console.error("Error logging event:", error);
      res.status(500).json({ error: "Failed to log event" });
    }
  });

  // Create claim with line items
  app.post("/api/claims", async (req, res) => {
    try {
      const claimData = z.object({
        sessionId: z.string(),
        totalQuoted: z.number(),
        totalFmv: z.number(),
        additionalAmount: z.number(),
        variancePct: z.number(),
        status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
        lineItems: z.array(z.object({
          category: z.string(),
          description: z.string(),
          quantity: z.number(),
          unit: z.enum(["LF", "SF", "SQ", "CT", "EA"]).default("EA"),
          quotedPrice: z.number(),
          fmvPrice: z.number(),
          variancePct: z.number(),
          fromOcr: z.number().optional(),
        })),
      }).parse(req.body);

      const { lineItems, ...claimInfo } = claimData;
      const claim = await storage.createClaim(claimInfo);

      // Get session to extract ZIP code and property address
      const session = await storage.getSession(claimData.sessionId);

      // Add all line items
      const addedLineItems = await Promise.all(
        lineItems.map(item =>
          storage.addClaimLineItem({ ...item, claimId: claim.id })
        )
      );

      // Track pricing data points for continuous improvement
      await Promise.all(
        lineItems.map(item =>
          storage.addPricingDataPoint({
            category: item.category,
            unit: item.unit,
            zipCode: session?.zipCode || undefined,
            propertyAddress: session?.propertyAddress || undefined,
            quotedPrice: item.quotedPrice,
            fmvPrice: item.fmvPrice,
            quantity: item.quantity,
            sessionId: claimData.sessionId,
            source: "user_upload",
          })
        )
      );

      res.json({ claim, lineItems: addedLineItems });
    } catch (error) {
      console.error("Error creating claim:", error);
      res.status(500).json({ error: "Failed to create claim" });
    }
  });

  // Get all attributions/sources
  app.get("/api/attributions", async (req, res) => {
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching attributions:", error);
      res.status(500).json({ error: "Failed to fetch attributions" });
    }
  });

  // Log source usage for a session
  app.post("/api/sessions/:sessionId/sources", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const usageData = z.object({
        sourceId: z.string(),
        purpose: z.string().optional(),
      }).parse(req.body);

      await storage.logSourceUsage({ sessionId, ...usageData });
      res.json({ success: true });
    } catch (error) {
      console.error("Error logging source usage:", error);
      res.status(500).json({ error: "Failed to log source usage" });
    }
  });

  // Get pricing statistics for a category and unit
  app.get("/api/pricing/stats", async (req, res) => {
    try {
      const { category, unit, zipPrefix } = z.object({
        category: z.string(),
        unit: z.enum(["LF", "SF", "SQ", "CT", "EA"]),
        zipPrefix: z.string().optional(),
      }).parse(req.query);

      const stats = await storage.getPricingStats(category, unit, zipPrefix);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching pricing stats:", error);
      res.status(500).json({ error: "Failed to fetch pricing stats" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
      }
    }
  });

  // OCR endpoint - Upload and process insurance document
  app.post("/api/ocr/upload", upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { path: filePath, mimetype } = req.file;

      console.log(`Processing uploaded file: ${req.file.originalname}, type: ${mimetype}`);

      // Perform OCR on the uploaded file
      const ocrResult = await performOCR(filePath, mimetype);

      // Parse the extracted text to identify claim items
      const parsedItems = parseInsuranceDocument(ocrResult.text);

      // Clean up uploaded file
      await fs.unlink(filePath).catch(err => 
        console.warn('Failed to delete uploaded file:', err)
      );

      res.json({
        success: true,
        rawText: ocrResult.text,
        source: ocrResult.source,
        confidence: ocrResult.confidence,
        parsedItems: parsedItems,
        itemCount: parsedItems.length
      });

    } catch (error: any) {
      console.error('OCR processing error:', error);
      
      // Clean up file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({ 
        error: 'Failed to process document',
        details: error.message 
      });
    }
  });

  // Partnership LOI submission
  app.post("/api/partners/loi", async (req, res) => {
    try {
      const loiData = z.object({
        type: z.enum(["contractor", "adjuster", "agency"]),
        companyName: z.string(),
        contactPerson: z.string(),
        email: z.string().email(),
        phone: z.string(),
        website: z.string().optional(),
        licenseNumber: z.string().optional(),
        zipCodes: z.array(z.string()).min(1),
        pricingPreferences: z.object({
          cpc: z.object({
            enabled: z.boolean(),
            amount: z.coerce.number().optional(),
            budgetPeriod: z.enum(["daily", "monthly"]).optional(),
            budgetCap: z.coerce.number().optional(),
          }).optional(),
          affiliate: z.object({
            enabled: z.boolean(),
            commissionPct: z.coerce.number().optional(),
            paymentTerms: z.string().optional(),
          }).optional(),
          monthlyBanner: z.object({
            enabled: z.boolean(),
            amount: z.coerce.number().optional(),
            size: z.string().optional(),
            placement: z.string().optional(),
          }).optional(),
        }),
        notes: z.string().optional(),
      }).parse(req.body);

      // Filter out disabled pricing options before storing
      const sanitizedPrefs = { ...loiData.pricingPreferences };
      if (sanitizedPrefs.cpc && !sanitizedPrefs.cpc.enabled) {
        delete sanitizedPrefs.cpc;
      }
      if (sanitizedPrefs.affiliate && !sanitizedPrefs.affiliate.enabled) {
        delete sanitizedPrefs.affiliate;
      }
      if (sanitizedPrefs.monthlyBanner && !sanitizedPrefs.monthlyBanner.enabled) {
        delete sanitizedPrefs.monthlyBanner;
      }

      // Create partner and LOI in a transactional way
      const partner = await storage.createPartner({
        companyName: loiData.companyName,
        type: loiData.type,
        tier: "advertiser",
        contactPerson: loiData.contactPerson,
        email: loiData.email,
        phone: loiData.phone,
        website: loiData.website,
        licenseNumber: loiData.licenseNumber,
        status: "pending",
      });

      const loi = await storage.createPartnershipLOI({
        partnerId: partner.id,
        pricingPreferences: sanitizedPrefs,
        notes: loiData.notes,
        status: "pending",
      }, loiData.zipCodes);

      // Auto-approve if enabled (for beta/testing)
      const autoApprove = process.env.AUTO_APPROVE_PARTNERS === "true";
      if (autoApprove) {
        await storage.updatePartnerStatus(partner.id, "approved");
        console.log(`✅ Auto-approved partner: ${partner.companyName} (${partner.email})`);
      }

      res.json({
        success: true,
        partnerId: partner.id,
        loiId: loi.id,
        message: autoApprove 
          ? "Application submitted and automatically approved" 
          : "Application submitted successfully"
      });
    } catch (error: any) {
      console.error('Partner LOI submission error:', error);
      res.status(400).json({ 
        error: 'Failed to submit application',
        details: error.message 
      });
    }
  });

  // Match partners to user location (Geo-Targeting API)
  app.post("/api/partners/match", asyncHandler(async (req, res) => {
    const { zip, areaCode, category, maxResults } = z.object({
      zip: z.string().regex(/^\d{5}$/).optional(),
      areaCode: z.string().regex(/^\d{3}$/).optional(),
      category: z.string().optional(),
      maxResults: z.number().min(1).max(20).default(5),
    }).parse(req.body);

    // If no location provided, detect from IP
    let userLocation;
    if (zip || areaCode) {
      const areaCodes = areaCode ? [areaCode] : (zip ? getAreaCodeFromZip(zip) : []);
      userLocation = {
        zip,
        areaCode: areaCodes[0],
      };
    } else {
      userLocation = getCoarseLocation(req);
    }

    // Get matched partners
    const matchedPartners = matchPartnersToUser(
      userLocation,
      PROMO_PARTNERS,
      category,
      maxResults
    );

    res.json({
      location: {
        zip: userLocation.zip,
        areaCode: userLocation.areaCode,
        metro: userLocation.metro,
      },
      partners: matchedPartners,
      matchingInfo: MATCHING_EXPLANATION,
      totalMatches: matchedPartners.length,
    });
  }));

  // Get partners with filters
  app.get("/api/partners", async (req, res) => {
    try {
      const { status, type, tier, zipCode } = req.query;

      let partners;
      if (zipCode && typeof zipCode === 'string') {
        // Public use - get partners for specific ZIP code (only approved by default)
        partners = await storage.getPartnersByZipCode(zipCode, {
          status: status as string || "approved",
          tier: tier as string,
        });
      } else {
        // Admin use - require authentication for full partner list
        if (!req.session?.isAdmin) {
          return res.status(401).json({ error: "Unauthorized - Admin access required" });
        }
        
        partners = await storage.getPartners({
          status: status as string,
          type: type as string,
          tier: tier as string,
        });
      }

      res.json({ partners });
    } catch (error: any) {
      console.error('Get partners error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve partners',
        details: error.message 
      });
    }
  });

  // Get single partner
  app.get("/api/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const partner = await storage.getPartner(id);

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json({ partner });
    } catch (error: any) {
      console.error('Get partner error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve partner',
        details: error.message 
      });
    }
  });

  // Update partner status (admin endpoint - protected)
  app.patch("/api/partners/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewerId } = z.object({
        status: z.enum(["pending", "approved", "rejected", "suspended"]),
        reviewerId: z.string().optional(),
      }).parse(req.body);

      await storage.updatePartnerStatus(id, status, reviewerId);

      res.json({
        success: true,
        message: `Partner status updated to ${status}`
      });
    } catch (error: any) {
      console.error('Update partner status error:', error);
      res.status(400).json({ 
        error: 'Failed to update partner status',
        details: error.message 
      });
    }
  });

  // Track partner lead (click, referral, conversion)
  app.post("/api/partners/:id/leads", async (req, res) => {
    try {
      const { id: partnerId } = req.params;
      const leadData = z.object({
        sessionId: z.string().optional(),
        claimId: z.string().optional(),
        leadType: z.enum(["click", "referral", "conversion"]),
        zipCode: z.string().optional(),
        metadata: z.any().optional(),
      }).parse(req.body);

      const lead = await storage.createPartnerLead({
        partnerId,
        sessionId: leadData.sessionId || null,
        claimId: leadData.claimId || null,
        leadType: leadData.leadType,
        zipCode: leadData.zipCode || null,
        metadata: leadData.metadata,
        clickedAt: leadData.leadType === "click" ? new Date() : null,
        convertedAt: leadData.leadType === "conversion" ? new Date() : null,
      });

      res.json({
        success: true,
        leadId: lead.id
      });
    } catch (error: any) {
      console.error('Create partner lead error:', error);
      res.status(400).json({ 
        error: 'Failed to track partner lead',
        details: error.message 
      });
    }
  });

  // Create price audit result for compliance tracking
  app.post("/api/price-audits", async (req, res) => {
    try {
      const auditData = z.object({
        claimLineItemId: z.string().optional(),
        sessionId: z.string().optional(),
        itemName: z.string(),
        matchedItem: z.string().optional(),
        userPrice: z.number(),
        marketMin: z.number().optional(),
        marketAvg: z.number().optional(),
        marketMax: z.number().optional(),
        unit: z.string().optional(),
        category: z.string().optional(),
        flag: z.enum(["OK", "Below market minimum", "Above market maximum", "Significantly below average", "Significantly above average", "No data available"]),
        severity: z.enum(["success", "warning", "error", "info"]),
        percentFromAvg: z.number().optional(),
        sampleSize: z.number().optional(),
        zipCode: z.string().optional(),
      }).parse(req.body);

      const result = await storage.createPriceAuditResult({
        claimLineItemId: auditData.claimLineItemId || null,
        sessionId: auditData.sessionId || null,
        itemName: auditData.itemName,
        matchedItem: auditData.matchedItem || null,
        userPrice: auditData.userPrice,
        marketMin: auditData.marketMin || null,
        marketAvg: auditData.marketAvg || null,
        marketMax: auditData.marketMax || null,
        unit: auditData.unit || null,
        category: auditData.category || null,
        flag: auditData.flag,
        severity: auditData.severity,
        percentFromAvg: auditData.percentFromAvg || null,
        sampleSize: auditData.sampleSize || null,
        zipCode: auditData.zipCode || null,
      });

      res.json({
        success: true,
        auditId: result.id
      });
    } catch (error: any) {
      console.error('Create price audit error:', error);
      res.status(400).json({ 
        error: 'Failed to store price audit',
        details: error.message 
      });
    }
  });

  // Get price audit results (admin endpoint)
  app.get("/api/price-audits", requireAdmin, async (req, res) => {
    try {
      const { sessionId, flag, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (sessionId) filters.sessionId = sessionId as string;
      if (flag) filters.flag = flag as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const results = await storage.getPriceAuditResults(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      
      res.json({ audits: results });
    } catch (error: any) {
      console.error('Get price audits error:', error);
      res.status(500).json({ 
        error: 'Failed to get price audits',
        details: error.message 
      });
    }
  });

  // Get price audit stats (admin endpoint)
  app.get("/api/price-audits/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getPriceAuditStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Get price audit stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get price audit stats',
        details: error.message 
      });
    }
  });

  // ========== MaxClaim v2.0 AUDIT ENDPOINTS ==========

  // Single item audit (v2.0)
  app.post("/api/audit/single", (req, res) => {
    try {
      const { item, price, qty } = z.object({
        item: z.string().min(1, "Item name is required"),
        price: z.number().positive("Price must be positive"),
        qty: z.number().positive("Quantity must be positive"),
      }).parse(req.body);

      const result = auditClaimItem(item, price, qty);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Missing required fields: item, price, qty',
          details: error.errors
        });
      } else {
        console.error('Audit single item error:', error);
        res.status(500).json({ error: 'Failed to audit item' });
      }
    }
  });

  // Batch audit (v2.0) - Full claim with multiple items
  app.post("/api/audit/batch", (req, res) => {
    try {
      const { items } = z.object({
        items: z.array(z.object({
          name: z.string().min(1),
          price: z.number(),
          qty: z.number(),
        })).min(1, "At least one item is required"),
      }).parse(req.body);

      const result = auditBatch(items);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid request: items array required',
          details: error.errors
        });
      } else {
        console.error('Audit batch error:', error);
        res.status(500).json({ error: 'Failed to audit claim batch' });
      }
    }
  });

  // Get all items for autocomplete (v2.0)
  app.get("/api/items", (req, res) => {
    try {
      const items = getAllItems();
      res.json({ items });
    } catch (error: any) {
      console.error('Get items error:', error);
      res.status(500).json({ error: 'Failed to get items' });
    }
  });

  // Get market data for specific item (v2.0)
  app.get("/api/items/:itemName", (req, res) => {
    try {
      const { itemName } = req.params;
      const data = getMarketData(decodeURIComponent(itemName));
      
      if (!data) {
        return res.status(404).json({ error: 'Item not found in database' });
      }
      
      res.json({
        name: itemName,
        unit: data.UNIT,
        rrcMin: data.RRC_COST,
        insMax: data.INS_MAX_COST,
        avgPrice: data.AVG_PRICE,
        samples: data.SAMPLES
      });
    } catch (error: any) {
      console.error('Get item data error:', error);
      res.status(500).json({ error: 'Failed to get item data' });
    }
  });

  // Health check endpoint with memory monitoring
  app.get("/health", (req, res) => {
    const memUsage = process.memoryUsage();
    const cacheStats = priceDBCache.getStats();
    const items = getAllItems();
    
    res.json({ 
      status: 'ok', 
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      priceDB: {
        items: items.length,
        cacheHits: cacheStats.cacheHits,
        cacheMisses: cacheStats.cacheMisses,
        cacheSize: `${cacheStats.memorySizeKB}KB`,
        cacheAge: `${priceDBCache.getCacheAge()}min`,
        lastLoaded: cacheStats.lastLoaded
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
