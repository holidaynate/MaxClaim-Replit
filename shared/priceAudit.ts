import priceDB from './priceDB.json';

export type AuditFlag = 
  | 'OK'
  | 'Below market minimum'
  | 'Above market maximum'
  | 'Significantly below average'
  | 'Significantly above average'
  | 'No data available';

export type AuditSeverity = 'success' | 'warning' | 'error' | 'info';

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

export interface PriceDBItem {
  category: string;
  unit: string;
  prices: number[];
  min: number;
  max: number;
  avg: number;
}

const typedPriceDB = priceDB as Record<string, PriceDBItem>;

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

export function auditClaimItem(itemName: string, userPrice: number): PriceAuditResult {
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
  const { min, max, avg, unit, category, prices } = priceData;
  
  let flag: AuditFlag = 'OK';
  let severity: AuditSeverity = 'success';
  
  if (userPrice < min) {
    flag = 'Below market minimum';
    severity = 'error';
  } else if (userPrice > max) {
    flag = 'Above market maximum';
    severity = 'warning';
  } else if (userPrice < avg * 0.85) {
    flag = 'Significantly below average';
    severity = 'warning';
  } else if (userPrice > avg * 1.15) {
    flag = 'Significantly above average';
    severity = 'info';
  }
  
  const percentFromAvg = avg > 0 ? Number((((userPrice - avg) / avg) * 100).toFixed(1)) : 0;
  
  return {
    item: itemName,
    matchedItem: matchedKey,
    userPrice,
    min,
    avg,
    max,
    unit,
    category,
    flag,
    severity,
    percentFromAvg,
    sampleSize: prices.length
  };
}

export function getMarketData(itemName: string): PriceDBItem | undefined {
  const matchedKey = fuzzyMatch(itemName);
  if (!matchedKey) return undefined;
  return typedPriceDB[matchedKey];
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const item of Object.values(typedPriceDB)) {
    if (item.category) {
      categories.add(item.category);
    }
  }
  return Array.from(categories).sort();
}

export function getItemsByCategory(category: string): Array<{ name: string; data: PriceDBItem }> {
  return Object.entries(typedPriceDB)
    .filter(([_, data]) => data.category === category)
    .map(([name, data]) => ({ name, data }));
}

export function searchItems(query: string): Array<{ name: string; data: PriceDBItem }> {
  const normalizedQuery = query.toLowerCase().trim();
  return Object.entries(typedPriceDB)
    .filter(([name]) => name.toLowerCase().includes(normalizedQuery))
    .map(([name, data]) => ({ name, data }));
}
