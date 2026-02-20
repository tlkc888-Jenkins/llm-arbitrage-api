/**
 * Queensland Mining Tenements API Client
 * Data source: QLD Government Spatial via ArcGIS REST API
 * 
 * Layers:
 * - 3: EPM granted (Exploration Permit Mineral)
 * - 2: EPM application
 * - 9: EPC granted (Exploration Permit Coal)
 * - 8: EPC application
 * - 32: ML granted (Mining Lease)
 * - 31: ML application
 */

const QLD_BASE_URL = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Economy/MinesPermitsCurrent/MapServer';

// Layer IDs for different permit types
const LAYERS = {
  EPM_GRANTED: 3,
  EPM_APPLICATION: 2,
  EPC_GRANTED: 9,
  EPC_APPLICATION: 8,
  ML_GRANTED: 32,
  ML_APPLICATION: 31,
  MDL_GRANTED: 29,  // Mineral Development Licence
  MC_GRANTED: 37    // Mining Claim
};

const DEFAULT_FIELDS = [
  'permitid', 'displayname', 'permittype', 'permittypeabbreviation',
  'permitstatus', 'permitstate',
  'authorisedholdername',
  'permitminerals', 'permitpurpose',
  'lodgedate', 'approvedate', 'expirydate',
  'shapeareahectares', 'area_subblocks',
  'nativetitlecategory'
].join(',');

/**
 * Query QLD mining tenements
 * @param {Object} options Query options
 * @param {string} options.status - Filter by status: granted, application
 * @param {string} options.type - Filter by type: EPM, EPC, ML, MDL, MC
 * @param {string} options.holder - Filter by holder name (partial match)
 * @param {string} options.commodity - Filter by mineral/commodity
 * @param {number} options.limit - Max records to return (default 100)
 * @param {number} options.offset - Offset for pagination
 * @param {boolean} options.includeGeometry - Include polygon geometry
 * @returns {Promise<Object>} Tenement data
 */
async function queryTenements(options = {}) {
  const {
    status = 'granted',
    type = 'EPM',
    holder,
    commodity,
    limit = 100,
    offset = 0,
    includeGeometry = false
  } = options;

  // Determine layer ID
  const layerKey = `${type.toUpperCase()}_${status.toUpperCase()}`;
  const layerId = LAYERS[layerKey];
  
  if (!layerId) {
    // Default to EPM granted if unknown
    layerId = LAYERS.EPM_GRANTED;
  }

  // Build WHERE clause
  const conditions = ['1=1'];
  
  if (holder) {
    conditions.push(`authorisedholdername LIKE '%${holder.toUpperCase()}%'`);
  }
  if (commodity) {
    conditions.push(`permitminerals LIKE '%${commodity.toLowerCase()}%'`);
  }

  const params = new URLSearchParams({
    where: conditions.join(' AND '),
    outFields: DEFAULT_FIELDS,
    resultRecordCount: limit,
    resultOffset: offset,
    returnGeometry: includeGeometry,
    f: 'json'
  });

  const url = `${QLD_BASE_URL}/${layerId}/query?${params}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`QLD API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Normalize the response
  return {
    state: 'QLD',
    source: 'GSQ',
    layer: layerKey,
    count: data.features?.length || 0,
    hasMore: data.exceededTransferLimit || false,
    tenements: (data.features || []).map(f => normalizeTenement(f))
  };
}

/**
 * Query all permit types at once (for comprehensive search)
 */
async function queryAllTypes(options = {}) {
  const {
    holder,
    commodity,
    limit = 100,
    includeGeometry = false
  } = options;

  // Query the main layers in parallel
  const layerIds = [
    LAYERS.EPM_GRANTED,
    LAYERS.EPC_GRANTED,
    LAYERS.ML_GRANTED,
    LAYERS.MDL_GRANTED
  ];

  const conditions = ['1=1'];
  if (holder) {
    conditions.push(`authorisedholdername LIKE '%${holder.toUpperCase()}%'`);
  }
  if (commodity) {
    conditions.push(`permitminerals LIKE '%${commodity.toLowerCase()}%'`);
  }

  const promises = layerIds.map(async (layerId) => {
    const params = new URLSearchParams({
      where: conditions.join(' AND '),
      outFields: DEFAULT_FIELDS,
      resultRecordCount: Math.floor(limit / layerIds.length),
      returnGeometry: includeGeometry,
      f: 'json'
    });

    try {
      const response = await fetch(`${QLD_BASE_URL}/${layerId}/query?${params}`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.features || []).map(f => normalizeTenement(f));
    } catch (e) {
      console.error(`Error querying layer ${layerId}:`, e.message);
      return [];
    }
  });

  const results = await Promise.all(promises);
  const tenements = results.flat();

  return {
    state: 'QLD',
    source: 'GSQ',
    count: tenements.length,
    tenements
  };
}

/**
 * Get a single tenement by ID or display name
 * @param {string} tenementId - Tenement ID (e.g., "EPM 12345" or permit ID)
 */
async function getTenement(tenementId) {
  // Try to match by displayname or permitid
  const cleanId = tenementId.replace(/\s+/g, ' ').trim();
  
  // Search across main layers
  const layerIds = [LAYERS.EPM_GRANTED, LAYERS.EPC_GRANTED, LAYERS.ML_GRANTED];
  
  for (const layerId of layerIds) {
    const params = new URLSearchParams({
      where: `displayname LIKE '%${cleanId}%' OR permitid = '${cleanId}'`,
      outFields: '*',
      returnGeometry: true,
      f: 'json'
    });

    const url = `${QLD_BASE_URL}/${layerId}/query?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features?.length) {
        return normalizeTenement(data.features[0], true);
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

/**
 * Get count statistics
 */
async function getStats() {
  const stats = {};
  
  const layersToCount = [
    { id: LAYERS.EPM_GRANTED, name: 'epm_granted' },
    { id: LAYERS.EPM_APPLICATION, name: 'epm_application' },
    { id: LAYERS.EPC_GRANTED, name: 'epc_granted' },
    { id: LAYERS.ML_GRANTED, name: 'ml_granted' },
    { id: LAYERS.MDL_GRANTED, name: 'mdl_granted' }
  ];

  await Promise.all(layersToCount.map(async ({ id, name }) => {
    try {
      const params = new URLSearchParams({
        where: '1=1',
        returnCountOnly: true,
        f: 'json'
      });

      const response = await fetch(`${QLD_BASE_URL}/${id}/query?${params}`);
      const data = await response.json();
      stats[name] = data.count || 0;
    } catch (e) {
      stats[name] = 0;
    }
  }));

  stats.total = Object.values(stats).reduce((a, b) => a + b, 0);

  return { state: 'QLD', stats };
}

/**
 * Normalize QLD tenement to unified schema
 */
function normalizeTenement(feature, includeFullDetails = false) {
  const attrs = feature.attributes;
  
  const tenement = {
    id: attrs.permitid?.toString(),
    displayId: attrs.displayname?.trim(),
    type: attrs.permittype,
    typeCode: attrs.permittypeabbreviation,
    status: attrs.permitstatus,
    subStatus: attrs.permitstate,
    holders: attrs.authorisedholdername ? [attrs.authorisedholdername] : [],
    commodities: parseCommodities(attrs.permitminerals),
    purpose: attrs.permitpurpose,
    area: attrs.shapeareahectares,
    areaUnit: 'HA',
    subBlocks: attrs.area_subblocks,
    lodgeDate: attrs.lodgedate ? new Date(attrs.lodgedate).toISOString() : null,
    grantDate: attrs.approvedate ? new Date(attrs.approvedate).toISOString() : null,
    expiryDate: attrs.expirydate ? new Date(attrs.expirydate).toISOString() : null,
    nativeTitleCategory: attrs.nativetitlecategory,
    state: 'QLD',
    source: 'GSQ'
  };

  // Include geometry if present
  if (feature.geometry) {
    tenement.geometry = {
      type: 'Polygon',
      coordinates: feature.geometry.rings
    };
  }

  return tenement;
}

/**
 * Parse commodity string into array
 */
function parseCommodities(str) {
  if (!str) return [];
  // QLD stores as comma-separated or pipe-separated
  return str.split(/[,|;]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = {
  queryTenements,
  queryAllTypes,
  getTenement,
  getStats,
  LAYERS
};

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('Testing QLD Mining Tenements API...\n');
    
    // Test stats
    console.log('Getting stats...');
    const stats = await getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    // Test query
    console.log('\nQuerying EPM granted tenements (limit 3)...');
    const results = await queryTenements({ type: 'EPM', status: 'granted', limit: 3 });
    console.log('Results:', JSON.stringify(results, null, 2));
    
    // Test all types
    console.log('\nQuerying all permit types (limit 5)...');
    const all = await queryAllTypes({ limit: 5 });
    console.log('All types count:', all.count);
  })().catch(console.error);
}
