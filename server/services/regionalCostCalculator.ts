/**
 * MaxClaim Regional Cost Calculator Service
 * Copyright (c) 2024 MaxClaim. All rights reserved.
 * 
 * Calculates region-specific pricing, budget recommendations, and competitive analysis
 * based on demand data, competitor counts, and disaster declarations.
 */

import { getRegionsForState, findRegionByZip, getRegionAllocationByPlan, REGION_ADJACENCY } from '../config/regions';
import { REGIONAL_DEMAND_DATA, BASE_CPC_BY_TRADE, getRegionDemand, getBaseCpcForTrade, getAllDisasterRegions } from '../config/regionalDemand';
import { getStateFromZip } from '../utils/zipToState';

export interface RegionalCostBreakdown {
  region: string;
  state: string;
  zip: string;
  tradeType: string;
  baseCpc: number;
  adjustedCpc: number;
  recommendedMonthlyBudget: {
    minimum: number;
    recommended: number;
    competitive: number;
  };
  costMultiplier: number;
  competitiveness: 'low' | 'medium' | 'high' | 'very_high';
  competitorCount: number;
  demandIndex: number;
  hasDisasterDeclaration: boolean;
  primaryHazards: string[];
  explanation: string;
}

export interface BudgetAllocation {
  region: string;
  allocatedBudget: number;
  percentage: number;
  estimatedClicks: number;
  estimatedLeads: number;
  cpcRate: number;
  priority: 'primary' | 'secondary' | 'tertiary';
}

export interface FullRegionRecommendation {
  homeRegion: string;
  state: string;
  tradeType: string;
  planType: 'standard' | 'premium' | 'build_your_own';
  totalBudget: number;
  regions: BudgetAllocation[];
  communityNeed: string | null;
  activeDisasters: { state: string; region: string; hazards: string[] }[];
  suggestion: string;
  avgCpcRate: number;
  estimatedMonthlyLeads: number;
  competitivenessScore: number;
}

export function calculateRegionCostBreakdown(
  state: string,
  region: string,
  zip: string,
  tradeType: string
): RegionalCostBreakdown {
  const demandData = getRegionDemand(state, region);
  
  const defaults = {
    baseMultiplier: 1.0,
    competitorCount: 15,
    disasterDeclaration: false,
    primaryHazards: [] as string[],
    populationDensity: 'suburban' as const,
    avgContractorBudget: 500,
    demandIndex: 50
  };
  
  const data = demandData || defaults;
  
  const baseCpc = getBaseCpcForTrade(tradeType);
  const adjustedCpc = Math.round(baseCpc * data.baseMultiplier * 100) / 100;
  
  const competitivenessFactor = Math.max(0.6, Math.min(1.5, 2.0 - (data.competitorCount / 40)));
  const avgBudget = data.avgContractorBudget;
  
  const minimum = Math.round(avgBudget * 0.3 * competitivenessFactor);
  const recommended = Math.round(avgBudget * competitivenessFactor);
  const competitive = Math.round(avgBudget * 1.8 * competitivenessFactor);
  
  let competitiveness: 'low' | 'medium' | 'high' | 'very_high';
  if (data.competitorCount >= 35) {
    competitiveness = 'very_high';
  } else if (data.competitorCount >= 20) {
    competitiveness = 'high';
  } else if (data.competitorCount >= 10) {
    competitiveness = 'medium';
  } else {
    competitiveness = 'low';
  }
  
  const hazardStr = data.primaryHazards.length > 0 
    ? data.primaryHazards.map(h => h.replace(/_/g, ' ')).join(', ') 
    : 'general weather';
  
  let explanation = `${region} has ${competitiveness} competition with ${data.competitorCount} active contractors. `;
  explanation += `Demand index: ${data.demandIndex}/100. `;
  explanation += `Primary hazards: ${hazardStr}. `;
  
  if (data.disasterDeclaration) {
    explanation += `⚠️ Active disaster declaration increases demand. `;
  }
  
  explanation += `Recommended budget ensures visibility; lower budgets still rotate during off-peak hours.`;
  
  return {
    region,
    state,
    zip,
    tradeType,
    baseCpc,
    adjustedCpc,
    recommendedMonthlyBudget: { minimum, recommended, competitive },
    costMultiplier: data.baseMultiplier,
    competitiveness,
    competitorCount: data.competitorCount,
    demandIndex: data.demandIndex,
    hasDisasterDeclaration: data.disasterDeclaration || false,
    primaryHazards: data.primaryHazards || [],
    explanation
  };
}

export function allocateBudgetAcrossRegions(
  regions: string[],
  state: string,
  tradeType: string,
  totalBudget: number,
  homeRegion: string
): BudgetAllocation[] {
  if (regions.length === 0) return [];
  
  const costBreakdowns = regions.map(region => 
    calculateRegionCostBreakdown(state, region, '', tradeType)
  );
  
  const totalDemand = costBreakdowns.reduce((sum, r) => sum + r.demandIndex, 0);
  
  const allocations: BudgetAllocation[] = costBreakdowns.map((breakdown, index) => {
    const isHome = breakdown.region === homeRegion;
    const adjacency = REGION_ADJACENCY[state]?.[homeRegion];
    const isAdjacent = adjacency?.adjacent.includes(breakdown.region) || false;
    
    let baseWeight = breakdown.demandIndex / totalDemand;
    
    if (isHome) {
      baseWeight *= 1.5;
    } else if (isAdjacent) {
      baseWeight *= 1.2;
    }
    
    if (breakdown.hasDisasterDeclaration) {
      baseWeight *= 1.3;
    }
    
    const normalizedWeight = baseWeight;
    const allocatedBudget = Math.round(totalBudget * normalizedWeight);
    
    const estimatedClicks = Math.round(allocatedBudget / breakdown.adjustedCpc);
    const conversionRate = breakdown.demandIndex > 70 ? 0.08 : breakdown.demandIndex > 50 ? 0.06 : 0.04;
    const estimatedLeads = Math.round(estimatedClicks * conversionRate);
    
    let priority: 'primary' | 'secondary' | 'tertiary';
    if (isHome || breakdown.hasDisasterDeclaration) {
      priority = 'primary';
    } else if (isAdjacent) {
      priority = 'secondary';
    } else {
      priority = 'tertiary';
    }
    
    return {
      region: breakdown.region,
      allocatedBudget,
      percentage: Math.round(normalizedWeight * 100),
      estimatedClicks,
      estimatedLeads,
      cpcRate: breakdown.adjustedCpc,
      priority
    };
  });
  
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedBudget, 0);
  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
  
  if (allocations.length > 0) {
    allocations[0].allocatedBudget += (totalBudget - totalAllocated);
    
    const percentageDiff = 100 - totalPercentage;
    allocations[0].percentage += percentageDiff;
  }
  
  return allocations.sort((a, b) => {
    const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function generateFullRecommendation(
  zip: string,
  tradeType: string,
  planType: 'standard' | 'premium' | 'build_your_own',
  budget?: number,
  selectedRegions?: string[]
): FullRegionRecommendation {
  const regionInfo = findRegionByZip(zip);
  let state = regionInfo?.state || getStateFromZip(zip) || 'TX';
  let homeRegion = regionInfo?.region || 'Austin Area';
  
  const stateRegions = getRegionsForState(state);
  if (stateRegions && !stateRegions[homeRegion]) {
    homeRegion = Object.keys(stateRegions)[0] || homeRegion;
  }
  
  const allocation = getRegionAllocationByPlan(state, homeRegion, planType);
  
  let regionsToUse: string[];
  if (selectedRegions && selectedRegions.length > 0) {
    regionsToUse = selectedRegions;
  } else {
    regionsToUse = [
      allocation.homeRegion,
      ...allocation.includedAdjacent,
      ...allocation.includedNonAdjacent,
      ...allocation.selectableNonAdjacent.slice(0, 1)
    ].filter(Boolean);
  }
  
  const homeBreakdown = calculateRegionCostBreakdown(state, homeRegion, zip, tradeType);
  const defaultBudget = homeBreakdown.recommendedMonthlyBudget.recommended * regionsToUse.length * 0.6;
  const totalBudget = budget || Math.round(defaultBudget);
  
  const budgetAllocations = allocateBudgetAcrossRegions(
    regionsToUse,
    state,
    tradeType,
    totalBudget,
    homeRegion
  );
  
  const activeDisasters = getAllDisasterRegions().filter(d => d.state === state);
  
  const avgDemand = budgetAllocations.reduce((sum, a) => {
    const demand = getRegionDemand(state, a.region)?.demandIndex || 50;
    return sum + demand;
  }, 0) / (budgetAllocations.length || 1);
  
  let communityNeed: string | null = null;
  if (activeDisasters.length > 0) {
    communityNeed = `High demand for ${tradeType.replace(/_/g, ' ')} services due to recent ${activeDisasters[0].hazards[0]} activity`;
  } else if (avgDemand > 75) {
    communityNeed = `Strong seasonal demand for ${tradeType.replace(/_/g, ' ')} services in ${state}`;
  }
  
  let suggestion: string;
  const totalLeads = budgetAllocations.reduce((sum, a) => sum + a.estimatedLeads, 0);
  const avgCpc = budgetAllocations.reduce((sum, a) => sum + a.cpcRate, 0) / (budgetAllocations.length || 1);
  
  if (activeDisasters.length > 0) {
    suggestion = `Active disaster declarations in your region create high demand. Your $${totalBudget}/month budget should generate approximately ${totalLeads} qualified leads. Consider increasing budget for maximum visibility during recovery period.`;
  } else if (totalBudget < homeBreakdown.recommendedMonthlyBudget.minimum * regionsToUse.length) {
    suggestion = `Your budget is below the competitive threshold for ${regionsToUse.length} regions. You'll still receive rotation, but primarily during off-peak hours. Consider focusing on fewer regions or increasing budget for better visibility.`;
  } else if (totalBudget >= homeBreakdown.recommendedMonthlyBudget.competitive) {
    suggestion = `Your budget positions you competitively across all selected regions. Estimated ${totalLeads} monthly leads at $${Math.round(totalBudget / totalLeads)} per lead. Premium placement during peak hours included.`;
  } else {
    suggestion = `Your $${totalBudget}/month budget provides good visibility across ${regionsToUse.length} regions. Estimated ${totalLeads} leads at approximately $${Math.round(avgCpc)}/click. Adjust region selection based on your service area.`;
  }
  
  const competitivenessScore = Math.round(
    (totalBudget / (homeBreakdown.recommendedMonthlyBudget.competitive * regionsToUse.length)) * 100
  );
  
  return {
    homeRegion,
    state,
    tradeType,
    planType,
    totalBudget,
    regions: budgetAllocations,
    communityNeed,
    activeDisasters,
    suggestion,
    avgCpcRate: Math.round(avgCpc * 100) / 100,
    estimatedMonthlyLeads: totalLeads,
    competitivenessScore: Math.min(100, competitivenessScore)
  };
}

export function getAvailableRegions(zip: string): {
  state: string;
  homeRegion: string;
  allRegions: string[];
  adjacentRegions: string[];
  nonAdjacentRegions: string[];
} {
  const regionInfo = findRegionByZip(zip);
  const state = regionInfo?.state || getStateFromZip(zip) || 'TX';
  const stateRegions = getRegionsForState(state);
  
  if (!stateRegions) {
    return {
      state,
      homeRegion: 'Unknown',
      allRegions: [],
      adjacentRegions: [],
      nonAdjacentRegions: []
    };
  }
  
  const homeRegion = regionInfo?.region || Object.keys(stateRegions)[0];
  const adjacency = REGION_ADJACENCY[state]?.[homeRegion];
  
  return {
    state,
    homeRegion,
    allRegions: Object.keys(stateRegions),
    adjacentRegions: adjacency?.adjacent || [],
    nonAdjacentRegions: adjacency?.nonAdjacent || []
  };
}
