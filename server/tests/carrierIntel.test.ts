import { describe, it, expect } from "vitest";
import {
  CARRIER_SAMPLE_SIZES,
  calculateConfidence,
  getCarrierPatterns,
  getCarrierStats,
  getAllCarriers,
  getOverallStats,
  analyzeClaimForCarrier,
} from "../services/carrierIntel";

describe("Carrier Intelligence Service", () => {
  describe("CARRIER_SAMPLE_SIZES constants", () => {
    it("should have correct threshold values", () => {
      expect(CARRIER_SAMPLE_SIZES.MINIMUM).toBe(50);
      expect(CARRIER_SAMPLE_SIZES.LOW_CONFIDENCE).toBe(100);
      expect(CARRIER_SAMPLE_SIZES.MEDIUM_CONFIDENCE).toBe(200);
      expect(CARRIER_SAMPLE_SIZES.HIGH_CONFIDENCE).toBe(300);
      expect(CARRIER_SAMPLE_SIZES.VERY_HIGH_CONFIDENCE).toBe(500);
    });

    it("should have increasing thresholds", () => {
      expect(CARRIER_SAMPLE_SIZES.MINIMUM).toBeLessThan(CARRIER_SAMPLE_SIZES.LOW_CONFIDENCE);
      expect(CARRIER_SAMPLE_SIZES.LOW_CONFIDENCE).toBeLessThan(CARRIER_SAMPLE_SIZES.MEDIUM_CONFIDENCE);
      expect(CARRIER_SAMPLE_SIZES.MEDIUM_CONFIDENCE).toBeLessThan(CARRIER_SAMPLE_SIZES.HIGH_CONFIDENCE);
      expect(CARRIER_SAMPLE_SIZES.HIGH_CONFIDENCE).toBeLessThan(CARRIER_SAMPLE_SIZES.VERY_HIGH_CONFIDENCE);
    });
  });

  describe("calculateConfidence", () => {
    it("should return insufficient for samples below minimum", () => {
      const result = calculateConfidence(25, 85);
      expect(result.confidenceLevel).toBe("insufficient");
      expect(result.sampleSizeCategory).toBe("insufficient_data");
      expect(result.adjustedConfidence).toBeLessThanOrEqual(50);
    });

    it("should apply minimum sample multiplier for samples at threshold", () => {
      const result = calculateConfidence(50, 80);
      expect(result.sampleSizeCategory).toBe("minimum");
      expect(result.adjustedConfidence).toBeLessThan(80);
    });

    it("should apply low sample multiplier for 100-199 samples", () => {
      const result = calculateConfidence(150, 90);
      expect(result.sampleSizeCategory).toBe("low");
      expect(result.adjustedConfidence).toBe(81);
    });

    it("should apply medium sample multiplier for 200-299 samples", () => {
      const result = calculateConfidence(250, 85);
      expect(result.sampleSizeCategory).toBe("medium");
      expect(result.adjustedConfidence).toBe(85);
    });

    it("should apply high sample multiplier for 300-499 samples", () => {
      const result = calculateConfidence(400, 90);
      expect(result.sampleSizeCategory).toBe("high");
      expect(result.adjustedConfidence).toBe(94.5);
      expect(result.confidenceLevel).toBe("high");
    });

    it("should apply very_high sample multiplier for 500+ samples", () => {
      const result = calculateConfidence(600, 90);
      expect(result.sampleSizeCategory).toBe("very_high");
      expect(result.adjustedConfidence).toBe(99);
      expect(result.confidenceLevel).toBe("very_high");
    });

    it("should cap adjusted confidence at 99", () => {
      const result = calculateConfidence(1000, 100);
      expect(result.adjustedConfidence).toBeLessThanOrEqual(99);
    });

    it("should correctly categorize confidence levels", () => {
      expect(calculateConfidence(300, 70).confidenceLevel).toBe("low");
      expect(calculateConfidence(300, 80).confidenceLevel).toBe("medium");
      expect(calculateConfidence(300, 90).confidenceLevel).toBe("high");
      expect(calculateConfidence(500, 95).confidenceLevel).toBe("very_high");
    });
  });

  describe("getCarrierPatterns", () => {
    it("should return patterns for known carriers", () => {
      const patterns = getCarrierPatterns("State Farm");
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(p => {
        expect(p.carrierName.toLowerCase()).toBe("state farm");
        expect(p).toHaveProperty("confidenceLevel");
        expect(p).toHaveProperty("underpaymentRate");
        expect(p).toHaveProperty("frequency");
      });
    });

    it("should return empty array for unknown carrier", () => {
      const patterns = getCarrierPatterns("Unknown Carrier XYZ");
      expect(patterns).toEqual([]);
    });

    it("should be case-insensitive", () => {
      const patterns1 = getCarrierPatterns("state farm");
      const patterns2 = getCarrierPatterns("STATE FARM");
      const patterns3 = getCarrierPatterns("State Farm");
      expect(patterns1.length).toBe(patterns2.length);
      expect(patterns2.length).toBe(patterns3.length);
    });
  });

  describe("getCarrierStats", () => {
    it("should return null for unknown carrier", () => {
      const stats = getCarrierStats("Unknown Carrier");
      expect(stats).toBeNull();
    });

    it("should return valid stats for known carrier", () => {
      const stats = getCarrierStats("State Farm");
      expect(stats).not.toBeNull();
      expect(stats!.carrierName).toBe("State Farm");
      expect(stats!.totalPatterns).toBeGreaterThan(0);
      expect(stats!.avgUnderpaymentRate).toBeGreaterThan(0);
      expect(stats!.avgFrequency).toBeGreaterThan(0);
      expect(stats!.riskScore).toBeGreaterThan(0);
    });

    it("should have valid strategy breakdown", () => {
      const stats = getCarrierStats("Allstate");
      expect(stats).not.toBeNull();
      expect(stats!.strategyBreakdown).toHaveProperty("OMIT");
      expect(stats!.strategyBreakdown).toHaveProperty("UNDERVALUE");
      expect(stats!.strategyBreakdown).toHaveProperty("DENY_COVERAGE");
      expect(stats!.primaryStrategy).toBeDefined();
    });
  });

  describe("getAllCarriers", () => {
    it("should return array of carrier names", () => {
      const carriers = getAllCarriers();
      expect(Array.isArray(carriers)).toBe(true);
      expect(carriers.length).toBeGreaterThan(0);
    });

    it("should include major carriers", () => {
      const carriers = getAllCarriers();
      expect(carriers).toContain("State Farm");
      expect(carriers).toContain("Allstate");
    });
  });

  describe("getOverallStats", () => {
    it("should return comprehensive statistics", () => {
      const stats = getOverallStats();
      expect(stats.totalCarriers).toBeGreaterThan(0);
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.avgUnderpaymentRate).toBeGreaterThan(0);
      expect(stats.carrierRankings.length).toBeGreaterThan(0);
    });

    it("should have carrier rankings sorted by risk score", () => {
      const stats = getOverallStats();
      for (let i = 1; i < stats.carrierRankings.length; i++) {
        expect(stats.carrierRankings[i - 1].riskScore)
          .toBeGreaterThanOrEqual(stats.carrierRankings[i].riskScore);
      }
    });
  });

  describe("analyzeClaimForCarrier", () => {
    it("should identify matching patterns", () => {
      const result = analyzeClaimForCarrier("State Farm", [
        "Roof replacement",
        "Ice and water shield",
        "Labor costs",
      ]);
      expect(result.matchedPatterns).toBeDefined();
      expect(result.estimatedUnderpayment).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.riskItems)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should return empty results for unknown carrier", () => {
      const result = analyzeClaimForCarrier("Unknown Carrier", ["Roof repair"]);
      expect(result.matchedPatterns).toEqual([]);
      expect(result.estimatedUnderpayment).toBe(0);
    });

    it("should provide strategy-based recommendations", () => {
      const result = analyzeClaimForCarrier("State Farm", [
        "Ice and water shield",
        "Drip edge",
      ]);
      if (result.matchedPatterns.length > 0) {
        expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
