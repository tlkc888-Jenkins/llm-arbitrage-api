/**
 * ASX Mining Companies by Commodity
 * 
 * Organized by primary commodity focus for targeted monitoring.
 * Priority: Gold, Copper, Silver, Lithium (as requested)
 * 
 * Last updated: 2026-02-20
 * Source: ASX, company announcements, industry reports
 */

const ASX_MINING_COMPANIES = {
  // ==================== PRIORITY COMMODITIES ====================
  
  gold: {
    // Majors (>1Moz annual production or >$1B market cap)
    majors: [
      'NCM',  // Newcrest Mining (now part of Newmont)
      'NEM',  // Newmont Corporation
      'NST',  // Northern Star Resources
      'EVN',  // Evolution Mining
      'GOR',  // Gold Road Resources
      'RMS',  // Ramelius Resources
      'RSG',  // Resolute Mining
      'SBM',  // St Barbara
      'PRU',  // Perseus Mining
      'CMM',  // Capricorn Metals
      'WGX',  // Westgold Resources
      'DEG',  // De Grey Mining
      'BGL',  // Bellevue Gold
      'RED',  // Red 5
      'TIE',  // Tietto Minerals
      'KCN',  // Kingsgate Consolidated
      'GMD',  // Genesis Minerals
    ],
    // Developers & explorers
    explorers: [
      'MML',  // Medusa Mining
      'DGO',  // DGO Gold
      'RRL',  // Regis Resources
      'SLR',  // Silver Lake Resources
      'DCN',  // Dacian Gold
      'MEI',  // Meteoric Resources
      'MAU',  // Magnetic Resources
      'NVA',  // Nova Minerals
      'LCL',  // Los Cerros
      'CAI',  // Calidus Resources
      'LEG',  // Legend Mining
      'MVL',  // Marvel Gold
    ]
  },
  
  copper: {
    majors: [
      'BHP',  // BHP (copper/iron ore)
      'RIO',  // Rio Tinto
      'OZL',  // OZ Minerals (now part of BHP)
      'SFR',  // Sandfire Resources
      '29M',  // 29Metals
      'AIS',  // Aeris Resources
      'HCH',  // Hot Chili
      'CYM',  // Cyprium Metals
      'C6C',  // Copper Search
      'COD',  // Coda Minerals
    ],
    explorers: [
      'CTM',  // Centaurus Metals
      'REZ',  // Resources & Energy
      'KGL',  // KGL Resources
      'MTC',  // MetalsTech
      'CAD',  // Caeneus Minerals
      'TYX',  // Tyranna Resources
      'CCV',  // Cash Converters (copper div)
      'HAV',  // Havilah Resources
    ]
  },
  
  silver: {
    companies: [
      'SVL',  // Silver Mines
      'WRM',  // White Rock Minerals
      'MCR',  // Mincor Resources
      'HCH',  // Hot Chili (silver credit)
      'COB',  // Cobalt Blue
      'SMR',  // Stanmore Resources
    ]
  },
  
  lithium: {
    majors: [
      'PLS',  // Pilbara Minerals
      'IGO',  // IGO Limited
      'MIN',  // Mineral Resources
      'LTR',  // Liontown Resources
      'AKE',  // Allkem (now Arcadium)
      'CXO',  // Core Lithium
      'GL1',  // Global Lithium
      'FFX',  // Firefinch
      'LRS',  // Latin Resources
      'AVZ',  // AVZ Minerals
      'LKE',  // Lake Resources
      'SYA',  // Sayona Mining
      'WR1',  // Winsome Resources
    ],
    explorers: [
      'KDR',  // Kidman Resources
      'ESS',  // Essential Metals
      'RDT',  // Red Dirt Metals
      'PLL',  // Piedmont Lithium
      'AZS',  // Azure Minerals
      'TNG',  // TNG Limited
      'M3M',  // M3 Mining
      'CDT',  // Castle Minerals
    ]
  },
  
  // ==================== SECONDARY COMMODITIES ====================
  
  iron_ore: {
    majors: [
      'BHP',  // BHP
      'RIO',  // Rio Tinto
      'FMG',  // Fortescue Metals
      'MIN',  // Mineral Resources
      'CIA',  // Champion Iron
      'MGT',  // Magnetite Mines
      'GRR',  // Grange Resources
      'CZR',  // CZR Resources
      'FEX',  // Fenix Resources
      'IRD',  // Iron Road
    ]
  },
  
  nickel: {
    companies: [
      'IGO',  // IGO Limited
      'WSA',  // Western Areas (now IGO)
      'NIC',  // Nickel Industries
      'MCR',  // Mincor Resources
      'PAN',  // Panoramic Resources
      'WR1',  // Winsome Resources
      'ARN',  // Aldebaran
      'CTM',  // Centaurus Metals
    ]
  },
  
  rare_earths: {
    companies: [
      'LYC',  // Lynas Rare Earths
      'ILU',  // Iluka Resources
      'ARU',  // Arafura Resources
      'HAS',  // Hastings Technology
      'VML',  // Vital Metals
      'GGG',  // Greenland Minerals
      'RNU',  // Renascor Resources
    ]
  },
  
  uranium: {
    companies: [
      'PDN',  // Paladin Energy
      'BMN',  // Bannerman Energy
      'BOE',  // Boss Energy
      'DYL',  // Deep Yellow
      'LOT',  // Lotus Resources
      'PEN',  // Peninsula Energy
      'EL8',  // Elevate Uranium
      'AGE',  // Alligator Energy
      'TOE',  // Toro Energy
    ]
  },
  
  coal: {
    companies: [
      'WHC',  // Whitehaven Coal
      'YAL',  // Yancoal
      'NHC',  // New Hope Corporation
      'SMR',  // Stanmore Resources
      'BRL',  // Bathurst Resources
      'TIG',  // Tigers Realm Coal
      'COL',  // Coalspur Mines
    ]
  },
  
  diversified: {
    companies: [
      'S32',  // South32
      'MIN',  // Mineral Resources
      'ILU',  // Iluka Resources
    ]
  }
};

/**
 * Get all companies for priority commodities
 * @returns {string[]} Array of ASX codes
 */
function getPriorityCompanies() {
  const priority = ['gold', 'copper', 'silver', 'lithium'];
  const codes = new Set();
  
  for (const commodity of priority) {
    const data = ASX_MINING_COMPANIES[commodity];
    if (data) {
      if (data.majors) data.majors.forEach(c => codes.add(c));
      if (data.explorers) data.explorers.forEach(c => codes.add(c));
      if (data.companies) data.companies.forEach(c => codes.add(c));
    }
  }
  
  return [...codes];
}

/**
 * Get all companies across all commodities
 * @returns {string[]} Array of ASX codes
 */
function getAllCompanies() {
  const codes = new Set();
  
  for (const [commodity, data] of Object.entries(ASX_MINING_COMPANIES)) {
    if (data.majors) data.majors.forEach(c => codes.add(c));
    if (data.explorers) data.explorers.forEach(c => codes.add(c));
    if (data.companies) data.companies.forEach(c => codes.add(c));
  }
  
  return [...codes];
}

/**
 * Get companies by commodity
 * @param {string} commodity - gold, copper, silver, lithium, etc.
 * @returns {string[]} Array of ASX codes
 */
function getCompaniesByCommodity(commodity) {
  const data = ASX_MINING_COMPANIES[commodity.toLowerCase()];
  if (!data) return [];
  
  const codes = new Set();
  if (data.majors) data.majors.forEach(c => codes.add(c));
  if (data.explorers) data.explorers.forEach(c => codes.add(c));
  if (data.companies) data.companies.forEach(c => codes.add(c));
  
  return [...codes];
}

/**
 * Get commodity for a company code
 * @param {string} code - ASX code
 * @returns {string[]} Array of commodities
 */
function getCommoditiesForCompany(code) {
  const commodities = [];
  const upperCode = code.toUpperCase();
  
  for (const [commodity, data] of Object.entries(ASX_MINING_COMPANIES)) {
    const allCodes = [
      ...(data.majors || []),
      ...(data.explorers || []),
      ...(data.companies || [])
    ];
    if (allCodes.includes(upperCode)) {
      commodities.push(commodity);
    }
  }
  
  return commodities;
}

/**
 * Get summary statistics
 */
function getStats() {
  const stats = {};
  let total = 0;
  
  for (const [commodity, data] of Object.entries(ASX_MINING_COMPANIES)) {
    const count = new Set([
      ...(data.majors || []),
      ...(data.explorers || []),
      ...(data.companies || [])
    ]).size;
    stats[commodity] = count;
    total += count;
  }
  
  return {
    byCommodity: stats,
    unique: getAllCompanies().length,
    priority: getPriorityCompanies().length
  };
}

module.exports = {
  ASX_MINING_COMPANIES,
  getPriorityCompanies,
  getAllCompanies,
  getCompaniesByCommodity,
  getCommoditiesForCompany,
  getStats
};

// Test if run directly
if (require.main === module) {
  console.log('ASX Mining Companies List');
  console.log('=========================\n');
  
  const stats = getStats();
  console.log('Stats:', JSON.stringify(stats, null, 2));
  
  console.log('\nPriority (gold/copper/silver/lithium):', getPriorityCompanies().length, 'companies');
  console.log('Sample:', getPriorityCompanies().slice(0, 10).join(', '));
  
  console.log('\nGold companies:', getCompaniesByCommodity('gold').length);
  console.log('Lithium companies:', getCompaniesByCommodity('lithium').length);
}
