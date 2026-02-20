#!/usr/bin/env node
/**
 * ASX Mining Announcements Fetcher
 * 
 * Fetches announcements from ASX-listed mining companies
 * Prioritizes: Gold, Copper, Silver, Lithium
 * 
 * Run: node asx-announcements.js [--priority-only] [--commodity=gold]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { 
  getPriorityCompanies, 
  getAllCompanies, 
  getCompaniesByCommodity,
  getCommoditiesForCompany 
} = require('./asx-mining-companies');

const API_BASE = 'https://asx.api.markitdigital.com/asx-research/1.0/companies';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON'));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch announcements for a single company
 */
async function getCompanyAnnouncements(code, count = 10) {
  try {
    const url = `${API_BASE}/${code}/announcements?count=${count}&market=asx`;
    const response = await fetch(url);
    
    if (!response.data || !response.data.items) {
      return null;
    }
    
    const commodities = getCommoditiesForCompany(code);
    
    return {
      code,
      name: response.data.displayName,
      commodities,
      announcements: response.data.items.map(item => ({
        code,
        company: response.data.displayName,
        commodities,
        type: item.announcementType,
        headline: item.headline,
        date: item.date,
        isPriceSensitive: item.isPriceSensitive,
        fileSize: item.fileSize,
        documentKey: item.documentKey
      }))
    };
  } catch (err) {
    console.error(`Error fetching ${code}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch announcements from multiple companies
 */
async function fetchAnnouncements(companyCodes, announcementsPerCompany = 5) {
  console.log(`📊 Fetching announcements from ${companyCodes.length} companies...`);
  
  const results = [];
  const allAnnouncements = [];
  
  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < companyCodes.length; i += batchSize) {
    const batch = companyCodes.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(code => getCompanyAnnouncements(code, announcementsPerCompany))
    );
    
    for (const result of batchResults) {
      if (result) {
        results.push(result);
        allAnnouncements.push(...result.announcements);
      }
    }
    
    // Progress
    const progress = Math.min(i + batchSize, companyCodes.length);
    process.stdout.write(`\r   ${progress}/${companyCodes.length} companies processed`);
    
    // Rate limiting delay
    if (i + batchSize < companyCodes.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.log('');
  
  // Sort by date (newest first)
  allAnnouncements.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return {
    fetchedAt: new Date().toISOString(),
    companiesPolled: companyCodes.length,
    companiesWithData: results.length,
    totalAnnouncements: allAnnouncements.length,
    companies: results,
    all_announcements: allAnnouncements
  };
}

/**
 * Filter for exploration/drilling/resource announcements
 */
function filterExplorationAnnouncements(announcements) {
  const keywords = [
    'drilling', 'drill', 'assay', 'intercept', 'mineralisation', 'mineralization',
    'resource', 'reserve', 'grade', 'metres', 'meters', 'g/t', 'oz/t',
    'exploration', 'discovery', 'results', 'RC', 'diamond'
  ];
  
  return announcements.filter(ann => {
    const text = (ann.headline + ' ' + ann.type).toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}

/**
 * Filter for capital raising announcements
 */
function filterCapitalRaises(announcements) {
  const keywords = [
    'placement', 'raising', 'capital', 'SPP', 'entitlement', 'offer',
    'appendix 3b', 'new shares', 'share purchase', 'rights issue'
  ];
  
  return announcements.filter(ann => {
    const text = (ann.headline + ' ' + ann.type).toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const priorityOnly = args.includes('--priority-only');
  const commodityArg = args.find(a => a.startsWith('--commodity='));
  const commodity = commodityArg ? commodityArg.split('=')[1] : null;
  
  console.log('🏢 ASX Mining Announcements Fetcher');
  console.log('====================================\n');
  
  // Determine which companies to fetch
  let companies;
  if (commodity) {
    companies = getCompaniesByCommodity(commodity);
    console.log(`📌 Filtering by commodity: ${commodity} (${companies.length} companies)`);
  } else if (priorityOnly) {
    companies = getPriorityCompanies();
    console.log(`📌 Priority commodities only (${companies.length} companies)`);
  } else {
    companies = getAllCompanies();
    console.log(`📌 All commodities (${companies.length} companies)`);
  }
  
  // Fetch announcements
  const data = await fetchAnnouncements(companies, 5);
  
  // Save full data
  const dataDir = path.join(__dirname, '..', 'data', 'mining');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(dataDir, 'asx_data.json'),
    JSON.stringify(data, null, 2)
  );
  
  // Create filtered views
  const explorationResults = filterExplorationAnnouncements(data.all_announcements);
  const capitalRaises = filterCapitalRaises(data.all_announcements);
  
  // Add to data object
  data.exploration_results = explorationResults;
  data.capital_raises = capitalRaises;
  
  // Save with filters
  fs.writeFileSync(
    path.join(dataDir, 'asx_data.json'),
    JSON.stringify(data, null, 2)
  );
  
  // Print summary
  console.log(`\n📈 Summary:`);
  console.log(`   Companies with data: ${data.companiesWithData}/${data.companiesPolled}`);
  console.log(`   Total announcements: ${data.totalAnnouncements}`);
  console.log(`   Exploration results: ${explorationResults.length}`);
  console.log(`   Capital raises: ${capitalRaises.length}`);
  
  // Show latest price-sensitive
  console.log(`\n⚡ Latest price-sensitive announcements:`);
  const priceSensitive = data.all_announcements
    .filter(a => a.isPriceSensitive)
    .slice(0, 10);
  
  for (const ann of priceSensitive) {
    const date = new Date(ann.date).toLocaleDateString('en-AU');
    const commodities = ann.commodities.length ? `[${ann.commodities.join(',')}]` : '';
    console.log(`   [${ann.code}] ${commodities} ${ann.headline.substring(0, 55)}`);
  }
  
  console.log(`\n✅ Saved to data/mining/asx_data.json`);
  
  return data;
}

module.exports = {
  fetchAnnouncements,
  getCompanyAnnouncements,
  filterExplorationAnnouncements,
  filterCapitalRaises
};

if (require.main === module) {
  main().catch(console.error);
}
