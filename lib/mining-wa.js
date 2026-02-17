/**
 * Western Australia Mining Tenements API Client
 * Data source: DMIRS via ArcGIS REST API
 */

const WA_BASE_URL = 'https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Industry_and_Mining/MapServer/3';

const DEFAULT_FIELDS = [
  'tenid', 'type', 'tenstatus', 'survstatus',
  'holder1', 'holder2', 'holder3',
  'legal_area', 'unit_of_me',
  'grantdate', 'startdate', 'enddate',
  'fmt_tenid'
].join(',');

/**
 * Query WA mining tenements
 * @param {Object} options Query options
 * @param {string} options.status - Filter by status: LIVE, PENDING, etc
 * @param {string} options.type - Filter by tenement type
 * @param {string} options.holder - Filter by holder name (partial match)
 * @param {number} options.limit - Max records to return (default 100)
 * @param {number} options.offset - Offset for pagination
 * @param {boolean} options.includeGeometry - Include polygon geometry
 * @returns {Promise<Object>} Tenement data
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

  // Build WHERE clause
  const conditions = ['1=1'];
  if (status) {
    conditions.push(`tenstatus = '${status.toUpperCase()}'`);
  }
  if (type) {
    conditions.push(`type LIKE '%${type.toUpperCase()}%'`);
  }
  if (holder) {
    conditions.push(`(holder1 LIKE '%${holder.toUpperCase()}%' OR holder2 LIKE '%${holder.toUpperCase()}%')`);
  }

  const params = new URLSearchParams({
    where: conditions.join(' AND '),
    outFields: DEFAULT_FIELDS,
    resultRecordCount: limit,
    resultOffset: offset,
    returnGeometry: includeGeometry,
    f: 'json'
  });

  const url = `${WA_BASE_URL}/query?${params}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WA API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Normalize the response
  return {
    state: 'WA',
    source: 'DMIRS',
    count: data.features?.length || 0,
    hasMore: data.exceededTransferLimit || false,
    tenements: (data.features || []).map(normalizeTenement)
  };
}

/**
 * Get a single tenement by ID
 * @param {string} tenementId - Tenement ID (e.g., "E45/1234")
 */
async function getTenement(tenementId) {
  const params = new URLSearchParams({
    where: `tenid LIKE '%${tenementId}%' OR fmt_tenid LIKE '%${tenementId}%'`,
    outFields: '*',
    returnGeometry: true,
    f: 'json'
  });

  const url = `${WA_BASE_URL}/query?${params}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (!data.features?.length) {
    return null;
  }

  return normalizeTenement(data.features[0], true);
}

/**
 * Get count of tenements by status
 */
async function getStats() {
  const statuses = ['LIVE', 'PENDING'];
  const stats = {};

  for (const status of statuses) {
    const params = new URLSearchParams({
      where: `tenstatus = '${status}'`,
      returnCountOnly: true,
      f: 'json'
    });

    const response = await fetch(`${WA_BASE_URL}/query?${params}`);
    const data = await response.json();
    stats[status.toLowerCase()] = data.count || 0;
  }

  return { state: 'WA', stats };
}

/**
 * Normalize WA tenement to unified schema
 */
function normalizeTenement(feature, includeAllHolders = false) {
  const attrs = feature.attributes;
  
  const tenement = {
    id: attrs.tenid?.trim(),
    formattedId: attrs.fmt_tenid?.trim(),
    type: attrs.type,
    status: attrs.tenstatus,
    surveyStatus: attrs.survstatus,
    holders: [attrs.holder1].filter(Boolean),
    area: attrs.legal_area,
    areaUnit: attrs.unit_of_me || 'HA',
    grantDate: attrs.grantdate ? new Date(attrs.grantdate).toISOString() : null,
    startDate: attrs.startdate ? new Date(attrs.startdate).toISOString() : null,
    endDate: attrs.enddate ? new Date(attrs.enddate).toISOString() : null,
    state: 'WA',
    source: 'DMIRS'
  };

  // Include additional holders if requested
  if (includeAllHolders) {
    for (let i = 2; i <= 9; i++) {
      const holder = attrs[`holder${i}`];
      if (holder) tenement.holders.push(holder);
    }
  }

  // Include geometry if present
  if (feature.geometry) {
    tenement.geometry = {
      type: 'Polygon',
      coordinates: feature.geometry.rings
    };
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
    console.log('Testing WA Mining Tenements API...\n');
    
    // Test stats
    console.log('Getting stats...');
    const stats = await getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    // Test query
    console.log('\nQuerying LIVE tenements (limit 3)...');
    const results = await queryTenements({ status: 'LIVE', limit: 3 });
    console.log('Results:', JSON.stringify(results, null, 2));
  })().catch(console.error);
}
