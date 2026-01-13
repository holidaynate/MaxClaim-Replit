import { describe, it, expect } from 'vitest';
import {
  normalizeTradeForMatching,
  matchesTrade,
  matchesLocation,
  calculateMatchScore,
  routeClaimToPartners,
  extractTradesFromClaimItems,
  selectWinningPartner,
  type RoutingCriteria
} from '../services/partnerRouter';
import type { Partner } from '../../shared/schema';

function createMockPartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: 'partner-1',
    companyName: 'Test Roofing Co',
    type: 'contractor',
    tier: 'advertiser',
    contactPerson: 'John Doe',
    email: 'test@example.com',
    password: null,
    emailVerified: true,
    phone: '555-1234',
    website: null,
    licenseNumber: null,
    zipCode: '75001',
    state: 'TX',
    subType: 'roofing',
    orgMembership: null,
    signingAgentId: null,
    planId: 'standard',
    billingStatus: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    serviceRegions: ['75001', '75002', '75003'],
    activeRegion: null,
    adConfig: { monthlyBudget: 500 },
    metrics: {},
    status: 'approved',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as Partner;
}

describe('PartnerRouter Service', () => {
  describe('normalizeTradeForMatching', () => {
    it('should normalize roofing variations', () => {
      expect(normalizeTradeForMatching('roofing')).toBe('roofing');
      expect(normalizeTradeForMatching('Roofer')).toBe('roofing');
      expect(normalizeTradeForMatching('roof specialist')).toBe('roofing');
    });

    it('should normalize flooring variations', () => {
      expect(normalizeTradeForMatching('flooring')).toBe('flooring');
      expect(normalizeTradeForMatching('carpet installer')).toBe('flooring');
      expect(normalizeTradeForMatching('tile')).toBe('flooring');
    });

    it('should normalize plumbing variations', () => {
      expect(normalizeTradeForMatching('plumbing')).toBe('plumbing');
      expect(normalizeTradeForMatching('plumber')).toBe('plumbing');
    });

    it('should return original for unknown trades', () => {
      expect(normalizeTradeForMatching('xyz specialty')).toBe('xyz specialty');
    });
  });

  describe('matchesTrade', () => {
    it('should match exact trade', () => {
      expect(matchesTrade('roofing', ['roofing'])).toBe(true);
    });

    it('should match similar trades', () => {
      expect(matchesTrade('roofer', ['roofing'])).toBe(true);
    });

    it('should not match different trades', () => {
      expect(matchesTrade('plumbing', ['roofing'])).toBe(false);
    });

    it('should match general contractor to any trade', () => {
      expect(matchesTrade('general', ['roofing', 'flooring'])).toBe(true);
    });

    it('should match when no trades required', () => {
      expect(matchesTrade('roofing', [])).toBe(true);
    });

    it('should not match null subType', () => {
      expect(matchesTrade(null, ['roofing'])).toBe(false);
    });
  });

  describe('matchesLocation', () => {
    it('should match exact ZIP code', () => {
      const partner = { zipCode: '75001', state: 'TX', serviceRegions: [] };
      const result = matchesLocation(partner, { zipCode: '75001' });
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('should match ZIP prefix (regional)', () => {
      const partner = { zipCode: '75001', state: 'TX', serviceRegions: [] };
      const result = matchesLocation(partner, { zipCode: '75099' });
      expect(result.matches).toBe(true);
      expect(result.score).toBe(0.8);
    });

    it('should match state', () => {
      const partner = { zipCode: '75001', state: 'TX', serviceRegions: [] };
      const result = matchesLocation(partner, { state: 'TX' });
      expect(result.matches).toBe(true);
      expect(result.score).toBe(0.6);
    });

    it('should match service regions', () => {
      const partner = { zipCode: '75001', state: 'TX', serviceRegions: ['90210'] };
      const result = matchesLocation(partner, { zipCode: '90210' });
      expect(result.matches).toBe(true);
      expect(result.score).toBe(0.9);
    });

    it('should not match different location', () => {
      const partner = { zipCode: '75001', state: 'TX', serviceRegions: [] };
      const result = matchesLocation(partner, { zipCode: '90210', state: 'CA' });
      expect(result.matches).toBe(false);
    });
  });

  describe('calculateMatchScore', () => {
    it('should calculate high score for perfect match', () => {
      const partner = createMockPartner({
        subType: 'roofing',
        zipCode: '75001',
        state: 'TX',
        tier: 'partner',
        billingStatus: 'active',
        adConfig: { monthlyBudget: 1000 }
      });

      const criteria: RoutingCriteria = {
        trades: ['roofing'],
        zipCode: '75001',
        state: 'TX'
      };

      const result = calculateMatchScore(partner, criteria);
      expect(result.score).toBeGreaterThan(70);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should give lower score for partial match', () => {
      const partner = createMockPartner({
        subType: 'plumbing',
        zipCode: '75001',
        tier: 'affiliate'
      });

      const criteria: RoutingCriteria = {
        trades: ['roofing'],
        zipCode: '75001'
      };

      const result = calculateMatchScore(partner, criteria);
      expect(result.score).toBeLessThan(50);
    });

    it('should apply tier weights', () => {
      const partnerTier = createMockPartner({ tier: 'partner', subType: 'roofing' });
      const affiliateTier = createMockPartner({ tier: 'affiliate', subType: 'roofing' });

      const criteria: RoutingCriteria = { trades: ['roofing'] };

      const partnerScore = calculateMatchScore(partnerTier, criteria);
      const affiliateScore = calculateMatchScore(affiliateTier, criteria);

      expect(partnerScore.score).toBeGreaterThan(affiliateScore.score);
    });
  });

  describe('routeClaimToPartners', () => {
    it('should filter out non-approved partners', () => {
      const partners = [
        createMockPartner({ id: 'p1', status: 'approved', subType: 'roofing' }),
        createMockPartner({ id: 'p2', status: 'pending', subType: 'roofing' }),
        createMockPartner({ id: 'p3', status: 'rejected', subType: 'roofing' })
      ];

      const result = routeClaimToPartners(partners, { trades: ['roofing'] });
      
      expect(result.eligiblePartners.length).toBe(1);
      expect(result.disqualifiedReasons['Not approved']).toBe(2);
    });

    it('should filter by trade', () => {
      const partners = [
        createMockPartner({ id: 'p1', status: 'approved', subType: 'roofing' }),
        createMockPartner({ id: 'p2', status: 'approved', subType: 'plumbing' })
      ];

      const result = routeClaimToPartners(partners, { trades: ['roofing'] });
      
      expect(result.eligiblePartners.length).toBe(1);
      expect(result.eligiblePartners[0].partnerId).toBe('p1');
    });

    it('should sort by match score', () => {
      const partners = [
        createMockPartner({ 
          id: 'p1', 
          status: 'approved', 
          subType: 'roofing', 
          tier: 'affiliate',
          adConfig: { monthlyBudget: 100 }
        }),
        createMockPartner({ 
          id: 'p2', 
          status: 'approved', 
          subType: 'roofing', 
          tier: 'partner',
          adConfig: { monthlyBudget: 2000 }
        })
      ];

      const result = routeClaimToPartners(partners, { trades: ['roofing'] });
      
      expect(result.eligiblePartners[0].partnerId).toBe('p2');
    });

    it('should respect limit', () => {
      const partners = Array.from({ length: 10 }, (_, i) =>
        createMockPartner({ id: `p${i}`, status: 'approved', subType: 'roofing' })
      );

      const result = routeClaimToPartners(partners, { trades: ['roofing'] }, 3);
      
      expect(result.eligiblePartners.length).toBe(3);
    });
  });

  describe('extractTradesFromClaimItems', () => {
    it('should extract trades from claim items', () => {
      const items = [
        { itemName: '3-tab shingle installation' },
        { itemName: 'Hardwood floor refinishing' },
        { itemName: 'Outlet replacement' }
      ];

      const trades = extractTradesFromClaimItems(items);
      
      expect(trades).toContain('roofing');
      expect(trades).toContain('flooring');
      expect(trades).toContain('electrical');
    });

    it('should deduplicate trades', () => {
      const items = [
        { itemName: 'Shingle repair' },
        { itemName: 'Shingle replacement' },
        { itemName: 'Ridge cap installation' }
      ];

      const trades = extractTradesFromClaimItems(items);
      
      expect(trades.length).toBe(1);
      expect(trades[0]).toBe('roofing');
    });
  });

  describe('selectWinningPartner', () => {
    it('should select highest score in highest_score mode', () => {
      const eligible = [
        { partnerId: 'p1', companyName: 'A', matchScore: 80, matchReasons: [], tier: 'partner' },
        { partnerId: 'p2', companyName: 'B', matchScore: 90, matchReasons: [], tier: 'partner' },
        { partnerId: 'p3', companyName: 'C', matchScore: 70, matchReasons: [], tier: 'partner' }
      ];

      const winner = selectWinningPartner(eligible, 'highest_score');
      
      expect(winner?.partnerId).toBe('p2');
    });

    it('should return null for empty list', () => {
      const winner = selectWinningPartner([]);
      expect(winner).toBeNull();
    });

    it('should select from weighted random', () => {
      const eligible = [
        { partnerId: 'p1', companyName: 'A', matchScore: 50, matchReasons: [], tier: 'partner' },
        { partnerId: 'p2', companyName: 'B', matchScore: 50, matchReasons: [], tier: 'partner' }
      ];

      const selections: Record<string, number> = { p1: 0, p2: 0 };
      for (let i = 0; i < 100; i++) {
        const winner = selectWinningPartner(eligible, 'weighted_random');
        if (winner) selections[winner.partnerId]++;
      }

      expect(selections.p1).toBeGreaterThan(20);
      expect(selections.p2).toBeGreaterThan(20);
    });
  });
});
