# SavvyLLM Landing Page Copy

---

## Hero Section

### Headline
**Stop Overpaying for LLMs**

### Subheadline
Find the cheapest model for any task. One API call. 800+ models. No middleman.

### CTA
[Start Free Trial] — 30 days free, no credit card required

### Hero stats
- 800+ models indexed
- Updated every 6 hours
- $0 markup on your API calls

---

## Problem Section

### Headline
**You're probably using GPT-4 for tasks GPT-3.5 could handle.**

And paying 20x more than you need to.

The LLM landscape has exploded. There are 800+ models across dozens of providers. Prices range from $0.01 to $60 per million tokens. 

But who has time to compare them all?

So developers pick a "safe" choice (usually OpenAI) and overpay. Every. Single. Request.

---

## Solution Section

### Headline
**SavvyLLM: The intelligence layer for LLM costs**

We analyze your task and instantly recommend the cheapest model that can handle it.

**How it works:**
1. Send us your prompt (or just the task type)
2. We classify complexity and search 800+ models
3. You get the cheapest option with endpoint ready to call
4. You call the provider directly — no proxy, no markup

```bash
curl https://api.savvyllm.ai/v1/classify \
  -H "Authorization: Bearer svl_live_..." \
  -d '{"prompt": "Summarize this article"}'

# Response: Use groq/llama-3.1-8b — $0.05/1M tokens
# (vs GPT-4 at $30/1M tokens — 600x cheaper)
```

---

## Comparison Section

### Headline
**SavvyLLM vs "The Other Guys"**

| Feature | OpenRouter | SavvyLLM |
|---------|------------|----------|
| Model | Proxy (routes your calls) | Advisory (you call direct) |
| Pricing | 5.5% of usage | Flat $25.95/mo |
| At $500/mo spend | $27.50 fee | $25.95 |
| At $5,000/mo spend | $275 fee | $25.95 |
| Lock-in | Their API format | None — keep direct relationships |
| Data ownership | Through their servers | Your calls, your data |

**The more you spend on LLMs, the more you save with SavvyLLM.**

---

## Pricing Section

### Headline
**Simple pricing. No surprises.**

| Plan | Price | Queries | Best for |
|------|-------|---------|----------|
| **Free Trial** | $0 | 500/mo | Testing it out |
| **Starter** | $9.95/mo | 5,000/mo | Indie developers |
| **Pro** | $25.95/mo | Unlimited | Teams & heavy users |

✓ 30-day free trial on all plans  
✓ No credit card required to start  
✓ Cancel anytime  

[Start Free Trial]

---

## Social Proof Section (for later)

### Headline
**Developers are saving thousands**

> "Switched my side project from GPT-4 to the models SavvyLLM recommended. Same quality, $400/mo saved."
> — @developer

> "Finally, a service that doesn't want to be another middleman in my stack."  
> — @founder

---

## FAQ Section

**Do you route my API calls?**  
No. We just tell you which model to use. You call the provider directly with your own API keys. Your data never touches our servers.

**How do you make money then?**  
Flat monthly subscription. We succeed when you find value in our recommendations, not when you spend more on LLMs.

**How accurate is the pricing data?**  
We pull from Helicone's comprehensive database of 800+ models and refresh every 6 hours. If a price changes, we catch it.

**What if I need the best model, not the cheapest?**  
Use our tier system. Ask for "complex" tier and we'll recommend models suited for coding, analysis, and reasoning — just the cheapest ones in that capability bracket.

**Can my AI agents use this?**  
Absolutely. That's a core use case. Your agents can call our API to make cost-optimal routing decisions programmatically.

---

## Final CTA Section

### Headline
**Stop leaving money on the table.**

Every request to an overpriced model is money wasted. SavvyLLM pays for itself with a single day of optimized routing.

[Start Your Free Trial] — No credit card required

---

## Footer

SavvyLLM — A product of Autropic Pty Ltd  
[Docs] [API] [GitHub] [Twitter] [Contact]
