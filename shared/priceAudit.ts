import priceDB from './priceDB.json';

/**
 * MaxClaim Audit Engine v2.0
 * Enforces RRC_COST/INS_MAX_COST min/max flags and quantity validation
 * Compares UNIT PRICES (not totals) against database ranges
 */

// New v2.0 status types
export type AuditStatus = 
  | 'PASS'
  | 'LOW_FLAG'
  | 'HIGH_FLAG'
  | 'MISSING_ITEM'
  | 'INVALID_QUANTITY';

export type AuditSeverity = 'none' | 'warning' | 'error' | 'info';

// New v2.0 pricing structure from priceDB
export interface PriceDBItem {
  UNIT: string;
  RRC_COST: number;    // Contractor minimum (below this = underpaid)
  INS_MAX_COST: number; // Insurer maximum (above this = overpaid)
  AVG_PRICE: number;   // Average market price
  SAMPLES: number;     // Number of data points
}

// Single item audit result
export interface AuditResult {
  item: string;
  status: AuditStatus;
  message: string;
  flagged: boolean;
  severity: AuditSeverity;
  unit?: string;
  pricing?: {
    rrcMin: number;
    insMax: number;
    average: number;
    entered: number;
  };
  quantity?: number;
  subtotal: number;
  expectedSubtotal: number;
  subtotalDifference: number;
  subtotalString?: string;
  expectedSubtotalString?: string;
  subtotalDifferenceString?: string;
  suggestions?: string[];
}

// Batch audit summary
export interface BatchAuditResult {
  totalItems: number;
  flaggedItems: number;
  passedItems: number;
  totalClaimValue: number;
  totalExpectedValue: number;
  variance: number;
  potentialUnderpayment: number;
  totalClaimValueString: string;
  totalExpectedValueString: string;
  varianceString: string;
  potentialUnderpaymentString: string;
  flagBreakdown: {
    lowFlags: number;
    highFlags: number;
    missing: number;
    invalid: number;
  };
  results: AuditResult[];
}

// Legacy types for backward compatibility
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

const typedPriceDB = priceDB as Record<string, PriceDBItem>;

/**
 * Helper: Find similar items using fuzzy matching
 */
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

/**
 * Fuzzy match item names
 */
function fuzzyMatch(itemName: string): string | undefined {
  const normalizedInput = itemName.toLowerCase().trim();
  
  // Exact match first
  for (const key of Object.keys(typedPriceDB)) {
    if (key.toLowerCase() === normalizedInput) {
      return key;
    }
  }
  
  // Partial match
  for (const key of Object.keys(typedPriceDB)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes(normalizedInput) || normalizedInput.includes(normalizedKey)) {
      return key;
    }
  }
  
  return undefined;
}

/**
 * Audit single claim item (v2.0)
 * Compares UNIT PRICE against RRC_COST/INS_MAX_COST range
 */
export function auditClaimItem(
  itemName: string,
  enteredPrice: number,
  enteredQty: number
): AuditResult {
  const normalizedItemName = itemName.trim();
  const matchedKey = fuzzyMatch(normalizedItemName);
  
  // MISSING ITEM CHECK
  if (!matchedKey) {
    return {
      item: itemName,
      status: 'MISSING_ITEM',
      message: `"${itemName}" not found in MaxClaim database`,
      flagged: true,
      severity: 'info',
      subtotal: 0,
      expectedSubtotal: 0,
      subtotalDifference: 0,
      suggestions: getSimilarItems(itemName)
    };
  }

  const itemData = typedPriceDB[matchedKey];
  const { UNIT, RRC_COST, INS_MAX_COST, AVG_PRICE } = itemData;

  // QUANTITY VALIDATION (MUST BE > 0)
  if (!enteredQty || enteredQty <= 0 || !Number.isFinite(enteredQty)) {
    return {
      item: itemName,
      status: 'INVALID_QUANTITY',
      message: `Quantity must be > 0 (received: ${enteredQty})`,
      flagged: true,
      severity: 'error',
      unit: UNIT,
      subtotal: 0,
      expectedSubtotal: 0,
      subtotalDifference: 0
    };
  }

  // PRICE AUDIT (RRC_COST vs INS_MAX_COST)
  let status: AuditStatus = 'PASS';
  let message = `Price $${enteredPrice.toFixed(2)} within acceptable range`;
  let flagged = false;
  let severity: AuditSeverity = 'none';

  if (enteredPrice < RRC_COST) {
    status = 'LOW_FLAG';
    severity = 'warning';
    const difference = (RRC_COST - enteredPrice).toFixed(2);
    message = `BELOW RRC MINIMUM: $${enteredPrice.toFixed(2)} < $${RRC_COST.toFixed(2)} (Losing $${difference}/${UNIT})`;
    flagged = true;
  } else if (enteredPrice > INS_MAX_COST) {
    status = 'HIGH_FLAG';
    severity = 'error';
    const overage = (enteredPrice - INS_MAX_COST).toFixed(2);
    message = `ABOVE INSURER MAX: $${enteredPrice.toFixed(2)} > $${INS_MAX_COST.toFixed(2)} (Overpaid $${overage}/${UNIT})`;
    flagged = true;
  }

  // Calculate subtotals and variance (keep as numbers for accurate aggregation)
  const subtotal = Math.round((enteredPrice * enteredQty) * 100) / 100;
  const expectedSubtotal = Math.round((AVG_PRICE * enteredQty) * 100) / 100;
  const subtotalDifference = Math.round((subtotal - expectedSubtotal) * 100) / 100;

  return {
    item: itemName,
    status,
    message,
    flagged,
    severity,
    unit: UNIT,
    pricing: {
      rrcMin: RRC_COST,
      insMax: INS_MAX_COST,
      average: AVG_PRICE,
      entered: Math.round(enteredPrice * 100) / 100
    },
    quantity: Math.round(enteredQty * 100) / 100,
    subtotal,
    expectedSubtotal,
    subtotalDifference,
    subtotalString: subtotal.toFixed(2),
    expectedSubtotalString: expectedSubtotal.toFixed(2),
    subtotalDifferenceString: subtotalDifference.toFixed(2)
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
  
  const flaggedItems = results.filter(r => r.flagged);
  
  // Use numeric values directly (subtotal is now a number, not a string)
  const totalClaimValue = results.reduce((sum, r) => sum + (r.subtotal || 0), 0);
  const totalExpectedValue = results.reduce((sum, r) => sum + (r.expectedSubtotal || 0), 0);
  
  // For LOW_FLAG items: calculate expected value - actual value (should be positive)
  // This represents how much more the contractor should have charged
  const potentialUnderpayment = results
    .filter(r => r.status === 'LOW_FLAG')
    .reduce((sum, r) => {
      // For underpaid items: expected is higher than actual, so difference is negative
      // We want the absolute value to show how much is being lost
      return sum + Math.abs(r.subtotalDifference || 0);
    }, 0);
  
  // Round final values
  const totalClaimValueRounded = Math.round(totalClaimValue * 100) / 100;
  const totalExpectedValueRounded = Math.round(totalExpectedValue * 100) / 100;
  const varianceRounded = Math.round((totalClaimValue - totalExpectedValue) * 100) / 100;
  const potentialUnderpaymentRounded = Math.round(potentialUnderpayment * 100) / 100;

  return {
    totalItems: results.length,
    flaggedItems: flaggedItems.length,
    passedItems: results.length - flaggedItems.length,
    totalClaimValue: totalClaimValueRounded,
    totalExpectedValue: totalExpectedValueRounded,
    variance: varianceRounded,
    potentialUnderpayment: potentialUnderpaymentRounded,
    totalClaimValueString: totalClaimValueRounded.toFixed(2),
    totalExpectedValueString: totalExpectedValueRounded.toFixed(2),
    varianceString: varianceRounded.toFixed(2),
    potentialUnderpaymentString: potentialUnderpaymentRounded.toFixed(2),
    flagBreakdown: {
      lowFlags: results.filter(r => r.status === 'LOW_FLAG').length,
      highFlags: results.filter(r => r.status === 'HIGH_FLAG').length,
      missing: results.filter(r => r.status === 'MISSING_ITEM').length,
      invalid: results.filter(r => r.status === 'INVALID_QUANTITY').length
    },
    results
  };
}

// Legacy function for backward compatibility
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
  const { RRC_COST, INS_MAX_COST, AVG_PRICE, UNIT, SAMPLES } = priceData;
  
  let flag: AuditFlag = 'OK';
  let severity: AuditSeverity = 'none';
  
  if (userPrice < RRC_COST) {
    flag = 'Below market minimum';
    severity = 'error';
  } else if (userPrice > INS_MAX_COST) {
    flag = 'Above market maximum';
    severity = 'warning';
  } else if (userPrice < AVG_PRICE * 0.85) {
    flag = 'Significantly below average';
    severity = 'warning';
  } else if (userPrice > AVG_PRICE * 1.15) {
    flag = 'Significantly above average';
    severity = 'info';
  }
  
  const percentFromAvg = AVG_PRICE > 0 ? Number((((userPrice - AVG_PRICE) / AVG_PRICE) * 100).toFixed(1)) : 0;
  
  return {
    item: itemName,
    matchedItem: matchedKey,
    userPrice,
    min: RRC_COST,
    avg: AVG_PRICE,
    max: INS_MAX_COST,
    unit: UNIT,
    flag,
    severity,
    percentFromAvg,
    sampleSize: SAMPLES
  };
}

/**
 * Get market data for an item
 */
export function getMarketData(itemName: string): PriceDBItem | undefined {
  const matchedKey = fuzzyMatch(itemName);
  if (!matchedKey) return undefined;
  return typedPriceDB[matchedKey];
}

/**
 * Get all items for autocomplete
 */
export function getAllItems(): Array<{ name: string; unit: string; avgPrice: number }> {
  return Object.entries(typedPriceDB).map(([name, data]) => ({
    name,
    unit: data.UNIT,
    avgPrice: data.AVG_PRICE
  }));
}

/**
 * Search items by query
 */
export function searchItems(query: string): Array<{ name: string; data: PriceDBItem }> {
  const normalizedQuery = query.toLowerCase().trim();
  return Object.entries(typedPriceDB)
    .filter(([name]) => name.toLowerCase().includes(normalizedQuery))
    .map(([name, data]) => ({ name, data }));
}
