/**
 * Grant Scraper Service
 * Discovers and aggregates disaster recovery grants from multiple sources
 * 
 * Sources:
 * - FEMA Individual and Household Program
 * - SBA Disaster Loans
 * - USDA Rural Development
 * - 211 Texas / State 211 Programs
 */

import { db } from "../db";
import { availableGrants } from "@shared/schema";
import { sql } from "drizzle-orm";

interface GrantInfo {
  source: string;
  name: string;
  category: "federal" | "state" | "local" | "nonprofit" | "private";
  minAmount?: number;
  maxAmount?: number;
  eligibility?: string;
  applicationUrl?: string;
  processingDays?: number;
  disasterTypes?: string[];
  statesAvailable?: string[];
}

// Known grant programs - manually curated and verified
const KNOWN_GRANTS: GrantInfo[] = [
  // FEMA Programs
  {
    source: "FEMA",
    name: "Individuals and Households Program (IHP)",
    category: "federal",
    minAmount: 0,
    maxAmount: 42500,
    eligibility: "Disaster-declared area residents with uninsured or underinsured losses",
    applicationUrl: "https://www.disasterassistance.gov/",
    processingDays: 10,
    disasterTypes: ["flood", "hurricane", "tornado", "fire", "earthquake"],
    statesAvailable: ["ALL"],
  },
  {
    source: "FEMA",
    name: "Housing Assistance",
    category: "federal",
    minAmount: 0,
    maxAmount: 40000,
    eligibility: "Homeowners or renters in disaster-declared areas",
    applicationUrl: "https://www.disasterassistance.gov/",
    processingDays: 14,
    disasterTypes: ["flood", "hurricane", "tornado", "fire"],
    statesAvailable: ["ALL"],
  },
  {
    source: "FEMA",
    name: "Other Needs Assistance (ONA)",
    category: "federal",
    minAmount: 0,
    maxAmount: 42500,
    eligibility: "Disaster victims for personal property, medical, dental, funeral, transportation",
    applicationUrl: "https://www.disasterassistance.gov/",
    processingDays: 14,
    disasterTypes: ["flood", "hurricane", "tornado", "fire", "earthquake"],
    statesAvailable: ["ALL"],
  },
  // SBA Programs
  {
    source: "SBA",
    name: "Home Disaster Loans",
    category: "federal",
    minAmount: 0,
    maxAmount: 500000,
    eligibility: "Homeowners and renters in declared disaster areas",
    applicationUrl: "https://www.sba.gov/funding-programs/disaster-assistance",
    processingDays: 21,
    disasterTypes: ["flood", "hurricane", "tornado", "fire", "earthquake", "wind"],
    statesAvailable: ["ALL"],
  },
  {
    source: "SBA",
    name: "Physical Disaster Loans",
    category: "federal",
    minAmount: 0,
    maxAmount: 2000000,
    eligibility: "Businesses of all sizes in declared disaster areas",
    applicationUrl: "https://www.sba.gov/funding-programs/disaster-assistance",
    processingDays: 21,
    disasterTypes: ["flood", "hurricane", "tornado", "fire", "earthquake"],
    statesAvailable: ["ALL"],
  },
  // USDA Programs
  {
    source: "USDA",
    name: "Section 504 Home Repair Loans & Grants",
    category: "federal",
    minAmount: 0,
    maxAmount: 40000,
    eligibility: "Very low-income homeowners in rural areas (populations under 35,000)",
    applicationUrl: "https://www.rd.usda.gov/programs-services/single-family-housing-programs/single-family-housing-repair-loans-grants",
    processingDays: 30,
    disasterTypes: ["flood", "fire", "wind", "hail"],
    statesAvailable: ["ALL"],
  },
  // HUD Programs
  {
    source: "HUD",
    name: "Community Development Block Grant - Disaster Recovery",
    category: "federal",
    minAmount: 0,
    maxAmount: 100000,
    eligibility: "Low to moderate income homeowners in disaster-affected communities",
    applicationUrl: "https://www.hud.gov/program_offices/comm_planning/cdbg-dr",
    processingDays: 60,
    disasterTypes: ["flood", "hurricane", "tornado", "fire"],
    statesAvailable: ["ALL"],
  },
  // Texas-specific
  {
    source: "211 Texas",
    name: "Texas Emergency Food Assistance",
    category: "state",
    eligibility: "Texas residents affected by disasters",
    applicationUrl: "https://211texas.org/",
    disasterTypes: ["flood", "hurricane", "tornado", "fire", "freeze"],
    statesAvailable: ["TX"],
  },
  {
    source: "Texas General Land Office",
    name: "Homeowner Assistance Program",
    category: "state",
    minAmount: 0,
    maxAmount: 150000,
    eligibility: "Texas homeowners with disaster damage in declared counties",
    applicationUrl: "https://recovery.texas.gov/",
    processingDays: 45,
    disasterTypes: ["flood", "hurricane"],
    statesAvailable: ["TX"],
  },
  // Florida-specific
  {
    source: "Florida DEO",
    name: "Rebuild Florida Housing Repair Program",
    category: "state",
    minAmount: 0,
    maxAmount: 150000,
    eligibility: "Florida homeowners affected by hurricanes",
    applicationUrl: "https://www.rebuildflorida.gov/",
    processingDays: 60,
    disasterTypes: ["hurricane", "flood"],
    statesAvailable: ["FL"],
  },
  // California-specific
  {
    source: "California OES",
    name: "Individual Assistance Program",
    category: "state",
    eligibility: "California residents in state-declared disasters",
    applicationUrl: "https://www.caloes.ca.gov/",
    disasterTypes: ["fire", "earthquake", "flood"],
    statesAvailable: ["CA"],
  },
  // Nonprofit Programs
  {
    source: "American Red Cross",
    name: "Disaster Relief Assistance",
    category: "nonprofit",
    eligibility: "Anyone affected by disaster regardless of income",
    applicationUrl: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services.html",
    processingDays: 3,
    disasterTypes: ["flood", "fire", "hurricane", "tornado"],
    statesAvailable: ["ALL"],
  },
  {
    source: "Salvation Army",
    name: "Disaster Relief Services",
    category: "nonprofit",
    eligibility: "Disaster survivors regardless of income",
    applicationUrl: "https://www.salvationarmyusa.org/usn/disaster-relief/",
    processingDays: 1,
    disasterTypes: ["flood", "fire", "hurricane", "tornado"],
    statesAvailable: ["ALL"],
  },
  {
    source: "Habitat for Humanity",
    name: "Disaster Response Program",
    category: "nonprofit",
    eligibility: "Low-income homeowners with disaster damage",
    applicationUrl: "https://www.habitat.org/our-work/disaster-response",
    processingDays: 30,
    disasterTypes: ["flood", "fire", "hurricane", "tornado"],
    statesAvailable: ["ALL"],
  },
  {
    source: "Catholic Charities",
    name: "Disaster Relief Services",
    category: "nonprofit",
    eligibility: "Disaster survivors regardless of religion or income",
    applicationUrl: "https://www.catholiccharitiesusa.org/our-vision-and-ministry/disaster-relief/",
    processingDays: 7,
    disasterTypes: ["flood", "fire", "hurricane", "tornado"],
    statesAvailable: ["ALL"],
  },
];

/**
 * Seed the grants database with known programs
 */
export async function seedGrants(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const grant of KNOWN_GRANTS) {
    try {
      // Check if grant already exists
      const existing = await db.select().from(availableGrants)
        .where(sql`source = ${grant.source} AND name = ${grant.name}`)
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(availableGrants).values({
        source: grant.source,
        name: grant.name,
        category: grant.category,
        minAmount: grant.minAmount || null,
        maxAmount: grant.maxAmount || null,
        eligibility: grant.eligibility || null,
        applicationUrl: grant.applicationUrl || null,
        processingDays: grant.processingDays || null,
        disasterTypes: grant.disasterTypes || null,
        statesAvailable: grant.statesAvailable || null,
        isActive: 1,
      });
      inserted++;
    } catch (error) {
      console.error(`Failed to insert grant ${grant.name}:`, error);
      skipped++;
    }
  }

  console.log(`[GrantScraper] Seeded ${inserted} grants, skipped ${skipped}`);
  return { inserted, skipped };
}

/**
 * Get grants matching user's location and disaster type
 */
export async function findMatchingGrants(
  state: string,
  disasterType?: string,
  incomeLevel?: "low" | "moderate" | "any"
): Promise<typeof KNOWN_GRANTS> {
  const allGrants = await db.select().from(availableGrants)
    .where(sql`is_active = 1`);

  return allGrants.filter(grant => {
    // Check state eligibility
    const stateMatch = grant.statesAvailable?.includes("ALL") || 
                       grant.statesAvailable?.includes(state);
    if (!stateMatch) return false;

    // Check disaster type if specified
    if (disasterType && grant.disasterTypes) {
      const typeMatch = grant.disasterTypes.includes(disasterType.toLowerCase());
      if (!typeMatch) return false;
    }

    return true;
  }).map(g => ({
    source: g.source,
    name: g.name,
    category: g.category as any,
    minAmount: g.minAmount || undefined,
    maxAmount: g.maxAmount || undefined,
    eligibility: g.eligibility || undefined,
    applicationUrl: g.applicationUrl || undefined,
    processingDays: g.processingDays || undefined,
    disasterTypes: g.disasterTypes || undefined,
    statesAvailable: g.statesAvailable || undefined,
  }));
}

/**
 * Future: Web scraping integration
 * This would use Crawl4AI or similar to discover new grants
 */
export async function scrapeGrantSources(): Promise<GrantInfo[]> {
  // In production, this would:
  // 1. Scrape FEMA announcement pages for new programs
  // 2. Check SBA disaster declaration updates
  // 3. Monitor state emergency management websites
  // 4. Parse 211 service databases
  
  console.log("[GrantScraper] Web scraping not yet implemented - using static data");
  
  // For now, return empty array - static data is seeded via seedGrants()
  return [];
}

/**
 * Get grant scraper status
 */
export function getScraperStatus() {
  return {
    enabled: false,
    lastScrape: null,
    knownGrantCount: KNOWN_GRANTS.length,
    sources: ["FEMA", "SBA", "USDA", "HUD", "211 Texas", "State Programs", "Nonprofits"],
  };
}

export { KNOWN_GRANTS };
