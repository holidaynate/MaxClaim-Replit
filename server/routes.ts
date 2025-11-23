import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeClaimItem } from "./pricing-data";
import { z } from "zod";

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
  // Analyze claim and calculate FMV
  app.post("/api/claims/analyze", async (req, res) => {
    try {
      const data = claimAnalysisSchema.parse(req.body);
      
      const results = data.items.map(item => {
        const analysis = analyzeClaimItem(
          item.category,
          item.description,
          item.quantity,
          item.quotedPrice,
          data.zipCode
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

  const httpServer = createServer(app);
  return httpServer;
}
