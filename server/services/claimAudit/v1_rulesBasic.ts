/**
 * Claim Audit v1 - Basic Rules Engine
 * Role: archived-but-viable
 * 
 * Oldest version, works completely offline without any external dependencies.
 * Can be reactivated if all else fails. Uses simple pattern matching and
 * hardcoded pricing averages for basic claim analysis.
 */

import type { ClaimAuditInput, ClaimAuditResult, AuditedLineItem, ClaimLineItem, VersionStatus } from './types';

const VERSION_ID = 'v1-rules-basic';

const BASIC_CATEGORY_AVERAGES: Record<string, { lowPerUnit: number; avgPerUnit: number; highPerUnit: number }> = {
  roofing: { lowPerUnit: 3.50, avgPerUnit: 5.00, highPerUnit: 8.00 },
  siding: { lowPerUnit: 4.00, avgPerUnit: 6.00, highPerUnit: 10.00 },
  flooring: { lowPerUnit: 3.00, avgPerUnit: 5.50, highPerUnit: 9.00 },
  drywall: { lowPerUnit: 1.50, avgPerUnit: 2.50, highPerUnit: 4.00 },
  painting: { lowPerUnit: 1.00, avgPerUnit: 2.00, highPerUnit: 3.50 },
  plumbing: { lowPerUnit: 75.00, avgPerUnit: 150.00, highPerUnit: 300.00 },
  electrical: { lowPerUnit: 50.00, avgPerUnit: 100.00, highPerUnit: 200.00 },
  hvac: { lowPerUnit: 500.00, avgPerUnit: 1500.00, highPerUnit: 3000.00 },
  windows: { lowPerUnit: 200.00, avgPerUnit: 400.00, highPerUnit: 800.00 },
  other: { lowPerUnit: 25.00, avgPerUnit: 75.00, highPerUnit: 150.00 },
};

const BASIC_MISSING_ITEMS: Record<string, string[]> = {
  roofing: ['Drip edge', 'Ice and water shield', 'Permit fees'],
  siding: ['House wrap', 'J-channel trim', 'Corner posts'],
  flooring: ['Underlayment', 'Transition strips', 'Baseboards'],
  drywall: ['Texture matching', 'Primer', 'Corner bead'],
  painting: ['Primer coat', 'Caulking', 'Surface prep'],
};

function detectCategory(description: string): string {
  const desc = description.toLowerCase();
  if (/roof|shingle|gutter/.test(desc)) return 'roofing';
  if (/siding|vinyl|exterior/.test(desc)) return 'siding';
  if (/floor|carpet|tile|laminate/.test(desc)) return 'flooring';
  if (/drywall|wall|ceiling/.test(desc)) return 'drywall';
  if (/paint|primer|coat/.test(desc)) return 'painting';
  if (/plumb|pipe|faucet/.test(desc)) return 'plumbing';
  if (/electric|wiring|outlet/.test(desc)) return 'electrical';
  if (/hvac|heat|cool|furnace/.test(desc)) return 'hvac';
  if (/window/.test(desc)) return 'windows';
  return 'other';
}

export async function analyze(input: ClaimAuditInput): Promise<ClaimAuditResult> {
  const startTime = Date.now();
  const auditedItems: AuditedLineItem[] = [];
  const categoriesFound = new Set<string>();

  for (const item of input.lineItems) {
    const category = item.category || detectCategory(item.description);
    categoriesFound.add(category);
    
    const pricing = BASIC_CATEGORY_AVERAGES[category] || BASIC_CATEGORY_AVERAGES.other;
    const quantity = item.quantity || 1;
    const expectedPrice = pricing.avgPerUnit * quantity;
    const variance = expectedPrice > 0 
      ? ((expectedPrice - item.quotedPrice) / expectedPrice) * 100 
      : 0;

    const flags: string[] = [];
    if (variance > 20) {
      flags.push(`Potentially underpaid by ${variance.toFixed(0)}%`);
    }
    if (item.quotedPrice < pricing.lowPerUnit * quantity) {
      flags.push('Below typical low range');
    }

    auditedItems.push({
      original: item,
      marketPrice: expectedPrice,
      variance,
      flags,
      recommendation: flags.length > 0 ? 'Request re-evaluation' : 'Price appears reasonable',
    });
  }

  const missingItems: string[] = [];
  for (const category of Array.from(categoriesFound)) {
    const commonMissing = BASIC_MISSING_ITEMS[category] || [];
    const descriptions = input.lineItems.map((i: ClaimLineItem) => i.description.toLowerCase()).join(' ');
    for (const missing of commonMissing) {
      if (!descriptions.includes(missing.toLowerCase().split(' ')[0])) {
        missingItems.push(`${category}: ${missing}`);
      }
    }
  }

  const totalQuoted = input.lineItems.reduce((sum: number, i: ClaimLineItem) => sum + i.quotedPrice, 0);
  const totalMarket = auditedItems.reduce((sum: number, i: AuditedLineItem) => sum + i.marketPrice, 0);
  const totalUnderpayment = Math.max(0, totalMarket - totalQuoted);

  return {
    success: true,
    version: VERSION_ID,
    role: 'archived-but-viable',
    auditedItems,
    missingItems: missingItems.slice(0, 5),
    carrierPatterns: [],
    recommendations: [
      totalUnderpayment > 100 
        ? `Consider requesting ${totalUnderpayment.toFixed(0)} additional compensation` 
        : 'Claim appears reasonable based on basic analysis',
      'Get contractor quotes for verification',
    ],
    summary: {
      totalQuoted,
      totalMarketValue: totalMarket,
      totalUnderpayment,
      itemsAudited: auditedItems.length,
      flaggedItems: auditedItems.filter(i => i.flags.length > 0).length,
    },
    confidence: 0.4,
    processingTimeMs: Date.now() - startTime,
    fallbackReason: undefined,
  };
}

export function getStatus(): VersionStatus {
  return {
    id: VERSION_ID,
    role: 'archived-but-viable' as const,
    available: true,
    description: 'Basic offline rules engine with hardcoded pricing averages',
  };
}
