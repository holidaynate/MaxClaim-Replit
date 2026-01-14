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

export type TrendClassification = "PROBLEMATIC" | "UNDERPAYS" | "FAIR" | "GENEROUS";
export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

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
  trendClassification: TrendClassification;
}

export interface CarrierInsight {
  severity: SeverityLevel;
  variance: number;
  percentageUnderpayment: number;
  message: string;
  recommendedAction: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  sampleSize: number;
  carrier: string;
  item: string;
  pattern: CarrierPattern | null;
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
  
  const trendClassification = getTrendClassification(avgUnderpaymentRate);
  
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
    trendClassification,
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

/**
 * Get trend classification based on average underpayment rate
 */
export function getTrendClassification(avgUnderpaymentRate: number): TrendClassification {
  if (avgUnderpaymentRate > 25) {
    return "PROBLEMATIC";
  } else if (avgUnderpaymentRate > 15) {
    return "UNDERPAYS";
  } else if (avgUnderpaymentRate < 5) {
    return "GENEROUS";
  }
  return "FAIR";
}

/**
 * Get severity level based on underpayment variance
 */
export function getSeverityLevel(variance: number): SeverityLevel {
  const absVariance = Math.abs(variance);
  if (absVariance >= 50) {
    return "CRITICAL";
  } else if (absVariance >= 25) {
    return "HIGH";
  } else if (absVariance >= 10) {
    return "MEDIUM";
  } else if (absVariance > 0) {
    return "LOW";
  }
  return "NONE";
}

/**
 * Generate user-friendly warning message with emoji indicators
 */
export function generateWarningMessage(
  carrier: string,
  item: string,
  variance: number,
  severity: SeverityLevel
): string {
  const percentage = Math.abs(variance).toFixed(0);

  switch (severity) {
    case "CRITICAL":
      return `CRITICAL: ${carrier} historically underpays "${item}" by ${percentage}%. This is a major red flag. Include extensive documentation, contractor quotes, and photos.`;
    case "HIGH":
      return `HIGH RISK: Historical data shows ${carrier} underpays "${item}" by ${percentage}%. Ensure detailed photographic evidence and labor documentation are included.`;
    case "MEDIUM":
      return `MEDIUM RISK: ${carrier} typically underpays "${item}" by ${percentage}%. Provide additional documentation to support your claim.`;
    case "LOW":
      return `Note: ${carrier} sometimes underpays "${item}" by ${percentage}%. Monitor this during negotiations.`;
    default:
      return `No historical underpayment trend for this item from ${carrier}.`;
  }
}

/**
 * Generate recommended action based on severity level
 */
export function generateRecommendation(severity: SeverityLevel, item: string): string {
  switch (severity) {
    case "CRITICAL":
      return `PRIORITY ACTION: Gather extensive documentation for "${item}" - photos from multiple angles, contractor estimates, labor rates. Consider hiring a public adjuster or attorney.`;
    case "HIGH":
      return `RECOMMENDED: Provide detailed photographic evidence of "${item}" and current local market rates. Have a professional contractor review for accuracy.`;
    case "MEDIUM":
      return `Recommended: Include photos and any contractor quotes for "${item}" to strengthen your claim.`;
    case "LOW":
      return `Monitor: Include standard documentation for "${item}" as part of normal claim process.`;
    default:
      return `Standard documentation for "${item}" should be sufficient.`;
  }
}

const STOP_WORDS = new Set([
  "the", "and", "for", "per", "with", "from", "this", "that", "are", "was", "were"
]);

const ROOFING_ABBREVIATIONS: Record<string, string[]> = {
  "sq": ["square", "squares"],
  "lf": ["linear", "foot", "feet"],
  "sf": ["square", "foot", "feet"],
  "hv": ["hvac", "heating", "ventilation"],
  "arch": ["architectural", "architecture"],
  "comp": ["composition", "composite"],
  "asph": ["asphalt"],
  "shgl": ["shingle", "shingles"],
  "ins": ["install", "installation", "insurance"],
  "rem": ["remove", "removal"],
  "rep": ["replace", "replacement"],
  "flsh": ["flash", "flashing"],
  "mod": ["modifier", "modification"],
};

/**
 * Normalize a string for fuzzy matching
 * Removes special characters, converts to lowercase, extracts key tokens
 * Keeps important abbreviations used in roofing/construction trades
 */
function normalizeForMatching(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
  
  const expandedTokens: string[] = [];
  for (const token of tokens) {
    expandedTokens.push(token);
    const expansions = ROOFING_ABBREVIATIONS[token];
    if (expansions) {
      expandedTokens.push(...expansions);
    }
  }
  
  return expandedTokens;
}

/**
 * Calculate match score using Dice coefficient
 * More robust for comparing token sets of different sizes
 * Returns a score from 0 to 1 (higher = better match)
 */
function calculateMatchScore(itemTokens: string[], patternTokens: string[]): number {
  if (patternTokens.length === 0 || itemTokens.length === 0) return 0;
  
  let matches = 0;
  
  for (const itemToken of itemTokens) {
    for (const patternToken of patternTokens) {
      if (
        itemToken === patternToken ||
        (itemToken.length >= 3 && patternToken.includes(itemToken)) ||
        (patternToken.length >= 3 && itemToken.includes(patternToken))
      ) {
        matches++;
        break;
      }
    }
  }
  
  const diceCoefficient = (2 * matches) / (itemTokens.length + patternTokens.length);
  return diceCoefficient;
}

/**
 * Get carrier intelligence for a specific line item
 * Returns severity, warning message, recommendations, and confidence
 * Uses fuzzy matching to handle variations in item naming
 */
export function getCarrierInsight(carrierName: string, itemName: string): CarrierInsight | null {
  if (!carrierName || typeof carrierName !== "string") {
    console.warn("[carrierIntel] Invalid carrier name:", carrierName);
    return null;
  }

  if (!itemName || typeof itemName !== "string") {
    console.warn("[carrierIntel] Invalid item name:", itemName);
    return null;
  }

  const patterns = getCarrierPatterns(carrierName);
  
  if (patterns.length === 0) {
    return null;
  }

  const itemTokens = normalizeForMatching(itemName);
  let bestMatch: CarrierPattern | null = null;
  let bestScore = 0;
  const MATCH_THRESHOLD = 0.35;

  for (const pattern of patterns) {
    const patternTokens = normalizeForMatching(pattern.lineItemDescription);
    const descriptionScore = calculateMatchScore(itemTokens, patternTokens);
    
    let gapScore = 0;
    for (const gap of pattern.typicalGaps) {
      const gapTokens = normalizeForMatching(gap);
      const score = calculateMatchScore(itemTokens, gapTokens);
      if (score > gapScore) {
        gapScore = score;
      }
    }
    
    const finalScore = Math.max(descriptionScore, gapScore);
    
    if (finalScore > bestScore && finalScore >= MATCH_THRESHOLD) {
      bestScore = finalScore;
      bestMatch = pattern;
    }
  }

  if (!bestMatch) {
    return null;
  }

  const variance = bestMatch.underpaymentRate;
  const severity = getSeverityLevel(variance);
  const { confidenceLevel, adjustedConfidence } = calculateConfidence(
    bestMatch.historicalCount,
    bestMatch.confidence
  );

  return {
    severity,
    variance,
    percentageUnderpayment: Math.abs(variance),
    message: generateWarningMessage(carrierName, itemName, variance, severity),
    recommendedAction: generateRecommendation(severity, itemName),
    confidence: adjustedConfidence,
    confidenceLevel,
    sampleSize: bestMatch.historicalCount,
    carrier: carrierName,
    item: itemName,
    pattern: bestMatch,
  };
}

/**
 * Update carrier trends from audit results using weighted average
 * This allows the system to learn from real audit data over time
 */
export async function updateTrendsFromAudit(auditResult: {
  carrier: string;
  itemName: string;
  claimPrice: number;
  marketPrice: number;
}): Promise<{ success: boolean; newVariance?: number; sampleSize?: number }> {
  const { carrier, itemName, claimPrice, marketPrice } = auditResult;

  if (!carrier || !itemName || marketPrice <= 0) {
    console.warn("[carrierIntel] Invalid audit result for trend update");
    return { success: false };
  }

  if (typeof claimPrice !== "number" || typeof marketPrice !== "number") {
    console.warn("[carrierIntel] Invalid price values in audit result");
    return { success: false };
  }

  const newVariance = ((claimPrice - marketPrice) / marketPrice) * 100;

  try {
    const existing = await db.select()
      .from(carrierTrends)
      .where(sql`lower(carrier_name) = ${carrier.toLowerCase()} AND lower(line_item_description) = ${itemName.toLowerCase()}`)
      .limit(1);

    if (existing.length > 0) {
      const trend = existing[0];
      const existingVariance = trend.underpaymentRate;
      const existingSampleSize = trend.historicalCount;
      
      const newSampleSize = existingSampleSize + 1;
      const weightedVariance = (existingVariance * existingSampleSize + newVariance) / newSampleSize;
      
      await db.update(carrierTrends)
        .set({
          underpaymentRate: Math.round(weightedVariance * 100) / 100,
          historicalCount: newSampleSize,
          confidence: Math.min(99, trend.confidence + 0.1),
        })
        .where(eq(carrierTrends.id, trend.id));

      console.log(
        `[carrierIntel] Updated trend for ${carrier}/"${itemName}": ` +
        `new variance = ${weightedVariance.toFixed(2)}%, sample size = ${newSampleSize}`
      );

      return { 
        success: true, 
        newVariance: Math.round(weightedVariance * 100) / 100, 
        sampleSize: newSampleSize 
      };
    } else {
      await db.insert(carrierTrends).values({
        carrierName: carrier,
        lineItemDescription: itemName,
        underpaymentRate: Math.round(newVariance * 100) / 100,
        frequency: 0.1,
        typicalGaps: [itemName],
        commonStrategy: newVariance < -20 ? "UNDERVALUE" : "OMIT",
        historicalCount: 1,
        confidence: 50,
      });

      console.log(
        `[carrierIntel] Created new trend for ${carrier}/"${itemName}": ` +
        `variance = ${newVariance.toFixed(2)}%`
      );

      return { 
        success: true, 
        newVariance: Math.round(newVariance * 100) / 100, 
        sampleSize: 1 
      };
    }
  } catch (error) {
    console.error("[carrierIntel] Failed to update trends from audit:", error);
    return { success: false };
  }
}

/**
 * Get multiple carrier insights for a list of items
 * Useful for batch processing during claim audits
 */
export function getCarrierInsights(
  carrierName: string,
  items: string[]
): {
  insights: CarrierInsight[];
  highRiskCount: number;
  totalEstimatedUnderpayment: number;
  overallRecommendation: string;
} {
  const insights: CarrierInsight[] = [];
  let highRiskCount = 0;
  let totalUnderpayment = 0;

  for (const item of items) {
    const insight = getCarrierInsight(carrierName, item);
    if (insight) {
      insights.push(insight);
      totalUnderpayment += insight.percentageUnderpayment;
      if (insight.severity === "CRITICAL" || insight.severity === "HIGH") {
        highRiskCount++;
      }
    }
  }

  let overallRecommendation = "Standard claim documentation should be sufficient.";
  if (highRiskCount >= 3) {
    overallRecommendation = "ALERT: Multiple high-risk items detected. Consider engaging a public adjuster or attorney to ensure fair compensation.";
  } else if (highRiskCount >= 1) {
    overallRecommendation = "Some items flagged as high risk. Ensure thorough documentation and consider professional review.";
  } else if (insights.length > 0) {
    overallRecommendation = "Some underpayment patterns detected. Provide supporting documentation for flagged items.";
  }

  return {
    insights,
    highRiskCount,
    totalEstimatedUnderpayment: Math.round(totalUnderpayment * 10) / 10,
    overallRecommendation,
  };
}

/**
 * Run self-tests to verify module functionality
 */
export function runCarrierIntelSelfTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const patterns = getCarrierPatterns("State Farm");
  if (patterns.length > 0) {
    passed++;
    results.push(`Test 1 PASSED: Found ${patterns.length} patterns for State Farm`);
  } else {
    failed++;
    results.push("Test 1 FAILED: No patterns found for State Farm");
  }

  const unknownPatterns = getCarrierPatterns("Unknown Carrier XYZ");
  if (unknownPatterns.length === 0) {
    passed++;
    results.push("Test 2 PASSED: Correctly returned empty for unknown carrier");
  } else {
    failed++;
    results.push("Test 2 FAILED: Should return empty for unknown carrier");
  }

  const severityCritical = getSeverityLevel(-55);
  const severityHigh = getSeverityLevel(-30);
  const severityMedium = getSeverityLevel(-15);
  const severityLow = getSeverityLevel(-5);
  if (
    severityCritical === "CRITICAL" &&
    severityHigh === "HIGH" &&
    severityMedium === "MEDIUM" &&
    severityLow === "LOW"
  ) {
    passed++;
    results.push("Test 3 PASSED: Severity levels calculated correctly");
  } else {
    failed++;
    results.push("Test 3 FAILED: Severity level calculation incorrect");
  }

  const stats = getCarrierStats("State Farm");
  if (stats && stats.carrierName === "State Farm" && stats.totalPatterns > 0 && stats.trendClassification) {
    passed++;
    results.push(`Test 4 PASSED: Carrier stats calculated (${stats.totalPatterns} patterns, ${stats.trendClassification} trend)`);
  } else {
    failed++;
    results.push("Test 4 FAILED: Failed to calculate carrier stats");
  }

  const trendProblematic = getTrendClassification(30);
  const trendUnderpays = getTrendClassification(20);
  const trendFair = getTrendClassification(10);
  const trendGenerous = getTrendClassification(3);
  if (
    trendProblematic === "PROBLEMATIC" &&
    trendUnderpays === "UNDERPAYS" &&
    trendFair === "FAIR" &&
    trendGenerous === "GENEROUS"
  ) {
    passed++;
    results.push("Test 5 PASSED: Trend classifications calculated correctly");
  } else {
    failed++;
    results.push("Test 5 FAILED: Trend classification calculation incorrect");
  }

  const fuzzyTestCases = [
    { carrier: "State Farm", item: "Roof Tear Off SQ", shouldMatch: true },
    { carrier: "State Farm", item: "arch shingle tear off", shouldMatch: true },
    { carrier: "State Farm", item: "ice water shield", shouldMatch: true },
    { carrier: "State Farm", item: "steep pitch charge", shouldMatch: true },
    { carrier: "State Farm", item: "valley flashing installation", shouldMatch: true },
    { carrier: "State Farm", item: "completely unrelated garbage item xyz", shouldMatch: false },
  ];

  let fuzzyPassed = 0;
  let fuzzyFailed = 0;
  for (const testCase of fuzzyTestCases) {
    const insight = getCarrierInsight(testCase.carrier, testCase.item);
    const matched = insight !== null;
    if (matched === testCase.shouldMatch) {
      fuzzyPassed++;
    } else {
      fuzzyFailed++;
      results.push(`Fuzzy test FAILED: "${testCase.item}" expected ${testCase.shouldMatch ? "match" : "no match"}, got ${matched ? "match" : "no match"}`);
    }
  }

  if (fuzzyFailed === 0) {
    passed++;
    results.push(`Test 6 PASSED: All ${fuzzyPassed} fuzzy matching tests passed`);
  } else {
    failed++;
    results.push(`Test 6 FAILED: ${fuzzyFailed}/${fuzzyTestCases.length} fuzzy matching tests failed`);
  }

  console.log(`[carrierIntel] Self-tests: ${passed} passed, ${failed} failed`);
  return { passed, failed, results };
}

/**
 * Get a visual flag/emoji for severity level
 * Used in audit results display for quick identification
 */
export function getSeverityFlag(severity: SeverityLevel): string {
  switch (severity) {
    case "CRITICAL": return "[!!!]";
    case "HIGH": return "[!!]";
    case "MEDIUM": return "[!]";
    case "LOW": return "[-]";
    case "NONE": return "[ok]";
    default: return "";
  }
}

/**
 * Get CSS-friendly color for severity level
 * Returns color names suitable for Tailwind or standard CSS
 */
export function getSeverityColor(severity: SeverityLevel): {
  bg: string;
  text: string;
  border: string;
  tailwind: string;
} {
  switch (severity) {
    case "CRITICAL":
      return { bg: "#dc2626", text: "#ffffff", border: "#b91c1c", tailwind: "red-600" };
    case "HIGH":
      return { bg: "#ea580c", text: "#ffffff", border: "#c2410c", tailwind: "orange-600" };
    case "MEDIUM":
      return { bg: "#eab308", text: "#000000", border: "#ca8a04", tailwind: "yellow-500" };
    case "LOW":
      return { bg: "#22c55e", text: "#000000", border: "#16a34a", tailwind: "green-500" };
    case "NONE":
    default:
      return { bg: "#6b7280", text: "#ffffff", border: "#4b5563", tailwind: "gray-500" };
  }
}

/**
 * Get aggregate risk assessment for a batch of carrier insights
 * Returns overall risk level and actionable summary
 */
export function getAggregateRiskAssessment(insights: CarrierInsight[]): {
  overallRisk: SeverityLevel;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalVariance: number;
  priorityItems: string[];
  actionSummary: string;
} {
  let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;
  let totalVariance = 0;
  const priorityItems: string[] = [];

  for (const insight of insights) {
    totalVariance += Math.abs(insight.variance);
    switch (insight.severity) {
      case "CRITICAL":
        criticalCount++;
        priorityItems.push(insight.item);
        break;
      case "HIGH":
        highCount++;
        if (priorityItems.length < 5) priorityItems.push(insight.item);
        break;
      case "MEDIUM":
        mediumCount++;
        break;
      case "LOW":
        lowCount++;
        break;
    }
  }

  let overallRisk: SeverityLevel = "NONE";
  let actionSummary = "Standard documentation should be sufficient for this claim.";

  if (criticalCount >= 2 || (criticalCount >= 1 && highCount >= 2)) {
    overallRisk = "CRITICAL";
    actionSummary = "URGENT: Multiple critical underpayment patterns detected. Strongly consider engaging a public adjuster or insurance attorney before accepting settlement.";
  } else if (criticalCount >= 1 || highCount >= 3) {
    overallRisk = "HIGH";
    actionSummary = "ALERT: Significant underpayment risk detected. Gather detailed documentation and consider professional review of claim settlement.";
  } else if (highCount >= 1 || mediumCount >= 3) {
    overallRisk = "MEDIUM";
    actionSummary = "CAUTION: Some underpayment indicators present. Ensure thorough documentation with photos, receipts, and contractor estimates.";
  } else if (mediumCount >= 1 || lowCount >= 2) {
    overallRisk = "LOW";
    actionSummary = "Minor concerns noted. Standard documentation should suffice, but verify all line items match fair market values.";
  }

  return {
    overallRisk,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalVariance: Math.round(totalVariance * 10) / 10,
    priorityItems,
    actionSummary,
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
  getTrendClassification,
  getSeverityLevel,
  generateWarningMessage,
  generateRecommendation,
  getCarrierInsight,
  getCarrierInsights,
  updateTrendsFromAudit,
  runCarrierIntelSelfTests,
  getSeverityFlag,
  getSeverityColor,
  getAggregateRiskAssessment,
};
