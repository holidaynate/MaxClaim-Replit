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
  const avgBudget = totalBudget / eligiblePartners.length;

  const dayOfMonth = currentTime.getDate();
  const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;
  const isMonthEnd = monthProgress > 0.85;

  const weights: RotationWeight[] = eligiblePartners.map(partner => {
    const tierMultiplier = TIER_MULTIPLIERS[partner.tier] || 1.0;
    
    const budgetRatio = partner.monthlyBudget / avgBudget;
    const remainingBudgetRatio = (partner.monthlyBudget - partner.budgetSpent) / partner.monthlyBudget;
    let budgetFactor = Math.min(2.0, Math.max(0.3, budgetRatio));
    
    if (isMonthEnd && remainingBudgetRatio > 0.3) {
      budgetFactor *= MONTH_END_BUDGET_BOOST;
    }
    
    const competitivePosition = Math.min(2.0, 
      1.0 + (partner.monthlyBudget / (avgBudget * competitorCount)) * 0.5
    );
    
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
    
    const weight = 
      tierMultiplier * 
      budgetFactor * 
      competitivePosition * 
      demandBonus * 
      disasterBonus * 
      freshnessPenalty *
      tradeAssociationPenalty;
    
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
  const dayOfMonth = currentTime.getDate();
  const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  
  const idealSpendRatio = dayOfMonth / daysInMonth;
  const actualSpendRatio = partner.budgetSpent / partner.monthlyBudget;
  
  const spendRate = actualSpendRatio / idealSpendRatio;
  
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
