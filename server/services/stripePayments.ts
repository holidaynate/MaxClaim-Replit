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
    monthlyPrice: 99,
    setupFee: 49,
    rotationWeight: 1.0,
    features: [
      'Standard listing in contractor directory',
      'Normal priority in rotation (1.0x weight)',
      'Lead tracking dashboard',
      'ZIP code targeting (up to 5 codes)',
    ],
  },
  premium: {
    tier: 'premium',
    monthlyPrice: 299,
    setupFee: 0,
    rotationWeight: 2.0,
    features: [
      'Premium featured listing',
      'High priority in rotation (2.0x weight)',
      'Full analytics dashboard',
      'Unlimited ZIP code targeting',
      'Dedicated account support',
      'Featured badge display',
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
}

export const stripePaymentService = new StripePaymentService();
