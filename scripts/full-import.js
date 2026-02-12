#!/usr/bin/env node
/**
 * Full API import - target 22,000+ tools
 * Run in background, saves progress incrementally
 */

const fs = require('fs');
const path = require('path');

const APIS_GURU_URL = 'https://api.apis.guru/v2/list.json';
const OUTPUT_DIR = path.join(__dirname, '../data');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'import-progress.json');
const TOOLS_FILE = path.join(OUTPUT_DIR, 'all-tools.json');

// Stats
let stats = {
  processed: 0,
  skipped: 0,
  totalTools: 0,
  errors: 0,
  startTime: Date.now()
};

async function parseOpenApiSpec(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) return { tools: [] };
    
    const spec = await response.json();
    const tools = [];
    const paths = spec.paths || {};
    const baseUrl = spec.servers?.[0]?.url || spec.host ? `https://${spec.host}${spec.basePath || ''}` : '';
    
    for (const [apiPath, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;
        
        tools.push({
          operationId: operation.operationId || `${method}_${apiPath}`,
          summary: operation.summary || '',
          description: operation.description || '',
          method: method.toUpperCase(),
          path: apiPath,
          parameters: operation.parameters || [],
          tags: operation.tags || []
        });
      }
    }
    
    return { baseUrl, tools };
  } catch (e) {
    return { tools: [] };
  }
}

function saveTool(tool) {
  fs.appendFileSync(TOOLS_FILE, JSON.stringify(tool) + '\n');
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(stats, null, 2));
}

async function main() {
  console.log('🚀 Starting FULL API import...');
  console.log('   Target: 22,000+ tools\n');
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Clear previous run
  if (fs.existsSync(TOOLS_FILE)) fs.unlinkSync(TOOLS_FILE);
  
  // Fetch catalog
  console.log('📡 Fetching APIs.guru catalog...');
  const response = await fetch(APIS_GURU_URL);
  const catalog = await response.json();
  const apis = Object.entries(catalog);
  console.log(`   Found ${apis.length} APIs to process\n`);
  
  for (const [name, info] of apis) {
    const preferred = info.preferred;
    const version = info.versions[preferred];
    const openapiUrl = version.swaggerUrl || version.swaggerYamlUrl;
    
    if (!openapiUrl) {
      stats.skipped++;
      continue;
    }
    
    process.stdout.write(`[${stats.processed + 1}/${apis.length}] ${name}...`);
    
    try {
      const { baseUrl, tools } = await parseOpenApiSpec(openapiUrl);
      
      if (tools.length === 0) {
        console.log(' skip');
        stats.skipped++;
      } else {
        for (const tool of tools) {
          const mcpTool = {
            slug: `${name}-${tool.operationId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 100),
            name: tool.operationId,
            summary: tool.summary,
            description: tool.description,
            provider: name,
            category: version.info?.['x-apisguru-categories']?.[0] || 'other',
            tags: tool.tags,
            endpoint: {
              method: tool.method,
              baseUrl: baseUrl,
              path: tool.path,
              parameters: tool.parameters.slice(0, 20) // Limit params
            }
          };
          saveTool(mcpTool);
          stats.totalTools++;
        }
        console.log(` ${tools.length} tools (total: ${stats.totalTools})`);
      }
      
      stats.processed++;
    } catch (e) {
      console.log(` ERROR: ${e.message}`);
      stats.errors++;
    }
    
    // Save progress every 50 APIs
    if (stats.processed % 50 === 0) {
      saveProgress();
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 50));
  }
  
  // Final stats
  stats.endTime = Date.now();
  stats.duration = Math.round((stats.endTime - stats.startTime) / 1000);
  saveProgress();
  
  console.log('\n✅ IMPORT COMPLETE');
  console.log(`   APIs processed: ${stats.processed}`);
  console.log(`   APIs skipped: ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`   TOTAL TOOLS: ${stats.totalTools}`);
  console.log(`   Duration: ${stats.duration}s`);
}

main().catch(console.error);
