import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

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
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Claim analytics (anonymous - no PII)
  recordClaimAnalysis(data: {
    zipCode: string;
    itemCount: number;
    totalInsuranceOffer: number;
    totalFMV: number;
    categories: string[];
  }): Promise<ClaimAnalysis>;
  getRegionalStats(): Promise<RegionalStats[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private claimAnalyses: Map<string, ClaimAnalysis>;

  constructor() {
    this.users = new Map();
    this.claimAnalyses = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async recordClaimAnalysis(data: {
    zipCode: string;
    itemCount: number;
    totalInsuranceOffer: number;
    totalFMV: number;
    categories: string[];
  }): Promise<ClaimAnalysis> {
    const id = randomUUID();
    const analysis: ClaimAnalysis = {
      id,
      ...data,
      timestamp: new Date()
    };
    this.claimAnalyses.set(id, analysis);
    return analysis;
  }

  async getRegionalStats(): Promise<RegionalStats[]> {
    const analysesByZip = new Map<string, ClaimAnalysis[]>();
    
    // Group by ZIP code
    const allAnalyses = Array.from(this.claimAnalyses.values());
    for (const analysis of allAnalyses) {
      const zipPrefix = analysis.zipCode.substring(0, 3);
      if (!analysesByZip.has(zipPrefix)) {
        analysesByZip.set(zipPrefix, []);
      }
      analysesByZip.get(zipPrefix)!.push(analysis);
    }

    // Calculate stats per region
    const stats: RegionalStats[] = [];
    const zipEntries = Array.from(analysesByZip.entries());
    for (const [zipCode, analyses] of zipEntries) {
      const totalUnderpayment = analyses.reduce((sum: number, a: ClaimAnalysis) => {
        return sum + ((a.totalFMV - a.totalInsuranceOffer) / a.totalInsuranceOffer * 100);
      }, 0);

      const categoryCount = new Map<string, number>();
      analyses.forEach((a: ClaimAnalysis) => {
        a.categories.forEach((cat: string) => {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        });
      });

      const commonCategories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      stats.push({
        zipCode,
        analysisCount: analyses.length,
        avgUnderpayment: totalUnderpayment / analyses.length,
        commonCategories
      });
    }

    return stats;
  }
}

export const storage = new MemStorage();
