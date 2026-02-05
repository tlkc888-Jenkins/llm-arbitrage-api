/**
 * Stripe billing module - subscriptions, webhooks, customer management
 */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

// Price IDs - set these in Stripe dashboard and add to env vars
const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,  // $9.95/mo
  pro: process.env.STRIPE_PRICE_PRO,          // $25.95/mo
  overage: process.env.STRIPE_PRICE_OVERAGE,  // $29.95/mo (auto-upgrade)
};

// Query limits per tier
const TIER_LIMITS = {
  free: 500,        // Free trial/tier
  starter: 5000,    // $9.95/mo
  pro: Infinity,    // $25.95/mo unlimited
};

// === Customer Management ===

async function createCustomer(email, metadata = {}) {
  return stripe.customers.create({
    email,
    metadata,
  });
}

async function getCustomer(customerId) {
  return stripe.customers.retrieve(customerId);
}

// === Checkout Sessions ===

async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, trialDays = 0 }) {
  const sessionConfig = {
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {},
  };
  
  if (trialDays > 0) {
    sessionConfig.subscription_data.trial_period_days = trialDays;
  }
  
  return stripe.checkout.sessions.create(sessionConfig);
}

async function createSetupSession({ customerId, successUrl, cancelUrl }) {
  // For collecting card without charging (during trial)
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'setup',
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

// === Subscriptions ===

async function getSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function cancelSubscription(subscriptionId) {
  return stripe.subscriptions.cancel(subscriptionId);
}

async function updateSubscription(subscriptionId, priceId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: priceId,
    }],
  });
}

// === Payment Methods ===

async function getPaymentMethod(paymentMethodId) {
  return stripe.paymentMethods.retrieve(paymentMethodId);
}

async function getCardFingerprint(customerId) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  
  if (paymentMethods.data.length > 0) {
    return paymentMethods.data[0].card.fingerprint;
  }
  return null;
}

// === Billing Portal ===

async function createPortalSession(customerId, returnUrl) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// === Webhook Handling ===

function constructWebhookEvent(payload, signature, webhookSecret) {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// === Helpers ===

function getTierLimit(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.starter;
}

function shouldUpgradeToOverage(tier, monthlyUsage) {
  const limit = getTierLimit(tier);
  return tier === 'starter' && monthlyUsage > limit;
}

module.exports = {
  stripe,
  PUBLISHABLE_KEY,
  PRICES,
  TIER_LIMITS,
  createCustomer,
  getCustomer,
  createCheckoutSession,
  createSetupSession,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  getPaymentMethod,
  getCardFingerprint,
  createPortalSession,
  constructWebhookEvent,
  getTierLimit,
  shouldUpgradeToOverage,
};
