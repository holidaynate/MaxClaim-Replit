import { 
  type User, 
  type InsertUser,
  type Session,
  type InsertSession,
  type SessionEvent,
  type InsertSessionEvent,
  type Claim,
  type InsertClaim,
  type ClaimLineItem,
  type InsertClaimLineItem,
  type Source,
  type SourceVersion,
  type InsertSessionSourceUsage,
  type PricingDataPoint,
  type InsertPricingDataPoint,
  type Partner,
  type InsertPartner,
  type PartnershipLOI,
  type InsertPartnershipLOI,
  type PartnerLead,
  type InsertPartnerLead,
  type ZipTargeting,
  type InsertZipTargeting,
  users,
  sessions,
  sessionEvents,
  claims,
  claimLineItems,
  sources,
  sourceVersions,
  sessionSourceUsage,
  pricingDataPoints,
  partners,
  partnershipLOIs,
  partnerLeads,
  zipTargeting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, like } from "drizzle-orm";

// Analytics data (no PII - only ZIP codes and aggregate data)
interface ClaimAnalysis {
  id: string;
  zipCode: string;
  itemCount: number;
  totalInsuranceOffer: number;
  totalFMV: number;
  categories: string[];
  timestamp: Date;
}

interface RegionalStats {
  zipCode: string;
  analysisCount: number;
  avgUnderpayment: number;
  commonCategories: string[];
}

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session management
  createSession(data: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  
  // Session events (tracking user interactions)
  logEvent(data: InsertSessionEvent): Promise<SessionEvent>;
  getSessionEvents(sessionId: string): Promise<SessionEvent[]>;
  
  // Claims management
  createClaim(data: InsertClaim): Promise<Claim>;
  getClaim(id: string): Promise<Claim | undefined>;
  completeClaim(id: string): Promise<void>;
  addClaimLineItem(data: InsertClaimLineItem): Promise<ClaimLineItem>;
  getClaimLineItems(claimId: string): Promise<ClaimLineItem[]>;
  
  // Attribution/Sources
  getSources(): Promise<Array<Source & { versions: SourceVersion[] }>>;
  logSourceUsage(data: InsertSessionSourceUsage): Promise<void>;
  
  // Pricing Data Points - Track user inputs for continuous improvement
  addPricingDataPoint(data: InsertPricingDataPoint): Promise<PricingDataPoint>;
  getPricingStats(category: string, unit: string, zipPrefix?: string): Promise<{
    min: number;
    max: number;
    avg: number;
    last: number;
    count: number;
  }>;
  
  // Claim analytics (anonymous - no PII) - legacy compatibility
  recordClaimAnalysis(data: {
    zipCode: string;
    itemCount: number;
    totalInsuranceOffer: number;
    totalFMV: number;
    categories: string[];
  }): Promise<ClaimAnalysis>;
  getRegionalStats(): Promise<RegionalStats[]>;
  
  // Partnership management
  createPartner(data: InsertPartner): Promise<Partner>;
  createPartnershipLOI(data: InsertPartnershipLOI, zipCodes: string[]): Promise<PartnershipLOI>;
  getPartners(filters?: { status?: string; type?: string; tier?: string }): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | undefined>;
  updatePartnerStatus(id: string, status: "pending" | "approved" | "rejected" | "suspended", reviewerId?: string): Promise<void>;
  getPartnersByZipCode(zipCode: string, filters?: { status?: string; tier?: string }): Promise<Array<Partner & { priority: number }>>;
  createPartnerLead(data: InsertPartnerLead): Promise<PartnerLead>;
  getPartnerLeads(partnerId: string): Promise<PartnerLead[]>;
}

// Reference: javascript_database integration blueprint for PostgreSQL storage implementation
export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Session management
  async createSession(data: InsertSession): Promise<Session> {
    const zipPrefix = data.zipCode ? data.zipCode.substring(0, 3) : undefined;
    const sessionData = { ...data, zipPrefix };
    const [session] = await db.insert(sessions).values(sessionData).returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db
      .update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.id, id));
  }

  // Session events (tracking user interactions)
  async logEvent(data: InsertSessionEvent): Promise<SessionEvent> {
    const [event] = await db.insert(sessionEvents).values(data).returning();
    await this.updateSessionActivity(data.sessionId);
    return event;
  }

  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    return await db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, sessionId))
      .orderBy(desc(sessionEvents.occurredAt));
  }

  // Claims management
  async createClaim(data: InsertClaim): Promise<Claim> {
    const [claim] = await db.insert(claims).values(data).returning();
    return claim;
  }

  async getClaim(id: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim || undefined;
  }

  async completeClaim(id: string): Promise<void> {
    await db
      .update(claims)
      .set({ 
        status: "completed" as const,
        completedAt: new Date()
      })
      .where(eq(claims.id, id));
  }

  async addClaimLineItem(data: InsertClaimLineItem): Promise<ClaimLineItem> {
    const [lineItem] = await db.insert(claimLineItems).values(data).returning();
    return lineItem;
  }

  async getClaimLineItems(claimId: string): Promise<ClaimLineItem[]> {
    return await db
      .select()
      .from(claimLineItems)
      .where(eq(claimLineItems.claimId, claimId));
  }

  // Attribution/Sources
  async getSources(): Promise<Array<Source & { versions: SourceVersion[] }>> {
    const allSources = await db.select().from(sources);
    const allVersions = await db.select().from(sourceVersions);

    return allSources.map((source) => ({
      ...source,
      versions: allVersions.filter((v) => v.sourceId === source.id),
    }));
  }

  async logSourceUsage(data: InsertSessionSourceUsage): Promise<void> {
    try {
      await db.insert(sessionSourceUsage).values(data);
    } catch (error) {
      // Ignore duplicate key errors (source already logged for this session)
    }
  }

  // Pricing Data Points - Track user inputs for continuous improvement
  async addPricingDataPoint(data: InsertPricingDataPoint): Promise<PricingDataPoint> {
    const zipPrefix = data.zipCode ? data.zipCode.substring(0, 3) : undefined;
    const dataPoint = { ...data, zipPrefix };
    const [point] = await db.insert(pricingDataPoints).values(dataPoint).returning();
    return point;
  }

  async getPricingStats(category: string, unit: string, zipPrefix?: string): Promise<{
    min: number;
    max: number;
    avg: number;
    last: number;
    count: number;
  }> {
    const conditions = [
      eq(pricingDataPoints.category, category),
      eq(pricingDataPoints.unit, unit as any),
    ];
    
    if (zipPrefix) {
      conditions.push(eq(pricingDataPoints.zipPrefix, zipPrefix));
    }

    const result = await db
      .select({
        min: sql<number>`min(${pricingDataPoints.fmvPrice})::float`,
        max: sql<number>`max(${pricingDataPoints.fmvPrice})::float`,
        avg: sql<number>`avg(${pricingDataPoints.fmvPrice})::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(pricingDataPoints)
      .where(and(...conditions));

    const lastEntry = await db
      .select({ fmvPrice: pricingDataPoints.fmvPrice })
      .from(pricingDataPoints)
      .where(and(...conditions))
      .orderBy(desc(pricingDataPoints.createdAt))
      .limit(1);

    return {
      min: result[0]?.min || 0,
      max: result[0]?.max || 0,
      avg: result[0]?.avg || 0,
      last: lastEntry[0]?.fmvPrice || 0,
      count: result[0]?.count || 0,
    };
  }

  // Legacy analytics compatibility - now persists data via claims table
  async recordClaimAnalysis(data: {
    zipCode: string;
    itemCount: number;
    totalInsuranceOffer: number;
    totalFMV: number;
    categories: string[];
  }): Promise<ClaimAnalysis> {
    // Create a session for this analysis
    const zipPrefix = data.zipCode.substring(0, 3);
    const [session] = await db
      .insert(sessions)
      .values({ zipCode: data.zipCode, zipPrefix })
      .returning();

    // Calculate additional amount and variance percentage
    const additionalAmount = data.totalFMV - data.totalInsuranceOffer;
    const variancePct = (additionalAmount / data.totalInsuranceOffer) * 100;

    // Create claim record
    const [claim] = await db
      .insert(claims)
      .values({
        sessionId: session.id,
        status: "completed",
        totalQuoted: data.totalInsuranceOffer,
        totalFmv: data.totalFMV,
        additionalAmount,
        variancePct,
        completedAt: new Date(),
      })
      .returning();

    // Return legacy-compatible response
    return {
      id: claim.id,
      zipCode: data.zipCode,
      itemCount: data.itemCount,
      totalInsuranceOffer: data.totalInsuranceOffer,
      totalFMV: data.totalFMV,
      categories: data.categories,
      timestamp: claim.createdAt,
    };
  }

  async getRegionalStats(): Promise<RegionalStats[]> {
    // Join claims with sessions to get zipPrefix and calculate aggregates
    const result = await db
      .select({
        zipPrefix: sessions.zipPrefix,
        count: sql<number>`count(*)::int`,
        avgVariance: sql<number>`avg(${claims.variancePct})::float`,
      })
      .from(claims)
      .innerJoin(sessions, eq(claims.sessionId, sessions.id))
      .where(and(
        eq(claims.status, "completed"),
        sql`${sessions.zipPrefix} IS NOT NULL`
      ))
      .groupBy(sessions.zipPrefix)
      .orderBy(desc(sql`count(*)`))
      .limit(100);

    // For each zipPrefix, get common categories from claim line items
    const stats: RegionalStats[] = await Promise.all(
      result.map(async (row) => {
        // Get session IDs for this zipPrefix
        const zipSessions = await db
          .select({ id: sessions.id })
          .from(sessions)
          .where(eq(sessions.zipPrefix, row.zipPrefix as string));
        
        const sessionIds = zipSessions.map(s => s.id);

        // Get common categories for these sessions
        const categoryCounts = await db
          .select({
            category: claimLineItems.category,
            count: sql<number>`count(*)::int`,
          })
          .from(claimLineItems)
          .innerJoin(claims, eq(claimLineItems.claimId, claims.id))
          .where(sql`${claims.sessionId} = ANY(${sessionIds})`)
          .groupBy(claimLineItems.category)
          .orderBy(desc(sql`count(*)`))
          .limit(3);

        return {
          zipCode: row.zipPrefix as string,
          analysisCount: row.count,
          avgUnderpayment: row.avgVariance || 0,
          commonCategories: categoryCounts.map(c => c.category),
        };
      })
    );

    return stats;
  }

  // Partnership management
  async createPartner(data: InsertPartner): Promise<Partner> {
    const [partner] = await db.insert(partners).values(data).returning();
    return partner;
  }

  async createPartnershipLOI(data: InsertPartnershipLOI, zipCodes: string[]): Promise<PartnershipLOI> {
    // Sanitize pricing preferences - remove disabled options
    const sanitizedPrefs = { ...data.pricingPreferences };
    if (sanitizedPrefs.cpc && !sanitizedPrefs.cpc.enabled) {
      delete sanitizedPrefs.cpc;
    }
    if (sanitizedPrefs.affiliate && !sanitizedPrefs.affiliate.enabled) {
      delete sanitizedPrefs.affiliate;
    }
    if (sanitizedPrefs.monthlyBanner && !sanitizedPrefs.monthlyBanner.enabled) {
      delete sanitizedPrefs.monthlyBanner;
    }

    const [loi] = await db.insert(partnershipLOIs).values({
      ...data,
      pricingPreferences: sanitizedPrefs as any,
    }).returning();
    
    // Insert ZIP code targeting for the partner in a transaction-safe way
    if (zipCodes.length > 0) {
      for (const zipCode of zipCodes) {
        try {
          await db.insert(zipTargeting).values({
            partnerId: data.partnerId,
            zipCode,
            priority: 1, // Default priority
          });
        } catch (error) {
          // Skip duplicates silently
        }
      }
    }
    
    return loi;
  }

  async getPartners(filters?: { status?: string; type?: string; tier?: string }): Promise<Partner[]> {
    let query = db.select().from(partners);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(partners.status, filters.status as any));
    }
    if (filters?.type) {
      conditions.push(eq(partners.type, filters.type as any));
    }
    if (filters?.tier) {
      conditions.push(eq(partners.tier, filters.tier as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(partners.createdAt));
  }

  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  async updatePartnerStatus(id: string, status: "pending" | "approved" | "rejected" | "suspended", reviewerId?: string): Promise<void> {
    // Update partner status
    await db
      .update(partners)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(partners.id, id));
    
    // Also update all LOIs for this partner
    const updateData: any = {
      status,
      reviewedAt: new Date(),
    };
    if (reviewerId) {
      updateData.reviewedBy = reviewerId;
    }
    
    await db
      .update(partnershipLOIs)
      .set(updateData)
      .where(eq(partnershipLOIs.partnerId, id));
  }

  async getPartnersByZipCode(
    zipCode: string, 
    filters?: { status?: string; tier?: string }
  ): Promise<Array<Partner & { priority: number }>> {
    // Find partners where the user's ZIP code starts with their stored ZIP prefix
    // For example: if user enters "78701", match stored "787", "7870", or "78701"
    const targeting = await db
      .select()
      .from(zipTargeting)
      .where(sql`${zipCode} LIKE ${zipTargeting.zipCode} || '%'`);
    
    if (targeting.length === 0) {
      return [];
    }
    
    const partnerIds = targeting.map(t => t.partnerId);
    
    // Now get the full partner details with filters
    const conditions = [inArray(partners.id, partnerIds)];
    
    if (filters?.status) {
      conditions.push(eq(partners.status, filters.status as any));
    }
    if (filters?.tier) {
      conditions.push(eq(partners.tier, filters.tier as any));
    }
    
    const partnerResults = await db
      .select()
      .from(partners)
      .where(and(...conditions));
    
    // Merge priority from targeting
    return partnerResults.map(partner => {
      const target = targeting.find(t => t.partnerId === partner.id);
      return {
        ...partner,
        priority: target?.priority || 1,
      };
    }).sort((a, b) => b.priority - a.priority); // Sort by priority descending
  }

  async createPartnerLead(data: InsertPartnerLead): Promise<PartnerLead> {
    const [lead] = await db.insert(partnerLeads).values(data).returning();
    return lead;
  }

  async getPartnerLeads(partnerId: string): Promise<PartnerLead[]> {
    return await db
      .select()
      .from(partnerLeads)
      .where(eq(partnerLeads.partnerId, partnerId))
      .orderBy(desc(partnerLeads.createdAt));
  }
}

export const storage = new DatabaseStorage();
