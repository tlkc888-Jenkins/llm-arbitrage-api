# Supabase Setup for AutropicAI

## 1. Create Project

Go to [supabase.com](https://supabase.com) → New Project

- Name: `autropicai`
- Database password: (save this)
- Region: Pick closest to users

## 2. Create Analytics Table

Go to SQL Editor → New Query → Run this:

```sql
-- Analytics events table
CREATE TABLE analytics (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  query TEXT,
  server_slug TEXT,
  tool_name TEXT,
  source TEXT DEFAULT 'api',
  results_count INTEGER,
  ip_hash TEXT,
  user_agent TEXT,
  referer TEXT,
  extra JSONB
);

-- Index for common queries
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_created_at ON analytics(created_at DESC);
CREATE INDEX idx_analytics_query ON analytics(query) WHERE query IS NOT NULL;
CREATE INDEX idx_analytics_server ON analytics(server_slug) WHERE server_slug IS NOT NULL;

-- Enable Row Level Security (but allow inserts from service key)
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow inserts from service role
CREATE POLICY "Allow service inserts" ON analytics
  FOR INSERT WITH CHECK (true);

-- Allow reads from service role  
CREATE POLICY "Allow service reads" ON analytics
  FOR SELECT USING (true);
```

## 3. Get API Keys

Go to Settings → API:

- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: The `anon` key (safe to expose)
- **service_role key**: The secret key (use this for server)

## 4. Add to Render

Go to Render Dashboard → autropicai → Environment:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_service_role_key_here
```

Then redeploy.

## 5. Verify

After deploy, check logs. You should see:
```
✓ Supabase analytics connected
```

Then query the table:
```sql
SELECT * FROM analytics ORDER BY created_at DESC LIMIT 10;
```

## Useful Queries

**Most searched queries:**
```sql
SELECT query, COUNT(*) as count 
FROM analytics 
WHERE event_type = 'discover' AND query IS NOT NULL
GROUP BY query 
ORDER BY count DESC 
LIMIT 20;
```

**Most used tools:**
```sql
SELECT server_slug, tool_name, COUNT(*) as count
FROM analytics
WHERE event_type = 'tool_call'
GROUP BY server_slug, tool_name
ORDER BY count DESC;
```

**Daily active users (by IP hash):**
```sql
SELECT DATE(created_at) as day, COUNT(DISTINCT ip_hash) as unique_users
FROM analytics
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

**Hourly traffic:**
```sql
SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as events
FROM analytics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```
