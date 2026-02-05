# Deployment Options

## Option A: Render.com (Recommended - Free)

1. Push to GitHub
2. Connect Render to repo
3. Deploy automatically

**One-time setup:**
```bash
# Create render.yaml
```

Free tier: 750 hours/month, sleeps after 15min inactivity

## Option B: Railway.app (Free)

Similar to Render, slightly faster cold starts.

## Option C: Fly.io (Free)

```bash
flyctl launch
flyctl deploy
```

Free tier: 3 shared VMs

## Option D: VPS Direct (Your Hostinger)

Needs SSH access from Mac:
```bash
# On Mac, SSH to VPS
ssh user@212.1.213.192

# Clone and run
cd /opt
git clone <repo>
cd llm-arbitrage-api
npm install
pm2 start server.js --name llm-api

# Nginx config
sudo nano /etc/nginx/sites-available/llm-api
```

## Option E: Cloudflare Workers (Fastest)

Requires code adaptation to Workers runtime.
100K requests/day free.
