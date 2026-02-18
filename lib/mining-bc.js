/**
 * British Columbia Mining Tenements API Client
 * Data source: BC Open Maps WFS
 * 
 * Dataset: MTA Mineral, Placer and Coal Tenure Spatial View
 * Licence: Open Government Licence - British Columbia
 */

const BC_WFS_URL = 'https://openmaps.gov.bc.ca/geo/pub/WHSE_MINERAL_TENURE.MTA_ACQUIRED_TENURE_SVW/ows';

/**
 * Query BC mineral tenements
 */
async function queryTenements(options = {}) {
  const {
    status,
    type,
    holder,
    limit = 100,
    offset = 0,
    includeGeometry = false
  } = options;

  // Build CQL filter
  const filters = [];
  if (status) {
    filters.push(`TENURE_STATUS='${status.toUpperCase()}'`);
  }
  if (type) {
    filters.push(`TENURE_TYPE_DESCRIPTION ILIKE '%${type}%'`);
  }
  if (holder) {
    filters.push(`OWNER_NAME ILIKE '%${holder}%'`);
  }

  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'WHSE_MINERAL_TENURE.MTA_ACQUIRED_TENURE_SVW',
    outputFormat: 'application/json',
    count: limit,
    startIndex: offset,
    sortBy: 'TENURE_NUMBER_ID'
  });

  if (filters.length > 0) {
    params.append('CQL_FILTER', filters.join(' AND '));
  }

  const url = `${BC_WFS_URL}?${params}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`BC WFS error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      state: 'BC',
      country: 'CA',
      source: 'BC Open Maps',
      count: data.features?.length || 0,
      hasMore: data.features?.length === limit,
      tenements: (data.features || []).map(f => normalizeTenement(f, includeGeometry))
    };
  } catch (error) {
    console.error('BC WFS error:', error);
    throw error;
  }
}

/**
 * Get stats for BC tenements
 */
async function getStats() {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'WHSE_MINERAL_TENURE.MTA_ACQUIRED_TENURE_SVW',
    resultType: 'hits'
  });

  try {
    const response = await fetch(`${BC_WFS_URL}?${params}`);
    const text = await response.text();
    
    // Parse numberMatched from XML response
    const match = text.match(/numberMatched="(\d+)"/);
    const total = match ? parseInt(match[1]) : 0;

    return {
      state: 'BC',
      country: 'CA',
      stats: {
        total: total
      }
    };
  } catch (error) {
    console.error('BC stats error:', error);
    return { state: 'BC', country: 'CA', stats: { total: 0, error: error.message } };
  }
}

/**
 * Search by holder/owner name
 */
async function getTenement(tenementId) {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'WHSE_MINERAL_TENURE.MTA_ACQUIRED_TENURE_SVW',
    outputFormat: 'application/json',
    CQL_FILTER: `TENURE_NUMBER_ID='${tenementId}'`
  });

  try {
    const response = await fetch(`${BC_WFS_URL}?${params}`);
    const data = await response.json();

    if (!data.features?.length) {
      return null;
    }

    return normalizeTenement(data.features[0], true);
  } catch (error) {
    console.error('BC tenement lookup error:', error);
    return null;
  }
}

/**
 * Normalize BC tenement to unified schema
 */
function normalizeTenement(feature, includeGeometry = false) {
  const p = feature.properties;
  
  const tenement = {
    id: p.TENURE_NUMBER_ID?.toString(),
    formattedId: p.TITLE_NUMBER || p.TENURE_NUMBER_ID?.toString(),
    type: p.TENURE_TYPE_DESCRIPTION,
    subType: p.TENURE_SUB_TYPE_DESCRIPTION,
    status: p.TERMINATION_DATE ? 'Terminated' : 'Active',
    holders: [p.OWNER_NAME].filter(Boolean),
    area: p.AREA_IN_HECTARES,
    areaUnit: 'HA',
    grantDate: p.ISSUE_DATE?.split('Z')[0] || null,
    goodToDate: p.GOOD_TO_DATE?.split('Z')[0] || null,
    state: 'BC',
    country: 'CA',
    source: 'BC Open Maps',
    // BC-specific fields
    claimName: p.CLAIM_NAME,
    titleType: p.TITLE_TYPE_DESCRIPTION
  };

  if (includeGeometry && feature.geometry) {
    tenement.geometry = feature.geometry;
  }

  return tenement;
}

module.exports = {
  queryTenements,
  getTenement,
  getStats
};

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('Testing BC Mining Tenements API...\n');
    
    const stats = await getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    console.log('\nQuerying tenements (limit 3)...');
    const results = await queryTenements({ limit: 3 });
    console.log('Results:', JSON.stringify(results, null, 2));
  })().catch(console.error);
}
