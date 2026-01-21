/**
 * MaxClaim Lead Store Service
 * Manages lead lifecycle: PENDING → IN_PROGRESS → CLOSED → PAID
 * 
 * Tracks partner leads through entire sales funnel:
 * - Lead creation from user interactions
 * - Status transitions with timestamps
 * - Commission calculation and payout triggering
 */

import { db } from "../db";
import { partnerLeads, partners } from "@shared/schema";
import type { InsertPartnerLead, PartnerLead } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export type LeadStatus = "pending" | "in_progress" | "closed" | "paid";

interface LeadCreateData {
  partnerId: string;
  sessionId?: string;
  claimId?: string;
  leadType: "click" | "referral" | "conversion";
  claimValue?: number;
  zipCode?: string;
  metadata?: Record<string, any>;
}

interface LeadStatusUpdate {
  status: LeadStatus;
  claimValue?: number;
  commissionRate?: number;
  metadata?: Record<string, any>;
}

interface LeadStats {
  total: number;
  pending: number;
  inProgress: number;
  closed: number;
  paid: number;
  totalValue: number;
  totalCommissions: number;
}

const DEFAULT_COMMISSION_RATES: Record<string, number> = {
  contractor: 0.05,  // 5% for contractors
  adjuster: 0.10,    // 10% for public adjusters
  agency: 0.08,      // 8% for agencies
};

class LeadStoreService {
  /**
   * Create a new lead
   */
  async createLead(data: LeadCreateData): Promise<PartnerLead> {
    const now = new Date();
    
    const insertData: InsertPartnerLead = {
      partnerId: data.partnerId,
      sessionId: data.sessionId,
      claimId: data.claimId,
      leadType: data.leadType,
      status: "pending",
      claimValue: data.claimValue,
      zipCode: data.zipCode,
      metadata: data.metadata,
      clickedAt: data.leadType === "click" ? now : null,
    };

    const [lead] = await db.insert(partnerLeads).values(insertData).returning();
    
    console.log(`[LeadStore] Created lead ${lead.id} for partner ${data.partnerId}`);
    return lead;
  }

  /**
   * Update lead status with proper lifecycle transitions
   */
  async updateStatus(
    leadId: string,
    update: LeadStatusUpdate
  ): Promise<PartnerLead | null> {
    const lead = await this.getById(leadId);
    if (!lead) {
      console.error(`[LeadStore] Lead ${leadId} not found`);
      return null;
    }

    if (!this.isValidTransition(lead.status, update.status)) {
      console.error(
        `[LeadStore] Invalid transition: ${lead.status} → ${update.status}`
      );
      throw new Error(
        `Invalid status transition from ${lead.status} to ${update.status}`
      );
    }

    const now = new Date();
    const updateData: Partial<PartnerLead> = {
      status: update.status,
    };

    if (update.claimValue !== undefined) {
      updateData.claimValue = update.claimValue;
    }

    if (update.status === "in_progress") {
      updateData.convertedAt = now;
    }

    if (update.status === "closed") {
      updateData.closedAt = now;
      
      const partner = await db.query.partners.findFirst({
        where: eq(partners.id, lead.partnerId),
      });
      
      const rate = update.commissionRate ?? 
        DEFAULT_COMMISSION_RATES[partner?.type || "contractor"] ?? 0.05;
      
      const claimValue = update.claimValue ?? lead.claimValue ?? 0;
      const commission = claimValue * rate;
      
      updateData.commissionRate = rate;
      updateData.commissionAmount = commission;
    }

    if (update.status === "paid") {
      updateData.paidAt = now;
    }

    if (update.metadata) {
      updateData.metadata = {
        ...(lead.metadata as Record<string, any> || {}),
        ...update.metadata,
      };
    }

    const [updated] = await db
      .update(partnerLeads)
      .set(updateData)
      .where(eq(partnerLeads.id, leadId))
      .returning();

    console.log(`[LeadStore] Updated lead ${leadId}: ${lead.status} → ${update.status}`);
    return updated;
  }

  /**
   * Get lead by ID
   */
  async getById(leadId: string): Promise<PartnerLead | null> {
    const lead = await db.query.partnerLeads.findFirst({
      where: eq(partnerLeads.id, leadId),
    });
    return lead || null;
  }

  /**
   * Get leads by partner
   */
  async getByPartner(
    partnerId: string,
    options?: { status?: LeadStatus; limit?: number }
  ): Promise<PartnerLead[]> {
    const conditions = [eq(partnerLeads.partnerId, partnerId)];
    
    if (options?.status) {
      conditions.push(eq(partnerLeads.status, options.status));
    }

    const leads = await db
      .select()
      .from(partnerLeads)
      .where(and(...conditions))
      .orderBy(desc(partnerLeads.createdAt))
      .limit(options?.limit || 100);

    return leads;
  }

  /**
   * Get partner lead statistics
   */
  async getPartnerStats(partnerId: string): Promise<LeadStats> {
    const leads = await this.getByPartner(partnerId);

    const stats: LeadStats = {
      total: leads.length,
      pending: 0,
      inProgress: 0,
      closed: 0,
      paid: 0,
      totalValue: 0,
      totalCommissions: 0,
    };

    for (const lead of leads) {
      switch (lead.status) {
        case "pending":
          stats.pending++;
          break;
        case "in_progress":
          stats.inProgress++;
          break;
        case "closed":
          stats.closed++;
          break;
        case "paid":
          stats.paid++;
          break;
      }

      if (lead.claimValue) {
        stats.totalValue += lead.claimValue;
      }
      if (lead.commissionAmount) {
        stats.totalCommissions += lead.commissionAmount;
      }
    }

    return stats;
  }

  /**
   * Get leads ready for payout
   */
  async getLeadsReadyForPayout(partnerId?: string): Promise<PartnerLead[]> {
    const conditions = [eq(partnerLeads.status, "closed")];
    
    if (partnerId) {
      conditions.push(eq(partnerLeads.partnerId, partnerId));
    }

    return db
      .select()
      .from(partnerLeads)
      .where(and(...conditions))
      .orderBy(desc(partnerLeads.closedAt));
  }

  /**
   * Mark leads as paid in batch
   */
  async markAsPaid(leadIds: string[]): Promise<number> {
    if (leadIds.length === 0) return 0;

    const now = new Date();
    let updated = 0;

    for (const id of leadIds) {
      try {
        await this.updateStatus(id, { status: "paid" });
        updated++;
      } catch (error) {
        console.error(`[LeadStore] Failed to mark lead ${id} as paid:`, error);
      }
    }

    return updated;
  }

  /**
   * Export leads to CSV format
   */
  async exportToCSV(partnerId: string): Promise<string> {
    const leads = await this.getByPartner(partnerId);
    
    const headers = [
      "ID",
      "Type",
      "Status",
      "Claim Value",
      "Commission",
      "ZIP Code",
      "Created At",
      "Closed At",
      "Paid At",
    ];

    const rows = leads.map((lead) => [
      lead.id,
      lead.leadType,
      lead.status,
      lead.claimValue?.toString() || "",
      lead.commissionAmount?.toString() || "",
      lead.zipCode || "",
      lead.createdAt.toISOString(),
      lead.closedAt?.toISOString() || "",
      lead.paidAt?.toISOString() || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return csv;
  }

  /**
   * Validate status transitions
   */
  private isValidTransition(from: LeadStatus, to: LeadStatus): boolean {
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      pending: ["in_progress", "closed"],
      in_progress: ["closed"],
      closed: ["paid"],
      paid: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Calculate commission for a lead
   */
  calculateCommission(
    claimValue: number,
    partnerType: string = "contractor",
    customRate?: number
  ): { rate: number; amount: number } {
    const rate = customRate ?? DEFAULT_COMMISSION_RATES[partnerType] ?? 0.05;
    const amount = Math.round(claimValue * rate * 100) / 100;
    return { rate, amount };
  }
}

export const leadStore = new LeadStoreService();
