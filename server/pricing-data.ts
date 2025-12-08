/**
 * MaxClaim – Insurance Claim Fair Market Value Tool
 * https://github.com/holidaynate/MaxClaim-Replit
 *
 * © 2023–2025 Nate Chacon (InfiN8 / HolidayNate). All rights reserved.
 *
 * This file is part of the proprietary MaxClaim SaaS implementation.
 * Business logic (claim auditing, multi-carrier pricing aggregation,
 * geo-targeted partner matching, weighted "pay what you want" promotions)
 * is original to MaxClaim and protected by copyright and pending patents.
 *
 * Third-party libraries are used under their respective open source licenses
 * as documented in THIRD_PARTY_NOTICES.md.
 */

// Regional Fair Market Value pricing database
// Enhanced with multi-source baseline pricing and citation support
//
// Data Sources:
// - RSMeans Data Online (industry standard baseline)
// - NRCA Roofing Cost Guide (roofing-specific)
// - PrecisionEstimator open-source rates (MIT license)
// - BLS Regional CPI (regional adjustments)
// - HUD CBSA cost indices (metro area adjustments)

import { 
  generateCitedEstimate, 
  generateDisclaimer,
  type CitedPriceEstimate,
  type PricingSource
} from './utils/pricingCitation';
import { getStateFromZip } from './utils/zipToState';
import { getRegionalCostAdjustment } from './utils/hudZipCrosswalk';
import { getCategoryPricing, getLineItem, BASELINE_PRICING, type BaselineEstimate } from './utils/baselinePricing';

interface PricingData {
  [category: string]: {
    basePrice: number; // Base price per unit
    unit: string; // sq ft, linear ft, each, etc.
    regionalMultipliers: {
      [zipPrefix: string]: number; // First 3 digits of ZIP -> multiplier
    };
  };
}

export const fmvPricingData: PricingData = {
  "Roofing": {
    basePrice: 450, // per square (100 sq ft)
    unit: "square",
    regionalMultipliers: {
      "780": 0.95, // South Texas (lower cost)
      "781": 0.95,
      "785": 0.95,
      "770": 1.05, // Georgia
      "771": 1.05,
      "100": 1.25, // NYC area (higher cost)
      "101": 1.25,
      "900": 1.20, // California
      "901": 1.20,
      "DEFAULT": 1.0
    }
  },
  "Flooring": {
    basePrice: 8.50, // per sq ft
    unit: "sq ft",
    regionalMultipliers: {
      "780": 0.92,
      "781": 0.92,
      "785": 0.92,
      "770": 1.08,
      "771": 1.08,
      "100": 1.30,
      "101": 1.30,
      "900": 1.25,
      "901": 1.25,
      "DEFAULT": 1.0
    }
  },
  "Drywall": {
    basePrice: 2.75, // per sq ft installed
    unit: "sq ft",
    regionalMultipliers: {
      "780": 0.90,
      "781": 0.90,
      "785": 0.90,
      "770": 1.10,
      "771": 1.10,
      "100": 1.35,
      "101": 1.35,
      "900": 1.28,
      "901": 1.28,
      "DEFAULT": 1.0
    }
  },
  "Painting": {
    basePrice: 3.25, // per sq ft
    unit: "sq ft",
    regionalMultipliers: {
      "780": 0.88,
      "781": 0.88,
      "785": 0.88,
      "770": 1.12,
      "771": 1.12,
      "100": 1.40,
      "101": 1.40,
      "900": 1.32,
      "901": 1.32,
      "DEFAULT": 1.0
    }
  },
  "Plumbing": {
    basePrice: 125, // per fixture/repair
    unit: "each",
    regionalMultipliers: {
      "780": 0.93,
      "781": 0.93,
      "785": 0.93,
      "770": 1.07,
      "771": 1.07,
      "100": 1.28,
      "101": 1.28,
      "900": 1.22,
      "901": 1.22,
      "DEFAULT": 1.0
    }
  },
  "Electrical": {
    basePrice: 150, // per circuit/outlet
    unit: "each",
    regionalMultipliers: {
      "780": 0.94,
      "781": 0.94,
      "785": 0.94,
      "770": 1.06,
      "771": 1.06,
      "100": 1.26,
      "101": 1.26,
      "900": 1.20,
      "901": 1.20,
      "DEFAULT": 1.0
    }
  },
  "HVAC": {
    basePrice: 5500, // per system
    unit: "system",
    regionalMultipliers: {
      "780": 0.91,
      "781": 0.91,
      "785": 0.91,
      "770": 1.09,
      "771": 1.09,
      "100": 1.22,
      "101": 1.22,
      "900": 1.18,
      "901": 1.18,
      "DEFAULT": 1.0
    }
  },
  "Windows & Doors": {
    basePrice: 850, // per window/door installed
    unit: "each",
    regionalMultipliers: {
      "780": 0.92,
      "781": 0.92,
      "785": 0.92,
      "770": 1.08,
      "771": 1.08,
      "100": 1.24,
      "101": 1.24,
      "900": 1.19,
      "901": 1.19,
      "DEFAULT": 1.0
    }
  },
  "Appliances": {
    basePrice: 750, // per appliance
    unit: "each",
    regionalMultipliers: {
      "780": 0.96,
      "781": 0.96,
      "785": 0.96,
      "770": 1.04,
      "771": 1.04,
      "100": 1.15,
      "101": 1.15,
      "900": 1.12,
      "901": 1.12,
      "DEFAULT": 1.0
    }
  },
  "Cabinets": {
    basePrice: 185, // per linear foot
    unit: "linear ft",
    regionalMultipliers: {
      "780": 0.89,
      "781": 0.89,
      "785": 0.89,
      "770": 1.11,
      "771": 1.11,
      "100": 1.38,
      "101": 1.38,
      "900": 1.30,
      "901": 1.30,
      "DEFAULT": 1.0
    }
  },
  "Other": {
    basePrice: 100, // generic rate
    unit: "each",
    regionalMultipliers: {
      "780": 0.95,
      "781": 0.95,
      "785": 0.95,
      "770": 1.05,
      "771": 1.05,
      "100": 1.20,
      "101": 1.20,
      "900": 1.15,
      "901": 1.15,
      "DEFAULT": 1.0
    }
  }
};

export function calculateFMV(
  category: string,
  quantity: number,
  zipCode: string,
  inflationMultiplier: number = 1.0
): number {
  const categoryData = fmvPricingData[category];
  if (!categoryData) {
    // Fallback to "Other" category
    return calculateFMV("Other", quantity, zipCode, inflationMultiplier);
  }

  const zipPrefix = zipCode.substring(0, 3);
  const multipliers = categoryData.regionalMultipliers;
  const regionalMultiplier = multipliers[zipPrefix] || multipliers["DEFAULT"];

  // Apply both regional and inflation adjustments
  return categoryData.basePrice * quantity * regionalMultiplier * inflationMultiplier;
}

export function analyzeClaimItem(
  category: string,
  description: string,
  quantity: number,
  insuranceOffer: number,
  zipCode: string,
  inflationMultiplier: number = 1.0,
  pricingStats?: { min: number; max: number; avg: number; last: number; count: number } | null
): {
  fmvPrice: number;
  additionalAmount: number;
  percentageIncrease: number;
  status: 'underpaid' | 'fair';
} {
  // Normalize category name for pricing lookup (handles frontend damage types)
  const normalizedCategory = normalizeCategoryForPricing(category);
  let fmvPrice = calculateFMV(normalizedCategory, quantity, zipCode, inflationMultiplier);
  
  // If we have pricing stats from real user data, use it to refine the FMV
  if (pricingStats && pricingStats.count > 0) {
    // Weight the calculation: 70% historical data average, 30% base calculation
    // This allows the system to learn from real data while maintaining a baseline
    const historicalAvg = pricingStats.avg;
    fmvPrice = (historicalAvg * 0.7) + (fmvPrice * 0.3);
  }
  
  const additionalAmount = fmvPrice - insuranceOffer;
  const percentageIncrease = (additionalAmount / insuranceOffer) * 100;

  // Most insurance companies underpay by 10-30%
  // If FMV is more than 10% higher, it's underpaid
  const status = percentageIncrease > 10 ? 'underpaid' : 'fair';

  return {
    fmvPrice: Math.round(fmvPrice * 100) / 100, // Round to 2 decimals
    additionalAmount: Math.round(additionalAmount * 100) / 100,
    percentageIncrease: Math.round(percentageIncrease * 10) / 10,
    status
  };
}

/**
 * Enhanced claim analysis with multi-source citation
 * Returns full pricing breakdown with data source attribution
 */
export function analyzeClaimItemWithCitation(
  category: string,
  description: string,
  quantity: number,
  insuranceOffer: number,
  zipCode: string,
  inflationMultiplier: number = 1.0,
  pricingStats?: { min: number; max: number; avg: number; last: number; count: number } | null
): {
  fmvPrice: number;
  additionalAmount: number;
  percentageIncrease: number;
  status: 'underpaid' | 'fair';
  citation: CitedPriceEstimate | null;
} {
  // Normalize category name for pricing lookup (handles frontend damage types)
  const normalizedCategory = normalizeCategoryForPricing(category);
  
  // Get basic analysis first (analyzeClaimItem also normalizes, but we do it here for clarity)
  const basicAnalysis = analyzeClaimItem(
    category, description, quantity, insuranceOffer, 
    zipCode, inflationMultiplier, pricingStats
  );
  
  // Generate cited estimate for documentation using normalized category
  const citation = generateCitedEstimate(
    normalizedCategory,
    description,
    quantity,
    zipCode,
    insuranceOffer,
    pricingStats?.avg
  );
  
  return {
    ...basicAnalysis,
    citation
  };
}

/**
 * Get available line items for a category (for dropdown selection)
 */
export function getCategoryLineItems(category: string): { name: string; description: string; unit: string }[] {
  const catPricing = getCategoryPricing(category);
  if (!catPricing) return [];
  
  return catPricing.lineItems.map(item => ({
    name: item.name,
    description: item.description,
    unit: item.unit
  }));
}

/**
 * Get all supported categories (merged from legacy and baseline pricing)
 */
export function getSupportedCategories(): string[] {
  const legacyCategories = Object.keys(fmvPricingData);
  const baselineCategories = BASELINE_PRICING.map(cat => cat.category);
  
  // Merge and deduplicate
  return [...new Set([...legacyCategories, ...baselineCategories])].sort();
}

/**
 * Map frontend damage types to pricing categories
 * Frontend uses user-friendly damage type names, but pricing uses trade categories
 */
const DAMAGE_TYPE_TO_CATEGORY: Record<string, string> = {
  // Frontend damage types
  "Roofing & Exterior": "Roofing",
  "Water Damage": "Plumbing",
  "Fire Damage": "Drywall",
  "Hail Damage": "Roofing",
  "Wind Damage": "Roofing",
  "Foundation": "Other",
  "Other Structural": "Framing",
  
  // Direct mappings for exact category names
  "Roofing": "Roofing",
  "Flooring": "Flooring",
  "Drywall": "Drywall",
  "Painting": "Painting",
  "Plumbing": "Plumbing",
  "Electrical": "Electrical",
  "HVAC": "HVAC",
  "Windows & Doors": "Windows & Doors",
  "Appliances": "Appliances",
  "Cabinets": "Cabinets",
  "Siding": "Siding",
  "Tile": "Tile",
  "Trim": "Trim",
  "Framing": "Framing",
  "Insulation": "Insulation",
  "Other": "Other"
};

/**
 * Normalize category name for pricing lookup
 * Handles frontend damage types and various category name formats
 */
export function normalizeCategoryForPricing(category: string): string {
  // Try direct mapping first
  if (DAMAGE_TYPE_TO_CATEGORY[category]) {
    return DAMAGE_TYPE_TO_CATEGORY[category];
  }
  
  // Try case-insensitive lookup
  const lowerCategory = category.toLowerCase();
  for (const [key, value] of Object.entries(DAMAGE_TYPE_TO_CATEGORY)) {
    if (key.toLowerCase() === lowerCategory) {
      return value;
    }
  }
  
  // Default to original category name (may still work with legacy pricing)
  return category;
}

/**
 * Export disclaimer for reports
 */
export { generateDisclaimer };
