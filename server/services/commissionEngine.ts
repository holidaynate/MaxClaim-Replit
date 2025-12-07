import { storage } from "../storage";
import type { 
  AgentCommissionTier, 
  SalesAgent, 
  PartnerContract,
  InsertAgentCommission,
  AgentCommission 
} from "@shared/schema";

export interface CommissionCalculation {
  baseRate: number;
  effectiveRate: number;
  bonusRate: number;
  amount: number;
  breakdown: {
    contractValue: number;
    baseCommission: number;
    bonusAmount: number;
    renewalMultiplier: number;
  };
}

export interface CommissionConfig {
  isRenewal: boolean;
  renewalMultiplier?: number;
  manualOverrideRate?: number;
}

export const DEFAULT_COMMISSION_TIERS: Array<{
  name: string;
  baseRate: number;
  bonusThresholds: Array<{ annualRevenue: number; bonusRate: number }>;
}> = [
  {
    name: "Bronze",
    baseRate: 0.15,
    bonusThresholds: [
      { annualRevenue: 10000, bonusRate: 0.02 },
      { annualRevenue: 25000, bonusRate: 0.03 },
      { annualRevenue: 50000, bonusRate: 0.05 },
    ],
  },
  {
    name: "Silver",
    baseRate: 0.20,
    bonusThresholds: [
      { annualRevenue: 15000, bonusRate: 0.03 },
      { annualRevenue: 35000, bonusRate: 0.05 },
      { annualRevenue: 75000, bonusRate: 0.07 },
    ],
  },
  {
    name: "Gold",
    baseRate: 0.30,
    bonusThresholds: [
      { annualRevenue: 25000, bonusRate: 0.04 },
      { annualRevenue: 60000, bonusRate: 0.06 },
      { annualRevenue: 100000, bonusRate: 0.08 },
    ],
  },
  {
    name: "Platinum",
    baseRate: 0.40,
    bonusThresholds: [
      { annualRevenue: 50000, bonusRate: 0.03 },
      { annualRevenue: 100000, bonusRate: 0.05 },
      { annualRevenue: 200000, bonusRate: 0.07 },
    ],
  },
];

export const RENEWAL_COMMISSION_MULTIPLIER = 0.5;

export class CommissionEngine {
  private async getAgentTier(tierId: string): Promise<AgentCommissionTier | undefined> {
    return await storage.getAgentCommissionTier(tierId);
  }

  async calculateCommission(
    agent: SalesAgent,
    contract: PartnerContract,
    config: CommissionConfig = { isRenewal: false }
  ): Promise<CommissionCalculation> {
    const contractValue = this.calculateContractValue(contract);
    
    let baseRate = 0.20;
    let bonusRate = 0;
    
    if (agent.commissionTierId) {
      const tier = await this.getAgentTier(agent.commissionTierId);
      if (tier) {
        baseRate = Number(tier.baseRate);
        bonusRate = this.calculateBonusRate(tier, Number(agent.ytdEarnings || 0));
      }
    }
    
    if (config.manualOverrideRate !== undefined) {
      baseRate = config.manualOverrideRate;
    }
    
    const renewalMultiplier = config.isRenewal 
      ? (config.renewalMultiplier ?? RENEWAL_COMMISSION_MULTIPLIER)
      : 1.0;
    
    const effectiveRate = (baseRate + bonusRate) * renewalMultiplier;
    const baseCommission = contractValue * baseRate * renewalMultiplier;
    const bonusAmount = contractValue * bonusRate * renewalMultiplier;
    const totalAmount = baseCommission + bonusAmount;
    
    return {
      baseRate,
      effectiveRate,
      bonusRate,
      amount: Math.round(totalAmount * 100) / 100,
      breakdown: {
        contractValue,
        baseCommission: Math.round(baseCommission * 100) / 100,
        bonusAmount: Math.round(bonusAmount * 100) / 100,
        renewalMultiplier,
      },
    };
  }

  private calculateContractValue(contract: PartnerContract): number {
    const baseMonthly = Number(contract.baseMonthly || 0);
    const setupFee = Number(contract.setupFee || 0);
    const durationMonths = contract.durationMonths || 12;
    const upfrontDiscount = Number(contract.upfrontDiscount || 0);
    
    const monthlyRevenue = baseMonthly * durationMonths;
    const discountAmount = monthlyRevenue * upfrontDiscount;
    
    return setupFee + monthlyRevenue - discountAmount;
  }

  private calculateBonusRate(tier: AgentCommissionTier, ytdRevenue: number): number {
    const thresholds = tier.bonusThresholds || [];
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
      return 0;
    }
    
    const sortedThresholds = [...thresholds].sort(
      (a, b) => b.annualRevenue - a.annualRevenue
    );
    
    for (const threshold of sortedThresholds) {
      if (ytdRevenue >= threshold.annualRevenue) {
        return threshold.bonusRate;
      }
    }
    
    return 0;
  }

  async createCommissionForDeal(
    agentId: string,
    partnerId: string,
    contractId: string,
    invoiceId: string,
    calculation: CommissionCalculation,
    isRenewal: boolean = false
  ): Promise<AgentCommission> {
    const commissionData: InsertAgentCommission = {
      agentId,
      partnerId,
      contractId,
      invoiceId,
      commissionType: isRenewal ? "renewal" : "deal_close",
      rate: calculation.effectiveRate,
      baseAmount: calculation.breakdown.contractValue,
      commissionAmount: calculation.amount,
      status: "pending",
      notes: isRenewal 
        ? "Auto-generated commission for contract renewal"
        : "Auto-generated commission for new deal close",
    };
    
    return await storage.createAgentCommission(commissionData);
  }

  async processInvoicePaid(
    invoiceId: string,
    contract: PartnerContract,
    isRenewal: boolean = false
  ): Promise<AgentCommission | null> {
    if (!contract.agentId) {
      return null;
    }
    
    const agent = await storage.getSalesAgent(contract.agentId);
    if (!agent) {
      return null;
    }
    
    const calculation = await this.calculateCommission(agent, contract, {
      isRenewal,
    });
    
    const commission = await this.createCommissionForDeal(
      agent.id,
      contract.partnerId,
      contract.id,
      invoiceId,
      calculation,
      isRenewal
    );
    
    return commission;
  }

  async approveCommission(commissionId: string): Promise<void> {
    await storage.updateAgentCommissionStatus(commissionId, "approved");
  }

  async payCommission(commissionId: string): Promise<void> {
    const commissions = await storage.getAgentCommissions({ status: "approved" });
    const commission = commissions.find(c => c.id === commissionId);
    
    if (!commission) {
      throw new Error("Commission not found or not approved");
    }
    
    await storage.updateSalesAgentEarnings(commission.agentId, Number(commission.commissionAmount));
    await storage.markCommissionPaid(commissionId);
  }

  async getAgentDashboardStats(agentId: string): Promise<{
    totalEarned: number;
    ytdEarnings: number;
    pendingCommissions: number;
    approvedUnpaid: number;
    activeContracts: number;
    renewalRate: number;
  }> {
    const agent = await storage.getSalesAgent(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }
    
    const allCommissions = await storage.getAgentCommissions({ agentId });
    const pendingCommissions = allCommissions
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    
    const approvedUnpaid = allCommissions
      .filter(c => c.status === "approved")
      .reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    
    const contracts = await storage.getPartnerContracts({ agentId, status: "active" });
    
    const renewals = await storage.getPartnerRenewals({ agentId, status: "confirmed" });
    const totalRenewable = await storage.getPartnerRenewals({ agentId });
    const renewalRate = totalRenewable.length > 0 
      ? (renewals.length / totalRenewable.length) * 100 
      : 0;
    
    return {
      totalEarned: Number(agent.totalEarned || 0),
      ytdEarnings: Number(agent.ytdEarnings || 0),
      pendingCommissions,
      approvedUnpaid,
      activeContracts: contracts.length,
      renewalRate: Math.round(renewalRate * 100) / 100,
    };
  }

  async processAutoRenewals(): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const results = { processed: 0, failed: 0, errors: [] as string[] };
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 7);
    
    const pendingRenewals = await storage.getPendingRenewals(cutoffDate);
    
    for (const renewal of pendingRenewals) {
      try {
        const contract = await storage.getPartnerContract(renewal.contractId);
        if (!contract || !contract.autoRenew) {
          await storage.updatePartnerRenewalStatus(renewal.id, "cancelled");
          continue;
        }
        
        await storage.updatePartnerRenewalStatus(renewal.id, "confirmed");
        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Renewal ${renewal.id}: ${(error as Error).message}`);
        await storage.updatePartnerRenewalStatus(renewal.id, "failed");
      }
    }
    
    return results;
  }
}

export const commissionEngine = new CommissionEngine();

export async function seedDefaultCommissionTiers(): Promise<void> {
  const existingTiers = await storage.getAgentCommissionTiers();
  if (existingTiers.length > 0) {
    console.log("[CommissionEngine] Commission tiers already seeded");
    return;
  }
  
  console.log("[CommissionEngine] Seeding default commission tiers...");
  
  for (const tier of DEFAULT_COMMISSION_TIERS) {
    await storage.createAgentCommissionTier({
      name: tier.name,
      baseRate: tier.baseRate,
      bonusThresholds: tier.bonusThresholds,
    });
  }
  
  console.log(`[CommissionEngine] Seeded ${DEFAULT_COMMISSION_TIERS.length} commission tiers`);
}
