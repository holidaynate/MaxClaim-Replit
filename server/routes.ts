import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeClaimItem } from "./pricing-data";
import { getRegionalContext, calculateInflationMultiplier, getBLSInflationData } from "./external-apis";
import { performOCR, parseInsuranceDocument } from "./ocr-service";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const claimAnalysisSchema = z.object({
  zipCode: z.string().min(5),
  items: z.array(z.object({
    category: z.string(),
    description: z.string(),
    quantity: z.number(),
    quotedPrice: z.number(),
  }))
});

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      const results = data.items.map(item => {
        const analysis = analyzeClaimItem(
          item.category,
          item.description,
          item.quantity,
          item.quotedPrice,
          data.zipCode,
          inflationMultiplier
        );
        
        return {
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          insuranceOffer: item.quotedPrice,
          fmvPrice: analysis.fmvPrice,
          additionalAmount: analysis.additionalAmount,
          percentageIncrease: analysis.percentageIncrease,
          status: analysis.status
        };
      });

      const totalInsuranceOffer = data.items.reduce((sum, item) => sum + item.quotedPrice, 0);
      const totalFMV = results.reduce((sum, item) => sum + item.fmvPrice, 0);
      const totalAdditional = totalFMV - totalInsuranceOffer;
      const overallIncrease = (totalAdditional / totalInsuranceOffer) * 100;

      // Store analytics (ZIP code and pricing data only - no PII)
      await storage.recordClaimAnalysis({
        zipCode: data.zipCode,
        itemCount: data.items.length,
        totalInsuranceOffer,
        totalFMV,
        categories: data.items.map(i => i.category)
      });

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
        highContrast: z.number().optional(),
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
          quotedPrice: z.number(),
          fmvPrice: z.number(),
          variancePct: z.number(),
          fromOcr: z.number().optional(),
        })),
      }).parse(req.body);

      const { lineItems, ...claimInfo } = claimData;
      const claim = await storage.createClaim(claimInfo);

      // Add all line items
      const addedLineItems = await Promise.all(
        lineItems.map(item =>
          storage.addClaimLineItem({ ...item, claimId: claim.id })
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

  const httpServer = createServer(app);
  return httpServer;
}
