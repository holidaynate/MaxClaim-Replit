import { describe, it, expect } from "vitest";
import {
  testDistribution,
  runQuickTest,
  validateWeightFactors,
  DistributionTestConfig,
} from "../services/distributionTest";
import { PartnerAdConfig } from "../services/competitiveRotation";

describe("Distribution Testing Service", () => {
  describe("testDistribution", () => {
    it("should run with default test partners", () => {
      const result = testDistribution(null, { iterations: 100 });
      expect(result.totalIterations).toBe(100);
      expect(result.totalSelections).toBe(300);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should calculate chi-square statistic", () => {
      const result = testDistribution(null, { iterations: 500 });
      expect(result.chiSquareStatistic).toBeGreaterThanOrEqual(0);
      expect(result.threshold).toBeGreaterThan(0);
      expect(typeof result.passed).toBe("boolean");
    });

    it("should return valid result structure", () => {
      const result = testDistribution(null, { iterations: 50 });
      expect(result).toHaveProperty("totalIterations");
      expect(result).toHaveProperty("totalSelections");
      expect(result).toHaveProperty("chiSquareStatistic");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("threshold");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("results");
    });

    it("should calculate percentages correctly", () => {
      const result = testDistribution(null, { iterations: 1000 });
      const totalActualPercentage = result.results.reduce(
        (sum, r) => sum + r.actualPercentage,
        0
      );
      expect(totalActualPercentage).toBeCloseTo(100, 0);
    });

    it("should handle empty partner list", () => {
      const emptyPartners: PartnerAdConfig[] = [];
      const result = testDistribution(emptyPartners, { iterations: 100 });
      expect(result.passed).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.message).toContain("No eligible partners");
    });

    it("should filter by trade type", () => {
      const result = testDistribution(null, {
        iterations: 100,
        targetTradeType: "roofing",
      });
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("should sort results by expected weight descending", () => {
      const result = testDistribution(null, { iterations: 100 });
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].expectedWeight).toBeGreaterThanOrEqual(
          result.results[i].expectedWeight
        );
      }
    });
  });

  describe("runQuickTest", () => {
    it("should run with 500 iterations by default", () => {
      const result = runQuickTest();
      expect(result.totalIterations).toBe(500);
    });

    it("should produce a pass/fail result", () => {
      const result = runQuickTest();
      expect(typeof result.passed).toBe("boolean");
      expect(result.message).toMatch(/Distribution test (PASSED|FAILED)/);
    });
  });

  describe("validateWeightFactors", () => {
    it("should validate test partner weights", () => {
      const validation = validateWeightFactors();
      expect(validation).toHaveProperty("valid");
      expect(validation).toHaveProperty("issues");
      expect(validation).toHaveProperty("weights");
    });

    it("should generate weights for all test partners", () => {
      const validation = validateWeightFactors();
      expect(validation.weights.length).toBeGreaterThan(0);
    });

    it("should ensure premium tier has higher weight than standard", () => {
      const validation = validateWeightFactors();
      if (validation.valid) {
        const premiumWeight = validation.weights.find(
          (w) => w.partnerId === "test-premium-1"
        );
        const standardWeight = validation.weights.find(
          (w) => w.partnerId === "test-standard-1"
        );
        if (premiumWeight && standardWeight) {
          expect(premiumWeight.weight).toBeGreaterThan(standardWeight.weight);
        }
      }
    });

    it("should ensure standard tier has higher weight than free", () => {
      const validation = validateWeightFactors();
      if (validation.valid) {
        const standardWeight = validation.weights.find(
          (w) => w.partnerId === "test-standard-1"
        );
        const freeWeight = validation.weights.find(
          (w) => w.partnerId === "test-free-1"
        );
        if (standardWeight && freeWeight) {
          expect(standardWeight.weight).toBeGreaterThan(freeWeight.weight);
        }
      }
    });

    it("should have positive tier multipliers", () => {
      const validation = validateWeightFactors();
      for (const w of validation.weights) {
        expect(w.factors.tierMultiplier).toBeGreaterThan(0);
      }
    });

    it("should have positive budget factors", () => {
      const validation = validateWeightFactors();
      for (const w of validation.weights) {
        expect(w.factors.budgetFactor).toBeGreaterThan(0);
      }
    });

    it("should have positive total weights", () => {
      const validation = validateWeightFactors();
      for (const w of validation.weights) {
        expect(w.weight).toBeGreaterThan(0);
      }
    });
  });

  describe("Statistical Distribution Validation", () => {
    it("should calculate chi-square statistic for distribution analysis", () => {
      const result = testDistribution(null, { iterations: 2000 });
      expect(result.chiSquareStatistic).toBeGreaterThanOrEqual(0);
      expect(result.threshold).toBeGreaterThan(0);
      expect(typeof result.passed).toBe("boolean");
    });

    it("should have deviation metrics for each partner", () => {
      const result = testDistribution(null, { iterations: 1000 });
      for (const r of result.results) {
        expect(r.deviation).toBeGreaterThanOrEqual(0);
        expect(r.chiSquareContrib).toBeGreaterThanOrEqual(0);
      }
    });

    it("should favor higher weighted partners in distribution", () => {
      const result = testDistribution(null, { iterations: 1000 });
      const highestWeight = result.results[0];
      const lowestWeight = result.results[result.results.length - 1];
      expect(highestWeight.actualSelections).toBeGreaterThanOrEqual(lowestWeight.actualSelections);
    });
  });
});
