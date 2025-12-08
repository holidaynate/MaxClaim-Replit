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
 * Baseline Pricing Engine with Multi-Source Citation
 * 
 * Provides fallback FMV estimates when user hasn't provided their own pricing data.
 * All estimates cite data sources for transparency and defensibility.
 * 
 * Data Sources:
 * - RSMeans baseline methodology (industry standard reference)
 * - PrecisionEstimator open-source rate structure (MIT license)
 * - AI Estimator roofing calculations (Apache-2.0 license)
 * - HUD regional adjustment factors
 * - NRCA/WSRCA industry association guidelines
 */

// Unit types supported
export type UnitType = 'SF' | 'LF' | 'SQ' | 'CT' | 'EA';

export interface LineItemRate {
  name: string;
  description: string;
  laborRate: number;       // Labor cost per unit
  materialRate: number;    // Material cost per unit
  unit: UnitType;
  wasteFactor: number;     // 1.0 = no waste, 1.10 = 10% waste
  source: string;          // Data source citation
  lastUpdated: string;     // ISO date of last update
}

export interface CategoryPricing {
  category: string;
  lineItems: LineItemRate[];
  defaultWasteFactor: number;
}

// State-level regional cost adjustment factors
// Based on BLS construction cost indices and regional market data
export const STATE_COST_MULTIPLIERS: Record<string, { multiplier: number; source: string }> = {
  // High-cost states (1.15+)
  CA: { multiplier: 1.28, source: "BLS CPI West Region 2024" },
  NY: { multiplier: 1.32, source: "BLS CPI Northeast 2024" },
  MA: { multiplier: 1.25, source: "BLS CPI Northeast 2024" },
  CT: { multiplier: 1.22, source: "BLS CPI Northeast 2024" },
  NJ: { multiplier: 1.20, source: "BLS CPI Northeast 2024" },
  WA: { multiplier: 1.18, source: "BLS CPI West Region 2024" },
  HI: { multiplier: 1.35, source: "BLS CPI West Region 2024" },
  AK: { multiplier: 1.30, source: "BLS CPI West Region 2024" },
  DC: { multiplier: 1.25, source: "BLS CPI Northeast 2024" },
  MD: { multiplier: 1.15, source: "BLS CPI Northeast 2024" },
  
  // Above-average states (1.05-1.14)
  OR: { multiplier: 1.12, source: "BLS CPI West Region 2024" },
  CO: { multiplier: 1.10, source: "BLS CPI West Region 2024" },
  VA: { multiplier: 1.08, source: "BLS CPI South Region 2024" },
  IL: { multiplier: 1.12, source: "BLS CPI Midwest 2024" },
  MN: { multiplier: 1.08, source: "BLS CPI Midwest 2024" },
  NH: { multiplier: 1.10, source: "BLS CPI Northeast 2024" },
  VT: { multiplier: 1.08, source: "BLS CPI Northeast 2024" },
  RI: { multiplier: 1.12, source: "BLS CPI Northeast 2024" },
  DE: { multiplier: 1.06, source: "BLS CPI Northeast 2024" },
  PA: { multiplier: 1.05, source: "BLS CPI Northeast 2024" },
  NV: { multiplier: 1.08, source: "BLS CPI West Region 2024" },
  AZ: { multiplier: 1.05, source: "BLS CPI West Region 2024" },
  
  // Average-cost states (0.95-1.04)
  FL: { multiplier: 1.02, source: "BLS CPI South Region 2024" },
  TX: { multiplier: 0.98, source: "BLS CPI South Region 2024" },
  GA: { multiplier: 1.00, source: "BLS CPI South Region 2024" },
  NC: { multiplier: 0.98, source: "BLS CPI South Region 2024" },
  SC: { multiplier: 0.96, source: "BLS CPI South Region 2024" },
  TN: { multiplier: 0.95, source: "BLS CPI South Region 2024" },
  OH: { multiplier: 1.00, source: "BLS CPI Midwest 2024" },
  MI: { multiplier: 1.02, source: "BLS CPI Midwest 2024" },
  WI: { multiplier: 1.00, source: "BLS CPI Midwest 2024" },
  IN: { multiplier: 0.96, source: "BLS CPI Midwest 2024" },
  MO: { multiplier: 0.95, source: "BLS CPI Midwest 2024" },
  IA: { multiplier: 0.95, source: "BLS CPI Midwest 2024" },
  KS: { multiplier: 0.94, source: "BLS CPI Midwest 2024" },
  NE: { multiplier: 0.94, source: "BLS CPI Midwest 2024" },
  UT: { multiplier: 1.02, source: "BLS CPI West Region 2024" },
  NM: { multiplier: 0.95, source: "BLS CPI West Region 2024" },
  MT: { multiplier: 0.98, source: "BLS CPI West Region 2024" },
  ID: { multiplier: 0.96, source: "BLS CPI West Region 2024" },
  WY: { multiplier: 0.95, source: "BLS CPI West Region 2024" },
  ND: { multiplier: 0.94, source: "BLS CPI Midwest 2024" },
  SD: { multiplier: 0.92, source: "BLS CPI Midwest 2024" },
  
  // Below-average states (0.85-0.94)
  LA: { multiplier: 0.92, source: "BLS CPI South Region 2024" },
  AL: { multiplier: 0.90, source: "BLS CPI South Region 2024" },
  MS: { multiplier: 0.88, source: "BLS CPI South Region 2024" },
  AR: { multiplier: 0.88, source: "BLS CPI South Region 2024" },
  KY: { multiplier: 0.90, source: "BLS CPI South Region 2024" },
  WV: { multiplier: 0.88, source: "BLS CPI South Region 2024" },
  OK: { multiplier: 0.90, source: "BLS CPI South Region 2024" },
  ME: { multiplier: 0.95, source: "BLS CPI Northeast 2024" },
};

// Default multiplier for unlisted states
const DEFAULT_STATE_MULTIPLIER = { multiplier: 1.0, source: "National Average 2024" };

/**
 * Baseline pricing data organized by category
 * Rates based on 2024 national averages, adjusted regionally
 */
export const BASELINE_PRICING: CategoryPricing[] = [
  {
    category: "Roofing",
    defaultWasteFactor: 1.15,  // 15% waste typical for roofing
    lineItems: [
      {
        name: "Asphalt Shingle - 3-Tab",
        description: "Standard 3-tab asphalt shingle removal and replacement",
        laborRate: 150,
        materialRate: 120,
        unit: "SQ",
        wasteFactor: 1.12,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Asphalt Shingle - Architectural",
        description: "Architectural/dimensional asphalt shingle installation",
        laborRate: 180,
        materialRate: 180,
        unit: "SQ",
        wasteFactor: 1.12,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Metal Roofing - Standing Seam",
        description: "Standing seam metal roofing installation",
        laborRate: 350,
        materialRate: 450,
        unit: "SQ",
        wasteFactor: 1.08,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Roof Decking - Plywood",
        description: "Plywood roof decking replacement (1/2\" CDX)",
        laborRate: 25,
        materialRate: 45,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Underlayment - Felt",
        description: "15# or 30# felt underlayment installation",
        laborRate: 15,
        materialRate: 12,
        unit: "SQ",
        wasteFactor: 1.05,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Underlayment - Synthetic",
        description: "Synthetic underlayment installation",
        laborRate: 18,
        materialRate: 35,
        unit: "SQ",
        wasteFactor: 1.05,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Ridge Cap",
        description: "Hip and ridge cap shingles",
        laborRate: 3.50,
        materialRate: 4.50,
        unit: "LF",
        wasteFactor: 1.08,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Flashing - Step",
        description: "Step flashing at wall intersections",
        laborRate: 8,
        materialRate: 5,
        unit: "LF",
        wasteFactor: 1.10,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Flashing - Valley",
        description: "Valley flashing installation",
        laborRate: 12,
        materialRate: 8,
        unit: "LF",
        wasteFactor: 1.08,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drip Edge",
        description: "Drip edge installation",
        laborRate: 2.50,
        materialRate: 2.00,
        unit: "LF",
        wasteFactor: 1.05,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Ice & Water Shield",
        description: "Self-adhering ice and water barrier",
        laborRate: 35,
        materialRate: 85,
        unit: "SQ",
        wasteFactor: 1.05,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Ventilation - Ridge Vent",
        description: "Ridge vent installation",
        laborRate: 5,
        materialRate: 4,
        unit: "LF",
        wasteFactor: 1.05,
        source: "NRCA Roofing Cost Guide 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Gutter - Aluminum",
        description: "5\" aluminum seamless gutter",
        laborRate: 6,
        materialRate: 5,
        unit: "LF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Downspout",
        description: "Aluminum downspout installation",
        laborRate: 8,
        materialRate: 6,
        unit: "LF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Flooring",
    defaultWasteFactor: 1.10,
    lineItems: [
      {
        name: "LVP - Luxury Vinyl Plank",
        description: "Luxury vinyl plank flooring installation",
        laborRate: 3.50,
        materialRate: 4.00,
        unit: "SF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "LVT - Luxury Vinyl Tile",
        description: "Luxury vinyl tile flooring installation",
        laborRate: 3.75,
        materialRate: 3.50,
        unit: "SF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Laminate Flooring",
        description: "Laminate flooring installation with underlayment",
        laborRate: 2.50,
        materialRate: 2.75,
        unit: "SF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Hardwood - Engineered",
        description: "Engineered hardwood flooring installation",
        laborRate: 4.50,
        materialRate: 6.00,
        unit: "SF",
        wasteFactor: 1.12,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Hardwood - Solid",
        description: "Solid hardwood flooring installation (nail-down)",
        laborRate: 5.50,
        materialRate: 8.00,
        unit: "SF",
        wasteFactor: 1.12,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Carpet - Standard",
        description: "Standard carpet with padding",
        laborRate: 1.50,
        materialRate: 3.50,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Carpet - Premium",
        description: "Premium carpet with upgraded padding",
        laborRate: 1.75,
        materialRate: 6.00,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Flooring Removal",
        description: "Existing flooring removal and disposal",
        laborRate: 1.25,
        materialRate: 0.25,
        unit: "SF",
        wasteFactor: 1.0,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Subfloor Repair",
        description: "Plywood subfloor repair/replacement",
        laborRate: 3.00,
        materialRate: 2.50,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Drywall",
    defaultWasteFactor: 1.10,
    lineItems: [
      {
        name: "Drywall - 1/2\" Standard",
        description: "1/2\" drywall installation (hang, tape, finish)",
        laborRate: 1.75,
        materialRate: 0.85,
        unit: "SF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drywall - 5/8\" Fire-Rated",
        description: "5/8\" Type X fire-rated drywall installation",
        laborRate: 2.00,
        materialRate: 1.10,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drywall - Moisture Resistant",
        description: "Moisture-resistant (green board) drywall",
        laborRate: 2.00,
        materialRate: 1.25,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drywall Repair - Small Patch",
        description: "Small hole/patch repair (up to 6\")",
        laborRate: 45,
        materialRate: 15,
        unit: "EA",
        wasteFactor: 1.0,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drywall Repair - Large Patch",
        description: "Large patch repair (6\" to 24\")",
        laborRate: 85,
        materialRate: 25,
        unit: "EA",
        wasteFactor: 1.0,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drywall - Texture Match",
        description: "Texture matching (orange peel, knockdown, etc.)",
        laborRate: 0.75,
        materialRate: 0.25,
        unit: "SF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drywall Removal",
        description: "Drywall removal and disposal",
        laborRate: 0.65,
        materialRate: 0.15,
        unit: "SF",
        wasteFactor: 1.0,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Painting",
    defaultWasteFactor: 1.05,
    lineItems: [
      {
        name: "Interior Paint - Walls",
        description: "Interior wall painting (2 coats, standard finish)",
        laborRate: 1.75,
        materialRate: 0.50,
        unit: "SF",
        wasteFactor: 1.05,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Interior Paint - Ceiling",
        description: "Ceiling painting (flat finish)",
        laborRate: 1.50,
        materialRate: 0.45,
        unit: "SF",
        wasteFactor: 1.05,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Interior Paint - Trim",
        description: "Trim/baseboard painting (semi-gloss)",
        laborRate: 2.50,
        materialRate: 0.75,
        unit: "LF",
        wasteFactor: 1.05,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Interior Paint - Door",
        description: "Interior door painting (both sides)",
        laborRate: 75,
        materialRate: 15,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Exterior Paint - Siding",
        description: "Exterior siding painting (2 coats)",
        laborRate: 2.25,
        materialRate: 0.65,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Exterior Paint - Trim",
        description: "Exterior trim painting",
        laborRate: 3.00,
        materialRate: 0.85,
        unit: "LF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Stain - Wood",
        description: "Wood staining (decks, fences, etc.)",
        laborRate: 2.00,
        materialRate: 0.75,
        unit: "SF",
        wasteFactor: 1.08,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Primer - Stain Blocking",
        description: "Stain-blocking primer application",
        laborRate: 0.85,
        materialRate: 0.40,
        unit: "SF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Plumbing",
    defaultWasteFactor: 1.05,
    lineItems: [
      {
        name: "Toilet - Standard",
        description: "Standard toilet replacement",
        laborRate: 150,
        materialRate: 200,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Faucet - Kitchen",
        description: "Kitchen faucet replacement",
        laborRate: 125,
        materialRate: 175,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Faucet - Bathroom",
        description: "Bathroom faucet replacement",
        laborRate: 100,
        materialRate: 125,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Water Heater - Tank (40 gal)",
        description: "40-gallon tank water heater replacement",
        laborRate: 350,
        materialRate: 650,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Water Heater - Tankless",
        description: "Tankless water heater installation",
        laborRate: 500,
        materialRate: 1200,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Pipe Repair - Copper",
        description: "Copper pipe repair (per linear foot)",
        laborRate: 45,
        materialRate: 15,
        unit: "LF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Pipe Repair - PEX",
        description: "PEX pipe repair (per linear foot)",
        laborRate: 25,
        materialRate: 8,
        unit: "LF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Drain Cleaning",
        description: "Professional drain cleaning",
        laborRate: 150,
        materialRate: 25,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Electrical",
    defaultWasteFactor: 1.05,
    lineItems: [
      {
        name: "Outlet - Standard",
        description: "Standard duplex outlet installation",
        laborRate: 75,
        materialRate: 15,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Outlet - GFCI",
        description: "GFCI outlet installation",
        laborRate: 95,
        materialRate: 35,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Switch - Standard",
        description: "Standard light switch replacement",
        laborRate: 65,
        materialRate: 12,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Light Fixture - Standard",
        description: "Standard light fixture replacement",
        laborRate: 85,
        materialRate: 75,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Ceiling Fan",
        description: "Ceiling fan installation (existing box)",
        laborRate: 125,
        materialRate: 150,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Panel Upgrade - 200A",
        description: "200-amp electrical panel upgrade",
        laborRate: 1200,
        materialRate: 800,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Circuit Breaker",
        description: "Circuit breaker replacement",
        laborRate: 85,
        materialRate: 45,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Wire Run - 12/2 NM",
        description: "New circuit wire run (12/2 NM-B)",
        laborRate: 12,
        materialRate: 3,
        unit: "LF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "HVAC",
    defaultWasteFactor: 1.0,
    lineItems: [
      {
        name: "AC Unit - Central (3 ton)",
        description: "3-ton central AC unit replacement",
        laborRate: 2500,
        materialRate: 3500,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Furnace - Gas",
        description: "Gas furnace replacement (80,000 BTU)",
        laborRate: 1500,
        materialRate: 2000,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Heat Pump",
        description: "Heat pump system replacement (3 ton)",
        laborRate: 2800,
        materialRate: 4200,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Ductwork - New",
        description: "New ductwork installation (per linear foot)",
        laborRate: 25,
        materialRate: 15,
        unit: "LF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Ductwork - Repair",
        description: "Ductwork repair/sealing",
        laborRate: 15,
        materialRate: 8,
        unit: "LF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Thermostat - Smart",
        description: "Smart thermostat installation",
        laborRate: 100,
        materialRate: 200,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Refrigerant Recharge",
        description: "AC refrigerant recharge (R-410A)",
        laborRate: 150,
        materialRate: 100,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Windows & Doors",
    defaultWasteFactor: 1.05,
    lineItems: [
      {
        name: "Window - Double-Hung Vinyl",
        description: "Standard double-hung vinyl window replacement",
        laborRate: 175,
        materialRate: 350,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Window - Casement",
        description: "Casement window replacement",
        laborRate: 200,
        materialRate: 425,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Window - Picture/Fixed",
        description: "Large picture/fixed window",
        laborRate: 225,
        materialRate: 500,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Sliding Glass Door",
        description: "Sliding glass door replacement",
        laborRate: 350,
        materialRate: 800,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Entry Door - Steel",
        description: "Steel entry door with frame",
        laborRate: 300,
        materialRate: 600,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Entry Door - Fiberglass",
        description: "Fiberglass entry door with frame",
        laborRate: 325,
        materialRate: 900,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Interior Door - Hollow Core",
        description: "Interior hollow-core door (prehung)",
        laborRate: 125,
        materialRate: 120,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Interior Door - Solid Core",
        description: "Interior solid-core door (prehung)",
        laborRate: 150,
        materialRate: 250,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Garage Door - Single",
        description: "Single-car garage door replacement",
        laborRate: 400,
        materialRate: 800,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Garage Door - Double",
        description: "Double-car garage door replacement",
        laborRate: 500,
        materialRate: 1400,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Appliances",
    defaultWasteFactor: 1.0,
    lineItems: [
      {
        name: "Refrigerator - Standard",
        description: "Standard refrigerator replacement",
        laborRate: 100,
        materialRate: 800,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Dishwasher",
        description: "Dishwasher replacement",
        laborRate: 150,
        materialRate: 550,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Range/Oven - Electric",
        description: "Electric range/oven replacement",
        laborRate: 125,
        materialRate: 650,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Range/Oven - Gas",
        description: "Gas range/oven replacement",
        laborRate: 175,
        materialRate: 750,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Microwave - Over Range",
        description: "Over-the-range microwave installation",
        laborRate: 125,
        materialRate: 350,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Washer",
        description: "Washing machine replacement",
        laborRate: 75,
        materialRate: 650,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Dryer - Electric",
        description: "Electric dryer replacement",
        laborRate: 75,
        materialRate: 550,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Dryer - Gas",
        description: "Gas dryer replacement",
        laborRate: 125,
        materialRate: 650,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Retail Average 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Cabinets",
    defaultWasteFactor: 1.0,
    lineItems: [
      {
        name: "Base Cabinet - Stock",
        description: "Stock base cabinet installation",
        laborRate: 65,
        materialRate: 150,
        unit: "LF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Wall Cabinet - Stock",
        description: "Stock wall cabinet installation",
        laborRate: 55,
        materialRate: 125,
        unit: "LF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Base Cabinet - Semi-Custom",
        description: "Semi-custom base cabinet installation",
        laborRate: 75,
        materialRate: 275,
        unit: "LF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Wall Cabinet - Semi-Custom",
        description: "Semi-custom wall cabinet installation",
        laborRate: 65,
        materialRate: 225,
        unit: "LF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Cabinet Refacing",
        description: "Cabinet door/drawer front refacing",
        laborRate: 45,
        materialRate: 85,
        unit: "LF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Countertop - Laminate",
        description: "Laminate countertop installation",
        laborRate: 25,
        materialRate: 35,
        unit: "LF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Countertop - Granite",
        description: "Granite countertop installation",
        laborRate: 45,
        materialRate: 85,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Countertop - Quartz",
        description: "Quartz countertop installation",
        laborRate: 45,
        materialRate: 95,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Tile",
    defaultWasteFactor: 1.12,
    lineItems: [
      {
        name: "Floor Tile - Ceramic",
        description: "Ceramic floor tile installation",
        laborRate: 6.00,
        materialRate: 3.50,
        unit: "SF",
        wasteFactor: 1.12,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Floor Tile - Porcelain",
        description: "Porcelain floor tile installation",
        laborRate: 7.00,
        materialRate: 5.00,
        unit: "SF",
        wasteFactor: 1.12,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Floor Tile - Natural Stone",
        description: "Natural stone floor tile installation",
        laborRate: 9.00,
        materialRate: 12.00,
        unit: "SF",
        wasteFactor: 1.15,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Wall Tile - Ceramic",
        description: "Ceramic wall tile installation",
        laborRate: 7.00,
        materialRate: 3.00,
        unit: "SF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Backsplash - Standard",
        description: "Standard backsplash tile installation",
        laborRate: 8.00,
        materialRate: 4.50,
        unit: "SF",
        wasteFactor: 1.15,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Backsplash - Mosaic",
        description: "Mosaic backsplash tile installation",
        laborRate: 12.00,
        materialRate: 15.00,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Shower Tile",
        description: "Shower wall/floor tile installation",
        laborRate: 10.00,
        materialRate: 6.00,
        unit: "SF",
        wasteFactor: 1.12,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Tile Removal",
        description: "Existing tile removal and disposal",
        laborRate: 3.50,
        materialRate: 0.50,
        unit: "SF",
        wasteFactor: 1.0,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Trim",
    defaultWasteFactor: 1.08,
    lineItems: [
      {
        name: "Baseboard - Standard",
        description: "Standard baseboard installation (3-1/4\")",
        laborRate: 3.50,
        materialRate: 1.75,
        unit: "LF",
        wasteFactor: 1.08,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Baseboard - Premium",
        description: "Premium baseboard installation (5-1/4\"+)",
        laborRate: 4.25,
        materialRate: 3.50,
        unit: "LF",
        wasteFactor: 1.08,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Crown Molding - Standard",
        description: "Standard crown molding installation",
        laborRate: 5.00,
        materialRate: 2.50,
        unit: "LF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Crown Molding - Premium",
        description: "Premium/multi-piece crown molding",
        laborRate: 8.00,
        materialRate: 6.00,
        unit: "LF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Window Casing",
        description: "Window casing/trim installation",
        laborRate: 45,
        materialRate: 25,
        unit: "EA",
        wasteFactor: 1.05,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Door Casing",
        description: "Door casing/trim installation",
        laborRate: 55,
        materialRate: 30,
        unit: "EA",
        wasteFactor: 1.05,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Quarter Round",
        description: "Quarter round installation",
        laborRate: 1.50,
        materialRate: 0.75,
        unit: "LF",
        wasteFactor: 1.08,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Shoe Molding",
        description: "Shoe molding installation",
        laborRate: 1.75,
        materialRate: 0.85,
        unit: "LF",
        wasteFactor: 1.08,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Framing",
    defaultWasteFactor: 1.10,
    lineItems: [
      {
        name: "Wall Framing - Interior",
        description: "Interior wall framing (2x4 @ 16\" OC)",
        laborRate: 5.50,
        materialRate: 3.00,
        unit: "SF",
        wasteFactor: 1.10,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Wall Framing - Exterior",
        description: "Exterior wall framing (2x6 @ 16\" OC)",
        laborRate: 7.00,
        materialRate: 4.50,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Header Installation",
        description: "Door/window header installation",
        laborRate: 85,
        materialRate: 45,
        unit: "EA",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Sistering Joists",
        description: "Floor joist sistering/reinforcement",
        laborRate: 18,
        materialRate: 8,
        unit: "LF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Stud Replacement",
        description: "Wall stud replacement",
        laborRate: 45,
        materialRate: 15,
        unit: "EA",
        wasteFactor: 1.0,
        source: "PrecisionEstimator Rate Sheet 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Siding",
    defaultWasteFactor: 1.10,
    lineItems: [
      {
        name: "Vinyl Siding",
        description: "Vinyl siding installation",
        laborRate: 3.50,
        materialRate: 3.00,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Fiber Cement Siding",
        description: "Fiber cement siding (HardiPlank) installation",
        laborRate: 5.00,
        materialRate: 4.50,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Wood Siding",
        description: "Wood lap siding installation",
        laborRate: 6.00,
        materialRate: 5.50,
        unit: "SF",
        wasteFactor: 1.12,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Soffit - Vinyl",
        description: "Vinyl soffit installation",
        laborRate: 4.00,
        materialRate: 3.50,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Fascia - Aluminum",
        description: "Aluminum fascia installation",
        laborRate: 5.00,
        materialRate: 3.50,
        unit: "LF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Siding Repair",
        description: "Siding repair (per section)",
        laborRate: 75,
        materialRate: 50,
        unit: "EA",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Insulation",
    defaultWasteFactor: 1.05,
    lineItems: [
      {
        name: "Batt Insulation - R-13",
        description: "R-13 fiberglass batt insulation (walls)",
        laborRate: 0.65,
        materialRate: 0.55,
        unit: "SF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Batt Insulation - R-19",
        description: "R-19 fiberglass batt insulation (floors/walls)",
        laborRate: 0.75,
        materialRate: 0.75,
        unit: "SF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Batt Insulation - R-30",
        description: "R-30 fiberglass batt insulation (attic)",
        laborRate: 0.85,
        materialRate: 1.10,
        unit: "SF",
        wasteFactor: 1.05,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Blown-In Insulation",
        description: "Blown-in cellulose/fiberglass insulation",
        laborRate: 1.25,
        materialRate: 0.85,
        unit: "SF",
        wasteFactor: 1.08,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Spray Foam - Open Cell",
        description: "Open-cell spray foam insulation",
        laborRate: 1.50,
        materialRate: 1.25,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Spray Foam - Closed Cell",
        description: "Closed-cell spray foam insulation",
        laborRate: 2.25,
        materialRate: 2.75,
        unit: "SF",
        wasteFactor: 1.10,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  },
  {
    category: "Other",
    defaultWasteFactor: 1.05,
    lineItems: [
      {
        name: "General Labor",
        description: "General construction labor",
        laborRate: 55,
        materialRate: 0,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Demolition - Light",
        description: "Light demolition work",
        laborRate: 2.50,
        materialRate: 0.50,
        unit: "SF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Demolition - Heavy",
        description: "Heavy demolition work",
        laborRate: 5.00,
        materialRate: 1.50,
        unit: "SF",
        wasteFactor: 1.0,
        source: "RSMeans Residential 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Debris Removal",
        description: "Construction debris removal",
        laborRate: 150,
        materialRate: 200,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Average 2024",
        lastUpdated: "2024-01-15"
      },
      {
        name: "Permit Fees",
        description: "Building permit fees (estimate)",
        laborRate: 0,
        materialRate: 350,
        unit: "EA",
        wasteFactor: 1.0,
        source: "National Average 2024",
        lastUpdated: "2024-01-15"
      }
    ]
  }
];

/**
 * Get state cost multiplier for regional adjustment
 */
export function getStateMultiplier(stateCode: string): { multiplier: number; source: string } {
  return STATE_COST_MULTIPLIERS[stateCode?.toUpperCase()] || DEFAULT_STATE_MULTIPLIER;
}

/**
 * Get category pricing data
 */
export function getCategoryPricing(category: string): CategoryPricing | undefined {
  return BASELINE_PRICING.find(c => c.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  return BASELINE_PRICING.map(c => c.category);
}

/**
 * Get line item by name within a category
 */
export function getLineItem(category: string, itemName: string): LineItemRate | undefined {
  const catPricing = getCategoryPricing(category);
  if (!catPricing) return undefined;
  
  return catPricing.lineItems.find(
    item => item.name.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(item.name.toLowerCase())
  );
}

/**
 * Calculate baseline FMV with full citation
 */
export interface BaselineEstimate {
  laborCost: number;
  materialCost: number;
  totalCost: number;
  wasteFactor: number;
  regionalMultiplier: number;
  unit: UnitType;
  sources: {
    pricing: string;
    regional: string;
    methodology: string;
  };
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUpdated: string;
}

export function calculateBaselineEstimate(
  category: string,
  lineItemName: string | null,
  quantity: number,
  stateCode: string
): BaselineEstimate | null {
  const catPricing = getCategoryPricing(category);
  if (!catPricing) return null;
  
  // Find specific line item or use category default
  let lineItem: LineItemRate | undefined;
  if (lineItemName) {
    lineItem = getLineItem(category, lineItemName);
  }
  
  // If no specific line item found, use first item as representative
  if (!lineItem && catPricing.lineItems.length > 0) {
    lineItem = catPricing.lineItems[0];
  }
  
  if (!lineItem) return null;
  
  const stateMultiplier = getStateMultiplier(stateCode);
  const wasteFactor = lineItem.wasteFactor;
  
  const laborCost = lineItem.laborRate * quantity * wasteFactor * stateMultiplier.multiplier;
  const materialCost = lineItem.materialRate * quantity * wasteFactor * stateMultiplier.multiplier;
  const totalCost = laborCost + materialCost;
  
  // Confidence based on data quality
  let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (lineItem.source.includes('RSMeans') || lineItem.source.includes('NRCA')) {
    confidenceLevel = 'HIGH';
  } else if (lineItem.source.includes('National Average')) {
    confidenceLevel = 'LOW';
  }
  
  return {
    laborCost: Math.round(laborCost * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    wasteFactor,
    regionalMultiplier: stateMultiplier.multiplier,
    unit: lineItem.unit,
    sources: {
      pricing: lineItem.source,
      regional: stateMultiplier.source,
      methodology: "Multi-source FMV methodology: base rate + regional adjustment + waste factor"
    },
    confidenceLevel,
    lastUpdated: lineItem.lastUpdated
  };
}

/**
 * Generate citation text for reports
 */
export function generateCitation(estimate: BaselineEstimate): string {
  return `Base pricing: ${estimate.sources.pricing}. ` +
         `Regional adjustment (${(estimate.regionalMultiplier * 100).toFixed(0)}%): ${estimate.sources.regional}. ` +
         `Confidence: ${estimate.confidenceLevel}. ` +
         `Last updated: ${estimate.lastUpdated}.`;
}

/**
 * Get all line items for a category (for dropdown selection)
 */
export function getCategoryLineItems(category: string): { name: string; description: string; unit: UnitType }[] {
  const catPricing = getCategoryPricing(category);
  if (!catPricing) return [];
  
  return catPricing.lineItems.map(item => ({
    name: item.name,
    description: item.description,
    unit: item.unit
  }));
}
