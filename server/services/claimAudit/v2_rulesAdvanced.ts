/**
 * Claim Audit v2 - Advanced Rules Engine
 * Role: fallback
 * 
 * Stable non-LLM rules engine with database-backed pricing data.
 * Used as the current deterministic fallback when LLM is unavailable.
 * Provides higher accuracy than v1 through regional pricing and carrier patterns.
 */

import { db } from '../../db';
import { pricingDataPoints, carrierTrends } from '@shared/schema';
import { sql, eq, like } from 'drizzle-orm';
import type { ClaimAuditInput, ClaimAuditResult, AuditedLineItem, ClaimLineItem, VersionStatus } from './types';

const VERSION_ID = 'v2-rules-advanced';

const COMMON_MISSING_ITEMS: Record<string, string[]> = {
  roofing: [
    'Ice and water shield (valleys, eaves)',
    'Drip edge (metal)',
    'Valley flashing',
    'Starter strip',
    'Ridge vent',
    'Pipe boots/flashings',
    'Permit and inspection fees',
    'Debris removal',
  ],
  siding: [
    'House wrap replacement',
    'J-channel trim',
    'Corner posts',
    'Window/door trim',
    'Soffit and fascia',
  ],
  flooring: [
    'Floor leveling compound',
    'Underlayment',
    'Transition strips',
    'Baseboards/quarter round',
    'Moisture barrier',
  ],
  painting: [
    'Primer',
    'Caulking',
    'Surface preparation',
    'Multiple coats',
  ],
  drywall: [
    'Texture matching',
    'Primer before paint',
    'Corner bead',
    'Joint compound (multiple coats)',
  ],
};

const KNOWN_CARRIER_PATTERNS: Record<string, string[]> = {
  'state farm': ['Often omits O&P on first estimate', 'May require multiple supplements'],
  'allstate': ['Known for depreciation disputes', 'May undervalue labor rates'],
  'farmers': ['Conservative on scope of work', 'May miss hidden damage'],
  'geico': ['Limited contractor network', 'May push preferred vendors'],
  'usaa': ['Generally fair but thorough documentation required'],
  'liberty mutual': ['Strict on line item matching', 'May require detailed breakdowns'],
  'progressive': ['Quick initial offers but often low', 'Responds well to documentation'],
};

function detectCategory(description: string): string {
  const desc = description.toLowerCase();
  if (/roof|shingle|gutter|flashing/.test(desc)) return 'roofing';
  if (/siding|vinyl|exterior wall/.test(desc)) return 'siding';
  if (/floor|carpet|tile|laminate|hardwood/.test(desc)) return 'flooring';
  if (/drywall|wall|ceiling|sheetrock/.test(desc)) return 'drywall';
  if (/paint|primer|coat/.test(desc)) return 'painting';
  if (/plumb|pipe|faucet|toilet/.test(desc)) return 'plumbing';
  if (/electric|wiring|outlet|circuit/.test(desc)) return 'electrical';
  if (/hvac|heat|cool|furnace|ac/.test(desc)) return 'hvac';
  if (/window/.test(desc)) return 'windows';
  return 'other';
}

async function lookupPricing(description: string, zipCode?: string): Promise<{ avgPrice: number; maxPrice: number } | null> {
  try {
    const searchTerm = description.substring(0, 30).toLowerCase();
    const results = await db.select({
      avgPrice: sql<number>`AVG(price_avg)`,
      maxPrice: sql<number>`MAX(price_high)`,
    }).from(pricingDataPoints)
      .where(sql`LOWER(description) LIKE ${`%${searchTerm}%`}`);
    
    if (results[0]?.avgPrice) {
      return {
        avgPrice: Number(results[0].avgPrice),
        maxPrice: Number(results[0].maxPrice) || Number(results[0].avgPrice) * 1.5,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function lookupCarrierPatterns(carrier: string): Promise<string[]> {
  const patterns: string[] = [];
  
  const carrierLower = carrier.toLowerCase();
  for (const [name, carrierPatterns] of Object.entries(KNOWN_CARRIER_PATTERNS)) {
    if (carrierLower.includes(name)) {
      patterns.push(...carrierPatterns);
    }
  }

  try {
    const dbPatterns = await db.select().from(carrierTrends)
      .where(like(carrierTrends.carrierName, `%${carrier.toLowerCase()}%`))
      .limit(5);
    
    for (const trend of dbPatterns) {
      if (trend.commonStrategy && trend.frequency && trend.frequency > 10) {
        patterns.push(`${carrier} has ${trend.frequency} reported ${trend.commonStrategy.toLowerCase()} patterns`);
      }
    }
  } catch {
  }

  return patterns;
}

export async function analyze(input: ClaimAuditInput): Promise<ClaimAuditResult> {
  const startTime = Date.now();
  const auditedItems: AuditedLineItem[] = [];
  const categoriesFound = new Set<string>();

  for (const item of input.lineItems) {
    const category = item.category || detectCategory(item.description);
    categoriesFound.add(category);
    
    const pricing = await lookupPricing(item.description, input.zipCode);
    const quantity = item.quantity || 1;
    
    let marketPrice: number;
    let maxPrice: number;
    
    if (pricing) {
      marketPrice = pricing.avgPrice * quantity;
      maxPrice = pricing.maxPrice * quantity;
    } else {
      marketPrice = item.quotedPrice * 1.15;
      maxPrice = item.quotedPrice * 1.5;
    }
    
    const variance = marketPrice > 0 
      ? ((marketPrice - item.quotedPrice) / marketPrice) * 100 
      : 0;

    const flags: string[] = [];
    if (variance > 20) {
      flags.push(`Underpaid by ${variance.toFixed(1)}% vs market`);
    }
    if (item.quotedPrice > maxPrice) {
      flags.push('Exceeds typical insurance maximum');
    }
    if (item.quotedPrice < marketPrice * 0.5) {
      flags.push('Significantly below market rate');
    }

    auditedItems.push({
      original: item,
      marketPrice,
      variance,
      flags,
      recommendation: flags.length > 0 
        ? `Request re-inspection - potential ${Math.abs(variance).toFixed(0)}% adjustment` 
        : 'Price within expected range',
    });
  }

  const missingItems: string[] = [];
  for (const category of Array.from(categoriesFound)) {
    const commonItems = COMMON_MISSING_ITEMS[category] || [];
    const extractedDescriptions = input.lineItems
      .map((i: ClaimLineItem) => i.description.toLowerCase())
      .join(' ');
    
    for (const commonItem of commonItems) {
      const keywords = commonItem.toLowerCase().split(/\s+/);
      const hasItem = keywords.some(kw => extractedDescriptions.includes(kw));
      
      if (!hasItem) {
        missingItems.push(`${category}: ${commonItem}`);
      }
    }
  }

  let carrierPatterns: string[] = [];
  if (input.carrier) {
    carrierPatterns = await lookupCarrierPatterns(input.carrier);
  }

  const recommendations: string[] = [];
  const significantUndervalued = auditedItems.filter(v => v.variance > 15);
  
  if (significantUndervalued.length > 0) {
    const additionalAmount = significantUndervalued.reduce(
      (sum, v) => sum + (v.marketPrice - v.original.quotedPrice), 0
    );
    recommendations.push(
      `Request re-inspection for ${significantUndervalued.length} undervalued items totaling potential $${additionalAmount.toFixed(0)} in additional compensation`
    );
  }

  if (missingItems.length > 0) {
    recommendations.push(
      `Submit supplement for ${missingItems.length} potentially omitted items: ${missingItems.slice(0, 3).join(', ')}${missingItems.length > 3 ? '...' : ''}`
    );
  }

  if (carrierPatterns.length > 0) {
    recommendations.push(
      `Document all work thoroughly - ${input.carrier} ${carrierPatterns[0].toLowerCase()}`
    );
  }

  recommendations.push('Get multiple contractor quotes to support fair market value claims');
  recommendations.push('Take detailed photos before, during, and after all repairs');

  const totalQuoted = input.lineItems.reduce((sum: number, i: ClaimLineItem) => sum + i.quotedPrice, 0);
  const totalMarket = auditedItems.reduce((sum: number, i: AuditedLineItem) => sum + i.marketPrice, 0);
  const totalUnderpayment = Math.max(0, totalMarket - totalQuoted);

  let confidence = 0.6;
  if (carrierPatterns.length > 0) confidence += 0.1;
  if (auditedItems.some(i => i.flags.length > 0)) confidence += 0.05;

  return {
    success: true,
    version: VERSION_ID,
    role: 'fallback',
    auditedItems,
    missingItems: missingItems.slice(0, 10),
    carrierPatterns,
    recommendations,
    summary: {
      totalQuoted,
      totalMarketValue: totalMarket,
      totalUnderpayment,
      itemsAudited: auditedItems.length,
      flaggedItems: auditedItems.filter(i => i.flags.length > 0).length,
    },
    confidence: Math.min(confidence, 0.75),
    processingTimeMs: Date.now() - startTime,
    fallbackReason: undefined,
  };
}

export function getStatus(): VersionStatus {
  return {
    id: VERSION_ID,
    role: 'fallback' as const,
    available: true,
    description: 'Advanced deterministic rules engine with database-backed pricing',
  };
}
