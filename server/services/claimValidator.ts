/**
 * ClaimValidator Service
 * 
 * Enhanced validation for insurance claim line items with trade-specific rules,
 * unit validation, quantity checking, and warning system.
 */

export interface ValidationWarning {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  normalizedItem?: string;
  normalizedUnit?: string;
  normalizedQuantity?: number;
}

export interface LineItemInput {
  itemName: string;
  quantity: number;
  unit: string;
  price: number;
  category?: string;
}

type UnitType = 'SQ' | 'SF' | 'LF' | 'EA' | 'CT' | 'GAL' | 'HR' | 'JOB';

interface TradeRule {
  expectedUnits: UnitType[];
  minQuantity?: number;
  maxQuantity?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  keywords: string[];
}

const TRADE_RULES: Record<string, TradeRule> = {
  roofing: {
    expectedUnits: ['SQ'],
    minQuantity: 1,
    maxQuantity: 200,
    priceRangeMin: 100,
    priceRangeMax: 1500,
    keywords: ['shingle', 'roof', 'underlayment', 'flashing', 'ridge', 'gutter', 'fascia', 'soffit', 'drip edge']
  },
  flooring: {
    expectedUnits: ['SF'],
    minQuantity: 10,
    maxQuantity: 10000,
    priceRangeMin: 1,
    priceRangeMax: 50,
    keywords: ['floor', 'carpet', 'tile', 'hardwood', 'laminate', 'vinyl', 'plank', 'grout']
  },
  drywall: {
    expectedUnits: ['SF'],
    minQuantity: 10,
    maxQuantity: 5000,
    priceRangeMin: 0.5,
    priceRangeMax: 10,
    keywords: ['drywall', 'sheetrock', 'gypsum', 'wallboard', 'joint compound', 'tape', 'mud']
  },
  painting: {
    expectedUnits: ['SF', 'GAL'],
    minQuantity: 10,
    maxQuantity: 10000,
    priceRangeMin: 0.5,
    priceRangeMax: 15,
    keywords: ['paint', 'primer', 'stain', 'coat', 'finish', 'latex', 'enamel']
  },
  trim: {
    expectedUnits: ['LF'],
    minQuantity: 1,
    maxQuantity: 1000,
    priceRangeMin: 1,
    priceRangeMax: 50,
    keywords: ['trim', 'baseboard', 'crown', 'molding', 'casing', 'door frame', 'window frame']
  },
  plumbing: {
    expectedUnits: ['EA', 'HR', 'JOB'],
    minQuantity: 1,
    maxQuantity: 100,
    priceRangeMin: 50,
    priceRangeMax: 5000,
    keywords: ['faucet', 'toilet', 'sink', 'pipe', 'drain', 'valve', 'water heater', 'disposal']
  },
  electrical: {
    expectedUnits: ['EA', 'HR', 'JOB'],
    minQuantity: 1,
    maxQuantity: 100,
    priceRangeMin: 25,
    priceRangeMax: 3000,
    keywords: ['outlet', 'switch', 'panel', 'breaker', 'wire', 'fixture', 'light', 'fan', 'circuit']
  },
  hvac: {
    expectedUnits: ['EA', 'HR', 'JOB'],
    minQuantity: 1,
    maxQuantity: 20,
    priceRangeMin: 100,
    priceRangeMax: 15000,
    keywords: ['hvac', 'furnace', 'ac', 'air conditioning', 'duct', 'thermostat', 'compressor', 'coil']
  },
  windows: {
    expectedUnits: ['EA', 'SF'],
    minQuantity: 1,
    maxQuantity: 100,
    priceRangeMin: 100,
    priceRangeMax: 2000,
    keywords: ['window', 'glass', 'pane', 'frame', 'screen', 'sash', 'double-hung', 'casement']
  },
  doors: {
    expectedUnits: ['EA'],
    minQuantity: 1,
    maxQuantity: 50,
    priceRangeMin: 100,
    priceRangeMax: 3000,
    keywords: ['door', 'entry', 'interior', 'exterior', 'slab', 'pre-hung', 'hardware', 'knob', 'lock']
  },
  appliances: {
    expectedUnits: ['EA'],
    minQuantity: 1,
    maxQuantity: 20,
    priceRangeMin: 200,
    priceRangeMax: 5000,
    keywords: ['refrigerator', 'dishwasher', 'stove', 'oven', 'microwave', 'washer', 'dryer', 'range']
  },
  cabinets: {
    expectedUnits: ['LF', 'EA'],
    minQuantity: 1,
    maxQuantity: 100,
    priceRangeMin: 100,
    priceRangeMax: 1500,
    keywords: ['cabinet', 'counter', 'countertop', 'vanity', 'drawer', 'shelf']
  }
};

const UNIT_ALIASES: Record<string, UnitType> = {
  'sq': 'SQ',
  'square': 'SQ',
  'squares': 'SQ',
  'sf': 'SF',
  'sqft': 'SF',
  'sq ft': 'SF',
  'square feet': 'SF',
  'square foot': 'SF',
  'lf': 'LF',
  'linft': 'LF',
  'linear feet': 'LF',
  'linear foot': 'LF',
  'ea': 'EA',
  'each': 'EA',
  'pc': 'EA',
  'piece': 'EA',
  'pieces': 'EA',
  'ct': 'CT',
  'count': 'CT',
  'gal': 'GAL',
  'gallon': 'GAL',
  'gallons': 'GAL',
  'hr': 'HR',
  'hour': 'HR',
  'hours': 'HR',
  'job': 'JOB',
  'ls': 'JOB',
  'lump sum': 'JOB'
};

export function normalizeUnit(unit: string): UnitType | null {
  const normalized = unit.toLowerCase().trim();
  return UNIT_ALIASES[normalized] || (normalized.toUpperCase() as UnitType) || null;
}

export function detectTrade(itemName: string, category?: string): string | null {
  const lowerName = itemName.toLowerCase();
  const lowerCategory = category?.toLowerCase();
  
  if (lowerCategory && TRADE_RULES[lowerCategory]) {
    return lowerCategory;
  }
  
  for (const [trade, rule] of Object.entries(TRADE_RULES)) {
    for (const keyword of rule.keywords) {
      if (lowerName.includes(keyword)) {
        return trade;
      }
    }
  }
  
  return null;
}

export function validateLineItem(input: LineItemInput): ValidationResult {
  const warnings: ValidationWarning[] = [];
  let isValid = true;
  
  const normalizedUnit = normalizeUnit(input.unit);
  const detectedTrade = detectTrade(input.itemName, input.category);
  
  if (!normalizedUnit) {
    warnings.push({
      code: 'UNKNOWN_UNIT',
      severity: 'warning',
      message: `Unknown unit type: "${input.unit}"`,
      suggestion: 'Use standard units like SQ, SF, LF, EA, or GAL'
    });
  }
  
  if (input.quantity <= 0) {
    warnings.push({
      code: 'INVALID_QUANTITY',
      severity: 'error',
      message: 'Quantity must be greater than zero'
    });
    isValid = false;
  }
  
  if (!Number.isFinite(input.quantity)) {
    warnings.push({
      code: 'INVALID_QUANTITY',
      severity: 'error',
      message: 'Quantity must be a valid number'
    });
    isValid = false;
  }
  
  if (input.price < 0) {
    warnings.push({
      code: 'NEGATIVE_PRICE',
      severity: 'error',
      message: 'Price cannot be negative'
    });
    isValid = false;
  }
  
  if (detectedTrade && normalizedUnit) {
    const tradeRule = TRADE_RULES[detectedTrade];
    
    if (!tradeRule.expectedUnits.includes(normalizedUnit)) {
      warnings.push({
        code: 'UNEXPECTED_UNIT',
        severity: 'warning',
        message: `"${normalizedUnit}" is unusual for ${detectedTrade} items`,
        suggestion: `Expected units: ${tradeRule.expectedUnits.join(', ')}`
      });
    }
    
    if (tradeRule.minQuantity && input.quantity < tradeRule.minQuantity) {
      warnings.push({
        code: 'LOW_QUANTITY',
        severity: 'info',
        message: `Quantity ${input.quantity} is unusually low for ${detectedTrade}`,
        suggestion: `Typical range: ${tradeRule.minQuantity} - ${tradeRule.maxQuantity} ${normalizedUnit}`
      });
    }
    
    if (tradeRule.maxQuantity && input.quantity > tradeRule.maxQuantity) {
      warnings.push({
        code: 'HIGH_QUANTITY',
        severity: 'warning',
        message: `Quantity ${input.quantity} seems unusually high for ${detectedTrade}`,
        suggestion: `Verify this is correct. Typical range: ${tradeRule.minQuantity} - ${tradeRule.maxQuantity} ${normalizedUnit}`
      });
    }
    
    if (tradeRule.priceRangeMin && input.price < tradeRule.priceRangeMin) {
      warnings.push({
        code: 'LOW_PRICE',
        severity: 'info',
        message: `Price $${input.price} per ${normalizedUnit} is below typical range for ${detectedTrade}`,
        suggestion: `Typical range: $${tradeRule.priceRangeMin} - $${tradeRule.priceRangeMax} per ${normalizedUnit}`
      });
    }
    
    if (tradeRule.priceRangeMax && input.price > tradeRule.priceRangeMax) {
      warnings.push({
        code: 'HIGH_PRICE',
        severity: 'warning',
        message: `Price $${input.price} per ${normalizedUnit} is above typical range for ${detectedTrade}`,
        suggestion: `Typical range: $${tradeRule.priceRangeMin} - $${tradeRule.priceRangeMax} per ${normalizedUnit}`
      });
    }
  }
  
  const subtotal = input.price * input.quantity;
  if (subtotal > 100000) {
    warnings.push({
      code: 'HIGH_SUBTOTAL',
      severity: 'warning',
      message: `Line item subtotal ($${subtotal.toLocaleString()}) exceeds $100,000`,
      suggestion: 'Please verify quantity and price are correct'
    });
  }
  
  return {
    isValid,
    warnings,
    normalizedItem: input.itemName.trim(),
    normalizedUnit: normalizedUnit || undefined,
    normalizedQuantity: input.quantity
  };
}

export function validateBatchItems(items: LineItemInput[]): {
  results: ValidationResult[];
  summary: {
    totalItems: number;
    validItems: number;
    itemsWithWarnings: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
} {
  const results = items.map(item => validateLineItem(item));
  
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  
  for (const result of results) {
    for (const warning of result.warnings) {
      switch (warning.severity) {
        case 'error':
          errorCount++;
          break;
        case 'warning':
          warningCount++;
          break;
        case 'info':
          infoCount++;
          break;
      }
    }
  }
  
  return {
    results,
    summary: {
      totalItems: items.length,
      validItems: results.filter(r => r.isValid).length,
      itemsWithWarnings: results.filter(r => r.warnings.length > 0).length,
      errorCount,
      warningCount,
      infoCount
    }
  };
}

export const claimValidator = {
  validateLineItem,
  validateBatchItems,
  normalizeUnit,
  detectTrade,
  getTradeRules: () => TRADE_RULES,
  getUnitAliases: () => UNIT_ALIASES
};

export default claimValidator;
