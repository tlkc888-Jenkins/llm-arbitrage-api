#!/usr/bin/env node
/**
 * SavvyLLM API — Find the cheapest LLM for your task
 * 
 * Includes: Auth, Stripe billing, API keys, usage tracking, anti-abuse
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

// Load modules
const db = require('./lib/database');
const auth = require('./lib/auth');
const billing = require('./lib/stripe-billing');
const antiAbuse = require('./lib/anti-abuse');

const app = express();

// === Config ===
const PORT = process.env.PORT || 8080;
const HELICONE_API = 'https://www.helicone.ai/api/llm-costs';
const CACHE_FILE = path.join(__dirname, 'data', 'pricing_cache.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// === Tier Definitions ===
const TIER_CONFIG = {
  simple: {
    maxInputCost: 1.0,
    maxOutputCost: 5.0,
    description: 'Basic Q&A, formatting, extraction',
  },
  standard: {
    maxInputCost: 5.0,
    maxOutputCost: 20.0,
    description: 'General chat, summarization, light reasoning',
  },
  complex: {
    maxInputCost: 20.0,
    maxOutputCost: 80.0,
    description: 'Coding, analysis, multi-step reasoning',
  },
  max: {
    maxInputCost: Infinity,
    maxOutputCost: Infinity,
    description: 'Best available, cost no object',
  },
};

const PROVIDER_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1',
  ANTHROPIC: 'https://api.anthropic.com/v1',
  GOOGLE: 'https://generativelanguage.googleapis.com/v1',
  GROQ: 'https://api.groq.com/openai/v1',
  TOGETHER: 'https://api.together.xyz/v1',
  MISTRAL: 'https://api.mistral.ai/v1',
  COHERE: 'https://api.cohere.ai/v1',
  FIREWORKS: 'https://api.fireworks.ai/inference/v1',
  PERPLEXITY: 'https://api.perplexity.ai',
  DEEPSEEK: 'https://api.deepseek.com/v1',
};

// === Pricing Cache ===
let pricingCache = null;
let cacheLoadedAt = null;

async function loadPricingCache() {
  const now = Date.now();
  if (pricingCache && cacheLoadedAt && (now - cacheLoadedAt) < CACHE_TTL_MS) {
    return pricingCache;
  }
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const cachedAt = new Date(data.cachedAt).getTime();
      if ((now - cachedAt) < CACHE_TTL_MS) {
        pricingCache = data;
        cacheLoadedAt = now;
        return pricingCache;
      }
    } catch (e) {
      console.error('Cache read error:', e.message);
    }
  }
  return refreshPricingCache();
}

async function refreshPricingCache() {
  console.log('Fetching fresh pricing from Helicone...');
  try {
    const resp = await fetch(HELICONE_API, { timeout: 30000 });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    const models = [];
    const EXCLUDE_PATTERNS = ['embed', 'whisper', 'tts', 'dall-e', 'image', 'vision-preview', 'moderation', 'auto', 'batch', 'realtime'];
    
    for (const m of raw.data || []) {
      const inputCost = m.input_cost_per_1m || 0;
      const outputCost = m.output_cost_per_1m || 0;
      const modelName = (m.model || '').toLowerCase();
      if (inputCost <= 0 && outputCost <= 0) continue;
      if (inputCost < 0 || outputCost < 0) continue;
      if (EXCLUDE_PATTERNS.some(p => modelName.includes(p))) continue;
      const totalCost1k = (inputCost * 0.5 + outputCost * 0.5) / 1000;
      models.push({
        provider: m.provider || 'UNKNOWN',
        model: m.model || 'unknown',
        inputCostPer1m: inputCost,
        outputCostPer1m: outputCost,
        totalCost1kTokens: Math.round(totalCost1k * 100000000) / 100000000,
      });
    }
    models.sort((a, b) => a.totalCost1kTokens - b.totalCost1kTokens);
    const cacheData = { cachedAt: new Date().toISOString(), totalModels: models.length, models };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    pricingCache = cacheData;
    cacheLoadedAt = Date.now();
    console.log(`Cached ${models.length} models`);
    return cacheData;
  } catch (e) {
    console.error('Fetch error:', e.message);
    if (pricingCache) return pricingCache;
    throw e;
  }
}

function filterModelsByTier(models, tier) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  return models.filter(m => m.inputCostPer1m <= config.maxInputCost && m.outputCostPer1m <= config.maxOutputCost);
}

function classifyPrompt(prompt, system = '') {
  const fullText = `${system} ${prompt}`.toLowerCase();
  const tokens = Math.ceil((prompt || '').length / 4);
  const simpleKeywords = ['what is', 'who is', 'list', 'format', 'extract', 'convert'];
  const complexKeywords = ['analyze', 'debug', 'write code', 'implement', 'compare', 'step by step', 'reasoning'];
  const hasSimple = simpleKeywords.some(kw => fullText.includes(kw));
  const hasComplex = complexKeywords.some(kw => fullText.includes(kw));
  if (tokens < 200 && hasSimple && !hasComplex) {
    return { tier: 'simple', confidence: 0.85, reasoning: 'Short prompt with simple task indicators' };
  } else if (tokens > 2000 || hasComplex) {
    return { tier: 'complex', confidence: 0.75, reasoning: 'Long context or complex task indicators' };
  } else if (hasSimple) {
    return { tier: 'simple', confidence: 0.70, reasoning: 'Simple task keywords detected' };
  }
  return { tier: 'standard', confidence: 0.65, reasoning: 'Default classification for general tasks' };
}

// === Middleware ===
app.use(express.json());

// Raw body for Stripe webhooks
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// === Public Routes ===

app.get('/', (req, res) => {
  res.json({
    name: 'SavvyLLM API',
    version: '0.2.0',
    tagline: 'Find the cheapest LLM for your task',
    endpoints: {
      auth: { signup: 'POST /auth/signup', login: 'POST /auth/login' },
      api: {
        cheapest: 'GET /v1/cheapest',
        classify: 'POST /v1/classify',
        models: 'GET /v1/models',
        tiers: 'GET /v1/tiers',
      },
      account: { me: 'GET /account/me', keys: 'GET /account/keys', usage: 'GET /account/usage' },
    },
    pricing: {
      trial: '30 days free',
      starter: '$9.95/mo - 5,000 queries',
      pro: '$25.95/mo - unlimited',
    },
  });
});

app.get('/health', async (req, res) => {
  try {
    const cache = await loadPricingCache();
    const cacheAge = (Date.now() - new Date(cache.cachedAt).getTime()) / 3600000;
    res.json({ status: 'ok', modelsCached: cache.totalModels, cacheAgeHours: Math.round(cacheAge * 100) / 100 });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

app.get('/v1/tiers', (req, res) => {
  const tiers = {};
  for (const [name, cfg] of Object.entries(TIER_CONFIG)) {
    tiers[name] = {
      maxInputCostPer1m: cfg.maxInputCost === Infinity ? 'unlimited' : cfg.maxInputCost,
      maxOutputCostPer1m: cfg.maxOutputCost === Infinity ? 'unlimited' : cfg.maxOutputCost,
      description: cfg.description,
    };
  }
  res.json({ tiers });
});

// === Auth Routes ===

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Check disposable email
    const emailCheck = antiAbuse.isDisposableEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.reason });
    }
    
    // Check IP abuse
    const ip = antiAbuse.getClientIp(req);
    const ipCheck = antiAbuse.validateSignupIp(db, ip);
    if (!ipCheck.valid) {
      return res.status(429).json({ error: ipCheck.reason });
    }
    
    // Check if email exists
    const existing = db.users.getByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Create user
    const passwordHash = await auth.hashPassword(password);
    const result = db.users.create(email.toLowerCase(), passwordHash, ip);
    const userId = result.lastInsertRowid;
    
    // Track IP
    db.antiAbuse.trackIpSignup(ip);
    
    // Create Stripe customer (if Stripe is configured)
    let stripeCustomerId = null;
    let setupUrl = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const customer = await billing.createCustomer(email, { userId: String(userId) });
        stripeCustomerId = customer.id;
        db.users.updateStripe(userId, stripeCustomerId);
        
        // Create setup session for card collection (required but not charged during trial)
        const setupSession = await billing.createSetupSession({
          customerId: stripeCustomerId,
          successUrl: `${BASE_URL}/setup-complete`,
          cancelUrl: `${BASE_URL}/setup-cancel`,
        });
        setupUrl = setupSession.url;
      } catch (e) {
        console.error('Stripe customer creation failed:', e.message);
      }
    }
    
    // Generate API key
    const apiKey = auth.generateApiKey();
    const keyHash = auth.hashApiKey(apiKey);
    const keyPrefix = auth.getKeyPrefix(apiKey);
    db.apiKeys.create(userId, keyHash, keyPrefix, 'Default');
    
    // Generate JWT
    const token = auth.generateToken(userId, email);
    
    res.status(201).json({
      message: 'Account created',
      userId,
      email,
      token,
      apiKey, // Only shown once!
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripeCustomerId,
      setupUrl, // Redirect here to add card (optional during trial, required after)
      note: setupUrl ? 'Add your card to continue after trial' : 'Card setup available when billing is enabled',
    });
    
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = db.users.getByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await auth.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = auth.generateToken(user.id, user.email);
    
    res.json({
      token,
      userId: user.id,
      email: user.email,
      subscriptionStatus: user.subscription_status,
      subscriptionTier: user.subscription_tier,
    });
    
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// === Account Routes (JWT auth) ===

app.get('/account/me', auth.authMiddleware(db), async (req, res) => {
  const user = db.users.getById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const monthlyUsage = db.usage.getThisMonth(user.id);
  const limit = billing.getTierLimit(user.subscription_tier);
  
  res.json({
    id: user.id,
    email: user.email,
    subscriptionStatus: user.subscription_status,
    subscriptionTier: user.subscription_tier,
    trialEndsAt: user.trial_ends_at,
    usage: {
      thisMonth: monthlyUsage,
      limit: limit === Infinity ? 'unlimited' : limit,
    },
    createdAt: user.created_at,
  });
});

app.get('/account/keys', auth.authMiddleware(db), (req, res) => {
  const keys = db.apiKeys.getByUser(req.user.id);
  res.json({ keys });
});

app.post('/account/keys', auth.authMiddleware(db), (req, res) => {
  const { name } = req.body;
  
  const apiKey = auth.generateApiKey();
  const keyHash = auth.hashApiKey(apiKey);
  const keyPrefix = auth.getKeyPrefix(apiKey);
  
  db.apiKeys.create(req.user.id, keyHash, keyPrefix, name || 'API Key');
  
  res.status(201).json({
    message: 'API key created',
    apiKey, // Only shown once!
    prefix: keyPrefix,
  });
});

app.delete('/account/keys/:id', auth.authMiddleware(db), (req, res) => {
  const keyId = parseInt(req.params.id);
  db.apiKeys.revoke(keyId, req.user.id);
  res.json({ message: 'API key revoked' });
});

app.get('/account/usage', auth.authMiddleware(db), (req, res) => {
  const today = db.usage.getToday(req.user.id);
  const month = db.usage.getThisMonth(req.user.id);
  const user = db.users.getById(req.user.id);
  const limit = billing.getTierLimit(user.subscription_tier);
  
  res.json({
    today,
    thisMonth: month,
    limit: limit === Infinity ? 'unlimited' : limit,
    remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - month),
  });
});

// === Billing Routes ===

app.post('/billing/checkout', auth.authMiddleware(db), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Billing not configured' });
  }
  
  const { tier } = req.body; // 'starter' or 'pro'
  const priceId = billing.PRICES[tier];
  
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid tier. Choose: starter, pro' });
  }
  
  const user = db.users.getById(req.user.id);
  if (!user.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer. Please contact support.' });
  }
  
  try {
    const session = await billing.createCheckoutSession({
      customerId: user.stripe_customer_id,
      priceId,
      successUrl: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${BASE_URL}/billing/cancel`,
    });
    
    res.json({ checkoutUrl: session.url });
  } catch (e) {
    console.error('Checkout error:', e);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.get('/billing/portal', auth.authMiddleware(db), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Billing not configured' });
  }
  
  const user = db.users.getById(req.user.id);
  if (!user.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer' });
  }
  
  try {
    const session = await billing.createPortalSession(user.stripe_customer_id, `${BASE_URL}/account`);
    res.json({ portalUrl: session.url });
  } catch (e) {
    console.error('Portal error:', e);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// === Stripe Webhooks ===

app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).send('Webhook not configured');
  }
  
  let event;
  try {
    event = billing.constructWebhookEvent(req.body, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook signature verification failed:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  
  console.log('Stripe webhook:', event.type);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const user = db.users.getByStripeCustomer(customerId);
        
        if (user && session.mode === 'subscription') {
          // Get subscription details
          const subscription = await billing.getSubscription(session.subscription);
          const priceId = subscription.items.data[0]?.price?.id;
          
          let tier = 'starter';
          if (priceId === billing.PRICES.pro) tier = 'pro';
          else if (priceId === billing.PRICES.overage) tier = 'overage';
          
          db.users.updateSubscription(user.id, 'active', tier);
          
          // Track card fingerprint for anti-abuse
          const fingerprint = await billing.getCardFingerprint(customerId);
          if (fingerprint) {
            const cardCheck = antiAbuse.checkCardReuse(db, fingerprint);
            if (!cardCheck.valid && cardCheck.existingUserId !== user.id) {
              console.warn(`Card reuse detected! User ${user.id} using card from user ${cardCheck.existingUserId}`);
              // Could flag for review instead of blocking
            }
            db.antiAbuse.saveCardFingerprint(fingerprint, user.id);
            db.users.updateCardFingerprint(user.id, fingerprint);
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const user = db.users.getByStripeCustomer(customerId);
        
        if (user) {
          const status = subscription.status === 'active' ? 'active' : subscription.status;
          const priceId = subscription.items.data[0]?.price?.id;
          
          let tier = 'starter';
          if (priceId === billing.PRICES.pro) tier = 'pro';
          else if (priceId === billing.PRICES.overage) tier = 'overage';
          
          db.users.updateSubscription(user.id, status, tier);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const user = db.users.getByStripeCustomer(customerId);
        
        if (user) {
          db.users.updateSubscription(user.id, 'canceled', user.subscription_tier);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const user = db.users.getByStripeCustomer(customerId);
        
        if (user) {
          db.users.updateSubscription(user.id, 'past_due', user.subscription_tier);
        }
        break;
      }
    }
  } catch (e) {
    console.error('Webhook processing error:', e);
  }
  
  res.json({ received: true });
});

// === API Routes (API Key auth) ===

const apiRateLimit = antiAbuse.rateLimitMiddleware(100, 60000); // 100 req/min

app.get('/v1/cheapest', auth.authMiddleware(db), apiRateLimit, async (req, res) => {
  const start = Date.now();
  
  try {
    // Track usage
    db.usage.increment(req.user.id);
    
    // Check usage limits
    const monthlyUsage = db.usage.getThisMonth(req.user.id);
    const limit = billing.getTierLimit(req.user.tier);
    
    if (limit !== Infinity && monthlyUsage > limit) {
      return res.status(429).json({
        error: 'Monthly query limit exceeded',
        usage: monthlyUsage,
        limit,
        upgradeUrl: `${BASE_URL}/billing/checkout`,
      });
    }
    
    const tier = req.query.tier || 'standard';
    const queryLimit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const providerFilter = req.query.provider?.toUpperCase();
    
    if (!TIER_CONFIG[tier]) {
      return res.status(400).json({ error: `Invalid tier. Choose from: ${Object.keys(TIER_CONFIG).join(', ')}` });
    }
    
    const cache = await loadPricingCache();
    let models = filterModelsByTier(cache.models, tier);
    
    if (providerFilter) {
      models = models.filter(m => m.provider === providerFilter);
    }
    
    const recommendations = models.slice(0, queryLimit).map(m => ({
      provider: m.provider,
      model: m.model,
      inputCostPer1m: m.inputCostPer1m,
      outputCostPer1m: m.outputCostPer1m,
      totalCost1kTokens: m.totalCost1kTokens,
      endpoint: PROVIDER_ENDPOINTS[m.provider] || null,
    }));
    
    res.json({
      tier,
      recommendations,
      totalModelsAnalyzed: cache.totalModels,
      cachedAt: cache.cachedAt,
      queryTimeMs: Date.now() - start,
    });
    
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/v1/classify', auth.authMiddleware(db), apiRateLimit, async (req, res) => {
  try {
    db.usage.increment(req.user.id);
    
    const { prompt, system } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    
    const { tier, confidence, reasoning } = classifyPrompt(prompt, system);
    const tokens = Math.ceil(`${system || ''} ${prompt}`.length / 4);
    
    const cache = await loadPricingCache();
    const models = filterModelsByTier(cache.models, tier).slice(0, 3);
    const recommendedModels = models.map(m => `${m.provider.toLowerCase()}/${m.model}`);
    
    res.json({ tier, confidence, reasoning, promptTokensEstimate: tokens, recommendedModels });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/v1/models', auth.authMiddleware(db), apiRateLimit, async (req, res) => {
  try {
    db.usage.increment(req.user.id);
    
    const cache = await loadPricingCache();
    let models = cache.models;
    
    const providerFilter = req.query.provider?.toUpperCase();
    const search = req.query.search?.toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    
    if (providerFilter) models = models.filter(m => m.provider === providerFilter);
    if (search) models = models.filter(m => m.model.toLowerCase().includes(search));
    
    res.json({ total: models.length, showing: Math.min(limit, models.length), models: models.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === Start ===
async function start() {
  // Initialize database first
  await db.initDb();
  console.log('Database initialized');
  
  // Pre-warm pricing cache
  loadPricingCache().catch(console.error);
  
  app.listen(PORT, () => {
    console.log(`SavvyLLM API running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
