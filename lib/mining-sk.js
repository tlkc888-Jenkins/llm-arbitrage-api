/**
 * Saskatchewan Mining Tenements API Client
 * Data source: Saskatchewan GIS ArcGIS REST Services
 * 
 * Dataset: Mineral Tenure Crown Dispositions
 * API: https://gis.saskatchewan.ca/arcgis/rest/services/Economy/Mineral_Tenure_Crown_Dispositions/MapServer
 */

const SK_ARCGIS_URL = 'https://gis.saskatchewan.ca/arcgis/rest/services/Economy/Mineral_Tenure_Crown_Dispositions/MapServer/0';

/**
 * Query Saskatchewan mineral dispositions
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
  const filters = ['1=1'];
  if (status) {
    filters.push(`DISPOSIT_3='${status}'`);
  }
  if (holder) {
    // OWNERS field is mixed case, use case-insensitive search
    filters.push(`UPPER(OWNERS) LIKE '%${holder.toUpperCase()}%'`);
  }

  const params = new URLSearchParams({
    where: filters.join(' AND '),
    outFields: '*',
    resultRecordCount: limit,
    resultOffset: offset,
    orderByFields: 'DISPOSITIO',
    f: 'json'
  });

  if (includeGeometry) {
    params.append('returnGeometry', 'true');
    params.append('outSR', '4326');
  } else {
    params.append('returnGeometry', 'false');
  }

  const url = `${SK_ARCGIS_URL}/query?${params}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SK ArcGIS error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'SK query error');
    }
    
    return {
      state: 'SK',
      country: 'CA',
      source: 'Saskatchewan GIS',
      count: data.features?.length || 0,
      hasMore: data.exceededTransferLimit || data.features?.length === limit,
      tenements: (data.features || []).map(f => normalizeTenement(f, includeGeometry))
    };
  } catch (error) {
    console.error('SK ArcGIS error:', error);
    throw error;
  }
}

/**
 * Get stats for SK tenements
 */
async function getStats() {
  const params = new URLSearchParams({
    where: '1=1',
    returnCountOnly: 'true',
    f: 'json'
  });

  try {
    const response = await fetch(`${SK_ARCGIS_URL}/query?${params}`);
    const data = await response.json();

    // Get breakdown by status
    const statusParams = new URLSearchParams({
      where: '1=1',
      outStatistics: JSON.stringify([{
        statisticType: 'count',
        onStatisticField: 'OBJECTID',
        outStatisticFieldName: 'count'
      }]),
      groupByFieldsForStatistics: 'DISPOSIT_3',
      f: 'json'
    });

    const statusResponse = await fetch(`${SK_ARCGIS_URL}/query?${statusParams}`);
    const statusData = await statusResponse.json();

    const byStatus = {};
    if (statusData.features) {
      statusData.features.forEach(f => {
        byStatus[f.attributes.DISPOSIT_3 || 'Unknown'] = f.attributes.count;
      });
    }

    return {
      state: 'SK',
      country: 'CA',
      stats: {
        total: data.count || 0,
        byStatus
      }
    };
  } catch (error) {
    console.error('SK stats error:', error);
    return { state: 'SK', country: 'CA', stats: { total: 0, error: error.message } };
  }
}

/**
 * Get single tenement by disposition number
 */
async function getTenement(tenementId) {
  const params = new URLSearchParams({
    where: `DISPOSIT_1='${tenementId}'`,
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'json'
  });

  try {
    const response = await fetch(`${SK_ARCGIS_URL}/query?${params}`);
    const data = await response.json();

    if (!data.features?.length) {
      return null;
    }

    return normalizeTenement(data.features[0], true);
  } catch (error) {
    console.error('SK tenement lookup error:', error);
    return null;
  }
}

/**
 * Parse owners string into array
 * Input: "DENISON MINES CORP.: 20.000%;  Skyharbour Resources Ltd.: 80.000%"
 * Output: ["DENISON MINES CORP. (20%)", "Skyharbour Resources Ltd. (80%)"]
 */
function parseOwners(ownerString) {
  if (!ownerString) return [];
  
  return ownerString.split(';').map(part => {
    const match = part.trim().match(/^(.+?):\s*([\d.]+)%$/);
    if (match) {
      const percent = parseFloat(match[2]);
      return `${match[1].trim()} (${percent}%)`;
    }
    return part.trim();
  }).filter(Boolean);
}

/**
 * Convert ArcGIS epoch (ms) to ISO date
 */
function epochToDate(epoch) {
  if (!epoch) return null;
  return new Date(epoch).toISOString().split('T')[0];
}

/**
 * Normalize SK tenement to unified schema
 */
function normalizeTenement(feature, includeGeometry = false) {
  const p = feature.attributes;
  
  const tenement = {
    id: p.DISPOSIT_1,
    formattedId: p.DISPOSIT_1,
    type: 'Mineral Disposition',
    status: p.DISPOSIT_3 || 'Unknown',
    holders: parseOwners(p.OWNERS),
    area: p['SHAPE.AREA'] ? Math.round(p['SHAPE.AREA'] / 10000) : null, // sq m to hectares
    areaUnit: 'HA',
    grantDate: epochToDate(p.EFFECTIVED),
    goodToDate: epochToDate(p.GOODSTANDI),
    state: 'SK',
    country: 'CA',
    source: 'Saskatchewan GIS'
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
    console.log('Testing Saskatchewan Mining Tenements API...\n');
    
    const stats = await getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    console.log('\nQuerying tenements (limit 3)...');
    const results = await queryTenements({ limit: 3 });
    console.log('Results:', JSON.stringify(results, null, 2));
  })().catch(console.error);
}
