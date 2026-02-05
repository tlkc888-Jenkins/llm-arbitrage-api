# Stripe Setup Guide

## 1. Create Products & Prices

Go to: https://dashboard.stripe.com/products

### Product: SavvyLLM Starter
- **Name**: SavvyLLM Starter
- **Description**: 5,000 queries per month
- Click "Add pricing"
  - **Price**: $9.95 USD
  - **Billing period**: Monthly
  - **Price ID**: Copy this (starts with `price_`)

### Product: SavvyLLM Pro  
- **Name**: SavvyLLM Pro
- **Description**: Unlimited queries
- Click "Add pricing"
  - **Price**: $25.95 USD
  - **Billing period**: Monthly
  - **Price ID**: Copy this (starts with `price_`)

### Product: SavvyLLM Overage (optional)
- **Name**: SavvyLLM Overage
- **Description**: Auto-upgrade when Starter limit exceeded
- Click "Add pricing"
  - **Price**: $29.95 USD
  - **Billing period**: Monthly
  - **Price ID**: Copy this (starts with `price_`)

## 2. Get API Keys

Go to: https://dashboard.stripe.com/apikeys

- **Publishable key**: `pk_live_...` (you have this)
- **Secret key**: `sk_live_...` (click "Reveal" and copy)

## 3. Set Up Webhook

Go to: https://dashboard.stripe.com/webhooks

Click "Add endpoint":
- **Endpoint URL**: `https://your-domain.com/webhooks/stripe`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

After creating, click the endpoint and copy the **Signing secret** (`whsec_...`)

## 4. Environment Variables for Render

Add these in Render dashboard → Environment:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_51SxGmoPS3sMxPlS7cPKm0k5Ygwg2wlTEm0nsOnlXLKIKkceBxJA1olQSsywkab9R22fAA6c2oWn3u6o01r00jmsHtvWQ
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_OVERAGE=price_...
JWT_SECRET=<generate-a-random-string>
BASE_URL=https://your-app-name.onrender.com
```

## 5. Test the Flow

1. Deploy to Render
2. Sign up for an account
3. Check Stripe dashboard → Customers (should see new customer)
4. Try the checkout flow
5. Verify webhook events are received

## Generate JWT Secret

Run this to generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
