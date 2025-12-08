import { 
  type User, 
  type InsertUser,
  type ReplitUser,
  type UpsertReplitUser,
  type UserClaim,
  type InsertUserClaim,
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
  type PriceAuditResult,
  type InsertPriceAuditResult,
  type AgentCommissionTier,
  type InsertAgentCommissionTier,
  type SalesAgent,
  type InsertSalesAgent,
  type PartnerContract,
  type InsertPartnerContract,
  type PartnerInvoice,
  type InsertPartnerInvoice,
  type AgentCommission,
  type InsertAgentCommission,
  type AgentPayout,
  type InsertAgentPayout,
  type PartnerRenewal,
  type InsertPartnerRenewal,
  type BogoOrganization,
  type InsertBogoOrganization,
  type AdRotation,
  type InsertAdRotation,
  type AdImpression,
  type InsertAdImpression,
  type ProOrganization,
  type InsertProOrganization,
  type EmailTemplate,
  type InsertEmailTemplate,
  type BatchJob,
  type InsertBatchJob,
  users,
  replitUsers,
  userClaims,
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
  priceAuditResults,
  agentCommissionTiers,
  salesAgents,
  partnerContracts,
  partnerInvoices,
  agentCommissions,
  agentPayouts,
  partnerRenewals,
  bogoOrganizations,
  adRotations,
  adImpressions,
  proOrganizations,
  emailTemplates,
  batchJobs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, like, gte, lte } from "drizzle-orm";

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
  // Admin user management (legacy)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Replit Auth user management
  // Reference: javascript_log_in_with_replit integration blueprint
  getReplitUser(id: string): Promise<ReplitUser | undefined>;
  upsertReplitUser(user: UpsertReplitUser): Promise<ReplitUser>;
  
  // User Claims - for "My Claims" dashboard
  createUserClaim(data: InsertUserClaim): Promise<UserClaim>;
  getUserClaims(userId: string, limit?: number): Promise<Array<UserClaim & { claim: Claim }>>;
  getUserClaim(id: string): Promise<UserClaim | undefined>;
  updateUserClaimReportUrl(id: string, reportUrl: string): Promise<void>;
  
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
  getPartnerByEmail(email: string): Promise<Partner | undefined>;
  updatePartnerStatus(id: string, status: "pending" | "approved" | "rejected" | "suspended", reviewerId?: string): Promise<void>;
  getPartnersByZipCode(zipCode: string, filters?: { status?: string; tier?: string }): Promise<Array<Partner & { priority: number }>>;
  createPartnerLead(data: InsertPartnerLead): Promise<PartnerLead>;
  getPartnerLeads(partnerId: string): Promise<PartnerLead[]>;
  
  // Price audit results for compliance and reporting
  createPriceAuditResult(data: InsertPriceAuditResult): Promise<PriceAuditResult>;
  getPriceAuditResults(filters?: { sessionId?: string; flag?: string; startDate?: Date; endDate?: Date }): Promise<PriceAuditResult[]>;
  getPriceAuditStats(): Promise<{ totalAudits: number; byFlag: Record<string, number>; avgPercentFromAvg: number }>;
  
  // ============================================
  // MONETIZATION SYSTEM - Sales Force & Commissions
  // ============================================
  
  // Agent Commission Tiers
  createAgentCommissionTier(data: InsertAgentCommissionTier): Promise<AgentCommissionTier>;
  getAgentCommissionTiers(): Promise<AgentCommissionTier[]>;
  getAgentCommissionTier(id: string): Promise<AgentCommissionTier | undefined>;
  
  // Sales Agents
  createSalesAgent(data: InsertSalesAgent): Promise<SalesAgent>;
  getSalesAgents(filters?: { status?: string; region?: string }): Promise<SalesAgent[]>;
  getSalesAgent(id: string): Promise<SalesAgent | undefined>;
  getSalesAgentByEmail(email: string): Promise<SalesAgent | undefined>;
  updateSalesAgentEarnings(id: string, amount: number): Promise<void>;
  updateSalesAgentStripeConnect(id: string, stripeConnectId: string): Promise<void>;
  
  // Partner Contracts
  createPartnerContract(data: InsertPartnerContract): Promise<PartnerContract>;
  getPartnerContracts(filters?: { partnerId?: string; agentId?: string; status?: string; monetizationTier?: string }): Promise<PartnerContract[]>;
  getPartnerContract(id: string): Promise<PartnerContract | undefined>;
  getPartnerContractByPartnerId(partnerId: string): Promise<PartnerContract | undefined>;
  updatePartnerContractStatus(id: string, status: string): Promise<void>;
  
  // Partner Invoices
  createPartnerInvoice(data: InsertPartnerInvoice): Promise<PartnerInvoice>;
  getPartnerInvoices(filters?: { partnerId?: string; contractId?: string; status?: string }): Promise<PartnerInvoice[]>;
  updatePartnerInvoiceStatus(id: string, status: string, stripeChargeId?: string): Promise<void>;
  
  // Agent Commissions
  createAgentCommission(data: InsertAgentCommission): Promise<AgentCommission>;
  getAgentCommissions(filters?: { agentId?: string; partnerId?: string; status?: string }): Promise<AgentCommission[]>;
  updateAgentCommissionStatus(id: string, status: string): Promise<void>;
  markCommissionPaid(id: string): Promise<void>;
  
  // Agent Payouts
  createAgentPayout(data: InsertAgentPayout): Promise<AgentPayout>;
  getAgentPayouts(filters?: { agentId?: string; status?: string }): Promise<AgentPayout[]>;
  updateAgentPayoutStatus(id: string, status: string, stripePayoutId?: string): Promise<void>;
  
  // Partner Renewals
  createPartnerRenewal(data: InsertPartnerRenewal): Promise<PartnerRenewal>;
  getPartnerRenewals(filters?: { partnerId?: string; agentId?: string; status?: string }): Promise<PartnerRenewal[]>;
  getPendingRenewals(beforeDate: Date): Promise<PartnerRenewal[]>;
  updatePartnerRenewalStatus(id: string, status: string): Promise<void>;
  
  // BOGO Organizations
  createBogoOrganization(data: InsertBogoOrganization): Promise<BogoOrganization>;
  getBogoOrganizations(filters?: { category?: string; region?: string; status?: string }): Promise<BogoOrganization[]>;
  updateBogoOrganization(id: string, data: Partial<InsertBogoOrganization>): Promise<void>;
  
  // Agent Reference Code
  getSalesAgentByRefCode(refCode: string): Promise<SalesAgent | undefined>;
  getAllAgentRefCodes(): Promise<string[]>;
  updateSalesAgentRefCode(id: string, refCode: string): Promise<void>;
  
  // Ad Rotations
  createAdRotation(data: InsertAdRotation): Promise<AdRotation>;
  getAdRotations(filters?: { partnerId?: string; zipCode?: string; status?: string }): Promise<AdRotation[]>;
  getAdRotationsByZip(zipCode: string): Promise<AdRotation[]>;
  updateAdRotation(id: string, data: Partial<InsertAdRotation>): Promise<void>;
  deleteAdRotation(id: string): Promise<void>;
  
  // Ad Impressions
  createAdImpression(data: InsertAdImpression): Promise<AdImpression>;
  getAdImpressions(filters?: { partnerId?: string; zipCode?: string; startDate?: Date; endDate?: Date }): Promise<AdImpression[]>;
  recordClickthrough(id: string): Promise<void>;
  getImpressionStats(partnerId: string, days?: number): Promise<{ impressions: number; clicks: number; ctr: number }>;
  
  // ============================================
  // PRO ORGANIZATIONS DATABASE - Sales Lead Sources
  // ============================================
  
  // Pro Organizations
  createProOrganization(data: InsertProOrganization): Promise<ProOrganization>;
  getProOrganizations(filters?: { category?: string; state?: string; scope?: string }): Promise<ProOrganization[]>;
  getProOrganization(id: string): Promise<ProOrganization | undefined>;
  getOrgsForState(stateCode: string, category?: string): Promise<ProOrganization[]>;
  updateProOrganization(id: string, data: Partial<InsertProOrganization>): Promise<void>;
  deleteProOrganization(id: string): Promise<void>;
  
  // Email Templates
  createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;
  getEmailTemplates(filters?: { category?: string; isActive?: boolean }): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<void>;
  deleteEmailTemplate(id: string): Promise<void>;
  
  // Batch Jobs - Async processing queue
  createBatchJob(data: InsertBatchJob): Promise<BatchJob>;
  getBatchJob(id: string): Promise<BatchJob | undefined>;
  updateBatchJobStatus(id: string, status: 'queued' | 'processing' | 'completed' | 'failed', results?: any, error?: string): Promise<void>;
  getRecentBatchJobs(limit?: number): Promise<BatchJob[]>;
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

  // Replit Auth user management
  // Reference: javascript_log_in_with_replit integration blueprint
  async getReplitUser(id: string): Promise<ReplitUser | undefined> {
    const [user] = await db.select().from(replitUsers).where(eq(replitUsers.id, id));
    return user || undefined;
  }

  async upsertReplitUser(userData: UpsertReplitUser): Promise<ReplitUser> {
    const [user] = await db
      .insert(replitUsers)
      .values(userData)
      .onConflictDoUpdate({
        target: replitUsers.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User Claims - for "My Claims" dashboard
  async createUserClaim(data: InsertUserClaim): Promise<UserClaim> {
    const [userClaim] = await db.insert(userClaims).values(data).returning();
    return userClaim;
  }

  async getUserClaims(userId: string, limit: number = 10): Promise<Array<UserClaim & { claim: Claim }>> {
    const results = await db
      .select()
      .from(userClaims)
      .innerJoin(claims, eq(userClaims.claimId, claims.id))
      .where(eq(userClaims.userId, userId))
      .orderBy(desc(userClaims.createdAt))
      .limit(limit);

    return results.map(r => ({
      ...r.user_claims,
      claim: r.claims,
    }));
  }

  async getUserClaim(id: string): Promise<UserClaim | undefined> {
    const [userClaim] = await db.select().from(userClaims).where(eq(userClaims.id, id));
    return userClaim || undefined;
  }

  async updateUserClaimReportUrl(id: string, reportUrl: string): Promise<void> {
    await db
      .update(userClaims)
      .set({ reportUrl })
      .where(eq(userClaims.id, id));
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

  async getPartnerByEmail(email: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.email, email));
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

  // Price audit results for compliance and reporting
  async createPriceAuditResult(data: InsertPriceAuditResult): Promise<PriceAuditResult> {
    const [result] = await db.insert(priceAuditResults).values(data).returning();
    return result;
  }

  async getPriceAuditResults(filters?: { 
    sessionId?: string; 
    flag?: string; 
    startDate?: Date; 
    endDate?: Date 
  }): Promise<PriceAuditResult[]> {
    const conditions = [];
    
    if (filters?.sessionId) {
      conditions.push(eq(priceAuditResults.sessionId, filters.sessionId));
    }
    if (filters?.flag) {
      conditions.push(eq(priceAuditResults.flag, filters.flag as any));
    }
    if (filters?.startDate) {
      conditions.push(sql`${priceAuditResults.createdAt} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${priceAuditResults.createdAt} <= ${filters.endDate}`);
    }
    
    if (conditions.length === 0) {
      return await db
        .select()
        .from(priceAuditResults)
        .orderBy(desc(priceAuditResults.createdAt))
        .limit(1000);
    }
    
    return await db
      .select()
      .from(priceAuditResults)
      .where(and(...conditions))
      .orderBy(desc(priceAuditResults.createdAt));
  }

  async getPriceAuditStats(): Promise<{ 
    totalAudits: number; 
    byFlag: Record<string, number>; 
    avgPercentFromAvg: number 
  }> {
    const allResults = await db.select().from(priceAuditResults);
    
    const byFlag: Record<string, number> = {};
    let totalPercentFromAvg = 0;
    let countWithPercent = 0;
    
    for (const result of allResults) {
      byFlag[result.flag] = (byFlag[result.flag] || 0) + 1;
      if (result.percentFromAvg !== null && result.percentFromAvg !== undefined) {
        totalPercentFromAvg += Number(result.percentFromAvg);
        countWithPercent++;
      }
    }
    
    return {
      totalAudits: allResults.length,
      byFlag,
      avgPercentFromAvg: countWithPercent > 0 ? totalPercentFromAvg / countWithPercent : 0,
    };
  }

  // ============================================
  // MONETIZATION SYSTEM - Sales Force & Commissions
  // ============================================

  // Agent Commission Tiers
  async createAgentCommissionTier(data: InsertAgentCommissionTier): Promise<AgentCommissionTier> {
    const [tier] = await db.insert(agentCommissionTiers).values(data).returning();
    return tier;
  }

  async getAgentCommissionTiers(): Promise<AgentCommissionTier[]> {
    return await db.select().from(agentCommissionTiers);
  }

  async getAgentCommissionTier(id: string): Promise<AgentCommissionTier | undefined> {
    const [tier] = await db.select().from(agentCommissionTiers).where(eq(agentCommissionTiers.id, id));
    return tier || undefined;
  }

  // Sales Agents
  async createSalesAgent(data: InsertSalesAgent): Promise<SalesAgent> {
    const [agent] = await db.insert(salesAgents).values(data).returning();
    return agent;
  }

  async getSalesAgents(filters?: { status?: string; region?: string }): Promise<SalesAgent[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(salesAgents.status, filters.status as any));
    }
    if (filters?.region) {
      conditions.push(eq(salesAgents.region, filters.region));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(salesAgents).orderBy(desc(salesAgents.createdAt));
    }
    
    return await db
      .select()
      .from(salesAgents)
      .where(and(...conditions))
      .orderBy(desc(salesAgents.createdAt));
  }

  async getSalesAgent(id: string): Promise<SalesAgent | undefined> {
    const [agent] = await db.select().from(salesAgents).where(eq(salesAgents.id, id));
    return agent || undefined;
  }

  async getSalesAgentByEmail(email: string): Promise<SalesAgent | undefined> {
    const [agent] = await db.select().from(salesAgents).where(eq(salesAgents.email, email));
    return agent || undefined;
  }

  async updateSalesAgentEarnings(id: string, amount: number): Promise<void> {
    await db
      .update(salesAgents)
      .set({
        totalEarned: sql`${salesAgents.totalEarned} + ${amount}`,
        ytdEarnings: sql`${salesAgents.ytdEarnings} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(salesAgents.id, id));
  }

  async updateSalesAgentStripeConnect(id: string, stripeConnectId: string): Promise<void> {
    await db
      .update(salesAgents)
      .set({ stripeConnectId, updatedAt: new Date() })
      .where(eq(salesAgents.id, id));
  }

  // Partner Contracts
  async createPartnerContract(data: InsertPartnerContract): Promise<PartnerContract> {
    const [contract] = await db.insert(partnerContracts).values(data).returning();
    return contract;
  }

  async getPartnerContracts(filters?: { 
    partnerId?: string; 
    agentId?: string; 
    status?: string; 
    monetizationTier?: string 
  }): Promise<PartnerContract[]> {
    const conditions = [];
    if (filters?.partnerId) {
      conditions.push(eq(partnerContracts.partnerId, filters.partnerId));
    }
    if (filters?.agentId) {
      conditions.push(eq(partnerContracts.agentId, filters.agentId));
    }
    if (filters?.status) {
      conditions.push(eq(partnerContracts.status, filters.status as any));
    }
    if (filters?.monetizationTier) {
      conditions.push(eq(partnerContracts.monetizationTier, filters.monetizationTier as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(partnerContracts).orderBy(desc(partnerContracts.createdAt));
    }
    
    return await db
      .select()
      .from(partnerContracts)
      .where(and(...conditions))
      .orderBy(desc(partnerContracts.createdAt));
  }

  async getPartnerContract(id: string): Promise<PartnerContract | undefined> {
    const [contract] = await db.select().from(partnerContracts).where(eq(partnerContracts.id, id));
    return contract || undefined;
  }

  async getPartnerContractByPartnerId(partnerId: string): Promise<PartnerContract | undefined> {
    const [contract] = await db
      .select()
      .from(partnerContracts)
      .where(eq(partnerContracts.partnerId, partnerId))
      .orderBy(desc(partnerContracts.createdAt))
      .limit(1);
    return contract || undefined;
  }

  async updatePartnerContractStatus(id: string, status: string): Promise<void> {
    await db
      .update(partnerContracts)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(partnerContracts.id, id));
  }

  // Partner Invoices
  async createPartnerInvoice(data: InsertPartnerInvoice): Promise<PartnerInvoice> {
    const [invoice] = await db.insert(partnerInvoices).values(data).returning();
    return invoice;
  }

  async getPartnerInvoices(filters?: { 
    partnerId?: string; 
    contractId?: string; 
    status?: string 
  }): Promise<PartnerInvoice[]> {
    const conditions = [];
    if (filters?.partnerId) {
      conditions.push(eq(partnerInvoices.partnerId, filters.partnerId));
    }
    if (filters?.contractId) {
      conditions.push(eq(partnerInvoices.contractId, filters.contractId));
    }
    if (filters?.status) {
      conditions.push(eq(partnerInvoices.status, filters.status as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(partnerInvoices).orderBy(desc(partnerInvoices.createdAt));
    }
    
    return await db
      .select()
      .from(partnerInvoices)
      .where(and(...conditions))
      .orderBy(desc(partnerInvoices.createdAt));
  }

  async updatePartnerInvoiceStatus(id: string, status: string, stripeChargeId?: string): Promise<void> {
    const updateData: any = { status: status as any };
    if (stripeChargeId) {
      updateData.stripeChargeId = stripeChargeId;
    }
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }
    await db.update(partnerInvoices).set(updateData).where(eq(partnerInvoices.id, id));
  }

  // Agent Commissions
  async createAgentCommission(data: InsertAgentCommission): Promise<AgentCommission> {
    const [commission] = await db.insert(agentCommissions).values(data).returning();
    return commission;
  }

  async getAgentCommissions(filters?: { 
    agentId?: string; 
    partnerId?: string; 
    status?: string 
  }): Promise<AgentCommission[]> {
    const conditions = [];
    if (filters?.agentId) {
      conditions.push(eq(agentCommissions.agentId, filters.agentId));
    }
    if (filters?.partnerId) {
      conditions.push(eq(agentCommissions.partnerId, filters.partnerId));
    }
    if (filters?.status) {
      conditions.push(eq(agentCommissions.status, filters.status as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(agentCommissions).orderBy(desc(agentCommissions.createdAt));
    }
    
    return await db
      .select()
      .from(agentCommissions)
      .where(and(...conditions))
      .orderBy(desc(agentCommissions.createdAt));
  }

  async updateAgentCommissionStatus(id: string, status: string): Promise<void> {
    await db
      .update(agentCommissions)
      .set({ status: status as any })
      .where(eq(agentCommissions.id, id));
  }

  async markCommissionPaid(id: string): Promise<void> {
    await db
      .update(agentCommissions)
      .set({ status: 'paid' as any, datePaid: new Date() })
      .where(eq(agentCommissions.id, id));
  }

  // Agent Payouts
  async createAgentPayout(data: InsertAgentPayout): Promise<AgentPayout> {
    const [payout] = await db.insert(agentPayouts).values(data).returning();
    return payout;
  }

  async getAgentPayouts(filters?: { agentId?: string; status?: string }): Promise<AgentPayout[]> {
    const conditions = [];
    if (filters?.agentId) {
      conditions.push(eq(agentPayouts.agentId, filters.agentId));
    }
    if (filters?.status) {
      conditions.push(eq(agentPayouts.status, filters.status as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(agentPayouts).orderBy(desc(agentPayouts.createdAt));
    }
    
    return await db
      .select()
      .from(agentPayouts)
      .where(and(...conditions))
      .orderBy(desc(agentPayouts.createdAt));
  }

  async updateAgentPayoutStatus(id: string, status: string, stripePayoutId?: string): Promise<void> {
    const updateData: any = { status: status as any };
    if (stripePayoutId) {
      updateData.stripePayoutId = stripePayoutId;
    }
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    await db.update(agentPayouts).set(updateData).where(eq(agentPayouts.id, id));
  }

  // Partner Renewals
  async createPartnerRenewal(data: InsertPartnerRenewal): Promise<PartnerRenewal> {
    const [renewal] = await db.insert(partnerRenewals).values(data).returning();
    return renewal;
  }

  async getPartnerRenewals(filters?: { 
    partnerId?: string; 
    agentId?: string; 
    status?: string 
  }): Promise<PartnerRenewal[]> {
    const conditions = [];
    if (filters?.partnerId) {
      conditions.push(eq(partnerRenewals.partnerId, filters.partnerId));
    }
    if (filters?.agentId) {
      conditions.push(eq(partnerRenewals.agentId, filters.agentId));
    }
    if (filters?.status) {
      conditions.push(eq(partnerRenewals.status, filters.status as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(partnerRenewals).orderBy(desc(partnerRenewals.createdAt));
    }
    
    return await db
      .select()
      .from(partnerRenewals)
      .where(and(...conditions))
      .orderBy(desc(partnerRenewals.createdAt));
  }

  async getPendingRenewals(beforeDate: Date): Promise<PartnerRenewal[]> {
    return await db
      .select()
      .from(partnerRenewals)
      .where(
        and(
          eq(partnerRenewals.status, 'pending' as any),
          sql`${partnerRenewals.renewalDate} <= ${beforeDate}`
        )
      )
      .orderBy(partnerRenewals.renewalDate);
  }

  async updatePartnerRenewalStatus(id: string, status: string): Promise<void> {
    const updateData: any = { status: status as any };
    if (status !== 'pending') {
      updateData.processedAt = new Date();
    }
    await db.update(partnerRenewals).set(updateData).where(eq(partnerRenewals.id, id));
  }

  // BOGO Organizations
  async createBogoOrganization(data: InsertBogoOrganization): Promise<BogoOrganization> {
    const [org] = await db.insert(bogoOrganizations).values(data).returning();
    return org;
  }

  async getBogoOrganizations(filters?: { 
    category?: string; 
    region?: string; 
    status?: string 
  }): Promise<BogoOrganization[]> {
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(bogoOrganizations.category, filters.category));
    }
    if (filters?.region) {
      conditions.push(eq(bogoOrganizations.region, filters.region));
    }
    if (filters?.status) {
      conditions.push(eq(bogoOrganizations.status, filters.status as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(bogoOrganizations).orderBy(desc(bogoOrganizations.createdAt));
    }
    
    return await db
      .select()
      .from(bogoOrganizations)
      .where(and(...conditions))
      .orderBy(desc(bogoOrganizations.createdAt));
  }

  async updateBogoOrganization(id: string, data: Partial<InsertBogoOrganization>): Promise<void> {
    await db
      .update(bogoOrganizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bogoOrganizations.id, id));
  }

  // Agent Reference Code methods
  async getSalesAgentByRefCode(refCode: string): Promise<SalesAgent | undefined> {
    const [agent] = await db
      .select()
      .from(salesAgents)
      .where(eq(salesAgents.agentRefCode, refCode.toLowerCase()));
    return agent || undefined;
  }

  async getAllAgentRefCodes(): Promise<string[]> {
    const agents = await db
      .select({ refCode: salesAgents.agentRefCode })
      .from(salesAgents)
      .where(sql`${salesAgents.agentRefCode} IS NOT NULL`);
    return agents.map(a => a.refCode).filter((code): code is string => code !== null);
  }

  async updateSalesAgentRefCode(id: string, refCode: string): Promise<void> {
    await db
      .update(salesAgents)
      .set({ agentRefCode: refCode.toLowerCase(), updatedAt: new Date() })
      .where(eq(salesAgents.id, id));
  }

  // Ad Rotation methods
  async createAdRotation(data: InsertAdRotation): Promise<AdRotation> {
    const [rotation] = await db.insert(adRotations).values(data).returning();
    return rotation;
  }

  async getAdRotations(filters?: { 
    partnerId?: string; 
    zipCode?: string; 
    status?: string 
  }): Promise<AdRotation[]> {
    const conditions = [];
    if (filters?.partnerId) {
      conditions.push(eq(adRotations.partnerId, filters.partnerId));
    }
    if (filters?.zipCode) {
      conditions.push(eq(adRotations.zipCode, filters.zipCode));
    }
    if (filters?.status) {
      conditions.push(eq(adRotations.status, filters.status as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(adRotations).orderBy(desc(adRotations.weight));
    }
    
    return await db
      .select()
      .from(adRotations)
      .where(and(...conditions))
      .orderBy(desc(adRotations.weight));
  }

  async getAdRotationsByZip(zipCode: string): Promise<AdRotation[]> {
    return await db
      .select()
      .from(adRotations)
      .where(
        and(
          eq(adRotations.zipCode, zipCode),
          eq(adRotations.status, 'active' as any)
        )
      )
      .orderBy(desc(adRotations.weight));
  }

  async updateAdRotation(id: string, data: Partial<InsertAdRotation>): Promise<void> {
    await db
      .update(adRotations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(adRotations.id, id));
  }

  async deleteAdRotation(id: string): Promise<void> {
    await db.delete(adRotations).where(eq(adRotations.id, id));
  }

  // Ad Impression methods
  async createAdImpression(data: InsertAdImpression): Promise<AdImpression> {
    const [impression] = await db.insert(adImpressions).values(data).returning();
    return impression;
  }

  async getAdImpressions(filters?: { 
    partnerId?: string; 
    zipCode?: string; 
    startDate?: Date;
    endDate?: Date;
  }): Promise<AdImpression[]> {
    const conditions = [];
    if (filters?.partnerId) {
      conditions.push(eq(adImpressions.partnerId, filters.partnerId));
    }
    if (filters?.zipCode) {
      conditions.push(eq(adImpressions.zipCode, filters.zipCode));
    }
    if (filters?.startDate) {
      conditions.push(gte(adImpressions.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(adImpressions.timestamp, filters.endDate));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(adImpressions).orderBy(desc(adImpressions.timestamp)).limit(1000);
    }
    
    return await db
      .select()
      .from(adImpressions)
      .where(and(...conditions))
      .orderBy(desc(adImpressions.timestamp))
      .limit(1000);
  }

  async recordClickthrough(id: string): Promise<void> {
    await db
      .update(adImpressions)
      .set({ clickthrough: true as any })
      .where(eq(adImpressions.id, id));
  }

  async getImpressionStats(partnerId: string, days: number = 30): Promise<{ 
    impressions: number; 
    clicks: number; 
    ctr: number 
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const impressions = await db
      .select()
      .from(adImpressions)
      .where(
        and(
          eq(adImpressions.partnerId, partnerId),
          gte(adImpressions.timestamp, startDate)
        )
      );
    
    const totalImpressions = impressions.length;
    const clicks = impressions.filter(i => i.clickthrough).length;
    const ctr = totalImpressions > 0 ? (clicks / totalImpressions) * 100 : 0;
    
    return {
      impressions: totalImpressions,
      clicks,
      ctr: parseFloat(ctr.toFixed(2)),
    };
  }

  // ============================================
  // PRO ORGANIZATIONS DATABASE - Sales Lead Sources
  // ============================================

  // Pro Organizations
  async createProOrganization(data: InsertProOrganization): Promise<ProOrganization> {
    const [org] = await db.insert(proOrganizations).values(data).returning();
    return org;
  }

  async getProOrganizations(filters?: { 
    category?: string; 
    state?: string; 
    scope?: string 
  }): Promise<ProOrganization[]> {
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(proOrganizations.category, filters.category as any));
    }
    if (filters?.state) {
      conditions.push(eq(proOrganizations.state, filters.state));
    }
    if (filters?.scope) {
      conditions.push(eq(proOrganizations.scope, filters.scope as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(proOrganizations).orderBy(proOrganizations.category, proOrganizations.name);
    }
    
    return await db
      .select()
      .from(proOrganizations)
      .where(and(...conditions))
      .orderBy(proOrganizations.category, proOrganizations.name);
  }

  async getProOrganization(id: string): Promise<ProOrganization | undefined> {
    const [org] = await db.select().from(proOrganizations).where(eq(proOrganizations.id, id));
    return org || undefined;
  }

  // Get organizations relevant to a specific state
  // Returns: national orgs + regional orgs covering the state + state-specific orgs
  async getOrgsForState(stateCode: string, category?: string): Promise<ProOrganization[]> {
    const upperState = stateCode?.toUpperCase();
    if (!upperState) return [];
    
    // Get all organizations and filter in memory for complex array matching
    const allOrgs = await db.select().from(proOrganizations).orderBy(proOrganizations.category, proOrganizations.name);
    
    const filtered = allOrgs.filter(org => {
      // Category filter if specified
      if (category && org.category !== category) return false;
      
      // National orgs apply everywhere
      if (org.scope === "national") return true;
      
      // Regional orgs - check if state is in regions array
      if (org.scope === "regional" && org.regions?.includes(upperState)) return true;
      
      // State-scoped orgs - check if state matches
      if (org.scope === "state") {
        if (org.states?.includes(upperState)) return true;
        if (org.state === upperState) return true;
      }
      
      // Local orgs - check if state matches
      if (org.scope === "local" && org.state === upperState) return true;
      
      return false;
    });
    
    return filtered;
  }

  async updateProOrganization(id: string, data: Partial<InsertProOrganization>): Promise<void> {
    await db
      .update(proOrganizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proOrganizations.id, id));
  }

  async deleteProOrganization(id: string): Promise<void> {
    await db.delete(proOrganizations).where(eq(proOrganizations.id, id));
  }

  // Email Templates
  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(data).returning();
    return template;
  }

  async getEmailTemplates(filters?: { 
    category?: string; 
    isActive?: boolean 
  }): Promise<EmailTemplate[]> {
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(emailTemplates.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(emailTemplates.isActive, filters.isActive as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(emailTemplates).orderBy(emailTemplates.category, emailTemplates.name);
    }
    
    return await db
      .select()
      .from(emailTemplates)
      .where(and(...conditions))
      .orderBy(emailTemplates.category, emailTemplates.name);
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<void> {
    await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id));
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // ============================================
  // BATCH JOBS - Async Processing Queue
  // ============================================

  async createBatchJob(data: InsertBatchJob): Promise<BatchJob> {
    const [job] = await db.insert(batchJobs).values(data).returning();
    return job;
  }

  async getBatchJob(id: string): Promise<BatchJob | undefined> {
    const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, id));
    return job;
  }

  async updateBatchJobStatus(
    id: string, 
    status: 'queued' | 'processing' | 'completed' | 'failed', 
    results?: any, 
    error?: string
  ): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'processing') {
      updateData.startedAt = new Date();
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }
    
    if (results !== undefined) {
      updateData.results = results;
    }
    
    if (error !== undefined) {
      updateData.error = error;
    }
    
    await db.update(batchJobs).set(updateData).where(eq(batchJobs.id, id));
  }

  async getRecentBatchJobs(limit: number = 20): Promise<BatchJob[]> {
    return db.select()
      .from(batchJobs)
      .orderBy(desc(batchJobs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
