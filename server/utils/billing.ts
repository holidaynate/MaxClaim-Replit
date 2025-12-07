// Reference: Stripe billing utility from user prompts
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
} else {
  console.warn("WARN: STRIPE_SECRET_KEY not set, billing functionality disabled");
}

/**
 * Create a checkout session for partner subscription.
 * Returns the checkout URL for redirect.
 */
export async function createPartnerCheckoutSession({
  partnerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  partnerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  if (!stripe) {
    console.error("Stripe not configured - cannot create checkout session");
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { partnerId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session.url;
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message);
    return null;
  }
}

/**
 * Create a one-time payment session for partner services.
 */
export async function createPartnerPaymentSession({
  partnerId,
  amount,
  description,
  successUrl,
  cancelUrl,
}: {
  partnerId: string;
  amount: number; // in cents
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  if (!stripe) {
    console.error("Stripe not configured - cannot create payment session");
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: { partnerId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session.url;
  } catch (err: any) {
    console.error("Stripe payment error:", err.message);
    return null;
  }
}

/**
 * Retrieve a checkout session by ID.
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err: any) {
    console.error("Stripe session retrieval error:", err.message);
    return null;
  }
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    return false;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (err: any) {
    console.error("Stripe subscription cancellation error:", err.message);
    return false;
  }
}

/**
 * Check if Stripe is configured.
 */
export function isStripeEnabled(): boolean {
  return !!stripe;
}

/**
 * Get Stripe instance for advanced usage.
 */
export function getStripeInstance(): Stripe | null {
  return stripe;
}
