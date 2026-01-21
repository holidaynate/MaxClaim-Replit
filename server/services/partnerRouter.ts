/**
 * PartnerRouter Service
 * 
 * Routes claims and leads to appropriate partners based on:
 * - Trade matching (subType specialty)
 * - Geographic coverage (zipCode, state, serviceRegions)
 * - Partner status (approved only)
 * - Weighted rotation algorithm for fair distribution
 */

import { detectTrade } from './claimValidator';
import type { Partner } from '../../shared/schema';

export interface RoutingCriteria {
  trades: string[];
  zipCode?: string;
  state?: string;
  claimValue?: number;
  priority?: 'budget' | 'rating' | 'distance';
}

export interface RoutingResult {
  partnerId: string;
  companyName: string;
  matchScore: number;
  matchReasons: string[];
  tier: string;
}

export interface RoutingAnalysis {
  eligiblePartners: RoutingResult[];
  totalCandidates: number;
  disqualifiedReasons: Record<string, number>;
}

const TRADE_MAPPINGS: Record<string, string[]> = {
  roofing: ['roofing', 'roofer', 'roofs', 'roof', 'shingle'],
  flooring: ['flooring', 'floors', 'carpet', 'tile'],
  drywall: ['drywall', 'sheetrock', 'wall'],
  painting: ['painting', 'painter', 'paint'],
  plumbing: ['plumbing', 'plumber', 'pipe'],
  electrical: ['electrical', 'electrician', 'electric'],
  hvac: ['hvac', 'heating', 'cooling', 'ac'],
  windows: ['windows', 'window', 'glass'],
  doors: ['doors', 'door', 'entry'],
  appliances: ['appliances', 'appliance'],
  cabinets: ['cabinets', 'cabinet', 'kitchen'],
  general: ['general', 'contractor', 'gc']
};

const TIER_WEIGHTS: Record<string, number> = {
  partner: 1.5,
  advertiser: 1.2,
  affiliate: 1.0
};

export function normalizeTradeForMatching(trade: string): string {
  const lower = trade.toLowerCase().trim();
  
  for (const [normalized, aliases] of Object.entries(TRADE_MAPPINGS)) {
    if (aliases.some(alias => lower.includes(alias))) {
      return normalized;
    }
  }
  
  return lower;
}

export function matchesTrade(partnerSubType: string | null | undefined, requiredTrades: string[]): boolean {
  if (!partnerSubType) return false;
  if (requiredTrades.length === 0) return true;
  
  const partnerTrade = normalizeTradeForMatching(partnerSubType);
  
  if (partnerTrade === 'general') return true;
  
  return requiredTrades.some(trade => {
    const normalizedRequired = normalizeTradeForMatching(trade);
    return partnerTrade === normalizedRequired || partnerTrade.includes(normalizedRequired);
  });
}

export function matchesLocation(
  partner: Pick<Partner, 'zipCode' | 'state' | 'serviceRegions'>,
  criteria: { zipCode?: string; state?: string }
): { matches: boolean; score: number; reason?: string } {
  if (!criteria.zipCode && !criteria.state) {
    return { matches: true, score: 0.5, reason: 'No location criteria' };
  }
  
  if (criteria.zipCode && partner.zipCode === criteria.zipCode) {
    return { matches: true, score: 1.0, reason: 'Exact ZIP match' };
  }
  
  if (criteria.zipCode && partner.zipCode) {
    const partnerPrefix = partner.zipCode.substring(0, 3);
    const criteriaPrefix = criteria.zipCode.substring(0, 3);
    if (partnerPrefix === criteriaPrefix) {
      return { matches: true, score: 0.8, reason: 'ZIP prefix match (regional)' };
    }
  }
  
  if (partner.serviceRegions && partner.serviceRegions.length > 0) {
    if (criteria.zipCode && partner.serviceRegions.includes(criteria.zipCode)) {
      return { matches: true, score: 0.9, reason: 'In service regions' };
    }
    if (criteria.state && partner.serviceRegions.some(r => r.toLowerCase() === criteria.state?.toLowerCase())) {
      return { matches: true, score: 0.7, reason: 'State in service regions' };
    }
  }
  
  if (criteria.state && partner.state?.toLowerCase() === criteria.state.toLowerCase()) {
    return { matches: true, score: 0.6, reason: 'State match' };
  }
  
  return { matches: false, score: 0 };
}

export function calculateMatchScore(
  partner: Partner,
  criteria: RoutingCriteria
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  const tierWeight = TIER_WEIGHTS[partner.tier] || 1.0;
  
  if (matchesTrade(partner.subType, criteria.trades)) {
    score += 40 * tierWeight;
    reasons.push(`Trade match: ${partner.subType}`);
  } else if (partner.subType === 'general' || !partner.subType) {
    score += 20 * tierWeight;
    reasons.push('General contractor (accepts all trades)');
  }
  
  const locationMatch = matchesLocation(partner, { zipCode: criteria.zipCode, state: criteria.state });
  if (locationMatch.matches) {
    score += 30 * locationMatch.score * tierWeight;
    reasons.push(locationMatch.reason || 'Location match');
  }
  
  if (partner.billingStatus === 'active') {
    score += 15;
    reasons.push('Active billing status');
  }
  
  const budget = partner.adConfig?.monthlyBudget || 0;
  if (budget > 0) {
    const budgetBonus = Math.min(budget / 1000, 15);
    score += budgetBonus;
    reasons.push(`Budget bonus: +${budgetBonus.toFixed(1)}`);
  }
  
  return { score: Math.min(score, 100), reasons };
}

export function routeClaimToPartners(
  partners: Partner[],
  criteria: RoutingCriteria,
  limit: number = 5
): RoutingAnalysis {
  const disqualifiedReasons: Record<string, number> = {
    'Not approved': 0,
    'No trade match': 0,
    'No location coverage': 0
  };
  
  const eligiblePartners: RoutingResult[] = [];
  
  for (const partner of partners) {
    if (partner.status !== 'approved') {
      disqualifiedReasons['Not approved']++;
      continue;
    }
    
    const tradeMatch = criteria.trades.length === 0 || 
      matchesTrade(partner.subType, criteria.trades) ||
      partner.subType === 'general';
    
    if (!tradeMatch) {
      disqualifiedReasons['No trade match']++;
      continue;
    }
    
    if (criteria.zipCode || criteria.state) {
      const locationMatch = matchesLocation(partner, {
        zipCode: criteria.zipCode,
        state: criteria.state
      });
      
      if (!locationMatch.matches) {
        disqualifiedReasons['No location coverage']++;
        continue;
      }
    }
    
    const { score, reasons } = calculateMatchScore(partner, criteria);
    
    eligiblePartners.push({
      partnerId: partner.id,
      companyName: partner.companyName,
      matchScore: score,
      matchReasons: reasons,
      tier: partner.tier
    });
  }
  
  eligiblePartners.sort((a, b) => b.matchScore - a.matchScore);
  
  return {
    eligiblePartners: eligiblePartners.slice(0, limit),
    totalCandidates: partners.length,
    disqualifiedReasons
  };
}

export function extractTradesFromClaimItems(
  items: Array<{ itemName: string; category?: string }>
): string[] {
  const trades = new Set<string>();
  
  for (const item of items) {
    const detected = detectTrade(item.itemName, item.category);
    if (detected) {
      trades.add(detected);
    }
  }
  
  return Array.from(trades);
}

export function selectWinningPartner(
  eligiblePartners: RoutingResult[],
  mode: 'highest_score' | 'weighted_random' = 'highest_score'
): RoutingResult | null {
  if (eligiblePartners.length === 0) return null;
  
  const sorted = [...eligiblePartners].sort((a, b) => b.matchScore - a.matchScore);
  
  if (mode === 'highest_score') {
    return sorted[0];
  }
  
  const totalWeight = eligiblePartners.reduce((sum, p) => sum + p.matchScore, 0);
  let random = Math.random() * totalWeight;
  
  for (const partner of eligiblePartners) {
    random -= partner.matchScore;
    if (random <= 0) {
      return partner;
    }
  }
  
  return eligiblePartners[0];
}

export const partnerRouter = {
  routeClaimToPartners,
  extractTradesFromClaimItems,
  selectWinningPartner,
  matchesTrade,
  matchesLocation,
  calculateMatchScore,
  normalizeTradeForMatching
};

export default partnerRouter;
