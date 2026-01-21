import { storage } from "../storage";
import { getUncachableStripeClient } from "./stripeClient";
import { commissionEngine } from "./commissionEngine";
import type { PartnerContract, InsertPartnerInvoice, SalesAgent } from "@shared/schema";

export interface PartnerPricingTier {
  tier: 'free_bogo' | 'standard' | 'premium';
  monthlyPrice: number;
  setupFee: number;
  rotationWeight: number;
  features: string[];
}

export const PARTNER_PRICING: Record<string, PartnerPricingTier> = {
  free: {
    tier: 'free_bogo',
    monthlyPrice: 0,
    setupFee: 0,
    rotationWeight: 0.5,
    features: [
      'Basic listing in contractor directory',
      'Available via trade association membership',
      'Standard rotation weight (1x)',
      'Monthly analytics report',
    ],
  },
  free_bogo: {
    tier: 'free_bogo',
    monthlyPrice: 0,
    setupFee: 0,
    rotationWeight: 0.5,
    features: [
      'Basic listing in contractor directory',
      'Limited to BOGO organization members',
      'Lower priority in rotation (0.5x weight)',
    ],
  },
  standard: {
    tier: 'standard',
    monthlyPrice: 500,
    setupFee: 0,
    rotationWeight: 2.0,
    features: [
      'Priority listing placement',
      '2x rotation weight',
      'Weekly analytics dashboard',
      'Lead notifications',
      'Edit listing anytime',
      '3 ad placements',
    ],
  },
  premium: {
    tier: 'premium',
    monthlyPrice: 2000,
    setupFee: 0,
    rotationWeight: 4.0,
    features: [
      'Top placement guarantee',
      '4x rotation weight',
      'Real-time analytics',
      'Direct lead routing',
      'Custom branding options',
      'Dedicated account manager',
      'All ad placements',
      'API access',
    ],
  },
};

export class StripePaymentService {
  async createPartnerCustomer(partnerId: string, email: string, name: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        partnerId,
        source: 'max-claim-partner',
      },
    });
    
    return customer.id;
  }

  async createPartnerSubscription(
    contract: PartnerContract,
    customerId: string
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    const stripe = await getUncachableStripeClient();
    const pricing = PARTNER_PRICING[contract.monetizationTier];
    
    if (!pricing || pricing.monthlyPrice === 0) {
      return { subscriptionId: '' };
    }

    const product = await stripe.products.create({
      name: `Max-Claim Partner ${pricing.tier.charAt(0).toUpperCase() + pricing.tier.slice(1)} Plan`,
      metadata: {
        partnerId: contract.partnerId,
        tier: pricing.tier,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(pricing.monthlyPrice * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        partnerId: contract.partnerId,
        contractId: contract.id,
        tier: pricing.tier,
      },
    });

    const latestInvoice = subscription.latest_invoice as any;
    const paymentIntent = latestInvoice?.payment_intent as any;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
    };
  }

  async chargeSetupFee(
    contract: PartnerContract,
    customerId: string
  ): Promise<{ invoiceId: string; clientSecret?: string } | null> {
    const pricing = PARTNER_PRICING[contract.monetizationTier];
    
    if (!pricing || pricing.setupFee === 0) {
      return null;
    }

    const stripe = await getUncachableStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pricing.setupFee * 100),
      currency: 'usd',
      customer: customerId,
      metadata: {
        partnerId: contract.partnerId,
        contractId: contract.id,
        type: 'setup_fee',
      },
    });

    const invoiceData: InsertPartnerInvoice = {
      partnerId: contract.partnerId,
      contractId: contract.id,
      amount: pricing.setupFee,
      status: 'unpaid',
      dueDate: new Date(),
      notes: 'Setup fee payment',
      stripeChargeId: paymentIntent.id,
    };

    await storage.createPartnerInvoice(invoiceData);

    return {
      invoiceId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  }

  async handlePaymentSuccess(
    paymentIntentId: string,
    contractId: string,
    isRenewal: boolean = false
  ): Promise<void> {
    const contract = await storage.getPartnerContract(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    const invoices = await storage.getPartnerInvoices({ contractId });
    const invoice = invoices.find(i => i.stripeChargeId === paymentIntentId);
    
    if (invoice) {
      await storage.updatePartnerInvoiceStatus(invoice.id, 'paid', paymentIntentId);
      
      if (contract.agentId) {
        await commissionEngine.processInvoicePaid(invoice.id, contract, isRenewal);
      }
    }
    
    if (contract.status === 'pending') {
      await storage.updatePartnerContractStatus(contractId, 'active');
    }
  }

  async createAgentConnectAccount(agent: SalesAgent): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    const account = await stripe.accounts.create({
      type: 'express',
      email: agent.email,
      metadata: {
        agentId: agent.id,
        source: 'max-claim-agent',
      },
      capabilities: {
        transfers: { requested: true },
      },
    });
    
    await storage.updateSalesAgentStripeConnect(agent.id, account.id);
    
    return account.id;
  }

  async createAgentConnectOnboardingLink(
    stripeConnectId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeConnectId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return accountLink.url;
  }

  async payAgentCommission(
    agentId: string,
    amount: number,
    description: string
  ): Promise<{ payoutId: string; transferId: string }> {
    const agent = await storage.getSalesAgent(agentId);
    if (!agent || !agent.stripeConnectId) {
      throw new Error('Agent not found or not connected to Stripe');
    }

    const stripe = await getUncachableStripeClient();

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: agent.stripeConnectId,
      description,
      metadata: {
        agentId: agent.id,
        source: 'max-claim-commission',
      },
    });

    const payout = await storage.createAgentPayout({
      agentId: agent.id,
      amount,
      payoutMethod: 'stripe_connect',
      status: 'processing',
      stripePayoutId: transfer.id,
      notes: description,
    });

    return {
      payoutId: payout.id,
      transferId: transfer.id,
    };
  }

  async getAgentConnectDashboardLink(stripeConnectId: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    const loginLink = await stripe.accounts.createLoginLink(stripeConnectId);
    
    return loginLink.url;
  }

  async cancelPartnerSubscription(subscriptionId: string): Promise<void> {
    if (!subscriptionId) return;
    
    const stripe = await getUncachableStripeClient();
    
    await stripe.subscriptions.cancel(subscriptionId);
  }

  async processRenewalPayment(
    contract: PartnerContract
  ): Promise<{ success: boolean; error?: string }> {
    if (!contract.stripeSubscriptionId) {
      return { success: false, error: 'No subscription found' };
    }

    try {
      const stripe = await getUncachableStripeClient();
      
      const subscription = await stripe.subscriptions.retrieve(contract.stripeSubscriptionId);
      
      if (subscription.status !== 'active') {
        return { success: false, error: `Subscription status is ${subscription.status}` };
      }

      const invoiceData: InsertPartnerInvoice = {
        partnerId: contract.partnerId,
        contractId: contract.id,
        amount: Number(contract.baseMonthly),
        status: 'paid',
        dueDate: new Date(),
        notes: 'Renewal payment',
        stripeInvoiceId: subscription.latest_invoice as string,
      };

      const invoice = await storage.createPartnerInvoice(invoiceData);

      if (contract.agentId) {
        await commissionEngine.processInvoicePaid(invoice.id, contract, true);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createCheckoutSession(
    partnerId: string,
    tier: 'standard' | 'premium',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const stripe = await getUncachableStripeClient();
    const pricing = PARTNER_PRICING[tier];
    
    if (!pricing || pricing.monthlyPrice === 0) {
      throw new Error('Invalid pricing tier for checkout');
    }

    const partner = await storage.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: partner.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `MaxClaim ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
              description: pricing.features.join(', '),
            },
            unit_amount: Math.round(pricing.monthlyPrice * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        partnerId,
        tier,
        source: 'max-claim-partner-signup',
      },
      subscription_data: {
        metadata: {
          partnerId,
          tier,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  async getCheckoutSession(sessionId: string): Promise<any> {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });
    return session;
  }

  async handleCheckoutComplete(sessionId: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const partnerId = session.metadata?.partnerId;
    
    if (!partnerId) {
      throw new Error('Partner ID not found in session metadata');
    }

    const partner = await storage.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    await storage.updatePartnerStatus(partnerId, 'approved');
    
    await storage.updatePartnerStripeInfo(partnerId, {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: (session.subscription as any)?.id,
    });
  }

  // Partner Connect (for contractors receiving referral payouts)
  async createPartnerConnectAccount(partnerId: string, email: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: {
        partnerId,
        source: 'max-claim-partner',
        accountType: 'contractor',
      },
      capabilities: {
        transfers: { requested: true },
      },
    });
    
    await storage.updatePartnerStripeInfo(partnerId, {
      stripeConnectId: account.id,
    });
    
    return account.id;
  }

  async createPartnerConnectOnboardingLink(
    stripeConnectId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeConnectId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return accountLink.url;
  }

  async getPartnerConnectDashboardLink(stripeConnectId: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(stripeConnectId);
    return loginLink.url;
  }

  // Process lead-based partner payouts
  async processLeadPayout(
    leadId: string,
    partnerId: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; transferId?: string; error?: string }> {
    const partner = await storage.getPartner(partnerId);
    if (!partner) {
      return { success: false, error: 'Partner not found' };
    }

    // Check if partner has Stripe Connect
    const stripeConnectId = (partner as any).stripeConnectId;
    if (!stripeConnectId) {
      return { success: false, error: 'Partner not connected to Stripe for payouts' };
    }

    try {
      const stripe = await getUncachableStripeClient();

      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: stripeConnectId,
        description,
        metadata: {
          partnerId,
          leadId,
          source: 'max-claim-lead-payout',
        },
      });

      return {
        success: true,
        transferId: transfer.id,
      };
    } catch (error: any) {
      console.error('[StripePayout] Lead payout failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Batch payout processing
  async processBatchPayouts(
    payouts: Array<{ partnerId: string; amount: number; description: string; leadId?: string }>
  ): Promise<{ processed: number; failed: number; results: Array<{ partnerId: string; success: boolean; error?: string }> }> {
    const results: Array<{ partnerId: string; success: boolean; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const payout of payouts) {
      const result = await this.processLeadPayout(
        payout.leadId || '',
        payout.partnerId,
        payout.amount,
        payout.description
      );

      if (result.success) {
        processed++;
      } else {
        failed++;
      }

      results.push({
        partnerId: payout.partnerId,
        success: result.success,
        error: result.error,
      });
    }

    return { processed, failed, results };
  }

  // Get partner payout balance from Stripe
  async getPartnerPayoutBalance(stripeConnectId: string): Promise<{ available: number; pending: number }> {
    try {
      const stripe = await getUncachableStripeClient();
      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeConnectId,
      });

      const available = balance.available.reduce((sum, b) => sum + (b.amount / 100), 0);
      const pending = balance.pending.reduce((sum, b) => sum + (b.amount / 100), 0);

      return { available, pending };
    } catch (error) {
      return { available: 0, pending: 0 };
    }
  }

  // Check if partner's Connect account is fully onboarded
  async isPartnerConnectComplete(stripeConnectId: string): Promise<boolean> {
    try {
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(stripeConnectId);
      return account.details_submitted && !account.requirements?.currently_due?.length;
    } catch (error) {
      return false;
    }
  }
}

export const stripePaymentService = new StripePaymentService();

// ============================================
// STANDALONE EXPORTS FOR PARTNER CONNECT
// ============================================

/**
 * Create a Stripe Connect account for a partner and persist the account ID
 */
export async function createPartnerConnectAccount(
  partnerId: string,
  email: string,
  companyName: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const accountId = await stripePaymentService.createPartnerConnectAccount(partnerId, email);
    return { success: true, accountId };
  } catch (error: any) {
    console.error('[StripeConnect] Account creation failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create an onboarding link for partner Connect account
 */
export async function createOnboardingLink(
  stripeConnectId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const url = await stripePaymentService.createPartnerConnectOnboardingLink(
      stripeConnectId,
      returnUrl,
      refreshUrl
    );
    return { success: true, url };
  } catch (error: any) {
    console.error('[StripeConnect] Onboarding link failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get Connect account dashboard link
 */
export async function getConnectDashboardLink(
  stripeConnectId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const url = await stripePaymentService.getPartnerConnectDashboardLink(stripeConnectId);
    return { success: true, url };
  } catch (error: any) {
    console.error('[StripeConnect] Dashboard link failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get Connect account balance
 */
export async function getConnectAccountBalance(
  stripeConnectId: string
): Promise<{ success: boolean; balance?: { available: number; pending: number }; error?: string }> {
  try {
    const balance = await stripePaymentService.getPartnerPayoutBalance(stripeConnectId);
    return { success: true, balance };
  } catch (error: any) {
    console.error('[StripeConnect] Balance check failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process payout for a specific lead
 */
export async function processLeadPayout(
  leadId: string
): Promise<{ success: boolean; transferId?: string; amount?: number; error?: string }> {
  try {
    // Get lead details via storage abstraction
    const lead = await storage.getPartnerLead(leadId);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }
    
    if (lead.status === 'paid') {
      return { success: false, error: 'Lead already paid' };
    }
    
    const amount = Number(lead.commissionAmount) || 0;
    if (amount <= 0) {
      return { success: false, error: 'No commission amount to pay' };
    }
    
    const result = await stripePaymentService.processLeadPayout(
      leadId,
      lead.partnerId,
      amount,
      `Lead payout for claim referral`
    );
    
    if (result.success) {
      // Update lead status to paid via storage abstraction
      await storage.updatePartnerLeadStatus(leadId, 'paid', new Date());
    }
    
    return {
      success: result.success,
      transferId: result.transferId,
      amount,
      error: result.error,
    };
  } catch (error: any) {
    console.error('[StripeConnect] Lead payout failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Batch process payouts for approved leads
 */
export async function batchProcessPayouts(
  maxPayouts: number = 50
): Promise<{ processed: number; failed: number; totalAmount: number }> {
  try {
    // Get approved leads via storage abstraction
    const leads = await storage.getApprovedLeadsForPayout(maxPayouts);
    
    let processed = 0;
    let failed = 0;
    let totalAmount = 0;
    
    for (const lead of leads) {
      const result = await processLeadPayout(lead.id);
      if (result.success) {
        processed++;
        totalAmount += result.amount || 0;
      } else {
        failed++;
      }
    }
    
    console.log(`[StripeConnect] Batch payout: ${processed} processed, ${failed} failed, $${totalAmount.toFixed(2)} total`);
    return { processed, failed, totalAmount };
  } catch (error: any) {
    console.error('[StripeConnect] Batch payout failed:', error.message);
    return { processed: 0, failed: 0, totalAmount: 0 };
  }
}
