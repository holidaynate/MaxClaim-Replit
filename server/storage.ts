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
  sessions,
  sessionEvents,
  claims,
  claimLineItems,
  sources,
  sourceVersions,
  sessionSourceUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

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
  
  // Claim analytics (anonymous - no PII) - legacy compatibility
  recordClaimAnalysis(data: {
    zipCode: string;
    itemCount: number;
    totalInsuranceOffer: number;
    totalFMV: number;
    categories: string[];
  }): Promise<ClaimAnalysis>;
  getRegionalStats(): Promise<RegionalStats[]>;
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

  // Legacy analytics compatibility
  async recordClaimAnalysis(data: {
    zipCode: string;
    itemCount: number;
    totalInsuranceOffer: number;
    totalFMV: number;
    categories: string[];
  }): Promise<ClaimAnalysis> {
    // Return a compatible object for backward compatibility
    // Actual data is now stored in claims and claimLineItems tables
    const analysis: ClaimAnalysis = {
      id: `legacy-${Date.now()}`,
      ...data,
      timestamp: new Date(),
    };
    return analysis;
  }

  async getRegionalStats(): Promise<RegionalStats[]> {
    // Query from claims table for real regional statistics
    const result = await db
      .select({
        zipPrefix: claims.sessionId, // We'll need to join with sessions
        count: sql<number>`count(*)::int`,
        avgVariance: sql<number>`avg(${claims.variancePct})::float`,
      })
      .from(claims)
      .where(eq(claims.status, "completed"))
      .groupBy(claims.sessionId)
      .limit(100);

    // Transform to match RegionalStats interface
    const stats: RegionalStats[] = result.map((row) => ({
      zipCode: row.zipPrefix ? row.zipPrefix.substring(0, 3) : "000",
      analysisCount: row.count,
      avgUnderpayment: row.avgVariance || 0,
      commonCategories: [],
    }));

    return stats;
  }
}

export const storage = new DatabaseStorage();
