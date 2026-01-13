/**
 * MaxClaim Carrier Trends Seed Data
 * Attribution: Based on industry patterns from Advocacy Framework v4.0
 * 
 * Historical underpayment patterns by major insurance carriers.
 * Data compiled from claims analysis and industry reports.
 */

import { db } from "../db";
import { carrierTrends } from "@shared/schema";

export interface CarrierTrendSeed {
  carrierName: string;
  lineItemDescription: string;
  underpaymentRate: number;
  frequency: number;
  typicalGaps: string[];
  commonStrategy: "OMIT" | "UNDERVALUE" | "DENY_COVERAGE" | "DENY_MODIFIER" | "ZERO_COST";
  historicalCount: number;
  confidence: number;
}

export const CARRIER_TRENDS_DATA: CarrierTrendSeed[] = [
  // ============ STATE FARM PATTERNS ============
  {
    carrierName: "State Farm",
    lineItemDescription: "Valley Flashing",
    underpaymentRate: -12,
    frequency: 0.45,
    typicalGaps: ["Valley Flashing", "Drip Edge", "Lead Boots"],
    commonStrategy: "OMIT",
    historicalCount: 247,
    confidence: 92,
  },
  {
    carrierName: "State Farm",
    lineItemDescription: "Steep Roof Charge",
    underpaymentRate: -35,
    frequency: 0.62,
    typicalGaps: ["Steep Charge Modifier", "Labor Adjustment"],
    commonStrategy: "DENY_MODIFIER",
    historicalCount: 312,
    confidence: 95,
  },
  {
    carrierName: "State Farm",
    lineItemDescription: "Permit / Inspection",
    underpaymentRate: -100,
    frequency: 0.98,
    typicalGaps: ["Permit", "Code Upgrade", "Inspection Fee"],
    commonStrategy: "OMIT",
    historicalCount: 189,
    confidence: 99,
  },
  {
    carrierName: "State Farm",
    lineItemDescription: "Ice & Water Shield",
    underpaymentRate: -25,
    frequency: 0.55,
    typicalGaps: ["Ice Dam Protection", "Underlayment Premium"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 156,
    confidence: 88,
  },
  {
    carrierName: "State Farm",
    lineItemDescription: "Haul Off / Debris Removal",
    underpaymentRate: -40,
    frequency: 0.72,
    typicalGaps: ["Debris Removal", "Dumpster Rental", "Disposal Fee"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 203,
    confidence: 91,
  },

  // ============ ALLSTATE PATTERNS ============
  {
    carrierName: "Allstate",
    lineItemDescription: "Power Attic Vent",
    underpaymentRate: -25,
    frequency: 0.38,
    typicalGaps: ["Power Attic Vent", "Soffit Vents", "Ridge Vents"],
    commonStrategy: "OMIT",
    historicalCount: 134,
    confidence: 85,
  },
  {
    carrierName: "Allstate",
    lineItemDescription: "Soffit Vents",
    underpaymentRate: -30,
    frequency: 0.42,
    typicalGaps: ["Soffit Ventilation", "Intake Vents"],
    commonStrategy: "OMIT",
    historicalCount: 98,
    confidence: 82,
  },
  {
    carrierName: "Allstate",
    lineItemDescription: "Labor Modifications",
    underpaymentRate: -18,
    frequency: 0.55,
    typicalGaps: ["Second Story Access", "Steep Pitch Labor"],
    commonStrategy: "DENY_MODIFIER",
    historicalCount: 167,
    confidence: 87,
  },
  {
    carrierName: "Allstate",
    lineItemDescription: "Gutters",
    underpaymentRate: -22,
    frequency: 0.48,
    typicalGaps: ["Gutter Guards", "Downspouts", "Gutter Replacement"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 145,
    confidence: 84,
  },

  // ============ LIBERTY MUTUAL PATTERNS ============
  {
    carrierName: "Liberty Mutual",
    lineItemDescription: "Lead Boots",
    underpaymentRate: -45,
    frequency: 0.65,
    typicalGaps: ["Pipe Flashing", "Lead Boot Replacement"],
    commonStrategy: "OMIT",
    historicalCount: 178,
    confidence: 90,
  },
  {
    carrierName: "Liberty Mutual",
    lineItemDescription: "Flashing",
    underpaymentRate: -28,
    frequency: 0.58,
    typicalGaps: ["Step Flashing", "Counter Flashing", "Wall Flashing"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 212,
    confidence: 89,
  },
  {
    carrierName: "Liberty Mutual",
    lineItemDescription: "Underlayment Premium",
    underpaymentRate: -20,
    frequency: 0.52,
    typicalGaps: ["Synthetic Underlayment", "Premium Felt"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 123,
    confidence: 83,
  },
  {
    carrierName: "Liberty Mutual",
    lineItemDescription: "Material Tax",
    underpaymentRate: -100,
    frequency: 0.85,
    typicalGaps: ["Sales Tax", "Material Tax"],
    commonStrategy: "ZERO_COST",
    historicalCount: 289,
    confidence: 96,
  },

  // ============ PROGRESSIVE PATTERNS ============
  {
    carrierName: "Progressive",
    lineItemDescription: "Permitting",
    underpaymentRate: -100,
    frequency: 0.92,
    typicalGaps: ["Building Permit", "Inspection Fee"],
    commonStrategy: "OMIT",
    historicalCount: 156,
    confidence: 94,
  },
  {
    carrierName: "Progressive",
    lineItemDescription: "Steep Charges",
    underpaymentRate: -50,
    frequency: 0.68,
    typicalGaps: ["Steep Pitch Premium", "Safety Equipment"],
    commonStrategy: "DENY_MODIFIER",
    historicalCount: 134,
    confidence: 88,
  },
  {
    carrierName: "Progressive",
    lineItemDescription: "Waste Factor",
    underpaymentRate: -15,
    frequency: 0.75,
    typicalGaps: ["Material Waste", "Cutting Waste"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 198,
    confidence: 85,
  },

  // ============ FARMERS PATTERNS ============
  {
    carrierName: "Farmers",
    lineItemDescription: "Drip Edge",
    underpaymentRate: -35,
    frequency: 0.58,
    typicalGaps: ["Drip Edge", "Edge Metal"],
    commonStrategy: "OMIT",
    historicalCount: 112,
    confidence: 82,
  },
  {
    carrierName: "Farmers",
    lineItemDescription: "Starter Shingles",
    underpaymentRate: -22,
    frequency: 0.48,
    typicalGaps: ["Starter Strip", "Starter Course"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 89,
    confidence: 78,
  },

  // ============ USAA PATTERNS ============
  {
    carrierName: "USAA",
    lineItemDescription: "Ridge Caps",
    underpaymentRate: -18,
    frequency: 0.35,
    typicalGaps: ["Hip & Ridge", "Cap Shingles"],
    commonStrategy: "UNDERVALUE",
    historicalCount: 76,
    confidence: 80,
  },
  {
    carrierName: "USAA",
    lineItemDescription: "Ventilation",
    underpaymentRate: -25,
    frequency: 0.42,
    typicalGaps: ["Ridge Vent", "Box Vents", "Turbine Vents"],
    commonStrategy: "OMIT",
    historicalCount: 94,
    confidence: 83,
  },
];

/**
 * Seed carrier trends into database
 */
export async function seedCarrierTrends(): Promise<void> {
  try {
    const existing = await db.select().from(carrierTrends).limit(1);
    
    if (existing.length > 0) {
      console.log("[Seed] Carrier trends already seeded");
      return;
    }

    console.log("[Seed] Seeding carrier trends...");
    
    for (const trend of CARRIER_TRENDS_DATA) {
      await db.insert(carrierTrends).values({
        carrierName: trend.carrierName,
        lineItemDescription: trend.lineItemDescription,
        underpaymentRate: trend.underpaymentRate,
        frequency: trend.frequency,
        typicalGaps: trend.typicalGaps,
        commonStrategy: trend.commonStrategy,
        historicalCount: trend.historicalCount,
        confidence: trend.confidence,
      });
    }

    console.log(`[Seed] Seeded ${CARRIER_TRENDS_DATA.length} carrier trend records`);
  } catch (error) {
    console.error("[Seed] Error seeding carrier trends:", error);
  }
}

/**
 * Get underpayment patterns for a specific carrier
 */
export function getCarrierPatterns(carrierName: string): CarrierTrendSeed[] {
  return CARRIER_TRENDS_DATA.filter(
    (t) => t.carrierName.toLowerCase() === carrierName.toLowerCase()
  );
}

/**
 * Check if a line item is commonly omitted by a carrier
 */
export function isCommonlyOmitted(
  carrierName: string,
  lineItem: string
): boolean {
  const patterns = getCarrierPatterns(carrierName);
  return patterns.some(
    (p) =>
      p.commonStrategy === "OMIT" &&
      p.lineItemDescription.toLowerCase().includes(lineItem.toLowerCase())
  );
}

/**
 * Get estimated underpayment for a line item by carrier
 */
export function getEstimatedUnderpayment(
  carrierName: string,
  lineItem: string
): { rate: number; confidence: number } | null {
  const patterns = getCarrierPatterns(carrierName);
  const match = patterns.find((p) =>
    lineItem.toLowerCase().includes(p.lineItemDescription.toLowerCase())
  );

  if (match) {
    return {
      rate: match.underpaymentRate,
      confidence: match.confidence,
    };
  }

  return null;
}
