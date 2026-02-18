/**
 * Northern Territory Mining Tenements API Client
 * Data source: NT Geological Survey WFS (GeoServer)
 * 
 * Uses MineralTenementML 1.0 standard via WFS 2.0
 * Base URL: https://geology.data.nt.gov.au/geoserver/wfs
 */

const NT_BASE_URL = 'https://geology.data.nt.gov.au/geoserver/wfs';
const FEATURE_TYPE = 'mt:MineralTenement';

/**
 * Query NT mineral tenements
 * @param {Object} options Query options
 * @param {string} options.status - Filter by status: Application, Current, etc
 * @param {string} options.type - Filter by tenement type (Exploration Licence, Mining Lease, etc)
 * @param {string} options.holder - Filter by owner name (partial match)
 * @param {number} options.limit - Max records to return (default 100)
 * @param {number} options.offset - Offset for pagination
 * @param {boolean} options.includeGeometry - Include polygon geometry (default true for WFS)
 * @returns {Promise<Object>} Tenement data
 */
async function queryTenements(options = {}) {
  const {
    status,
    type,
    holder,
    limit = 100,
    offset = 0,
    includeGeometry = true
  } = options;

  // Build CQL filter
  const filters = [];
  if (status) {
    filters.push(`status='${status}'`);
  }
  if (type) {
    filters.push(`tenementType LIKE '%${type}%'`);
  }
  if (holder) {
    filters.push(`owner LIKE '%${holder}%'`);
  }

  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: FEATURE_TYPE,
    outputFormat: 'application/json',
    count: limit,
    startIndex: offset
  });

  if (filters.length > 0) {
    params.set('CQL_FILTER', filters.join(' AND '));
  }

  const url = `${NT_BASE_URL}?${params}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NT WFS error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    state: 'NT',
    source: 'NTGS',
    count: data.features?.length || 0,
    totalMatched: data.numberMatched || null,
    hasMore: (data.numberReturned || 0) < (data.numberMatched || 0),
    tenements: (data.features || []).map(f => normalizeTenement(f, includeGeometry))
  };
}

/**
 * Get a single tenement by permit ID
 * @param {string} permitId - Permit ID (e.g., "EL31482")
 */
async function getTenement(permitId) {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: FEATURE_TYPE,
    outputFormat: 'application/json',
    CQL_FILTER: `name='${permitId}' OR fileID='${permitId}'`
  });

  const url = `${NT_BASE_URL}?${params}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NT WFS error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.features?.length) {
    return null;
  }

  return normalizeTenement(data.features[0], true);
}

/**
 * Get count of tenements by status
 * Note: WFS resultType=hits returns XML, so we parse numberMatched from XML response
 * Note: NT WFS primarily contains Application status tenements
 */
async function getStats() {
  const statuses = ['Application', 'Granted', 'Expired', 'Surrendered', 'Cancelled'];
  const stats = {};

  for (const status of statuses) {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: FEATURE_TYPE,
      resultType: 'hits',
      CQL_FILTER: `status='${status}'`
    });

    const response = await fetch(`${NT_BASE_URL}?${params}`);
    const text = await response.text();
    const match = text.match(/numberMatched="(\d+)"/);
    stats[status.toLowerCase()] = match ? parseInt(match[1], 10) : 0;
  }

  // Also get total count
  const totalParams = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: FEATURE_TYPE,
    resultType: 'hits'
  });
  const totalResponse = await fetch(`${NT_BASE_URL}?${totalParams}`);
  const totalText = await totalResponse.text();
  const totalMatch = totalText.match(/numberMatched="(\d+)"/);
  stats.total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return { state: 'NT', stats };
}

/**
 * Search tenements by bounding box
 * @param {Object} bbox - Bounding box {minLon, minLat, maxLon, maxLat}
 */
async function searchByBBox(bbox, options = {}) {
  const { minLon, minLat, maxLon, maxLat } = bbox;
  const { limit = 100 } = options;

  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: FEATURE_TYPE,
    outputFormat: 'application/json',
    count: limit,
    bbox: `${minLat},${minLon},${maxLat},${maxLon},EPSG:4283`
  });

  const url = `${NT_BASE_URL}?${params}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NT WFS error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    state: 'NT',
    source: 'NTGS',
    count: data.features?.length || 0,
    tenements: (data.features || []).map(f => normalizeTenement(f, true))
  };
}

/**
 * Normalize NT tenement to unified schema
 */
function normalizeTenement(feature, includeGeometry = true) {
  const props = feature.properties;
  
  const tenement = {
    id: props.name || props.fileID,
    formattedId: props.name,
    type: props.tenementType,
    typeUri: props.tenementType_uri,
    status: props.status,
    statusUri: props.status_uri,
    holders: parseOwners(props.owner),
    commodity: props.commodity !== 'urn:ogc:def:nil:OGC::missing' ? props.commodity : null,
    area: parseArea(props.area),
    areaRaw: props.area,
    applicationDate: props.applicationDate || null,
    grantDate: null, // NT data doesn't include grant date in basic view
    endDate: null,
    fileId: props.fileID,
    identifier: props.identifier,
    jurisdiction: props.jurisdiction_uri,
    state: 'NT',
    source: 'NTGS'
  };

  if (includeGeometry && feature.geometry) {
    tenement.geometry = feature.geometry;
  }

  return tenement;
}

/**
 * Parse owner string into array of holders
 * NT format: "Applicant - NAME (100%),\nAgent - NAME"
 */
function parseOwners(ownerString) {
  if (!ownerString) return [];
  
  const holders = [];
  const parts = ownerString.split(',\n');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('Applicant - ') || trimmed.startsWith('Holder - ')) {
      const name = trimmed.replace(/^(Applicant|Holder) - /, '').replace(/\s*\(\d+%\)$/, '');
      holders.push(name);
    }
  }
  
  return holders.length > 0 ? holders : [ownerString];
}

/**
 * Parse area string to numeric value
 * NT format: "25 Blocks (77.55 Km2)" or "100 Hectares"
 */
function parseArea(areaString) {
  if (!areaString) return null;
  
  // Try to extract km² value
  const km2Match = areaString.match(/\(([\d.]+)\s*Km2\)/i);
  if (km2Match) {
    return { value: parseFloat(km2Match[1]), unit: 'km²' };
  }
  
  // Try hectares
  const haMatch = areaString.match(/([\d.]+)\s*Hectares?/i);
  if (haMatch) {
    return { value: parseFloat(haMatch[1]), unit: 'ha' };
  }
  
  // Try blocks
  const blockMatch = areaString.match(/([\d.]+)\s*Blocks?/i);
  if (blockMatch) {
    return { value: parseFloat(blockMatch[1]), unit: 'blocks' };
  }
  
  return null;
}

module.exports = {
  queryTenements,
  getTenement,
  getStats,
  searchByBBox,
  NT_BASE_URL,
  FEATURE_TYPE
};

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('Testing NT Mining Tenements WFS...\n');
    
    // Test query
    console.log('Querying tenements (limit 3)...');
    const results = await queryTenements({ limit: 3 });
    console.log('Results:', JSON.stringify(results, null, 2));
    
    // Test single tenement
    if (results.tenements.length > 0) {
      const id = results.tenements[0].id;
      console.log(`\nGetting single tenement: ${id}...`);
      const single = await getTenement(id);
      console.log('Single:', JSON.stringify(single, null, 2));
    }
    
    // Test stats
    console.log('\nGetting stats...');
    const stats = await getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
  })().catch(console.error);
}
