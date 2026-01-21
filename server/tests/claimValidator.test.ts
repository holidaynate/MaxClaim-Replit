import { describe, it, expect } from 'vitest';
import {
  validateLineItem,
  validateBatchItems,
  normalizeUnit,
  detectTrade,
  type LineItemInput
} from '../services/claimValidator';

describe('ClaimValidator Service', () => {
  describe('normalizeUnit', () => {
    it('should normalize common unit aliases', () => {
      expect(normalizeUnit('sq')).toBe('SQ');
      expect(normalizeUnit('square')).toBe('SQ');
      expect(normalizeUnit('sf')).toBe('SF');
      expect(normalizeUnit('sqft')).toBe('SF');
      expect(normalizeUnit('lf')).toBe('LF');
      expect(normalizeUnit('linear feet')).toBe('LF');
      expect(normalizeUnit('ea')).toBe('EA');
      expect(normalizeUnit('each')).toBe('EA');
      expect(normalizeUnit('gal')).toBe('GAL');
      expect(normalizeUnit('gallon')).toBe('GAL');
      expect(normalizeUnit('hr')).toBe('HR');
      expect(normalizeUnit('hour')).toBe('HR');
      expect(normalizeUnit('job')).toBe('JOB');
      expect(normalizeUnit('ls')).toBe('JOB');
    });

    it('should handle uppercase input', () => {
      expect(normalizeUnit('SQ')).toBe('SQ');
      expect(normalizeUnit('SF')).toBe('SF');
      expect(normalizeUnit('LF')).toBe('LF');
    });

    it('should handle whitespace', () => {
      expect(normalizeUnit('  sq  ')).toBe('SQ');
      expect(normalizeUnit(' linear feet ')).toBe('LF');
    });
  });

  describe('detectTrade', () => {
    it('should detect roofing trade from keywords', () => {
      expect(detectTrade('3-tab shingle installation')).toBe('roofing');
      expect(detectTrade('Roof underlayment')).toBe('roofing');
      expect(detectTrade('Ridge cap shingles')).toBe('roofing');
    });

    it('should detect flooring trade from keywords', () => {
      expect(detectTrade('Hardwood floor installation')).toBe('flooring');
      expect(detectTrade('Carpet padding')).toBe('flooring');
      expect(detectTrade('Vinyl plank flooring')).toBe('flooring');
    });

    it('should detect drywall trade from keywords', () => {
      expect(detectTrade('Drywall installation')).toBe('drywall');
      expect(detectTrade('Sheetrock repair')).toBe('drywall');
    });

    it('should detect electrical trade from keywords', () => {
      expect(detectTrade('Outlet replacement')).toBe('electrical');
      expect(detectTrade('Circuit breaker panel')).toBe('electrical');
    });

    it('should detect plumbing trade from keywords', () => {
      expect(detectTrade('Faucet replacement')).toBe('plumbing');
      expect(detectTrade('Water heater installation')).toBe('plumbing');
    });

    it('should use category hint when provided', () => {
      expect(detectTrade('Generic item', 'roofing')).toBe('roofing');
      expect(detectTrade('Generic item', 'flooring')).toBe('flooring');
    });

    it('should return null for unknown items', () => {
      expect(detectTrade('Random unrelated item')).toBeNull();
    });
  });

  describe('validateLineItem', () => {
    it('should validate a correct roofing item', () => {
      const input: LineItemInput = {
        itemName: '3-tab shingle installation',
        quantity: 25,
        unit: 'SQ',
        price: 350
      };
      
      const result = validateLineItem(input);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should flag invalid quantity', () => {
      const input: LineItemInput = {
        itemName: 'Shingle',
        quantity: 0,
        unit: 'SQ',
        price: 350
      };
      
      const result = validateLineItem(input);
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should flag negative price', () => {
      const input: LineItemInput = {
        itemName: 'Shingle',
        quantity: 10,
        unit: 'SQ',
        price: -100
      };
      
      const result = validateLineItem(input);
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.code === 'NEGATIVE_PRICE')).toBe(true);
    });

    it('should warn about unexpected unit for trade', () => {
      const input: LineItemInput = {
        itemName: 'Roof shingle',
        quantity: 10,
        unit: 'LF',
        price: 100
      };
      
      const result = validateLineItem(input);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'UNEXPECTED_UNIT')).toBe(true);
    });

    it('should warn about unusually high quantity', () => {
      const input: LineItemInput = {
        itemName: 'Roof shingle',
        quantity: 500,
        unit: 'SQ',
        price: 300
      };
      
      const result = validateLineItem(input);
      expect(result.warnings.some(w => w.code === 'HIGH_QUANTITY')).toBe(true);
    });

    it('should warn about unusually high price', () => {
      const input: LineItemInput = {
        itemName: 'Roof shingle',
        quantity: 10,
        unit: 'SQ',
        price: 5000
      };
      
      const result = validateLineItem(input);
      expect(result.warnings.some(w => w.code === 'HIGH_PRICE')).toBe(true);
    });

    it('should warn about high subtotal', () => {
      const input: LineItemInput = {
        itemName: 'Roof shingle',
        quantity: 100,
        unit: 'SQ',
        price: 1500
      };
      
      const result = validateLineItem(input);
      expect(result.warnings.some(w => w.code === 'HIGH_SUBTOTAL')).toBe(true);
    });

    it('should normalize unit in result', () => {
      const input: LineItemInput = {
        itemName: 'Floor tile',
        quantity: 100,
        unit: 'sqft',
        price: 5
      };
      
      const result = validateLineItem(input);
      expect(result.normalizedUnit).toBe('SF');
    });
  });

  describe('validateBatchItems', () => {
    it('should validate multiple items and provide summary', () => {
      const items: LineItemInput[] = [
        { itemName: 'Shingle roof', quantity: 25, unit: 'SQ', price: 350 },
        { itemName: 'Hardwood floor', quantity: 500, unit: 'SF', price: 8 },
        { itemName: 'Invalid item', quantity: 0, unit: 'EA', price: 100 }
      ];
      
      const { results, summary } = validateBatchItems(items);
      
      expect(results.length).toBe(3);
      expect(summary.totalItems).toBe(3);
      expect(summary.validItems).toBe(2);
      expect(summary.errorCount).toBeGreaterThan(0);
    });

    it('should count warnings by severity', () => {
      const items: LineItemInput[] = [
        { itemName: 'Roof shingle', quantity: 500, unit: 'SQ', price: 5000 }
      ];
      
      const { summary } = validateBatchItems(items);
      
      expect(summary.warningCount).toBeGreaterThan(0);
    });
  });
});
