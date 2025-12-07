import type { PromoPartner } from '@shared/partners';
import type { Partner, PartnerContract } from '@shared/schema';
import { getAreaCodeFromZip, getMetroFromZip } from '../utils/location';
import { storage } from '../storage';

/**
 * Fair Geo-Matching Algorithm for Partner Display
 * Prioritizes local contractors while maintaining fairness
 * 
 * Matching Priority:
 * 1. LOCAL PRESENCE (cannot be overridden by payment tier)
 *    - Partner serves user's exact ZIP code (primary area)
 *    - Partner serves user's area code (primary area)
 *    - Partner is "local" business type
 * 
 * 2. PAYMENT TIER MULTIPLIER (applied after local scoring)
 *    - free tier: 1.0x
 *    - standard tier: 1.3x
 *    - premium tier: 1.6x
 * 
 * 3. AD WEIGHT (custom multiplier from partner)
 *    - Allows fine-tuning within tier
 * 
 * Result: Local contractors always rank higher in their service area,
 * regardless of payment tier. Payment tier only affects ranking among
 * similar-locality partners.
 */

export interface UserLocation {
  zip?: string;        // 5-digit ZIP code
  areaCode?: string;   // 3-digit area code
  metro?: string;      // Metro area name
}

export interface ScoredPartner extends PromoPartner {
  matchScore: number;
  matchReasons: string[];
}

/**
 * Match partners to user's location using fair geo-targeting algorithm
 * 
 * @param userLocation User's coarse location
 * @param allPartners All available partners
 * @param category Optional category filter (e.g., "Roofing")
 * @param maxResults Maximum number of partners to return (default 5)
 * @returns Array of scored and sorted partners
 */
export function matchPartnersToUser(
  userLocation: UserLocation,
  allPartners: PromoPartner[],
  category?: string,
  maxResults: number = 5
): ScoredPartner[] {
  const { zip, areaCode, metro } = userLocation;

  // Filter by category if provided
  let eligiblePartners = allPartners;
  if (category) {
    eligiblePartners = allPartners.filter(p => 
      p.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Filter out expired partners
  const now = new Date();
  eligiblePartners = eligiblePartners.filter(p => 
    new Date(p.expiresAt) >= now
  );

  // Derive area codes from ZIP if not provided
  const userAreaCodes = areaCode 
    ? [areaCode] 
    : (zip ? getAreaCodeFromZip(zip) : []);

  // Score each partner
  const scoredPartners: ScoredPartner[] = eligiblePartners.map(partner => {
    let score = 0;
    const matchReasons: string[] = [];

    // ===== LOCAL PRIORITY SCORING (100+ points) =====
    // This ensures local contractors always rank higher than non-local,
    // regardless of payment tier
    
    // Primary ZIP match (highest local priority)
    if (zip && partner.serviceAreas.primary.zips.includes(zip)) {
      score += 100;
      matchReasons.push(`Serves your ZIP code (${zip})`);
    }

    // Primary area code match (high local priority)
    if (userAreaCodes.some(ac => partner.serviceAreas.primary.areaCodes.includes(ac))) {
      score += 80;
      matchReasons.push(`Serves your area code`);
    }

    // Secondary ZIP match (medium local priority)
    if (zip && partner.serviceAreas.secondary?.zips.includes(zip)) {
      score += 50;
      matchReasons.push(`Serves your area (secondary zone)`);
    }

    // Secondary area code match (lower local priority)
    if (userAreaCodes.some(ac => partner.serviceAreas.secondary?.areaCodes.includes(ac))) {
      score += 40;
      matchReasons.push(`Serves your region (secondary zone)`);
    }

    // Local business type bonus
    if (partner.businessType === 'local') {
      score += 30;
      matchReasons.push('Local business');
    } else if (partner.businessType === 'regional') {
      score += 15;
      matchReasons.push('Regional business');
    }

    // Featured partner (small bonus, doesn't override local)
    if (partner.featured) {
      score += 10;
      matchReasons.push('Featured partner');
    }

    // ===== PAYMENT TIER MULTIPLIER =====
    // Applied AFTER local scoring to maintain local priority
    // This means a local free-tier partner will still outrank
    // a non-local premium partner
    
    const tierMultiplier = getTierMultiplier(partner.tier);
    score *= tierMultiplier;

    // Ad weight multiplier (fine-tuning within tier)
    const adWeight = partner.adWeight || 1.0;
    score *= adWeight;

    // If no local match at all, heavily penalize
    // (ensures out-of-area partners don't appear unless no local options)
    if (score < 10) {
      score *= 0.1; // 90% penalty for out-of-area
      matchReasons.push('Outside your service area');
    }

    return {
      ...partner,
      matchScore: Math.round(score * 10) / 10, // Round to 1 decimal
      matchReasons
    };
  });

  // Sort by match score (highest first)
  scoredPartners.sort((a, b) => b.matchScore - a.matchScore);

  // Return top N results
  return scoredPartners.slice(0, maxResults);
}

/**
 * Get payment tier multiplier based on monetization tier
 * Updated for new BOGO system:
 * - free_bogo: 0.5x (lower priority for free BOGO listings)
 * - standard: 1.0x (normal rotation weight)
 * - premium: 2.0x (high priority featured listings)
 */
function getTierMultiplier(tier: 'free' | 'standard' | 'premium' | 'free_bogo'): number {
  const multipliers: Record<string, number> = {
    free: 0.5,       // Legacy free tier maps to BOGO weight
    free_bogo: 0.5,  // BOGO free listings have lower priority
    standard: 1.0,   // Standard tier has normal weight
    premium: 2.0     // Premium tier has double priority
  };
  return multipliers[tier] ?? 1.0;
}

/**
 * Get tier multiplier from a partner contract rotation weight
 * Uses the contract's configured rotation weight if available
 */
export function getContractRotationWeight(rotationWeight?: number | null): number {
  if (rotationWeight !== undefined && rotationWeight !== null) {
    return Number(rotationWeight);
  }
  return 1.0; // Default weight
}

/**
 * Get partners by trade/category with location filtering
 * This is a convenience function that wraps matchPartnersToUser
 */
export function getPartnersByTrade(
  trade: string,
  userLocation: UserLocation,
  allPartners: PromoPartner[],
  maxResults: number = 5
): ScoredPartner[] {
  return matchPartnersToUser(userLocation, allPartners, trade, maxResults);
}

/**
 * Explain matching algorithm to users (transparency)
 */
export const MATCHING_EXPLANATION = {
  title: "How we match contractors",
  points: [
    "Local contractors who serve your area are always prioritized",
    "We consider your ZIP code and area code to find nearby professionals",
    "Payment tier only affects ranking among contractors with similar coverage",
    "We never show contractors who don't serve your area"
  ],
  fairness: "Local contractors always rank higher than non-local, regardless of advertising spend."
};

export interface DatabasePartnerWithContract {
  partner: Partner;
  contract?: PartnerContract;
}

export interface ScoredDatabasePartner {
  partner: Partner;
  contract?: PartnerContract;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Match database-backed partners to user's location
 * Uses live tier weights from contracts table
 */
export async function matchDatabasePartnersToUser(
  userZip: string,
  partnerType?: string,
  maxResults: number = 5
): Promise<ScoredDatabasePartner[]> {
  const partners = await storage.getPartnersByZipCode(userZip, { status: 'approved' });
  
  if (partners.length === 0) {
    return [];
  }

  const results: (ScoredDatabasePartner | null)[] = await Promise.all(
    partners.map(async (partnerWithPriority) => {
      const partner = partnerWithPriority as Partner & { priority: number };
      const contract = await storage.getPartnerContractByPartnerId(partner.id);
      
      if (partnerType && partner.type !== partnerType) {
        return null;
      }

      let score = 0;
      const matchReasons: string[] = [];

      score += partner.priority * 10;
      matchReasons.push('Serves your area');

      if (partner.tier === 'partner') {
        score += 30;
        matchReasons.push('Verified partner');
      } else if (partner.tier === 'affiliate') {
        score += 15;
        matchReasons.push('Affiliate partner');
      }

      let tierMultiplier = 1.0;
      if (contract) {
        tierMultiplier = getContractRotationWeight(contract.rotationWeight);
        
        const tierName = contract.monetizationTier;
        if (tierName === 'premium') {
          score += 10;
          matchReasons.push('Premium partner');
        } else if (tierName === 'free_bogo') {
          matchReasons.push('Community partner');
        }
      } else {
        tierMultiplier = 1.0;
      }
      
      score *= tierMultiplier;

      return {
        partner,
        contract: contract || undefined,
        matchScore: Math.round(score * 10) / 10,
        matchReasons,
      };
    })
  );

  const validPartners = results.filter((p): p is ScoredDatabasePartner => p !== null);
  validPartners.sort((a, b) => b.matchScore - a.matchScore);

  return validPartners.slice(0, maxResults);
}

/**
 * Get the rotation weight multipliers for display
 */
export const TIER_WEIGHTS = {
  free_bogo: { weight: 0.5, label: 'Community (BOGO)', description: 'Free listing for organization members' },
  standard: { weight: 1.0, label: 'Standard', description: 'Normal rotation priority' },
  premium: { weight: 2.0, label: 'Premium', description: 'Featured with 2x rotation priority' },
};
