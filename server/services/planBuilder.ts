/**
 * MaxClaim AI Plan Builder Service
 * Copyright (c) 2024 MaxClaim. All rights reserved.
 * 
 * Rules-based recommendation engine for partner ad configurations.
 * Recommends banner sizes, placements, CPC bids, budgets, and affiliate percentages
 * based on ZIP code, trade type, and selected tier.
 */

import { getStateFromZip } from "../utils/zipToState";

// Trade type definitions with base metrics
const TRADE_METRICS: Record<string, {
  baseConversionRate: number; // Expected conversion rate
  avgClaimValue: number;      // Average claim value in trade
  competitionLevel: "low" | "medium" | "high";
  recommendedPlacements: string[];
  baseCpc: number;            // Base cost per click
  affiliateRange: [number, number]; // Min/max affiliate percentage
}> = {
  roofing: {
    baseConversionRate: 0.045,
    avgClaimValue: 15000,
    competitionLevel: "high",
    recommendedPlacements: ["results_sidebar", "results_header", "claim_confirmation"],
    baseCpc: 2.50,
    affiliateRange: [8, 15],
  },
  general_contractor: {
    baseConversionRate: 0.035,
    avgClaimValue: 25000,
    competitionLevel: "medium",
    recommendedPlacements: ["results_sidebar", "results_footer", "claim_confirmation"],
    baseCpc: 2.00,
    affiliateRange: [6, 12],
  },
  public_adjuster: {
    baseConversionRate: 0.065,
    avgClaimValue: 35000,
    competitionLevel: "high",
    recommendedPlacements: ["results_header", "claim_confirmation", "email_report"],
    baseCpc: 4.00,
    affiliateRange: [10, 20],
  },
  insurance_attorney: {
    baseConversionRate: 0.025,
    avgClaimValue: 75000,
    competitionLevel: "medium",
    recommendedPlacements: ["results_header", "underpaid_alert", "email_report"],
    baseCpc: 8.00,
    affiliateRange: [5, 10],
  },
  restoration: {
    baseConversionRate: 0.055,
    avgClaimValue: 12000,
    competitionLevel: "medium",
    recommendedPlacements: ["results_sidebar", "results_footer"],
    baseCpc: 1.75,
    affiliateRange: [7, 14],
  },
  remodeler: {
    baseConversionRate: 0.040,
    avgClaimValue: 18000,
    competitionLevel: "low",
    recommendedPlacements: ["results_sidebar", "results_footer", "claim_confirmation"],
    baseCpc: 1.50,
    affiliateRange: [6, 12],
  },
};

// State-based disaster risk multipliers affect CPC and competition
const STATE_RISK_MULTIPLIERS: Record<string, number> = {
  // Priority 1 - Critical disaster states
  TX: 1.4, FL: 1.5, CA: 1.3, OK: 1.35, MS: 1.25, IL: 1.2, LA: 1.45,
  // Priority 2 - High risk states
  GA: 1.2, NC: 1.15, MO: 1.2, AL: 1.15, CO: 1.25, KS: 1.3, TN: 1.1,
  SC: 1.1, VA: 1.05, AR: 1.15, KY: 1.05, NY: 1.1, PA: 1.05, WA: 1.1,
  // Priority 3 - Moderate risk
  IN: 1.0, OH: 1.0, MI: 0.95, MN: 1.0, WI: 0.95, OR: 1.05, NV: 1.0,
  NM: 1.05, MT: 0.9, ID: 0.9, WY: 0.85, UT: 0.95, AZ: 1.1, IA: 1.05,
  NE: 1.1, ND: 0.9, SD: 0.9, AK: 0.85, HI: 1.0,
  // Priority 4 - Low risk
  ME: 0.8, NH: 0.8, VT: 0.75, MA: 0.85, CT: 0.85, RI: 0.8, NJ: 0.9,
  DE: 0.85, MD: 0.9, WV: 0.85, DC: 0.9,
};

// Tier configurations
const TIER_CONFIG = {
  free: {
    maxPlacements: 1,
    maxBannerSizes: 1,
    budgetCap: 0,
    affiliateDiscount: 0,
    priorityWeight: 1,
    features: ["Basic listing", "1 placement", "Pay-per-lead only"],
  },
  standard: {
    maxPlacements: 3,
    maxBannerSizes: 2,
    budgetCap: 500,
    affiliateDiscount: 0.15,
    priorityWeight: 2,
    features: ["Priority listing", "3 placements", "2 banner sizes", "Basic analytics", "Email support"],
  },
  premium: {
    maxPlacements: 6,
    maxBannerSizes: 4,
    budgetCap: 2000,
    affiliateDiscount: 0.25,
    priorityWeight: 4,
    features: ["Featured listing", "All placements", "All banner sizes", "Advanced analytics", "Dedicated support", "API access"],
  },
};

// Banner size recommendations by placement
const BANNER_SIZES: Record<string, { width: number; height: number; label: string; performance: "high" | "medium" | "low" }[]> = {
  results_header: [
    { width: 728, height: 90, label: "Leaderboard", performance: "high" },
    { width: 320, height: 100, label: "Mobile Banner", performance: "medium" },
  ],
  results_sidebar: [
    { width: 300, height: 250, label: "Medium Rectangle", performance: "high" },
    { width: 300, height: 600, label: "Half Page", performance: "high" },
    { width: 160, height: 600, label: "Wide Skyscraper", performance: "medium" },
  ],
  results_footer: [
    { width: 728, height: 90, label: "Leaderboard", performance: "medium" },
    { width: 970, height: 250, label: "Billboard", performance: "high" },
  ],
  claim_confirmation: [
    { width: 300, height: 250, label: "Medium Rectangle", performance: "high" },
    { width: 336, height: 280, label: "Large Rectangle", performance: "high" },
  ],
  email_report: [
    { width: 600, height: 100, label: "Email Banner", performance: "medium" },
    { width: 300, height: 250, label: "Medium Rectangle", performance: "high" },
  ],
  underpaid_alert: [
    { width: 300, height: 250, label: "Medium Rectangle", performance: "high" },
    { width: 320, height: 100, label: "Mobile Banner", performance: "medium" },
  ],
};

export interface PlanRecommendation {
  tier: "free" | "standard" | "premium";
  tradeType: string;
  zipCode: string;
  state: string | null;
  riskMultiplier: number;
  
  // Budget recommendations
  recommendedMonthlyBudget: number;
  minBudget: number;
  maxBudget: number;
  
  // CPC recommendations
  recommendedCpc: number;
  minCpc: number;
  maxCpc: number;
  
  // Affiliate recommendations
  recommendedAffiliatePercent: number;
  minAffiliate: number;
  maxAffiliate: number;
  
  // Placement recommendations
  recommendedPlacements: {
    id: string;
    name: string;
    description: string;
    priority: number;
    estimatedImpressions: number;
    estimatedClicks: number;
    estimatedLeads: number;
  }[];
  
  // Banner recommendations
  recommendedBanners: {
    placement: string;
    sizes: { width: number; height: number; label: string; performance: string }[];
  }[];
  
  // Projections
  monthlyProjections: {
    estimatedImpressions: number;
    estimatedClicks: number;
    estimatedLeads: number;
    estimatedCost: number;
    estimatedRevenue: number;
    estimatedRoi: number;
  };
  
  // Tier features
  tierFeatures: string[];
  
  // Insights
  insights: string[];
}

const PLACEMENT_DETAILS: Record<string, { name: string; description: string; baseImpressions: number }> = {
  results_header: {
    name: "Results Header",
    description: "Premium placement at the top of claim results",
    baseImpressions: 5000,
  },
  results_sidebar: {
    name: "Results Sidebar",
    description: "Persistent sidebar visibility during review",
    baseImpressions: 8000,
  },
  results_footer: {
    name: "Results Footer",
    description: "Call-to-action placement after results",
    baseImpressions: 4000,
  },
  claim_confirmation: {
    name: "Claim Confirmation",
    description: "High-intent placement on claim submission",
    baseImpressions: 3000,
  },
  email_report: {
    name: "Email Report",
    description: "Included in emailed claim reports",
    baseImpressions: 2000,
  },
  underpaid_alert: {
    name: "Underpaid Alert",
    description: "Shown when underpayment is detected",
    baseImpressions: 1500,
  },
};

export function generatePlanRecommendation(
  zipCode: string,
  tradeType: string,
  tier: "free" | "standard" | "premium"
): PlanRecommendation {
  // Get state from ZIP
  const state = getStateFromZip(zipCode);
  const riskMultiplier = state ? (STATE_RISK_MULTIPLIERS[state] || 1.0) : 1.0;
  
  // Get trade metrics
  const trade = TRADE_METRICS[tradeType] || TRADE_METRICS.general_contractor;
  const tierConfig = TIER_CONFIG[tier];
  
  // Calculate CPC with risk adjustment
  const baseCpc = trade.baseCpc * riskMultiplier;
  const recommendedCpc = Math.round(baseCpc * 100) / 100;
  const minCpc = Math.round(baseCpc * 0.7 * 100) / 100;
  const maxCpc = Math.round(baseCpc * 1.5 * 100) / 100;
  
  // Calculate affiliate percentage (inversely affected by risk - higher risk = lower affiliate to protect margins)
  const [minAff, maxAff] = trade.affiliateRange;
  const affiliateAdjustment = 1 - ((riskMultiplier - 1) * 0.5);
  const baseAffiliate = (minAff + maxAff) / 2;
  const recommendedAffiliatePercent = Math.round(baseAffiliate * affiliateAdjustment * (1 - tierConfig.affiliateDiscount));
  
  // Calculate budget recommendations
  let recommendedMonthlyBudget = 0;
  let minBudget = 0;
  let maxBudget = tierConfig.budgetCap;
  
  if (tier !== "free") {
    const baseMonthlyBudget = tier === "premium" ? 1500 : 350;
    recommendedMonthlyBudget = Math.round(baseMonthlyBudget * riskMultiplier);
    minBudget = tier === "standard" ? 100 : 500;
    maxBudget = tierConfig.budgetCap;
  }
  
  // Get recommended placements based on tier limits
  const allPlacements = trade.recommendedPlacements;
  const selectedPlacements = allPlacements.slice(0, tierConfig.maxPlacements);
  
  const recommendedPlacements = selectedPlacements.map((placementId, index) => {
    const details = PLACEMENT_DETAILS[placementId] || {
      name: placementId,
      description: "",
      baseImpressions: 1000,
    };
    
    const impressions = Math.round(details.baseImpressions * riskMultiplier * tierConfig.priorityWeight);
    const clicks = Math.round(impressions * 0.02); // 2% CTR
    const leads = Math.round(clicks * trade.baseConversionRate);
    
    return {
      id: placementId,
      name: details.name,
      description: details.description,
      priority: index + 1,
      estimatedImpressions: impressions,
      estimatedClicks: clicks,
      estimatedLeads: leads,
    };
  });
  
  // Get banner recommendations
  const recommendedBanners = selectedPlacements
    .filter(p => BANNER_SIZES[p])
    .map(placementId => ({
      placement: placementId,
      sizes: BANNER_SIZES[placementId].slice(0, tierConfig.maxBannerSizes),
    }));
  
  // Calculate monthly projections
  const totalImpressions = recommendedPlacements.reduce((sum, p) => sum + p.estimatedImpressions, 0);
  const totalClicks = recommendedPlacements.reduce((sum, p) => sum + p.estimatedClicks, 0);
  const totalLeads = recommendedPlacements.reduce((sum, p) => sum + p.estimatedLeads, 0);
  const estimatedCost = tier === "free" ? 0 : Math.min(totalClicks * recommendedCpc, recommendedMonthlyBudget);
  const estimatedRevenue = totalLeads * trade.avgClaimValue * (recommendedAffiliatePercent / 100);
  const estimatedRoi = estimatedCost > 0 ? Math.round((estimatedRevenue / estimatedCost - 1) * 100) : 0;
  
  // Generate insights
  const insights: string[] = [];
  
  if (riskMultiplier >= 1.3) {
    insights.push(`High disaster activity in ${state || "your area"} creates strong demand for ${tradeType.replace(/_/g, " ")} services.`);
  } else if (riskMultiplier >= 1.1) {
    insights.push(`Moderate disaster exposure in ${state || "your area"} provides steady lead flow.`);
  } else {
    insights.push(`Lower competition in ${state || "your area"} means better cost efficiency.`);
  }
  
  if (trade.competitionLevel === "high") {
    insights.push(`${tradeType.replace(/_/g, " ")} is a competitive category - higher CPC recommended for visibility.`);
  }
  
  if (tier === "premium") {
    insights.push("Premium tier includes priority placement rotation and advanced targeting.");
  } else if (tier === "standard") {
    insights.push("Upgrade to Premium for access to all placements and advanced analytics.");
  } else {
    insights.push("Free tier uses pay-per-lead model with no monthly commitment.");
  }
  
  if (totalLeads > 10) {
    insights.push(`Projected ${totalLeads} monthly leads at $${Math.round(estimatedCost / totalLeads)} cost per lead.`);
  }
  
  return {
    tier,
    tradeType,
    zipCode,
    state,
    riskMultiplier: Math.round(riskMultiplier * 100) / 100,
    
    recommendedMonthlyBudget,
    minBudget,
    maxBudget,
    
    recommendedCpc,
    minCpc,
    maxCpc,
    
    recommendedAffiliatePercent,
    minAffiliate: minAff,
    maxAffiliate: maxAff,
    
    recommendedPlacements,
    recommendedBanners,
    
    monthlyProjections: {
      estimatedImpressions: totalImpressions,
      estimatedClicks: totalClicks,
      estimatedLeads: totalLeads,
      estimatedCost,
      estimatedRevenue: Math.round(estimatedRevenue),
      estimatedRoi,
    },
    
    tierFeatures: tierConfig.features,
    insights,
  };
}

// Get available trade types for UI
export function getTradeTypes() {
  return Object.entries(TRADE_METRICS).map(([id, metrics]) => ({
    id,
    label: id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    competitionLevel: metrics.competitionLevel,
    avgClaimValue: metrics.avgClaimValue,
  }));
}

// Get tier comparison for UI
export function getTierComparison() {
  return Object.entries(TIER_CONFIG).map(([id, config]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    monthlyPrice: id === "free" ? 0 : id === "standard" ? 500 : 2000,
    ...config,
  }));
}
