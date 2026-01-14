/**
 * MaxClaim Competitive Rotation Algorithm
 * Copyright (c) 2024 MaxClaim. All rights reserved.
 * 
 * Allocates ad placement priority based on budget, region, trade type, and demand level.
 * Implements weighted rotation with budget maximization before month-end.
 */

import { REGIONAL_DEMAND_DATA, getRegionDemand, getBaseCpcForTrade } from "../config/regionalDemand";

export interface PartnerAdConfig {
  partnerId: string;
  companyName: string;
  tradeType: string;
  tier: "free" | "standard" | "premium" | "build_your_own";
  monthlyBudget: number;
  budgetSpent: number;
  regions: string[];
  state: string;
  isTradeAssociation: boolean;
  status: "active" | "paused" | "exhausted";
  lastShownAt?: Date;
  totalImpressions: number;
  totalClicks: number;
}

export interface RotationWeight {
  partnerId: string;
  weight: number;
  factors: {
    tierMultiplier: number;
    budgetFactor: number;
    competitivePosition: number;
    demandBonus: number;
    disasterBonus: number;
    freshnessPenalty: number;
    tradeAssociationPenalty: number;
  };
  priority: number;
  estimatedCpc: number;
}

export interface PlacementResult {
  topPartners: RotationWeight[];
  totalEligible: number;
  region: string;
  tradeType: string;
  timestamp: Date;
}

const TIER_MULTIPLIERS: Record<string, number> = {
  premium: 4.0,
  standard: 2.0,
  build_your_own: 1.5,
  free: 0.5,
};

const TIME_DECAY_MINUTES = 15;
const MONTH_END_BUDGET_BOOST = 1.5;
const DISASTER_REGION_BOOST = 1.8;
const MAX_WEIGHT_CAP = 10.0;

export function calculateRotationWeights(
  partners: PartnerAdConfig[],
  targetRegion: string,
  targetState: string,
  targetTradeType: string | null,
  currentTime: Date = new Date()
): RotationWeight[] {
  const eligiblePartners = partners.filter(p => {
    if (p.status !== "active") return false;
    if (p.budgetSpent >= p.monthlyBudget && p.tier !== "free") return false;
    if (!p.regions.includes(targetRegion)) return false;
    if (p.state !== targetState) return false;
    if (targetTradeType && p.tradeType !== targetTradeType) return false;
    return true;
  });

  if (eligiblePartners.length === 0) {
    return [];
  }

  const regionDemand = getRegionDemand(targetState, targetRegion);
  const demandIndex = regionDemand?.demandIndex || 50;
  const hasDisaster = regionDemand?.disasterDeclaration || false;
  const competitorCount = regionDemand?.competitorCount || eligiblePartners.length;

  const totalBudget = eligiblePartners.reduce((sum, p) => sum + p.monthlyBudget, 0);
  const paidPartnerCount = eligiblePartners.filter(p => p.monthlyBudget > 0).length;
  const avgBudget = paidPartnerCount > 0 ? totalBudget / paidPartnerCount : 500;

  const dayOfMonth = currentTime.getDate();
  const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;
  const isMonthEnd = monthProgress > 0.85;

  const weights: RotationWeight[] = eligiblePartners.map(partner => {
    const tierMultiplier = TIER_MULTIPLIERS[partner.tier] || 1.0;
    
    let budgetFactor = 1.0;
    if (partner.monthlyBudget > 0 && avgBudget > 0) {
      const budgetRatio = partner.monthlyBudget / avgBudget;
      budgetFactor = Math.min(2.0, Math.max(0.3, budgetRatio));
      
      const remainingBudgetRatio = (partner.monthlyBudget - partner.budgetSpent) / partner.monthlyBudget;
      if (isMonthEnd && remainingBudgetRatio > 0.3) {
        budgetFactor *= MONTH_END_BUDGET_BOOST;
      }
    } else {
      budgetFactor = 0.3;
    }
    
    let competitivePosition = 1.0;
    if (partner.monthlyBudget > 0 && avgBudget > 0 && competitorCount > 0) {
      competitivePosition = Math.min(2.0, 
        1.0 + (partner.monthlyBudget / (avgBudget * competitorCount)) * 0.5
      );
    }
    
    const demandBonus = demandIndex > 70 ? 1.3 : demandIndex > 50 ? 1.1 : 1.0;
    const disasterBonus = hasDisaster && partner.tier === "premium" ? DISASTER_REGION_BOOST : 
                          hasDisaster ? 1.2 : 1.0;
    
    let freshnessPenalty = 1.0;
    if (partner.lastShownAt) {
      const minutesSinceShown = (currentTime.getTime() - partner.lastShownAt.getTime()) / 60000;
      if (minutesSinceShown < TIME_DECAY_MINUTES) {
        freshnessPenalty = 0.5 + (minutesSinceShown / TIME_DECAY_MINUTES) * 0.5;
      }
    }
    
    const tradeAssociationPenalty = partner.isTradeAssociation ? 0.5 : 1.0;
    
    const rawWeight = 
      tierMultiplier * 
      budgetFactor * 
      competitivePosition * 
      demandBonus * 
      disasterBonus * 
      freshnessPenalty *
      tradeAssociationPenalty;
    
    const weight = Math.min(rawWeight, MAX_WEIGHT_CAP);
    
    const baseCpc = getBaseCpcForTrade(partner.tradeType);
    const regionMultiplier = regionDemand?.baseMultiplier || 1.0;
    const estimatedCpc = baseCpc * regionMultiplier * (competitorCount > 20 ? 1.2 : 1.0);

    return {
      partnerId: partner.partnerId,
      weight,
      factors: {
        tierMultiplier,
        budgetFactor,
        competitivePosition,
        demandBonus,
        disasterBonus,
        freshnessPenalty,
        tradeAssociationPenalty,
      },
      priority: 0,
      estimatedCpc: Math.round(estimatedCpc * 100) / 100,
    };
  });

  weights.sort((a, b) => b.weight - a.weight);
  
  weights.forEach((w, index) => {
    w.priority = index + 1;
  });

  return weights;
}

export function selectPartnersForPlacement(
  partners: PartnerAdConfig[],
  targetRegion: string,
  targetState: string,
  targetTradeType: string | null,
  maxResults: number = 5,
  currentTime: Date = new Date()
): PlacementResult {
  const weights = calculateRotationWeights(
    partners, 
    targetRegion, 
    targetState, 
    targetTradeType, 
    currentTime
  );

  const topPartners = weights.slice(0, maxResults);

  return {
    topPartners,
    totalEligible: weights.length,
    region: targetRegion,
    tradeType: targetTradeType || "all",
    timestamp: currentTime,
  };
}

export function weightedRandomSelect(
  weights: RotationWeight[],
  count: number = 1
): RotationWeight[] {
  if (weights.length === 0) return [];
  if (weights.length <= count) return [...weights];

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const selected: RotationWeight[] = [];
  const available = [...weights];

  for (let i = 0; i < count && available.length > 0; i++) {
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (let j = 0; j < available.length; j++) {
      cumulative += available[j].weight;
      if (random <= cumulative) {
        selected.push(available[j]);
        available.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

export function calculateBudgetPacing(
  partner: PartnerAdConfig,
  currentTime: Date = new Date()
): {
  isOnPace: boolean;
  spendRate: number;
  recommendedDailySpend: number;
  daysRemaining: number;
  projectedMonthEnd: number;
} {
  if (partner.monthlyBudget <= 0) {
    const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
    return {
      isOnPace: true,
      spendRate: 0,
      recommendedDailySpend: 0,
      daysRemaining: daysInMonth - currentTime.getDate(),
      projectedMonthEnd: 0,
    };
  }

  const dayOfMonth = currentTime.getDate();
  const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  
  const idealSpendRatio = dayOfMonth / daysInMonth;
  const actualSpendRatio = partner.budgetSpent / partner.monthlyBudget;
  
  const spendRate = idealSpendRatio > 0 ? actualSpendRatio / idealSpendRatio : 0;
  
  const budgetRemaining = partner.monthlyBudget - partner.budgetSpent;
  const recommendedDailySpend = daysRemaining > 0 ? budgetRemaining / daysRemaining : budgetRemaining;
  
  const currentDailyAvg = dayOfMonth > 0 ? partner.budgetSpent / dayOfMonth : 0;
  const projectedMonthEnd = partner.budgetSpent + (currentDailyAvg * daysRemaining);
  
  const isOnPace = spendRate >= 0.8 && spendRate <= 1.2;

  return {
    isOnPace,
    spendRate: Math.round(spendRate * 100) / 100,
    recommendedDailySpend: Math.round(recommendedDailySpend * 100) / 100,
    daysRemaining,
    projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
  };
}

export function getCompetitiveInsights(
  partners: PartnerAdConfig[],
  region: string,
  state: string
): {
  totalCompetitors: number;
  avgBudget: number;
  topTier: string;
  budgetRange: { min: number; max: number };
  tierDistribution: Record<string, number>;
} {
  const regionPartners = partners.filter(p => 
    p.regions.includes(region) && 
    p.state === state && 
    p.status === "active"
  );

  if (regionPartners.length === 0) {
    return {
      totalCompetitors: 0,
      avgBudget: 0,
      topTier: "none",
      budgetRange: { min: 0, max: 0 },
      tierDistribution: {},
    };
  }

  const budgets = regionPartners.map(p => p.monthlyBudget);
  const avgBudget = budgets.reduce((a, b) => a + b, 0) / budgets.length;
  
  const tierDistribution: Record<string, number> = {};
  regionPartners.forEach(p => {
    tierDistribution[p.tier] = (tierDistribution[p.tier] || 0) + 1;
  });

  const topTier = regionPartners.reduce((top, p) => {
    const tierOrder = { premium: 3, standard: 2, build_your_own: 1, free: 0 };
    return tierOrder[p.tier as keyof typeof tierOrder] > tierOrder[top.tier as keyof typeof tierOrder] ? p : top;
  }).tier;

  return {
    totalCompetitors: regionPartners.length,
    avgBudget: Math.round(avgBudget),
    topTier,
    budgetRange: { 
      min: Math.min(...budgets), 
      max: Math.max(...budgets) 
    },
    tierDistribution,
  };
}

/**
 * Test distribution of weighted random selection
 * Runs multiple iterations to verify weight distribution matches expectations
 * Useful for QA validation and debugging
 */
export function testDistribution(
  weights: RotationWeight[],
  iterations: number = 1000
): Record<string, { count: number; percentage: number; expectedPercentage: number }> {
  if (!Array.isArray(weights) || weights.length === 0) {
    return {};
  }

  const counts: Record<string, number> = {};
  weights.forEach(w => {
    counts[w.partnerId] = 0;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  for (let i = 0; i < iterations; i++) {
    const selected = weightedRandomSelect(weights, 1);
    if (selected.length > 0) {
      counts[selected[0].partnerId]++;
    }
  }

  const stats: Record<string, { count: number; percentage: number; expectedPercentage: number }> = {};
  
  weights.forEach(w => {
    const count = counts[w.partnerId];
    const percentage = Number(((count / iterations) * 100).toFixed(2));
    const expectedPercentage = Number(((w.weight / totalWeight) * 100).toFixed(2));
    
    stats[w.partnerId] = {
      count,
      percentage,
      expectedPercentage,
    };
  });

  return stats;
}

/**
 * Run self-tests to verify rotation algorithm functionality
 */
export function runRotationSelfTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const testPartners: PartnerAdConfig[] = [
    {
      partnerId: "test1",
      companyName: "Test Partner 1",
      tradeType: "Roofing",
      tier: "premium",
      monthlyBudget: 1000,
      budgetSpent: 100,
      regions: ["Gulf Coast"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 500,
      totalClicks: 50,
    },
    {
      partnerId: "test2",
      companyName: "Test Partner 2",
      tradeType: "Roofing",
      tier: "standard",
      monthlyBudget: 500,
      budgetSpent: 50,
      regions: ["Gulf Coast"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 300,
      totalClicks: 30,
    },
    {
      partnerId: "test3",
      companyName: "Test Partner 3",
      tradeType: "Roofing",
      tier: "free",
      monthlyBudget: 0,
      budgetSpent: 0,
      regions: ["Gulf Coast"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 100,
      totalClicks: 5,
    },
  ];

  const weights = calculateRotationWeights(testPartners, "Gulf Coast", "TX", "Roofing");
  if (weights.length === 3) {
    passed++;
    results.push(`Test 1 PASSED: Calculated weights for ${weights.length} partners`);
  } else {
    failed++;
    results.push(`Test 1 FAILED: Expected 3 weights, got ${weights.length}`);
  }

  if (weights.length > 0 && weights[0].partnerId === "test1") {
    passed++;
    results.push("Test 2 PASSED: Premium partner ranked first (highest weight)");
  } else {
    failed++;
    results.push("Test 2 FAILED: Premium partner should rank first");
  }

  const allCapped = weights.every(w => w.weight <= MAX_WEIGHT_CAP);
  if (allCapped) {
    passed++;
    results.push(`Test 3 PASSED: All weights capped at ${MAX_WEIGHT_CAP}`);
  } else {
    failed++;
    results.push(`Test 3 FAILED: Some weights exceed cap of ${MAX_WEIGHT_CAP}`);
  }

  const selected = weightedRandomSelect(weights, 2);
  if (selected.length === 2) {
    passed++;
    results.push("Test 4 PASSED: Weighted random select returns correct count");
  } else {
    failed++;
    results.push(`Test 4 FAILED: Expected 2 selections, got ${selected.length}`);
  }

  const ids = selected.map(s => s.partnerId);
  if (new Set(ids).size === ids.length) {
    passed++;
    results.push("Test 5 PASSED: No duplicate selections");
  } else {
    failed++;
    results.push("Test 5 FAILED: Found duplicate selections");
  }

  if (weights.length >= 2) {
    const distribution = testDistribution(weights, 1000);
    const test1Stats = distribution["test1"];
    const test3Stats = distribution["test3"];
    
    if (test1Stats && test3Stats && test1Stats.percentage > test3Stats.percentage) {
      passed++;
      results.push(`Test 6 PASSED: Premium partner selected more often (${test1Stats.percentage}% vs ${test3Stats.percentage}%)`);
    } else {
      failed++;
      results.push("Test 6 FAILED: Premium partner should be selected more often");
    }
  }

  const placement = selectPartnersForPlacement(testPartners, "Gulf Coast", "TX", "Roofing", 2);
  if (placement.topPartners.length === 2 && placement.totalEligible === 3) {
    passed++;
    results.push("Test 7 PASSED: Partner placement returns correct results");
  } else {
    failed++;
    results.push("Test 7 FAILED: Partner placement returned incorrect results");
  }

  console.log(`[competitiveRotation] Self-tests: ${passed} passed, ${failed} failed`);
  return { passed, failed, results };
}
