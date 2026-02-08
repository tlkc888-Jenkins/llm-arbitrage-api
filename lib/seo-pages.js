/**
 * Programmatic SEO - Generate landing pages for every server, category, and use case
 * 
 * The unlock: Distribution without social accounts.
 * Google indexes these pages → organic traffic → users
 */

const db = require('./database');

/**
 * Generate HTML for individual server page
 * Target keywords: "[server name] MCP", "MCP server for [category]", etc.
 */
function generateServerPage(server, baseUrl = 'https://tryautropic.com') {
  const tags = JSON.parse(server.tags || '[]');
  const isHosted = ['time', 'memory', 'calculator', 'crypto', 'json', 'fetch'].includes(server.slug);
  
  const title = `${server.name} - MCP Server | AutropicAI`;
  const description = server.description?.slice(0, 155) || `${server.name} MCP server for Claude and AI agents. Install and use instantly.`;
  const keywords = [
    server.name,
    `${server.name} MCP`,
    `${server.name} MCP server`,
    `${server.category} MCP server`,
    'MCP server',
    'Claude tools',
    'AI agent tools',
    ...tags
  ].join(', ');

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": server.name,
    "description": server.description,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "url": `${baseUrl}/servers/${server.slug}`,
    "author": {
      "@type": "Organization", 
      "name": "AutropicAI"
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}/servers/${server.slug}">
  <meta property="og:image" content="${baseUrl}/og-image.png">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  
  <!-- Canonical -->
  <link rel="canonical" href="${baseUrl}/servers/${server.slug}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6; 
      color: #333; 
      background: #f8fafc;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; }
    header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    header p { opacity: 0.9; }
    .badge { 
      display: inline-block; 
      background: rgba(255,255,255,0.2); 
      padding: 0.25rem 0.75rem; 
      border-radius: 999px; 
      font-size: 0.875rem;
      margin-top: 1rem;
    }
    .hosted-badge { background: #10b981; }
    main { padding: 2rem; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    section { margin-bottom: 2rem; }
    h2 { color: #1e293b; margin-bottom: 1rem; font-size: 1.25rem; }
    pre { 
      background: #1e293b; 
      color: #e2e8f0; 
      padding: 1rem; 
      border-radius: 8px; 
      overflow-x: auto;
      font-size: 0.875rem;
    }
    .tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .tag { 
      background: #e2e8f0; 
      padding: 0.25rem 0.75rem; 
      border-radius: 999px; 
      font-size: 0.875rem;
    }
    .cta { 
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
    }
    .cta:hover { opacity: 0.9; }
    .meta { color: #64748b; font-size: 0.875rem; }
    a { color: #667eea; }
    .breadcrumb { padding: 1rem 2rem; font-size: 0.875rem; }
    .breadcrumb a { color: #64748b; text-decoration: none; }
    .related { background: #f1f5f9; padding: 2rem; margin-top: 2rem; border-radius: 8px; }
    .try-now { 
      background: #10b981; 
      border: none; 
      color: white; 
      padding: 1rem 2rem; 
      border-radius: 8px; 
      font-size: 1rem; 
      cursor: pointer;
      font-weight: 600;
    }
    .try-now:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="breadcrumb">
    <a href="/">Home</a> → 
    <a href="/category/${server.category?.toLowerCase().replace(/\s+/g, '-') || 'all'}">${server.category || 'All'}</a> → 
    ${server.name}
  </div>
  
  <div class="container">
    <header>
      <h1>${server.name}</h1>
      <p>${server.description || 'MCP Server for AI agents'}</p>
      ${isHosted ? '<span class="badge hosted-badge">⚡ Instant Use - No Install</span>' : `<span class="badge">${server.category || 'MCP Server'}</span>`}
    </header>
    
    <main>
      ${isHosted ? `
      <section>
        <h2>⚡ Try It Now</h2>
        <p>This server is hosted by AutropicAI. Use it instantly without any installation:</p>
        <pre>POST ${baseUrl}/mcp/${server.slug}/tools/call
Content-Type: application/json

{
  "name": "tool_name",
  "arguments": {}
}</pre>
        <p style="margin-top: 1rem;">
          <a href="/api/v1/provision/${server.slug}" class="cta">Get Endpoint Details</a>
        </p>
      </section>
      ` : ''}
      
      <section>
        <h2>Installation</h2>
        ${server.install_command ? `<pre>${server.install_command}</pre>` : `<pre>npx @anthropic/mcp install ${server.slug}</pre>`}
      </section>
      
      ${server.github_url ? `
      <section>
        <h2>Source Code</h2>
        <p><a href="${server.github_url}" target="_blank" rel="noopener">${server.github_url}</a></p>
        <p class="meta">
          ${server.github_stars ? `⭐ ${server.github_stars} stars` : ''} 
          ${server.language ? `• ${server.language}` : ''}
          ${server.license ? `• ${server.license} license` : ''}
        </p>
      </section>
      ` : ''}
      
      ${tags.length > 0 ? `
      <section>
        <h2>Tags</h2>
        <div class="tags">
          ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </section>
      ` : ''}
      
      <section>
        <h2>What is MCP?</h2>
        <p>The Model Context Protocol (MCP) is an open standard that enables AI assistants like Claude to securely connect to external data sources and tools. MCP servers provide specific capabilities that extend what AI agents can do.</p>
        <p style="margin-top: 1rem;"><a href="/">Browse all ${db.servers.count()} MCP servers →</a></p>
      </section>
    </main>
    
    <div class="related">
      <h2>Related MCP Servers</h2>
      <p>Explore more servers in the ${server.category || 'same'} category:</p>
      <p style="margin-top: 1rem;"><a href="/category/${server.category?.toLowerCase().replace(/\s+/g, '-') || 'all'}">View all ${server.category || ''} servers →</a></p>
    </div>
  </div>
  
  <script>
    // Track page view
    fetch('/api/v1/servers/${server.slug}/view', { method: 'POST' }).catch(() => {});
  </script>
</body>
</html>`;
}

/**
 * Generate category landing page
 */
function generateCategoryPage(category, servers, baseUrl = 'https://tryautropic.com') {
  const title = `${category.name} MCP Servers | AutropicAI`;
  const description = `Browse ${servers.length} MCP servers for ${category.name.toLowerCase()}. Find and install tools for Claude and AI agents.`;
  
  const serverListHtml = servers.map(s => `
    <div class="server-card">
      <h3><a href="/servers/${s.slug}">${s.name}</a></h3>
      <p>${s.description?.slice(0, 120) || 'MCP Server'}${s.description?.length > 120 ? '...' : ''}</p>
      <div class="meta">${s.github_stars ? `⭐ ${s.github_stars}` : ''} ${s.language || ''}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${category.name} MCP, ${category.name} Claude tools, ${category.name} AI tools, MCP servers">
  <link rel="canonical" href="${baseUrl}/category/${category.slug}">
  
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6; 
      color: #333; 
      background: #f8fafc;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 3rem 2rem; 
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    .server-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
      gap: 1.5rem;
      padding: 2rem;
      background: white;
    }
    .server-card { 
      border: 1px solid #e2e8f0; 
      padding: 1.5rem; 
      border-radius: 8px;
      transition: box-shadow 0.2s;
    }
    .server-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .server-card h3 { margin-bottom: 0.5rem; }
    .server-card h3 a { color: #1e293b; text-decoration: none; }
    .server-card h3 a:hover { color: #667eea; }
    .server-card p { color: #64748b; font-size: 0.875rem; }
    .meta { color: #94a3b8; font-size: 0.75rem; margin-top: 0.75rem; }
    .breadcrumb { padding: 1rem 2rem; font-size: 0.875rem; }
    .breadcrumb a { color: #64748b; text-decoration: none; }
    nav { background: white; padding: 1rem 2rem; border-bottom: 1px solid #e2e8f0; }
    nav a { color: #667eea; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <nav>
    <a href="/">← Back to AutropicAI</a>
  </nav>
  
  <div class="container">
    <header>
      <div class="icon">${category.icon || '📦'}</div>
      <h1>${category.name} MCP Servers</h1>
      <p>${servers.length} servers available</p>
    </header>
    
    <div class="server-grid">
      ${serverListHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate use-case landing page
 * e.g., "How to send emails with Claude using MCP"
 */
function generateUseCasePage(useCase, relevantServers, baseUrl = 'https://tryautropic.com') {
  const title = `How to ${useCase.action} with Claude MCP | AutropicAI`;
  const description = `Learn how to ${useCase.action.toLowerCase()} using Claude and MCP servers. ${relevantServers.length} tools available.`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="how to ${useCase.action.toLowerCase()} Claude, ${useCase.action.toLowerCase()} MCP, Claude AI ${useCase.action.toLowerCase()}, AI automation">
  <link rel="canonical" href="${baseUrl}/use-case/${useCase.slug}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <!-- Content here -->
</body>
</html>`;
}

module.exports = {
  generateServerPage,
  generateCategoryPage,
  generateUseCasePage
};
