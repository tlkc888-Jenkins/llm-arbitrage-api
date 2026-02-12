#!/usr/bin/env node
/**
 * Mass-import APIs from public OpenAPI directories
 * Target: 22,000+ tools from APIs.guru, public-apis, and more
 */

const fs = require('fs');
const path = require('path');

const APIS_GURU_URL = 'https://api.apis.guru/v2/list.json';
const PUBLIC_APIS_URL = 'https://api.publicapis.org/entries';

// Categories we want (free, no-auth preferred)
const PRIORITY_CATEGORIES = [
  'open_data', 'weather', 'finance', 'geocoding', 'tools',
  'text', 'data', 'news', 'government', 'science', 'health'
];

async function fetchApisGuru() {
  console.log('📡 Fetching APIs.guru catalog...');
  const response = await fetch(APIS_GURU_URL);
  const data = await response.json();
  
  const apis = [];
  for (const [name, info] of Object.entries(data)) {
    const preferred = info.preferred;
    const version = info.versions[preferred];
    
    apis.push({
      source: 'apis.guru',
      name: name,
      title: version.info?.title || name,
      description: version.info?.description || '',
      categories: version.info?.['x-apisguru-categories'] || [],
      openapiUrl: version.swaggerUrl || version.swaggerYamlUrl,
      openapiVersion: version.openapiVer,
      providerUrl: version.info?.['x-origin']?.[0]?.url
    });
  }
  
  console.log(`   Found ${apis.length} APIs`);
  return apis;
}

async function fetchPublicApis() {
  console.log('📡 Fetching Public APIs catalog...');
  try {
    const response = await fetch(PUBLIC_APIS_URL);
    const data = await response.json();
    
    // Filter for no-auth APIs
    const freeApis = (data.entries || []).filter(api => 
      api.Auth === '' || api.Auth === 'No'
    );
    
    console.log(`   Found ${freeApis.length} free/no-auth APIs`);
    return freeApis.map(api => ({
      source: 'public-apis',
      name: api.API.toLowerCase().replace(/\s+/g, '-'),
      title: api.API,
      description: api.Description,
      categories: [api.Category?.toLowerCase()],
      url: api.Link,
      cors: api.Cors,
      https: api.HTTPS
    }));
  } catch (e) {
    console.log('   Public APIs fetch failed:', e.message);
    return [];
  }
}

async function parseOpenApiSpec(url) {
  try {
    const response = await fetch(url);
    const spec = await response.json();
    
    const tools = [];
    const paths = spec.paths || {};
    
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post'].includes(method.toLowerCase())) {
          tools.push({
            name: operation.operationId || `${method}_${path.replace(/\//g, '_')}`,
            description: operation.summary || operation.description || '',
            method: method.toUpperCase(),
            path: path,
            parameters: operation.parameters || [],
            requestBody: operation.requestBody
          });
        }
      }
    }
    
    return {
      baseUrl: spec.servers?.[0]?.url || '',
      tools
    };
  } catch (e) {
    return { baseUrl: '', tools: [] };
  }
}

function generateMcpTool(api, tool, baseUrl) {
  return {
    slug: `${api.name}-${tool.name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    name: tool.name,
    description: tool.description || `${tool.method} ${tool.path}`,
    provider: api.name,
    category: api.categories?.[0] || 'other',
    endpoint: {
      method: tool.method,
      baseUrl: baseUrl,
      path: tool.path,
      parameters: tool.parameters
    },
    source: api.source,
    imported: new Date().toISOString()
  };
}

async function main() {
  console.log('🚀 Starting mass API import...\n');
  
  // Fetch catalogs
  const apisGuru = await fetchApisGuru();
  const publicApis = await fetchPublicApis();
  
  console.log(`\n📊 Total discovered: ${apisGuru.length + publicApis.length} APIs\n`);
  
  // Process first batch (start small, scale up)
  const BATCH_SIZE = 50;
  const batch = apisGuru.slice(0, BATCH_SIZE);
  
  let totalTools = 0;
  const allTools = [];
  
  for (const api of batch) {
    if (!api.openapiUrl) continue;
    
    process.stdout.write(`Processing ${api.name}...`);
    const { baseUrl, tools } = await parseOpenApiSpec(api.openapiUrl);
    
    if (tools.length > 0) {
      const mcpTools = tools.map(t => generateMcpTool(api, t, baseUrl));
      allTools.push(...mcpTools);
      totalTools += tools.length;
      console.log(` ${tools.length} tools`);
    } else {
      console.log(' (skipped)');
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Save results
  const outputPath = path.join(__dirname, '../data/imported-tools.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allTools, null, 2));
  
  console.log(`\n✅ Imported ${totalTools} tools from ${BATCH_SIZE} APIs`);
  console.log(`   Saved to: ${outputPath}`);
  console.log(`\n📈 At this rate, full import would yield ~${Math.round(apisGuru.length * (totalTools / BATCH_SIZE))} tools`);
}

main().catch(console.error);
