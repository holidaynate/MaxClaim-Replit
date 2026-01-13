import { db } from "../db";
import { carrierTrends } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { CARRIER_TRENDS_DATA } from "../seeds/carrierTrends";

export const CARRIER_SAMPLE_SIZES = {
  MINIMUM: 50,
  LOW_CONFIDENCE: 100,
  MEDIUM_CONFIDENCE: 200,
  HIGH_CONFIDENCE: 300,
  VERY_HIGH_CONFIDENCE: 500,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  70: "low",
  80: "medium",
  90: "high",
  95: "very_high",
} as const;

export type ConfidenceLevel = "insufficient" | "low" | "medium" | "high" | "very_high";
export type StrategyType = "OMIT" | "UNDERVALUE" | "DENY_COVERAGE" | "DENY_MODIFIER" | "ZERO_COST";

export interface CarrierPattern {
  carrierName: string;
  lineItemDescription: string;
  underpaymentRate: number;
  frequency: number;
  typicalGaps: string[];
  commonStrategy: StrategyType;
  historicalCount: number;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
}

export interface CarrierStats {
  carrierName: string;
  totalPatterns: number;
  avgUnderpaymentRate: number;
  avgFrequency: number;
  avgConfidence: number;
  primaryStrategy: StrategyType;
  strategyBreakdown: Record<StrategyType, number>;
  totalHistoricalClaims: number;
  riskScore: number;
}

export interface OverallStats {
  totalCarriers: number;
  totalPatterns: number;
  avgUnderpaymentRate: number;
  avgFrequency: number;
  avgConfidence: number;
  totalHistoricalClaims: number;
  carrierRankings: Array<{
    carrier: string;
    riskScore: number;
    avgUnderpayment: number;
  }>;
  strategyPrevalence: Record<StrategyType, number>;
}

export function calculateConfidence(historicalCount: number, baseConfidence: number): {
  confidenceLevel: ConfidenceLevel;
  adjustedConfidence: number;
  sampleSizeCategory: string;
} {
  if (historicalCount < CARRIER_SAMPLE_SIZES.MINIMUM) {
    return {
      confidenceLevel: "insufficient",
      adjustedConfidence: Math.min(baseConfidence * 0.5, 50),
      sampleSizeCategory: "insufficient_data",
    };
  }
  
  let sampleMultiplier = 1.0;
  let sampleSizeCategory = "minimum";
  
  if (historicalCount >= CARRIER_SAMPLE_SIZES.VERY_HIGH_CONFIDENCE) {
    sampleMultiplier = 1.1;
    sampleSizeCategory = "very_high";
  } else if (historicalCount >= CARRIER_SAMPLE_SIZES.HIGH_CONFIDENCE) {
    sampleMultiplier = 1.05;
    sampleSizeCategory = "high";
  } else if (historicalCount >= CARRIER_SAMPLE_SIZES.MEDIUM_CONFIDENCE) {
    sampleMultiplier = 1.0;
    sampleSizeCategory = "medium";
  } else if (historicalCount >= CARRIER_SAMPLE_SIZES.LOW_CONFIDENCE) {
    sampleMultiplier = 0.9;
    sampleSizeCategory = "low";
  } else {
    sampleMultiplier = 0.75;
    sampleSizeCategory = "minimum";
  }
  
  const adjustedConfidence = Math.min(baseConfidence * sampleMultiplier, 99);
  
  let confidenceLevel: ConfidenceLevel;
  if (adjustedConfidence >= 95) {
    confidenceLevel = "very_high";
  } else if (adjustedConfidence >= 90) {
    confidenceLevel = "high";
  } else if (adjustedConfidence >= 80) {
    confidenceLevel = "medium";
  } else if (adjustedConfidence >= 70) {
    confidenceLevel = "low";
  } else {
    confidenceLevel = "insufficient";
  }
  
  return {
    confidenceLevel,
    adjustedConfidence: Math.round(adjustedConfidence * 10) / 10,
    sampleSizeCategory,
  };
}

export function getCarrierPatterns(carrierName: string): CarrierPattern[] {
  return CARRIER_TRENDS_DATA
    .filter(t => t.carrierName.toLowerCase() === carrierName.toLowerCase())
    .map(t => {
      const { confidenceLevel } = calculateConfidence(t.historicalCount, t.confidence);
      return {
        ...t,
        confidenceLevel,
      };
    });
}

export async function getCarrierPatternsFromDB(carrierName: string): Promise<CarrierPattern[]> {
  const trends = await db.select()
    .from(carrierTrends)
    .where(sql`lower(carrier_name) = ${carrierName.toLowerCase()}`);
  
  return trends.map(t => {
    const { confidenceLevel } = calculateConfidence(t.historicalCount, t.confidence);
    return {
      carrierName: t.carrierName,
      lineItemDescription: t.lineItemDescription,
      underpaymentRate: t.underpaymentRate,
      frequency: t.frequency,
      typicalGaps: t.typicalGaps as string[],
      commonStrategy: t.commonStrategy as StrategyType,
      historicalCount: t.historicalCount,
      confidence: t.confidence,
      confidenceLevel,
    };
  });
}

export function getCarrierStats(carrierName: string): CarrierStats | null {
  const patterns = getCarrierPatterns(carrierName);
  
  if (patterns.length === 0) {
    return null;
  }
  
  const strategyBreakdown: Record<StrategyType, number> = {
    OMIT: 0,
    UNDERVALUE: 0,
    DENY_COVERAGE: 0,
    DENY_MODIFIER: 0,
    ZERO_COST: 0,
  };
  
  let totalUnderpayment = 0;
  let totalFrequency = 0;
  let totalConfidence = 0;
  let totalHistoricalClaims = 0;
  
  for (const p of patterns) {
    totalUnderpayment += Math.abs(p.underpaymentRate);
    totalFrequency += p.frequency;
    totalConfidence += p.confidence;
    totalHistoricalClaims += p.historicalCount;
    strategyBreakdown[p.commonStrategy]++;
  }
  
  const avgUnderpaymentRate = totalUnderpayment / patterns.length;
  const avgFrequency = totalFrequency / patterns.length;
  const avgConfidence = totalConfidence / patterns.length;
  
  const primaryStrategy = (Object.entries(strategyBreakdown) as [StrategyType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
  
  const riskScore = Math.round(
    (avgUnderpaymentRate * 0.4) + 
    (avgFrequency * 100 * 0.3) + 
    (patterns.length * 5 * 0.3)
  );
  
  return {
    carrierName,
    totalPatterns: patterns.length,
    avgUnderpaymentRate: Math.round(avgUnderpaymentRate * 10) / 10,
    avgFrequency: Math.round(avgFrequency * 100) / 100,
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    primaryStrategy,
    strategyBreakdown,
    totalHistoricalClaims,
    riskScore,
  };
}

export function getAllCarriers(): string[] {
  const carriers = new Set<string>();
  for (const trend of CARRIER_TRENDS_DATA) {
    carriers.add(trend.carrierName);
  }
  return Array.from(carriers);
}

export function getOverallStats(): OverallStats {
  const carriers = getAllCarriers();
  const carrierStatsList: CarrierStats[] = [];
  
  const strategyPrevalence: Record<StrategyType, number> = {
    OMIT: 0,
    UNDERVALUE: 0,
    DENY_COVERAGE: 0,
    DENY_MODIFIER: 0,
    ZERO_COST: 0,
  };
  
  let totalUnderpayment = 0;
  let totalFrequency = 0;
  let totalConfidence = 0;
  let totalHistoricalClaims = 0;
  
  for (const carrier of carriers) {
    const stats = getCarrierStats(carrier);
    if (stats) {
      carrierStatsList.push(stats);
      totalUnderpayment += stats.avgUnderpaymentRate;
      totalFrequency += stats.avgFrequency;
      totalConfidence += stats.avgConfidence;
      totalHistoricalClaims += stats.totalHistoricalClaims;
      
      for (const [strategy, count] of Object.entries(stats.strategyBreakdown)) {
        strategyPrevalence[strategy as StrategyType] += count;
      }
    }
  }
  
  const carrierRankings = carrierStatsList
    .map(s => ({
      carrier: s.carrierName,
      riskScore: s.riskScore,
      avgUnderpayment: s.avgUnderpaymentRate,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
  
  return {
    totalCarriers: carriers.length,
    totalPatterns: CARRIER_TRENDS_DATA.length,
    avgUnderpaymentRate: Math.round((totalUnderpayment / carriers.length) * 10) / 10,
    avgFrequency: Math.round((totalFrequency / carriers.length) * 100) / 100,
    avgConfidence: Math.round((totalConfidence / carriers.length) * 10) / 10,
    totalHistoricalClaims,
    carrierRankings,
    strategyPrevalence,
  };
}

export function analyzeClaimForCarrier(
  carrierName: string,
  lineItems: string[]
): {
  matchedPatterns: CarrierPattern[];
  estimatedUnderpayment: number;
  riskItems: string[];
  recommendations: string[];
} {
  const patterns = getCarrierPatterns(carrierName);
  const matchedPatterns: CarrierPattern[] = [];
  const riskItems: string[] = [];
  let estimatedUnderpayment = 0;
  
  for (const item of lineItems) {
    const itemLower = item.toLowerCase();
    for (const pattern of patterns) {
      if (
        itemLower.includes(pattern.lineItemDescription.toLowerCase()) ||
        pattern.typicalGaps.some(gap => itemLower.includes(gap.toLowerCase()))
      ) {
        matchedPatterns.push(pattern);
        estimatedUnderpayment += Math.abs(pattern.underpaymentRate);
        if (pattern.frequency > 0.5 || pattern.underpaymentRate < -30) {
          riskItems.push(item);
        }
      }
    }
  }
  
  const recommendations: string[] = [];
  
  if (matchedPatterns.some(p => p.commonStrategy === "OMIT")) {
    recommendations.push("Check for completely missing line items - this carrier frequently omits certain items");
  }
  if (matchedPatterns.some(p => p.commonStrategy === "UNDERVALUE")) {
    recommendations.push("Verify pricing against current market rates - undervaluation is common");
  }
  if (matchedPatterns.some(p => p.commonStrategy === "DENY_MODIFIER")) {
    recommendations.push("Ensure labor modifiers for steep pitch, access difficulty are included");
  }
  if (matchedPatterns.some(p => p.commonStrategy === "ZERO_COST")) {
    recommendations.push("Confirm taxes and permits are not zeroed out");
  }
  
  return {
    matchedPatterns,
    estimatedUnderpayment,
    riskItems,
    recommendations,
  };
}

export const carrierIntel = {
  CARRIER_SAMPLE_SIZES,
  CONFIDENCE_THRESHOLDS,
  calculateConfidence,
  getCarrierPatterns,
  getCarrierPatternsFromDB,
  getCarrierStats,
  getAllCarriers,
  getOverallStats,
  analyzeClaimForCarrier,
};
