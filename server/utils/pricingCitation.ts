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

/**
 * Multi-Source Pricing Citation System
 * 
 * Provides transparent, defensible pricing documentation for insurance claims.
 * All estimates include data source attribution and confidence levels.
 * 
 * Citation Methodology:
 * 1. Primary Source: RSMeans/NRCA industry standard data
 * 2. Secondary Source: Regional adjustment (HUD CBSA or BLS state data)
 * 3. Tertiary Source: Historical claim data (when available)
 */

import { 
  calculateBaselineEstimate, 
  generateCitation as generateBaselineCitation,
  type BaselineEstimate 
} from './baselinePricing';
import { 
  getRegionalCostAdjustment, 
  isHighCostArea,
  type RegionalCostAdjustment 
} from './hudZipCrosswalk';
import { getStateFromZip } from './zipToState';

export interface PricingSource {
  name: string;
  type: 'primary' | 'secondary' | 'tertiary' | 'user';
  citation: string;
  weight: number;       // 0-1, how much this source influences final price
  lastUpdated: string;
  url?: string;
}

export interface CitedPriceEstimate {
  // Price breakdown
  laborCost: number;
  materialCost: number;
  totalCost: number;
  
  // Price range for reporting
  lowEstimate: number;
  highEstimate: number;
  
  // Regional info
  regionName: string;
  regionalMultiplier: number;
  isHighCostArea: boolean;
  highCostPremium: number;
  
  // Data quality indicators
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  dataQualityScore: number;  // 1-100
  
  // Sources for citation
  sources: PricingSource[];
  
  // Formatted citation for reports
  formattedCitation: string;
  shortCitation: string;
  
  // Methodology explanation
  methodology: string;
  
  // Metadata
  category: string;
  lineItem: string | null;
  quantity: number;
  unit: string;
  zipCode: string;
  stateCode: string | null;
  timestamp: string;
}

/**
 * Generate a fully-cited price estimate with multi-source validation
 */
export function generateCitedEstimate(
  category: string,
  lineItemName: string | null,
  quantity: number,
  zipCode: string,
  userProvidedPrice?: number,
  historicalAvg?: number
): CitedPriceEstimate | null {
  const stateCode = getStateFromZip(zipCode);
  if (!stateCode) {
    // Try to proceed with national average if no state found
  }
  
  // Get baseline estimate with sources
  const baseline = calculateBaselineEstimate(
    category,
    lineItemName,
    quantity,
    stateCode || 'TX'  // Default to TX if unknown
  );
  
  if (!baseline) return null;
  
  // Get regional adjustment details
  const regionalAdj = getRegionalCostAdjustment(zipCode);
  const highCostInfo = isHighCostArea(zipCode);
  
  // Build sources array
  const sources: PricingSource[] = [
    {
      name: baseline.sources.pricing.split(' ')[0],  // First word is usually source name
      type: 'primary',
      citation: baseline.sources.pricing,
      weight: 0.6,
      lastUpdated: baseline.lastUpdated,
      url: getSourceUrl(baseline.sources.pricing)
    },
    {
      name: "Regional Adjustment",
      type: 'secondary',
      citation: `${regionalAdj.areaName}: ${regionalAdj.source}`,
      weight: 0.3,
      lastUpdated: "2024-01-01",
      url: "https://www.bls.gov/cpi/"
    }
  ];
  
  let finalPrice = baseline.totalCost;
  let dataQualityScore = 70;  // Base score
  
  // Add historical data if available
  if (historicalAvg && historicalAvg > 0) {
    sources.push({
      name: "Historical Claim Data",
      type: 'tertiary',
      citation: `MaxClaim historical average for ${category} in region`,
      weight: 0.1,
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    
    // Blend historical data (10% weight)
    finalPrice = finalPrice * 0.9 + historicalAvg * 0.1;
    dataQualityScore += 10;
  }
  
  // If user provided a price, include it for reference
  if (userProvidedPrice && userProvidedPrice > 0) {
    sources.push({
      name: "User Provided",
      type: 'user',
      citation: `User-entered price: $${userProvidedPrice.toFixed(2)}`,
      weight: 0,  // Reference only, doesn't affect calculation
      lastUpdated: new Date().toISOString().split('T')[0]
    });
  }
  
  // Adjust quality score based on data sources
  if (baseline.confidenceLevel === 'HIGH') dataQualityScore += 15;
  if (baseline.confidenceLevel === 'LOW') dataQualityScore -= 15;
  if (regionalAdj.adjustmentType === 'metro') dataQualityScore += 10;
  if (stateCode) dataQualityScore += 5;
  
  // Calculate price range (±15% for MEDIUM confidence, ±10% for HIGH, ±20% for LOW)
  let rangePercent = 0.15;
  if (baseline.confidenceLevel === 'HIGH') rangePercent = 0.10;
  if (baseline.confidenceLevel === 'LOW') rangePercent = 0.20;
  
  const lowEstimate = finalPrice * (1 - rangePercent);
  const highEstimate = finalPrice * (1 + rangePercent);
  
  // Generate formatted citations
  const formattedCitation = generateFormattedCitation(sources, baseline, regionalAdj);
  const shortCitation = generateShortCitation(sources);
  
  // Methodology explanation
  const methodology = `Fair Market Value (FMV) calculated using multi-source methodology: ` +
    `Base pricing from ${baseline.sources.pricing}, ` +
    `regional adjustment (${(regionalAdj.multiplier * 100).toFixed(0)}%) from ${regionalAdj.source}, ` +
    `waste factor (${((baseline.wasteFactor - 1) * 100).toFixed(0)}%) applied for material loss. ` +
    `Confidence: ${baseline.confidenceLevel}. Data quality score: ${dataQualityScore}/100.`;
  
  return {
    laborCost: baseline.laborCost,
    materialCost: baseline.materialCost,
    totalCost: Math.round(finalPrice * 100) / 100,
    
    lowEstimate: Math.round(lowEstimate * 100) / 100,
    highEstimate: Math.round(highEstimate * 100) / 100,
    
    regionName: regionalAdj.areaName,
    regionalMultiplier: regionalAdj.multiplier,
    isHighCostArea: highCostInfo.isHighCost,
    highCostPremium: highCostInfo.premium,
    
    confidenceLevel: baseline.confidenceLevel,
    dataQualityScore: Math.min(100, Math.max(0, dataQualityScore)),
    
    sources,
    formattedCitation,
    shortCitation,
    methodology,
    
    category,
    lineItem: lineItemName,
    quantity,
    unit: baseline.unit,
    zipCode,
    stateCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate a formatted citation for PDF reports
 */
function generateFormattedCitation(
  sources: PricingSource[],
  baseline: BaselineEstimate,
  regional: RegionalCostAdjustment
): string {
  const primarySource = sources.find(s => s.type === 'primary');
  const secondarySource = sources.find(s => s.type === 'secondary');
  
  let citation = `## Cost Estimate Sources\n\n`;
  citation += `**Primary Source:** ${primarySource?.citation || 'Industry baseline data'}\n`;
  citation += `**Regional Adjustment:** ${secondarySource?.citation || 'National average'}\n`;
  citation += `**Regional Multiplier:** ${(regional.multiplier * 100).toFixed(0)}%\n`;
  citation += `**Confidence Level:** ${baseline.confidenceLevel}\n`;
  citation += `**Waste Factor:** ${((baseline.wasteFactor - 1) * 100).toFixed(0)}%\n`;
  citation += `**Last Updated:** ${baseline.lastUpdated}\n\n`;
  citation += `**Methodology:** ${regional.methodology}\n`;
  
  return citation;
}

/**
 * Generate short citation for inline use
 */
function generateShortCitation(sources: PricingSource[]): string {
  const primaryNames = sources
    .filter(s => s.type === 'primary' || s.type === 'secondary')
    .map(s => s.name)
    .join(', ');
  
  return `Source: ${primaryNames} (${new Date().getFullYear()})`;
}

/**
 * Get URL for known data sources
 */
function getSourceUrl(sourceName: string): string | undefined {
  const urlMap: Record<string, string> = {
    'RSMeans': 'https://www.rsmeansonline.com',
    'NRCA': 'https://www.nrca.net',
    'PrecisionEstimator': 'https://github.com/giampi-ai/PrecisionEstimator',
    'BLS': 'https://www.bls.gov/cpi/',
    'HUD': 'https://www.huduser.gov/portal/datasets/usps_crosswalk.html'
  };
  
  for (const [key, url] of Object.entries(urlMap)) {
    if (sourceName.includes(key)) return url;
  }
  
  return undefined;
}

/**
 * Generate comparison citation when user price differs from FMV
 */
export function generateComparisonCitation(
  userPrice: number,
  fmvPrice: number,
  sources: PricingSource[]
): string {
  const difference = fmvPrice - userPrice;
  const percentDiff = ((difference / userPrice) * 100).toFixed(1);
  const direction = difference > 0 ? 'above' : 'below';
  
  const sourceCitations = sources
    .filter(s => s.type !== 'user')
    .map(s => s.citation)
    .join('; ');
  
  return `Fair Market Value ($${fmvPrice.toFixed(2)}) is ${Math.abs(parseFloat(percentDiff))}% ${direction} ` +
         `the insurance offer ($${userPrice.toFixed(2)}). ` +
         `Sources: ${sourceCitations}.`;
}

/**
 * Generate summary citation for batch claim analysis
 */
export function generateBatchCitation(
  totalClaimValue: number,
  totalFmvValue: number,
  totalVariance: number,
  itemCount: number,
  uniqueSources: Set<string>
): string {
  const variancePercent = ((totalVariance / totalClaimValue) * 100).toFixed(1);
  const sourceList = Array.from(uniqueSources).slice(0, 3).join(', ');
  
  return `Batch analysis of ${itemCount} line items. ` +
         `Total insurance value: $${totalClaimValue.toFixed(2)}. ` +
         `Total Fair Market Value: $${totalFmvValue.toFixed(2)}. ` +
         `Variance: $${totalVariance.toFixed(2)} (${variancePercent}%). ` +
         `Primary data sources: ${sourceList}. ` +
         `Analysis date: ${new Date().toLocaleDateString()}.`;
}

/**
 * Generate disclaimer text for reports
 */
export function generateDisclaimer(): string {
  return `DISCLAIMER: This Fair Market Value (FMV) estimate is provided for informational purposes only ` +
         `and does not constitute legal, financial, or professional advice. Actual costs may vary based on ` +
         `local market conditions, contractor availability, material prices, and scope of work. ` +
         `This estimate uses data from multiple industry sources including RSMeans, NRCA, and regional ` +
         `cost indices published by the Bureau of Labor Statistics. MaxClaim recommends obtaining ` +
         `multiple contractor quotes for accurate project pricing. Users should consult with licensed ` +
         `contractors, public adjusters, or legal professionals for specific claim guidance.`;
}

/**
 * Get all unique data sources used in a set of estimates
 */
export function aggregateSources(estimates: CitedPriceEstimate[]): PricingSource[] {
  const sourceMap = new Map<string, PricingSource>();
  
  for (const estimate of estimates) {
    for (const source of estimate.sources) {
      const key = `${source.name}-${source.type}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, source);
      }
    }
  }
  
  return Array.from(sourceMap.values()).sort((a, b) => {
    const typeOrder = { primary: 0, secondary: 1, tertiary: 2, user: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}
