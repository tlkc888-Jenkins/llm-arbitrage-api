# Supabase Setup for Analytics

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Create new project (free tier is fine)
3. Note your project URL and anon key

## 2. Create Analytics Table

Go to SQL Editor in Supabase and run:

```sql
-- Analytics table for tracking usage
CREATE TABLE analytics (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Event info
  event_type TEXT NOT NULL,  -- 'search', 'view', 'mcp_call', 'submit'
  query TEXT,                -- search term or github url
  server_slug TEXT,          -- which server was viewed
  category TEXT,             -- category filter used
  source TEXT,               -- 'web', 'api', 'mcp'
  results_count INTEGER,     -- how many results returned
  
  -- User info (privacy-safe)
  ip_hash TEXT,              -- hashed IP for uniqueness
  user_agent TEXT,           -- browser/client info
  referer TEXT,              -- where they came from
  
  -- Extra data
  extra JSONB                -- any additional context
);

-- Index for common queries
CREATE INDEX idx_analytics_created_at ON analytics(created_at DESC);
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_query ON analytics(query) WHERE query IS NOT NULL;

-- Enable Row Level Security (but allow inserts from API)
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from anon key (our API)
CREATE POLICY "Allow anonymous inserts" ON analytics
  FOR INSERT TO anon
  WITH CHECK (true);

-- Policy: Only authenticated users can read (for dashboard later)
CREATE POLICY "Authenticated users can read" ON analytics
  FOR SELECT TO authenticated
  USING (true);
```

## 3. Add Environment Variables

In Render dashboard, add:

- `SUPABASE_URL` = your project URL (e.g., https://xxx.supabase.co)
- `SUPABASE_KEY` = your anon/public key

## 4. Verify

After deploying, make a search on tryautropic.com, then check Supabase:

```sql
SELECT * FROM analytics ORDER BY created_at DESC LIMIT 10;
```

## Data We're Collecting

| Event Type | What It Tells Us |
|------------|------------------|
| `search` | What agents/users need — market demand signal |
| `view` | Which servers are popular — partnership opportunities |
| `mcp_call` | Agent usage of our MCP server — product validation |
| `submit` | New servers being built — ecosystem growth |

## Example Queries

```sql
-- Top search queries this week
SELECT query, COUNT(*) as count 
FROM analytics 
WHERE event_type = 'search' 
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY query 
ORDER BY count DESC 
LIMIT 20;

-- Most viewed servers
SELECT server_slug, COUNT(*) as views
FROM analytics
WHERE event_type = 'view'
GROUP BY server_slug
ORDER BY views DESC
LIMIT 20;

-- Daily active users (unique IP hashes)
SELECT DATE(created_at) as day, COUNT(DISTINCT ip_hash) as users
FROM analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- MCP vs Web usage
SELECT source, COUNT(*) as count
FROM analytics
GROUP BY source;
```
