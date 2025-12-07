import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
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
import { seedDefaultCommissionTiers } from "./services/commissionEngine";
import { seedProOrgsAndTemplates } from "./seeds/proOrgsAndTemplates";
import { generateAgentRefCode, isValidAgentRefCodeFormat, generateUniqueAgentRefCode } from "./utils/agentRefCode";
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
  })).min(1, "At least one claim item is required")
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
          unit: item.unit as "LF" | "SF" | "SQ" | "CT" | "EA",
          quotedPrice: item.insuranceOffer,
          fmvPrice: item.fmvPrice,
          variancePct: item.percentageIncrease,
          fromOcr: 0,
        });

        // Track pricing data point for continuous improvement
        await storage.addPricingDataPoint({
          category: item.category,
          unit: item.unit as "LF" | "SF" | "SQ" | "CT" | "EA",
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
        agentRefCode: z.string().optional(), // Agent reference code for attribution
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

      // Validate agent reference code if provided
      let signingAgentId: string | null = null;
      if (loiData.agentRefCode) {
        if (!isValidAgentRefCodeFormat(loiData.agentRefCode)) {
          return res.status(400).json({ error: "Invalid agent reference code format" });
        }
        const agent = await storage.getSalesAgentByRefCode(loiData.agentRefCode);
        if (!agent) {
          return res.status(400).json({ error: "Agent reference code not found" });
        }
        if (agent.status !== 'active') {
          return res.status(400).json({ error: "Agent is not active" });
        }
        signingAgentId = agent.id;
      }

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
        signingAgentId, // Link to signing agent if provided
      });

      const loi = await storage.createPartnershipLOI({
        partnerId: partner.id,
        pricingPreferences: sanitizedPrefs,
        notes: loiData.notes,
        status: "pending",
        agentId: signingAgentId, // Store agent ID in LOI for commission tracking
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
    const { zip, areaCode, category, maxResults, sessionId, trackImpressions } = z.object({
      zip: z.string().regex(/^\d{5}$/).optional(),
      areaCode: z.string().regex(/^\d{3}$/).optional(),
      category: z.string().optional(),
      maxResults: z.number().min(1).max(20).default(5),
      sessionId: z.string().optional(), // For tracking impressions
      trackImpressions: z.boolean().default(true), // Enable/disable impression tracking
    }).parse(req.body);

    // If no location provided, use default San Antonio
    let userLocation: { zip?: string; areaCode?: string; metro?: string };
    if (zip || areaCode) {
      const areaCodes = areaCode ? [areaCode] : (zip ? getAreaCodeFromZip(zip) : []);
      const detectedLocation = zip ? getCoarseLocation(zip) : undefined;
      userLocation = {
        zip,
        areaCode: areaCodes[0],
        metro: detectedLocation?.metro,
      };
    } else {
      // Default to San Antonio area for unspecified locations
      userLocation = {
        zip: undefined,
        areaCode: '210',
        metro: 'San Antonio',
      };
    }

    // Get matched partners
    const matchedPartners = matchPartnersToUser(
      userLocation,
      PROMO_PARTNERS,
      category,
      maxResults
    );

    // Track ad impressions for each matched partner (non-blocking)
    const impressionIds: Record<string, string> = {};
    if (trackImpressions && zip) {
      for (const partner of matchedPartners) {
        try {
          const impression = await storage.createAdImpression({
            partnerId: partner.id,
            zipCode: zip,
            sessionId: sessionId || null,
            referralType: 'match',
            clickthrough: false,
          });
          impressionIds[partner.id] = impression.id;
        } catch (error) {
          console.error(`Failed to track impression for partner ${partner.id}:`, error);
        }
      }
    }

    res.json({
      location: {
        zip: userLocation.zip,
        areaCode: userLocation.areaCode,
        metro: userLocation.metro,
      },
      partners: matchedPartners,
      impressionIds, // Include impression IDs so frontend can track clickthroughs
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
        unitPrice: data.UNIT_PRICE,
        fmvPrice: data.FMV_PRICE,
        avgPrice: data.AVERAGE_PRICE,
        samples: data.SAMPLES
      });
    } catch (error: any) {
      console.error('Get item data error:', error);
      res.status(500).json({ error: 'Failed to get item data' });
    }
  });

  // ============================================
  // FILE SERVING ROUTES - Object Storage
  // ============================================

  // Serve stored objects (PDFs, documents) - requires auth and ownership check
  app.get("/files/:claimId/:filename", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user.claims?.sub;
    const { claimId, filename } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Verify user owns this claim
    const userClaimsData = await storage.getUserClaims(userId, 100);
    const userOwnsClaim = userClaimsData.some(uc => uc.claimId === claimId);
    
    if (!userOwnsClaim) {
      return res.status(403).json({ error: "Access denied - not your claim" });
    }
    
    try {
      const { getObjectStorageService, ObjectNotFoundError } = await import('./utils/objectStorage');
      const storageService = getObjectStorageService();
      
      const file = await storageService.getClaimFile(claimId, filename);
      await storageService.downloadObject(file, res);
    } catch (error: any) {
      if (error.name === 'ObjectNotFoundError') {
        return res.status(404).json({ error: 'File not found' });
      }
      console.error('File serving error:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }));

  // ============================================
  // PROTECTED USER ROUTES - Replit Auth Required
  // ============================================

  // Get current authenticated user
  app.get("/api/user/me", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const replitUser = await storage.getReplitUser(userId);
    if (!replitUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: replitUser.id,
      email: replitUser.email,
      firstName: replitUser.firstName,
      lastName: replitUser.lastName,
      profileImageUrl: replitUser.profileImageUrl,
    });
  }));

  // Get user's saved claims (My Claims dashboard)
  app.get("/api/user/claims", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const userClaims = await storage.getUserClaims(userId, limit);

    res.json({
      claims: userClaims.map(uc => ({
        id: uc.id,
        claimId: uc.claimId,
        createdAt: uc.createdAt,
        reportUrl: uc.reportUrl,
        inputs: uc.inputs,
        claim: {
          id: uc.claim.id,
          status: uc.claim.status,
          totalQuoted: Number(uc.claim.totalQuoted),
          totalFmv: Number(uc.claim.totalFmv),
          additionalAmount: Number(uc.claim.additionalAmount),
          variancePct: Number(uc.claim.variancePct),
        }
      })),
      total: userClaims.length,
    });
  }));

  // Get a specific user claim with full details
  app.get("/api/user/claims/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user.claims?.sub;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userClaim = await storage.getUserClaim(id);
    if (!userClaim || userClaim.userId !== userId) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = await storage.getClaim(userClaim.claimId);
    if (!claim) {
      return res.status(404).json({ error: "Claim details not found" });
    }

    const lineItems = await storage.getClaimLineItems(userClaim.claimId);

    res.json({
      id: userClaim.id,
      claimId: userClaim.claimId,
      createdAt: userClaim.createdAt,
      reportUrl: userClaim.reportUrl,
      inputs: userClaim.inputs,
      claim: {
        id: claim.id,
        status: claim.status,
        totalQuoted: Number(claim.totalQuoted),
        totalFmv: Number(claim.totalFmv),
        additionalAmount: Number(claim.additionalAmount),
        variancePct: Number(claim.variancePct),
        completedAt: claim.completedAt,
      },
      lineItems: lineItems.map(item => ({
        id: item.id,
        category: item.category,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        quotedPrice: Number(item.quotedPrice),
        fmvPrice: Number(item.fmvPrice),
        variancePct: Number(item.variancePct),
      })),
    });
  }));

  // Save a claim to user's history (called after audit)
  app.post("/api/user/claims", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { claimId, inputs, reportUrl } = z.object({
      claimId: z.string(),
      inputs: z.object({
        zipCode: z.string(),
        propertyAddress: z.string().optional(),
        items: z.array(z.object({
          category: z.string(),
          description: z.string(),
          quantity: z.number(),
          unit: z.string(),
          quotedPrice: z.number().optional(),
          unitPrice: z.number().optional(),
        })),
        email: z.string().email().optional(),
      }).optional(),
      reportUrl: z.string().url().optional(),
    }).parse(req.body);

    // Verify the claim exists
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Create user claim record
    const userClaim = await storage.createUserClaim({
      userId,
      claimId,
      inputs,
      reportUrl,
    });

    res.status(201).json({
      id: userClaim.id,
      message: "Claim saved to your history",
    });
  }));

  // ===== SALES AGENT MANAGEMENT ROUTES =====

  // Validate agent reference code (public endpoint for partner signup)
  app.get("/api/agents/validate-code/:code", asyncHandler(async (req, res) => {
    const { code } = req.params;
    
    if (!isValidAgentRefCodeFormat(code)) {
      return res.json({ valid: false, error: "Invalid code format" });
    }
    
    const agent = await storage.getSalesAgentByRefCode(code);
    if (!agent) {
      return res.json({ valid: false, error: "Agent not found" });
    }
    
    if (agent.status !== 'active') {
      return res.json({ valid: false, error: "Agent is not active" });
    }
    
    res.json({ 
      valid: true, 
      agent: { 
        name: agent.name, 
        region: agent.region,
        refCode: agent.agentRefCode,
      } 
    });
  }));

  // Create a new sales agent (with auto-generated ref code)
  app.post("/api/admin/agents", requireAdmin, asyncHandler(async (req, res) => {
    const agentData = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      region: z.string().optional(),
      birthYear: z.number().min(1940).max(2010).optional(),
      commissionTierId: z.string().optional(),
    }).parse(req.body);

    // Create the agent first
    const agent = await storage.createSalesAgent(agentData);
    
    // Generate unique ref code if birthYear provided
    if (agentData.birthYear) {
      const nameParts = agentData.name.split(' ');
      const firstName = nameParts[0] || 'xxx';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'xxx';
      const joinYear = new Date().getFullYear();
      
      const existingCodes = await storage.getAllAgentRefCodes();
      const refCode = await generateUniqueAgentRefCode(
        firstName, 
        lastName, 
        agentData.birthYear, 
        joinYear, 
        existingCodes
      );
      
      await storage.updateSalesAgentRefCode(agent.id, refCode);
      
      // Return agent with ref code
      const updatedAgent = await storage.getSalesAgent(agent.id);
      return res.status(201).json(updatedAgent);
    }
    
    res.status(201).json(agent);
  }));
  
  // Generate/regenerate agent reference code
  app.post("/api/admin/agents/:id/generate-code", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { birthYear } = z.object({
      birthYear: z.number().min(1940).max(2010),
    }).parse(req.body);
    
    const agent = await storage.getSalesAgent(id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    
    const nameParts = agent.name.split(' ');
    const firstName = nameParts[0] || 'xxx';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'xxx';
    const joinYear = agent.joinedAt ? new Date(agent.joinedAt).getFullYear() : new Date().getFullYear();
    
    const existingCodes = await storage.getAllAgentRefCodes();
    const refCode = await generateUniqueAgentRefCode(firstName, lastName, birthYear, joinYear, existingCodes);
    
    await storage.updateSalesAgentRefCode(id, refCode);
    
    res.json({ success: true, refCode });
  }));

  // Get all sales agents
  app.get("/api/admin/agents", requireAdmin, asyncHandler(async (req, res) => {
    const { status, region } = req.query;
    const agents = await storage.getSalesAgents({
      status: status as string,
      region: region as string,
    });
    res.json({ agents, total: agents.length });
  }));

  // Get a specific sales agent
  app.get("/api/admin/agents/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const agents = await storage.getSalesAgents({});
    const agent = agents.find(a => a.id === id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(agent);
  }));

  // Get agent's commission summary
  app.get("/api/admin/agents/:id/commissions", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;

    const agents = await storage.getSalesAgents({});
    const agent = agents.find(a => a.id === id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const commissions = await storage.getAgentCommissions({
      agentId: id,
      status: status as string,
    });

    const summary = commissions.reduce((acc: { total: number; pending: number; paid: number }, c) => {
      acc.total += Number(c.commissionAmount);
      acc.pending += c.status === 'pending' ? Number(c.commissionAmount) : 0;
      acc.paid += c.status === 'paid' ? Number(c.commissionAmount) : 0;
      return acc;
    }, { total: 0, pending: 0, paid: 0 });

    res.json({
      agent: { id: agent.id, name: agent.name, tier: agent.commissionTierId },
      commissions,
      summary,
    });
  }));

  // ===== PARTNER CONTRACT ROUTES =====

  // Create a partner contract
  app.post("/api/admin/contracts", requireAdmin, asyncHandler(async (req, res) => {
    const contractData = z.object({
      partnerId: z.string(),
      agentId: z.string().optional(),
      monetizationTier: z.enum(["free_bogo", "standard", "premium"]),
      monthlyFee: z.number().min(0),
      billingPeriod: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
      rotationWeight: z.number().min(0.1).max(10).default(1.0),
      autoRenew: z.boolean().default(true),
      renewalPeriodDays: z.number().default(30),
      bogoOrganizationId: z.string().optional(),
    }).parse(req.body);

    const contract = await storage.createPartnerContract(contractData);
    res.status(201).json(contract);
  }));

  // Get all contracts
  app.get("/api/admin/contracts", requireAdmin, asyncHandler(async (req, res) => {
    const { partnerId, agentId, status, tier } = req.query;
    const contracts = await storage.getPartnerContracts({
      partnerId: partnerId as string,
      agentId: agentId as string,
      status: status as string,
      monetizationTier: tier as string,
    });
    res.json({ contracts, total: contracts.length });
  }));

  // Get a specific contract
  app.get("/api/admin/contracts/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contracts = await storage.getPartnerContracts({});
    const contract = contracts.find(c => c.id === id);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    res.json(contract);
  }));

  // ===== COMMISSION TRACKING ROUTES =====

  // Get all commissions with filters
  app.get("/api/admin/commissions", requireAdmin, asyncHandler(async (req, res) => {
    const { agentId, status } = req.query;

    const commissions = await storage.getAgentCommissions({
      agentId: agentId as string,
      status: status as string,
    });

    const summary = commissions.reduce((acc: { total: number; count: number }, c) => {
      acc.total += Number(c.commissionAmount);
      acc.count += 1;
      return acc;
    }, { total: 0, count: 0 });

    res.json({ commissions, summary, total: commissions.length });
  }));

  // Create a manual commission entry
  app.post("/api/admin/commissions", requireAdmin, asyncHandler(async (req, res) => {
    const commissionData = z.object({
      agentId: z.string(),
      partnerId: z.string(),
      contractId: z.string().optional(),
      commissionType: z.enum(["deal_close", "renewal", "bonus", "manual"]),
      baseAmount: z.number().positive(),
      rate: z.number().min(0).max(100).default(15),
      commissionAmount: z.number().positive(),
      notes: z.string().optional(),
    }).parse(req.body);

    const commission = await storage.createAgentCommission({
      ...commissionData,
      status: "pending",
    });

    res.status(201).json(commission);
  }));

  // Approve/pay a commission
  app.post("/api/admin/commissions/:id/pay", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const commissions = await storage.getAgentCommissions({});
    const commission = commissions.find(c => c.id === id);
    if (!commission) {
      return res.status(404).json({ error: "Commission not found" });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({ error: "Commission is not in pending status" });
    }

    await storage.updateAgentCommissionStatus(id, 'paid');
    res.json({ success: true, message: "Commission marked as paid" });
  }));

  // ===== PAYOUT ROUTES =====

  // Get agent payouts
  app.get("/api/admin/payouts", requireAdmin, asyncHandler(async (req, res) => {
    const { agentId, status } = req.query;
    const payouts = await storage.getAgentPayouts({
      agentId: agentId as string,
      status: status as string,
    });
    res.json({ payouts, total: payouts.length });
  }));

  // Create a payout for an agent
  app.post("/api/admin/payouts", requireAdmin, asyncHandler(async (req, res) => {
    const payoutData = z.object({
      agentId: z.string(),
      amount: z.number().positive(),
      method: z.enum(["stripe_connect", "bank_transfer", "check"]).default("stripe_connect"),
    }).parse(req.body);

    const agents = await storage.getSalesAgents({});
    const agent = agents.find(a => a.id === payoutData.agentId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const payout = await storage.createAgentPayout({
      ...payoutData,
      status: "pending",
    });

    res.status(201).json(payout);
  }));

  // Process a payout
  app.post("/api/admin/payouts/:id/process", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const payouts = await storage.getAgentPayouts({});
    const payout = payouts.find(p => p.id === id);
    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: "Payout is not in pending status" });
    }

    await storage.updateAgentPayoutStatus(id, 'processing');
    res.json({ success: true, message: "Payout is now processing" });
  }));

  // ===== BOGO ORGANIZATION ROUTES =====

  // Create a BOGO organization
  app.post("/api/admin/bogo-organizations", requireAdmin, asyncHandler(async (req, res) => {
    const orgData = z.object({
      name: z.string().min(2),
      category: z.string(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      membersCount: z.number().optional(),
      maxFreeListings: z.number().default(10),
    }).parse(req.body);

    const org = await storage.createBogoOrganization(orgData);
    res.status(201).json(org);
  }));

  // Get all BOGO organizations
  app.get("/api/admin/bogo-organizations", requireAdmin, asyncHandler(async (req, res) => {
    const { status, category } = req.query;
    const orgs = await storage.getBogoOrganizations({
      status: status as string,
      category: category as string,
    });
    res.json({ organizations: orgs, total: orgs.length });
  }));

  // Get a specific BOGO organization
  app.get("/api/admin/bogo-organizations/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const orgs = await storage.getBogoOrganizations({});
    const org = orgs.find(o => o.id === id);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json(org);
  }));

  // Update a BOGO organization
  app.patch("/api/admin/bogo-organizations/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = z.object({
      name: z.string().min(2).optional(),
      status: z.enum(["active", "inactive", "suspended"]).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      membersCount: z.number().optional(),
      maxFreeListings: z.number().optional(),
    }).parse(req.body);

    await storage.updateBogoOrganization(id, updates);
    const orgs = await storage.getBogoOrganizations({});
    const org = orgs.find(o => o.id === id);
    res.json(org);
  }));

  // ===== INVOICE ROUTES =====

  // Get all invoices
  app.get("/api/admin/invoices", requireAdmin, asyncHandler(async (req, res) => {
    const { contractId, status } = req.query;
    const invoices = await storage.getPartnerInvoices({
      contractId: contractId as string,
      status: status as string,
    });
    res.json({ invoices, total: invoices.length });
  }));

  // Create an invoice
  app.post("/api/admin/invoices", requireAdmin, asyncHandler(async (req, res) => {
    const invoiceData = z.object({
      partnerId: z.string(),
      contractId: z.string(),
      amount: z.number().positive(),
      dueDate: z.string(),
      notes: z.string().optional(),
    }).parse(req.body);

    const invoice = await storage.createPartnerInvoice({
      ...invoiceData,
      dueDate: new Date(invoiceData.dueDate),
      status: "unpaid",
    });

    res.status(201).json(invoice);
  }));

  // ===== RENEWAL TRACKING ROUTES =====

  // Get upcoming renewals
  app.get("/api/admin/renewals", requireAdmin, asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.days as string) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const renewals = await storage.getPendingRenewals(futureDate);
    res.json({ renewals, total: renewals.length });
  }));

  // ===== DASHBOARD STATS ROUTES =====

  // Get monetization dashboard stats
  app.get("/api/admin/dashboard/stats", requireAdmin, asyncHandler(async (req, res) => {
    const [
      agents,
      contracts,
      commissions,
      payouts,
    ] = await Promise.all([
      storage.getSalesAgents({}),
      storage.getPartnerContracts({}),
      storage.getAgentCommissions({}),
      storage.getAgentPayouts({}),
    ]);

    const activeContracts = contracts.filter((c: { status: string }) => c.status === 'approved');
    const pendingCommissions = commissions.filter((c: { status: string }) => c.status === 'pending');
    const totalRevenue = activeContracts.reduce((sum: number, c: { baseMonthly: any }) => sum + Number(c.baseMonthly || 0), 0);
    const pendingPayouts = payouts.filter((p: { status: string }) => p.status === 'pending');

    res.json({
      agents: {
        total: agents.length,
        active: agents.filter((a: { status: string }) => a.status === 'active').length,
      },
      contracts: {
        total: contracts.length,
        active: activeContracts.length,
        byTier: {
          free_bogo: activeContracts.filter((c: { monetizationTier: string }) => c.monetizationTier === 'free_bogo').length,
          standard: activeContracts.filter((c: { monetizationTier: string }) => c.monetizationTier === 'standard').length,
          premium: activeContracts.filter((c: { monetizationTier: string }) => c.monetizationTier === 'premium').length,
        },
      },
      commissions: {
        total: commissions.reduce((sum: number, c: { commissionAmount: any }) => sum + Number(c.commissionAmount), 0),
        pending: pendingCommissions.reduce((sum: number, c: { commissionAmount: any }) => sum + Number(c.commissionAmount), 0),
        count: pendingCommissions.length,
      },
      revenue: {
        monthlyRecurring: totalRevenue,
        activeSubscriptions: activeContracts.length,
      },
      payouts: {
        pending: pendingPayouts.length,
        totalPending: pendingPayouts.reduce((sum: number, p: { amount: any }) => sum + Number(p.amount), 0),
      },
    });
  }));

  // ===== AD IMPRESSION TRACKING ROUTES =====

  // Record a partner impression (when partner is shown to user)
  app.post("/api/impressions", asyncHandler(async (req, res) => {
    const data = z.object({
      partnerId: z.string(),
      contractId: z.string().optional(),
      rotationId: z.string().optional(),
      zipCode: z.string(),
      sessionId: z.string().optional(),
      referralType: z.string().optional(),
    }).parse(req.body);

    const impression = await storage.createAdImpression({
      ...data,
      clickthrough: false,
    });

    res.status(201).json({ id: impression.id });
  }));

  // Record a clickthrough
  app.post("/api/impressions/:id/click", asyncHandler(async (req, res) => {
    const { id } = req.params;
    await storage.recordClickthrough(id);
    res.json({ success: true });
  }));

  // Get impression stats for a partner (admin only)
  app.get("/api/admin/impressions/stats/:partnerId", requireAdmin, asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    const stats = await storage.getImpressionStats(partnerId, days);
    res.json(stats);
  }));

  // Get all impressions (admin only)
  app.get("/api/admin/impressions", requireAdmin, asyncHandler(async (req, res) => {
    const { partnerId, zipCode } = req.query;
    const impressions = await storage.getAdImpressions({
      partnerId: partnerId as string,
      zipCode: zipCode as string,
    });
    res.json({ impressions, total: impressions.length });
  }));

  // ===== AD ROTATION ROUTES =====

  // Get ad rotations for a ZIP code (public - used for displaying partners)
  app.get("/api/ad-rotations/:zipCode", asyncHandler(async (req, res) => {
    const { zipCode } = req.params;
    const rotations = await storage.getAdRotationsByZip(zipCode);
    res.json({ rotations });
  }));

  // Admin: Create ad rotation
  app.post("/api/admin/ad-rotations", requireAdmin, asyncHandler(async (req, res) => {
    const data = z.object({
      partnerId: z.string(),
      contractId: z.string().optional(),
      zipCode: z.string(),
      weight: z.number().min(0.1).max(10).default(1.0),
      rotationOrder: z.number().default(0),
    }).parse(req.body);

    const rotation = await storage.createAdRotation(data);
    res.status(201).json(rotation);
  }));

  // Admin: Get all ad rotations
  app.get("/api/admin/ad-rotations", requireAdmin, asyncHandler(async (req, res) => {
    const { partnerId, zipCode, status } = req.query;
    const rotations = await storage.getAdRotations({
      partnerId: partnerId as string,
      zipCode: zipCode as string,
      status: status as string,
    });
    res.json({ rotations, total: rotations.length });
  }));

  // Admin: Delete ad rotation
  app.delete("/api/admin/ad-rotations/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    await storage.deleteAdRotation(id);
    res.json({ success: true });
  }));

  // ===== RENEWAL PROCESSING ROUTE =====

  // Process pending renewals (could be triggered by cron)
  app.post("/api/admin/renewals/process", requireAdmin, asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.days as string) || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const pendingRenewals = await storage.getPendingRenewals(futureDate);
    const processed = [];
    const failed = [];
    
    for (const renewal of pendingRenewals) {
      try {
        // Get the contract for pricing info
        const contract = await storage.getPartnerContract(renewal.contractId);
        if (!contract) {
          failed.push({ id: renewal.id, error: "Contract not found" });
          continue;
        }
        
        // Create invoice for renewal
        const invoice = await storage.createPartnerInvoice({
          contractId: renewal.contractId,
          partnerId: renewal.partnerId,
          amount: contract.baseMonthly || 0,
          dueDate: new Date(renewal.renewalDate),
          status: "unpaid",
          notes: `Auto-renewal for contract ${contract.id}`,
        });
        
        // Create commission for the agent if assigned
        if (renewal.agentId) {
          await storage.createAgentCommission({
            agentId: renewal.agentId,
            partnerId: renewal.partnerId,
            contractId: renewal.contractId,
            invoiceId: invoice.id,
            commissionType: "renewal",
            rate: contract.commissionRate || 0.15,
            baseAmount: contract.baseMonthly || 0,
            commissionAmount: (contract.baseMonthly || 0) * (contract.commissionRate || 0.15) * 0.75, // 75% of deal close rate for renewals
            status: "pending",
            dateEarned: new Date(),
          });
        }
        
        // Mark renewal as confirmed
        await storage.updatePartnerRenewalStatus(renewal.id, "confirmed");
        
        processed.push({ id: renewal.id, invoiceId: invoice.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        failed.push({ id: renewal.id, error: message });
        await storage.updatePartnerRenewalStatus(renewal.id, "failed");
      }
    }
    
    res.json({
      processed: processed.length,
      failed: failed.length,
      details: { processed, failed },
    });
  }));

  // ===== PRO ORGANIZATIONS DATABASE ROUTES =====

  // Get all pro organizations (with optional filters)
  app.get("/api/pro-organizations", asyncHandler(async (req, res) => {
    const { category, state, scope } = req.query;
    const orgs = await storage.getProOrganizations({
      category: category as string,
      state: state as string,
      scope: scope as string,
    });
    res.json({ organizations: orgs, total: orgs.length });
  }));

  // Get single pro organization
  app.get("/api/pro-organizations/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const org = await storage.getProOrganization(id);
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    res.json(org);
  }));

  // Admin: Create pro organization
  app.post("/api/admin/pro-organizations", requireAdmin, asyncHandler(async (req, res) => {
    const data = z.object({
      name: z.string().min(1),
      category: z.enum(["general_contractors", "remodelers", "roofers", "public_adjusters", "attorneys", "disaster_recovery"]),
      scope: z.enum(["national", "regional", "state", "local"]),
      state: z.string().length(2).optional(),
      city: z.string().optional(),
      website: z.string().url().optional(),
      memberDirectoryUrl: z.string().url().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const org = await storage.createProOrganization(data);
    res.status(201).json(org);
  }));

  // Admin: Update pro organization
  app.patch("/api/admin/pro-organizations/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await storage.getProOrganization(id);
    if (!existing) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    
    await storage.updateProOrganization(id, req.body);
    res.json({ success: true });
  }));

  // Admin: Delete pro organization
  app.delete("/api/admin/pro-organizations/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    await storage.deleteProOrganization(id);
    res.json({ success: true });
  }));

  // ===== EMAIL TEMPLATES ROUTES =====

  // Get all email templates (with optional filters)
  app.get("/api/email-templates", asyncHandler(async (req, res) => {
    const { category } = req.query;
    const isActive = req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined;
    const templates = await storage.getEmailTemplates({
      category: category as string,
      isActive,
    });
    res.json({ templates, total: templates.length });
  }));

  // Get single email template
  app.get("/api/email-templates/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await storage.getEmailTemplate(id);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(template);
  }));

  // Admin: Create email template
  app.post("/api/admin/email-templates", requireAdmin, asyncHandler(async (req, res) => {
    const data = z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      placeholders: z.array(z.string()).optional(),
      isActive: z.boolean().default(true),
    }).parse(req.body);

    const template = await storage.createEmailTemplate(data as any);
    res.status(201).json(template);
  }));

  // Admin: Update email template
  app.patch("/api/admin/email-templates/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await storage.getEmailTemplate(id);
    if (!existing) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    
    await storage.updateEmailTemplate(id, req.body);
    res.json({ success: true });
  }));

  // Admin: Delete email template
  app.delete("/api/admin/email-templates/:id", requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    await storage.deleteEmailTemplate(id);
    res.json({ success: true });
  }));

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

  // Seed default commission tiers on startup
  try {
    await seedDefaultCommissionTiers();
  } catch (error) {
    console.error("[CommissionEngine] Failed to seed commission tiers:", error);
  }

  // Seed pro organizations and email templates on startup
  try {
    await seedProOrgsAndTemplates();
  } catch (error) {
    console.error("[ProOrgsDB] Failed to seed pro organizations/templates:", error);
  }

  const httpServer = createServer(app);
  return httpServer;
}
