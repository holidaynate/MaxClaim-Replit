import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeClaimItem } from "./pricing-data";
import { getRegionalContext, calculateInflationMultiplier, getBLSInflationData } from "./external-apis";
import { performOCR, parseInsuranceDocument } from "./ocr-service";
import { insertPartnerSchema, insertPartnershipLOISchema, insertPartnerLeadSchema } from "@shared/schema";
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
    quantity: z.number(),
    unit: z.enum(["LF", "SF", "SQ", "CT", "EA"]).default("EA"),
    quotedPrice: z.number(),
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
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = z.object({
        password: z.string(),
      }).parse(req.body);

      const adminPassword = process.env.ADMIN_PASSWORD || "maxclaim2025beta";

      if (password === adminPassword) {
        req.session.isAdmin = true;
        res.json({ success: true, message: "Logged in successfully" });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } catch (error: any) {
      res.status(400).json({ error: "Invalid request", details: error.message });
    }
  });

  // Admin logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Check admin session status
  app.get("/api/admin/status", (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  // Analyze claim and calculate FMV with external API enrichment
  app.post("/api/claims/analyze", async (req, res) => {
    try {
      const data = claimAnalysisSchema.parse(req.body);
      
      // Fetch BLS inflation data and regional context in parallel
      const blsApiKey = process.env.BLS_API_KEY; // Optional - works without it but with rate limits
      const [blsData, regionalContext] = await Promise.all([
        getBLSInflationData(blsApiKey),
        getRegionalContext(data.zipCode, blsApiKey)
      ]);

      // Calculate inflation multiplier from BLS data
      const inflationMultiplier = calculateInflationMultiplier(blsData);
      
      const zipPrefix = data.zipCode.substring(0, 3);
      
      const results = await Promise.all(data.items.map(async (item) => {
        // Try to get pricing stats for this category/unit
        const pricingStats = await storage.getPricingStats(item.category, item.unit, zipPrefix).catch(() => null);
        
        const analysis = analyzeClaimItem(
          item.category,
          item.description,
          item.quantity,
          item.quotedPrice,
          data.zipCode,
          inflationMultiplier,
          pricingStats
        );
        
        return {
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          insuranceOffer: item.quotedPrice,
          fmvPrice: analysis.fmvPrice,
          additionalAmount: analysis.additionalAmount,
          percentageIncrease: analysis.percentageIncrease,
          status: analysis.status
        };
      }));

      const totalInsuranceOffer = data.items.reduce((sum, item) => sum + item.quotedPrice, 0);
      const totalFMV = results.reduce((sum, item) => sum + item.fmvPrice, 0);
      const totalAdditional = totalFMV - totalInsuranceOffer;
      const overallIncrease = (totalAdditional / totalInsuranceOffer) * 100;

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
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        console.error("Error analyzing claim:", error);
        res.status(500).json({ error: "Failed to analyze claim" });
      }
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
