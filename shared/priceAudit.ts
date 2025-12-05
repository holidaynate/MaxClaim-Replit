/**
 * MaxClaim Audit Engine v2.0
 * Dynamic Market Pricing System
 * 
 * UNIT_PRICE = Lowest price from ALL claims (Contractor floor)
 * FMV_PRICE = Highest price from ALL claims (Insurer ceiling/uplift target)
 * AVERAGE_PRICE = (UNIT_PRICE + FMV_PRICE) / 2 (Fair market midpoint)
 * 
 * Badge Logic:
 * - LOW = Price < FMV_PRICE (underpaid opportunity - can claim more)
 * - FMV = Price >= FMV_PRICE (fair market value achieved)
 */

export type AuditStatus = 
  | 'PASS'
  | 'LOW'
  | 'FMV'
  | 'MISSING_ITEM'
  | 'INVALID_QUANTITY';

export type AuditSeverity = 'none' | 'warning' | 'error' | 'info' | 'success';

export interface PriceDBItem {
  UNIT: string;
  UNIT_PRICE: number;      // Lowest from all claims (Min/Floor)
  AVERAGE_PRICE: number;   // Midpoint between min/max
  FMV_PRICE: number;       // Highest from all claims (Max/Ceiling)
  SAMPLES: number;
  LAST_UPDATED?: string;
}

export interface AuditResult {
  item: string;
  status: AuditStatus;
  message: string;
  badges: string[];
  flagged: boolean;
  severity: AuditSeverity;
  unit?: string;
  marketPricing?: {
    unitPrice: number;      // Lowest market price (floor)
    averagePrice: number;   // Midpoint
    fmvPrice: number;       // Highest market price (ceiling)
  };
  enteredPrice: number;
  enteredQty: number;
  subtotal: number;
  fmvSubtotal: number;
  avgSubtotal: number;
  underpaymentOpportunity: number;
  subtotalString?: string;
  fmvSubtotalString?: string;
  underpaymentString?: string;
  suggestions?: string[];
}

export interface BatchAuditResult {
  totalItems: number;
  flaggedItems: number;
  fmvItems: number;
  lowItems: number;
  totalClaimValue: number;
  totalFmvValue: number;
  totalUnderpaymentOpportunity: number;
  totalClaimValueString: string;
  totalFmvValueString: string;
  totalUnderpaymentString: string;
  flagBreakdown: {
    low: number;
    fmv: number;
    missing: number;
    invalid: number;
  };
  results: AuditResult[];
}

export type AuditFlag = 
  | 'OK'
  | 'Below market minimum'
  | 'Above market maximum'
  | 'Significantly below average'
  | 'Significantly above average'
  | 'No data available';

export interface PriceAuditResult {
  item: string;
  matchedItem?: string;
  userPrice: number;
  min?: number;
  avg?: number;
  max?: number;
  unit?: string;
  category?: string;
  flag: AuditFlag;
  severity: AuditSeverity;
  percentFromAvg?: number;
  sampleSize?: number;
}

// Import priceDB directly for shared code (browser + server)
// Note: In Node.js, ES6 imports are already efficiently cached
import priceDB from './priceDB.json';
let typedPriceDB = priceDB as Record<string, PriceDBItem>;

function getSimilarItems(searchTerm: string): string[] {
  const items = Object.keys(typedPriceDB);
  const searchWords = searchTerm.toLowerCase().split(' ');
  
  return items
    .filter(item => {
      const itemLower = item.toLowerCase();
      return searchWords.some(word => itemLower.includes(word));
    })
    .slice(0, 3);
}

function fuzzyMatch(itemName: string): string | undefined {
  const normalizedInput = itemName.toLowerCase().trim();
  
  for (const key of Object.keys(typedPriceDB)) {
    if (key.toLowerCase() === normalizedInput) {
      return key;
    }
  }
  
  for (const key of Object.keys(typedPriceDB)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes(normalizedInput) || normalizedInput.includes(normalizedKey)) {
      return key;
    }
  }
  
  return undefined;
}

/**
 * Updates priceDB when new claim data comes in
 * Single high/low price can shift the entire market range
 */
export function updateMarketPrice(
  itemName: string, 
  newPrice: number, 
  unit: string = 'SQ',
  source: string = 'claim'
): PriceDBItem {
  const normalizedItemName = itemName.trim();
  let itemData = typedPriceDB[normalizedItemName];
  
  if (!itemData) {
    typedPriceDB[normalizedItemName] = {
      UNIT: unit,
      UNIT_PRICE: newPrice,
      AVERAGE_PRICE: newPrice,
      FMV_PRICE: newPrice,
      SAMPLES: 1,
      LAST_UPDATED: new Date().toISOString().split('T')[0]
    };
    console.log(`📊 New item ${normalizedItemName}: $${newPrice}/${unit}`);
    return typedPriceDB[normalizedItemName];
  }

  const currentMin = itemData.UNIT_PRICE;
  const currentMax = itemData.FMV_PRICE;
  
  itemData.UNIT_PRICE = Math.min(currentMin, newPrice);
  itemData.FMV_PRICE = Math.max(currentMax, newPrice);
  itemData.AVERAGE_PRICE = (itemData.UNIT_PRICE + itemData.FMV_PRICE) / 2;
  itemData.SAMPLES = (itemData.SAMPLES || 0) + 1;
  itemData.LAST_UPDATED = new Date().toISOString().split('T')[0];
  
  console.log(`📊 Updated ${normalizedItemName}: $${currentMin}→$${itemData.UNIT_PRICE} | $${currentMax}→$${itemData.FMV_PRICE}`);
  
  return itemData;
}

/**
 * Audit single claim item
 * Compares entered price against dynamic market range
 * 
 * Badge Logic:
 * - LOW = Price < FMV_PRICE (underpaid - opportunity to claim more)
 * - FMV = Price >= FMV_PRICE (fair market value achieved)
 */
export function auditClaimItem(
  itemName: string,
  enteredPrice: number,
  enteredQty: number
): AuditResult {
  const normalizedItemName = itemName.trim();
  const matchedKey = fuzzyMatch(normalizedItemName);
  
  if (!matchedKey) {
    return {
      item: itemName,
      status: 'MISSING_ITEM',
      message: `"${itemName}" not found in MaxClaim database`,
      badges: [],
      flagged: true,
      severity: 'info',
      enteredPrice: 0,
      enteredQty: 0,
      subtotal: 0,
      fmvSubtotal: 0,
      avgSubtotal: 0,
      underpaymentOpportunity: 0,
      suggestions: getSimilarItems(itemName)
    };
  }

  const itemData = typedPriceDB[matchedKey];
  const { UNIT, UNIT_PRICE, AVERAGE_PRICE, FMV_PRICE } = itemData;

  if (!enteredQty || enteredQty <= 0 || !Number.isFinite(enteredQty)) {
    return {
      item: itemName,
      status: 'INVALID_QUANTITY',
      message: `Quantity must be > 0 (received: ${enteredQty})`,
      badges: [],
      flagged: true,
      severity: 'error',
      unit: UNIT,
      enteredPrice: 0,
      enteredQty: 0,
      subtotal: 0,
      fmvSubtotal: 0,
      avgSubtotal: 0,
      underpaymentOpportunity: 0
    };
  }

  const badges: string[] = [];
  let status: AuditStatus = 'PASS';
  let message = '';
  let flagged = false;
  let severity: AuditSeverity = 'none';

  const subtotal = Math.round((enteredPrice * enteredQty) * 100) / 100;
  const fmvSubtotal = Math.round((FMV_PRICE * enteredQty) * 100) / 100;
  const avgSubtotal = Math.round((AVERAGE_PRICE * enteredQty) * 100) / 100;
  const underpaymentOpportunity = Math.round((fmvSubtotal - subtotal) * 100) / 100;

  if (enteredPrice >= FMV_PRICE) {
    status = 'FMV';
    badges.push('FMV');
    severity = 'success';
    message = `Fair Market Value achieved: $${enteredPrice.toFixed(2)} >= $${FMV_PRICE.toFixed(2)}/${UNIT}`;
    flagged = false;
  } else {
    status = 'LOW';
    badges.push('LOW');
    severity = 'warning';
    const uplift = (FMV_PRICE - enteredPrice).toFixed(2);
    message = `Underpaid: $${enteredPrice.toFixed(2)} < $${FMV_PRICE.toFixed(2)}/${UNIT} (Opportunity: +$${uplift}/${UNIT})`;
    flagged = true;
  }

  return {
    item: matchedKey,
    status,
    message,
    badges,
    flagged,
    severity,
    unit: UNIT,
    marketPricing: {
      unitPrice: UNIT_PRICE,
      averagePrice: AVERAGE_PRICE,
      fmvPrice: FMV_PRICE
    },
    enteredPrice: Math.round(enteredPrice * 100) / 100,
    enteredQty: Math.round(enteredQty * 100) / 100,
    subtotal,
    fmvSubtotal,
    avgSubtotal,
    underpaymentOpportunity: Math.max(0, underpaymentOpportunity),
    subtotalString: subtotal.toFixed(2),
    fmvSubtotalString: fmvSubtotal.toFixed(2),
    underpaymentString: Math.max(0, underpaymentOpportunity).toFixed(2)
  };
}

/**
 * Batch audit entire claim (multiple items)
 */
export function auditBatch(
  items: Array<{ name: string; price: number; qty: number }>
): BatchAuditResult {
  const results = items.map(item => 
    auditClaimItem(item.name, item.price, item.qty)
  );
  
  const lowItems = results.filter(r => r.status === 'LOW');
  const fmvItems = results.filter(r => r.status === 'FMV');
  const flaggedItems = results.filter(r => r.flagged);
  
  const totalClaimValue = results.reduce((sum, r) => sum + (r.subtotal || 0), 0);
  const totalFmvValue = results.reduce((sum, r) => sum + (r.fmvSubtotal || 0), 0);
  const totalUnderpaymentOpportunity = results.reduce((sum, r) => sum + (r.underpaymentOpportunity || 0), 0);
  
  const totalClaimValueRounded = Math.round(totalClaimValue * 100) / 100;
  const totalFmvValueRounded = Math.round(totalFmvValue * 100) / 100;
  const totalUnderpaymentRounded = Math.round(totalUnderpaymentOpportunity * 100) / 100;

  return {
    totalItems: results.length,
    flaggedItems: flaggedItems.length,
    fmvItems: fmvItems.length,
    lowItems: lowItems.length,
    totalClaimValue: totalClaimValueRounded,
    totalFmvValue: totalFmvValueRounded,
    totalUnderpaymentOpportunity: totalUnderpaymentRounded,
    totalClaimValueString: totalClaimValueRounded.toFixed(2),
    totalFmvValueString: totalFmvValueRounded.toFixed(2),
    totalUnderpaymentString: totalUnderpaymentRounded.toFixed(2),
    flagBreakdown: {
      low: lowItems.length,
      fmv: fmvItems.length,
      missing: results.filter(r => r.status === 'MISSING_ITEM').length,
      invalid: results.filter(r => r.status === 'INVALID_QUANTITY').length
    },
    results
  };
}

/**
 * Process entire claim and update market prices
 */
export function processClaimAndUpdatePrices(
  items: Array<{ name: string; price: number; qty: number; unit?: string }>
): BatchAuditResult {
  items.forEach(item => {
    if (item.price > 0 && item.qty > 0) {
      updateMarketPrice(item.name, item.price, item.unit || 'SQ', 'claim');
    }
  });
  
  return auditBatch(items);
}

export function auditClaimItemLegacy(itemName: string, userPrice: number): PriceAuditResult {
  const matchedKey = fuzzyMatch(itemName);
  
  if (!matchedKey) {
    return {
      item: itemName,
      userPrice,
      flag: 'No data available',
      severity: 'info'
    };
  }
  
  const priceData = typedPriceDB[matchedKey];
  const { UNIT_PRICE, FMV_PRICE, AVERAGE_PRICE, UNIT, SAMPLES } = priceData;
  
  let flag: AuditFlag = 'OK';
  let severity: AuditSeverity = 'none';
  
  if (userPrice < UNIT_PRICE) {
    flag = 'Below market minimum';
    severity = 'error';
  } else if (userPrice > FMV_PRICE) {
    flag = 'Above market maximum';
    severity = 'success';
  } else if (userPrice < AVERAGE_PRICE * 0.85) {
    flag = 'Significantly below average';
    severity = 'warning';
  } else if (userPrice > AVERAGE_PRICE * 1.15) {
    flag = 'Significantly above average';
    severity = 'info';
  }
  
  const percentFromAvg = AVERAGE_PRICE > 0 ? Number((((userPrice - AVERAGE_PRICE) / AVERAGE_PRICE) * 100).toFixed(1)) : 0;
  
  return {
    item: itemName,
    matchedItem: matchedKey,
    userPrice,
    min: UNIT_PRICE,
    avg: AVERAGE_PRICE,
    max: FMV_PRICE,
    unit: UNIT,
    flag,
    severity,
    percentFromAvg,
    sampleSize: SAMPLES
  };
}

export function getMarketData(itemName: string): PriceDBItem | undefined {
  const matchedKey = fuzzyMatch(itemName);
  if (!matchedKey) return undefined;
  return typedPriceDB[matchedKey];
}

export function getAllItems(): Array<{ name: string; unit: string; avgPrice: number; fmvPrice: number }> {
  return Object.entries(typedPriceDB).map(([name, data]) => ({
    name,
    unit: data.UNIT,
    avgPrice: data.AVERAGE_PRICE,
    fmvPrice: data.FMV_PRICE
  }));
}

export function searchItems(query: string): Array<{ name: string; data: PriceDBItem }> {
  const normalizedQuery = query.toLowerCase().trim();
  return Object.entries(typedPriceDB)
    .filter(([name]) => name.toLowerCase().includes(normalizedQuery))
    .map(([name, data]) => ({ name, data }));
}

export function getPriceDB(): Record<string, PriceDBItem> {
  return typedPriceDB;
}
