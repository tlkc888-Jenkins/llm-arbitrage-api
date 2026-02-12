/**
 * Hosted MCP Servers — Runtime provision without installation
 * 
 * These are lightweight MCP servers hosted directly on AutropicAI.
 * Agents can use them immediately via SSE without any local setup.
 */

// Memory storage - in-memory cache backed by Supabase when configured
const memoryStore = new Map();
const MEMORY_SUPABASE_URL = process.env.SUPABASE_URL;
const MEMORY_SUPABASE_KEY = process.env.SUPABASE_KEY;

// Persist memory to Supabase
async function persistMemory(namespace, key, value) {
  if (!MEMORY_SUPABASE_URL || !MEMORY_SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${MEMORY_SUPABASE_URL}/rest/v1/agent_memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': MEMORY_SUPABASE_KEY,
        'Authorization': `Bearer ${MEMORY_SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ namespace, key, value, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch (e) {
    console.error('[MEMORY PERSIST]', e.message);
    return false;
  }
}

// Load memory from Supabase
async function loadMemory(namespace, key) {
  if (!MEMORY_SUPABASE_URL || !MEMORY_SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${MEMORY_SUPABASE_URL}/rest/v1/agent_memory?namespace=eq.${encodeURIComponent(namespace)}&key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
      {
        headers: {
          'apikey': MEMORY_SUPABASE_KEY,
          'Authorization': `Bearer ${MEMORY_SUPABASE_KEY}`,
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0].value : null;
  } catch (e) {
    console.error('[MEMORY LOAD]', e.message);
    return null;
  }
}

// List keys from Supabase
async function listMemoryKeys(namespace) {
  if (!MEMORY_SUPABASE_URL || !MEMORY_SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${MEMORY_SUPABASE_URL}/rest/v1/agent_memory?namespace=eq.${encodeURIComponent(namespace)}&select=key`,
      {
        headers: {
          'apikey': MEMORY_SUPABASE_KEY,
          'Authorization': `Bearer ${MEMORY_SUPABASE_KEY}`,
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.map(d => d.key);
  } catch (e) {
    console.error('[MEMORY LIST]', e.message);
    return null;
  }
}

// Delete from Supabase
async function deleteMemory(namespace, key) {
  if (!MEMORY_SUPABASE_URL || !MEMORY_SUPABASE_KEY) return false;
  try {
    const res = await fetch(
      `${MEMORY_SUPABASE_URL}/rest/v1/agent_memory?namespace=eq.${encodeURIComponent(namespace)}&key=eq.${encodeURIComponent(key)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': MEMORY_SUPABASE_KEY,
          'Authorization': `Bearer ${MEMORY_SUPABASE_KEY}`,
        }
      }
    );
    return res.ok;
  } catch (e) {
    console.error('[MEMORY DELETE]', e.message);
    return false;
  }
}

/**
 * Available hosted MCP servers
 */
/**
 * Available hosted MCP servers
 */
const HOSTED_SERVERS = {
  // Geolocation server - geocoding, distance, IP location (no API key needed)
  'geo': {
    name: 'Geolocation',
    description: 'Geocoding, reverse geocoding, distance calculations, and IP-based location',
    tools: [
      {
        name: 'geocode',
        description: 'Convert an address or place name to coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Address or place name (e.g., "Eiffel Tower" or "123 Main St, New York")' }
          },
          required: ['address']
        }
      },
      {
        name: 'reverse_geocode',
        description: 'Convert coordinates to an address',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: { type: 'number', description: 'Latitude' },
            longitude: { type: 'number', description: 'Longitude' }
          },
          required: ['latitude', 'longitude']
        }
      },
      {
        name: 'distance',
        description: 'Calculate distance between two points',
        inputSchema: {
          type: 'object',
          properties: {
            from_lat: { type: 'number', description: 'Starting latitude' },
            from_lon: { type: 'number', description: 'Starting longitude' },
            to_lat: { type: 'number', description: 'Destination latitude' },
            to_lon: { type: 'number', description: 'Destination longitude' }
          },
          required: ['from_lat', 'from_lon', 'to_lat', 'to_lon']
        }
      },
      {
        name: 'ip_location',
        description: 'Get approximate location from an IP address',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address (leave empty for current/caller IP)' }
          }
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'geocode') {
        try {
          const q = encodeURIComponent(args.address);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
            headers: { 'User-Agent': 'AutropicAI-MCP/1.0 (https://tryautropic.com)' }
          });
          const data = await res.json();
          if (!data.length) {
            return { error: 'Location not found' };
          }
          const loc = data[0];
          return {
            query: args.address,
            latitude: parseFloat(loc.lat),
            longitude: parseFloat(loc.lon),
            display_name: loc.display_name,
            type: loc.type
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'reverse_geocode') {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${args.latitude}&lon=${args.longitude}&format=json`, {
            headers: { 'User-Agent': 'AutropicAI-MCP/1.0 (https://tryautropic.com)' }
          });
          const data = await res.json();
          if (data.error) {
            return { error: data.error };
          }
          return {
            latitude: args.latitude,
            longitude: args.longitude,
            address: data.display_name,
            details: {
              road: data.address?.road,
              suburb: data.address?.suburb,
              city: data.address?.city || data.address?.town || data.address?.village,
              state: data.address?.state,
              country: data.address?.country,
              postcode: data.address?.postcode
            }
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'distance') {
        // Haversine formula
        const R = 6371; // Earth's radius in km
        const toRad = (deg) => deg * Math.PI / 180;
        
        const dLat = toRad(args.to_lat - args.from_lat);
        const dLon = toRad(args.to_lon - args.from_lon);
        const lat1 = toRad(args.from_lat);
        const lat2 = toRad(args.to_lat);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const km = R * c;
        
        return {
          from: { latitude: args.from_lat, longitude: args.from_lon },
          to: { latitude: args.to_lat, longitude: args.to_lon },
          distance: {
            kilometers: Math.round(km * 100) / 100,
            miles: Math.round(km * 0.621371 * 100) / 100
          }
        };
      }
      
      if (tool === 'ip_location') {
        try {
          const ip = args.ip || '';
          const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,query`);
          const data = await res.json();
          if (data.status === 'fail') {
            return { error: data.message };
          }
          return {
            ip: data.query,
            location: {
              city: data.city,
              region: data.regionName,
              country: data.country,
              country_code: data.countryCode,
              postal_code: data.zip,
              latitude: data.lat,
              longitude: data.lon,
              timezone: data.timezone
            },
            isp: data.isp
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Weather server - real weather data via wttr.in (no API key needed)
  'weather': {
    name: 'Weather',
    description: 'Get current weather and forecasts for any location worldwide',
    tools: [
      {
        name: 'get_weather',
        description: 'Get current weather for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name, address, or coordinates (e.g., "London", "New York", "48.8566,2.3522")' }
          },
          required: ['location']
        }
      },
      {
        name: 'get_forecast',
        description: 'Get weather forecast for upcoming days',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name, address, or coordinates' },
            days: { type: 'number', description: 'Number of days (1-3). Default: 3' }
          },
          required: ['location']
        }
      }
    ],
    execute: async (tool, args) => {
      const location = encodeURIComponent(args.location);
      
      if (tool === 'get_weather') {
        try {
          const res = await fetch(`https://wttr.in/${location}?format=j1`, {
            headers: { 'User-Agent': 'AutropicAI-MCP/1.0' }
          });
          if (!res.ok) {
            return { error: `Weather API error: ${res.status}` };
          }
          const data = await res.json();
          const current = data.current_condition?.[0];
          const area = data.nearest_area?.[0];
          
          if (!current) {
            return { error: 'Could not get weather data for this location' };
          }
          
          return {
            location: area ? `${area.areaName?.[0]?.value}, ${area.country?.[0]?.value}` : args.location,
            temperature: {
              celsius: parseInt(current.temp_C),
              fahrenheit: parseInt(current.temp_F)
            },
            feels_like: {
              celsius: parseInt(current.FeelsLikeC),
              fahrenheit: parseInt(current.FeelsLikeF)
            },
            condition: current.weatherDesc?.[0]?.value,
            humidity: `${current.humidity}%`,
            wind: {
              speed_kmh: parseInt(current.windspeedKmph),
              speed_mph: parseInt(current.windspeedMiles),
              direction: current.winddir16Point
            },
            visibility_km: parseInt(current.visibility),
            uv_index: parseInt(current.uvIndex),
            observation_time: current.localObsDateTime || current.observation_time
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'get_forecast') {
        try {
          const res = await fetch(`https://wttr.in/${location}?format=j1`, {
            headers: { 'User-Agent': 'AutropicAI-MCP/1.0' }
          });
          if (!res.ok) {
            return { error: `Weather API error: ${res.status}` };
          }
          const data = await res.json();
          const area = data.nearest_area?.[0];
          const days = Math.min(args.days || 3, 3);
          
          const forecast = data.weather?.slice(0, days).map(day => ({
            date: day.date,
            max_temp: { celsius: parseInt(day.maxtempC), fahrenheit: parseInt(day.maxtempF) },
            min_temp: { celsius: parseInt(day.mintempC), fahrenheit: parseInt(day.mintempF) },
            avg_temp: { celsius: parseInt(day.avgtempC), fahrenheit: parseInt(day.avgtempF) },
            condition: day.hourly?.[4]?.weatherDesc?.[0]?.value || 'Unknown',
            chance_of_rain: `${day.hourly?.[4]?.chanceofrain || 0}%`,
            sunrise: day.astronomy?.[0]?.sunrise,
            sunset: day.astronomy?.[0]?.sunset
          }));
          
          return {
            location: area ? `${area.areaName?.[0]?.value}, ${area.country?.[0]?.value}` : args.location,
            days: forecast?.length || 0,
            forecast
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Web fetch server - fetch and extract content from URLs
  'fetch': {
    name: 'Web Fetch',
    description: 'Fetch web pages and extract readable content',
    tools: [
      {
        name: 'fetch_url',
        description: 'Fetch a URL and return the content',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to fetch' },
            format: { type: 'string', description: 'Return format: text, html, or json (for APIs). Default: text' },
            max_length: { type: 'number', description: 'Max characters to return. Default: 50000' }
          },
          required: ['url']
        }
      },
      {
        name: 'extract_links',
        description: 'Extract all links from a web page',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to extract links from' }
          },
          required: ['url']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'fetch_url') {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          
          const res = await fetch(args.url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'AutropicAI-MCP/1.0 (https://tryautropic.com)',
              'Accept': 'text/html,application/json,text/plain,*/*'
            }
          });
          clearTimeout(timeout);
          
          if (!res.ok) {
            return { error: `HTTP ${res.status}: ${res.statusText}` };
          }
          
          const contentType = res.headers.get('content-type') || '';
          let content = await res.text();
          const maxLen = args.max_length || 50000;
          
          // Format based on request or content type
          const format = args.format || (contentType.includes('json') ? 'json' : 'text');
          
          if (format === 'json' && contentType.includes('json')) {
            try {
              const json = JSON.parse(content);
              return { url: args.url, format: 'json', data: json };
            } catch (e) {
              return { url: args.url, format: 'text', content: content.slice(0, maxLen) };
            }
          }
          
          if (format === 'text') {
            // Strip HTML tags for plain text
            content = content
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
          
          return { 
            url: args.url, 
            format, 
            length: content.length,
            truncated: content.length > maxLen,
            content: content.slice(0, maxLen) 
          };
        } catch (e) {
          if (e.name === 'AbortError') {
            return { error: 'Request timed out (10s limit)' };
          }
          return { error: e.message };
        }
      }
      
      if (tool === 'extract_links') {
        try {
          const res = await fetch(args.url, {
            headers: { 'User-Agent': 'AutropicAI-MCP/1.0' }
          });
          const html = await res.text();
          
          // Extract href attributes
          const linkRegex = /href=["']([^"']+)["']/gi;
          const links = [];
          let match;
          while ((match = linkRegex.exec(html)) !== null) {
            let href = match[1];
            // Resolve relative URLs
            if (href.startsWith('/')) {
              const base = new URL(args.url);
              href = `${base.origin}${href}`;
            } else if (!href.startsWith('http')) {
              continue; // Skip non-http links
            }
            if (!links.includes(href)) {
              links.push(href);
            }
          }
          
          return { url: args.url, links, count: links.length };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },


  // Time server - current time and timezone operations
  'time': {
    name: 'Time',
    description: 'Get current time, timezone conversions, and date calculations',
    tools: [
      {
        name: 'get_current_time',
        description: 'Get the current time in a specified timezone',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: { type: 'string', description: 'IANA timezone (e.g., America/New_York). Defaults to UTC.' }
          }
        }
      },
      {
        name: 'convert_timezone',
        description: 'Convert a time from one timezone to another',
        inputSchema: {
          type: 'object',
          properties: {
            time: { type: 'string', description: 'ISO 8601 time string' },
            from_tz: { type: 'string', description: 'Source timezone' },
            to_tz: { type: 'string', description: 'Target timezone' }
          },
          required: ['time', 'from_tz', 'to_tz']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'get_current_time') {
        const tz = args.timezone || 'UTC';
        try {
          const now = new Date();
          const formatted = now.toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' });
          return { time: formatted, timezone: tz, iso: now.toISOString() };
        } catch (e) {
          return { error: `Invalid timezone: ${tz}` };
        }
      }
      if (tool === 'convert_timezone') {
        try {
          const date = new Date(args.time);
          const converted = date.toLocaleString('en-US', { timeZone: args.to_tz, dateStyle: 'full', timeStyle: 'long' });
          return { original: args.time, from: args.from_tz, to: args.to_tz, converted };
        } catch (e) {
          return { error: e.message };
        }
      }
      return { error: 'Unknown tool' };
    }
  },

  // Memory server - persistent key-value storage for agents
  'memory': {
    name: 'Memory',
    description: 'Store and retrieve key-value data. Persists across requests within a session.',
    tools: [
      {
        name: 'store',
        description: 'Store a value with a key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Storage key' },
            value: { type: 'string', description: 'Value to store (will be JSON stringified if object)' },
            namespace: { type: 'string', description: 'Optional namespace to avoid collisions' }
          },
          required: ['key', 'value']
        }
      },
      {
        name: 'retrieve',
        description: 'Retrieve a value by key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Storage key' },
            namespace: { type: 'string', description: 'Optional namespace' }
          },
          required: ['key']
        }
      },
      {
        name: 'list_keys',
        description: 'List all keys in a namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Optional namespace' }
          }
        }
      },
      {
        name: 'delete',
        description: 'Delete a key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Storage key' },
            namespace: { type: 'string', description: 'Optional namespace' }
          },
          required: ['key']
        }
      }
    ],
    execute: async (tool, args) => {
      const ns = args.namespace || 'default';
      const fullKey = `${ns}:${args.key}`;
      const isPersisted = !!(MEMORY_SUPABASE_URL && MEMORY_SUPABASE_KEY);
      
      if (tool === 'store') {
        // Store in memory cache
        memoryStore.set(fullKey, args.value);
        
        // Persist to Supabase if configured
        let persisted = false;
        if (isPersisted) {
          persisted = await persistMemory(ns, args.key, args.value);
        }
        
        return { 
          success: true, 
          key: args.key, 
          namespace: ns,
          persisted,
          storage: isPersisted ? 'persistent' : 'ephemeral'
        };
      }
      
      if (tool === 'retrieve') {
        // Check memory cache first
        let value = memoryStore.get(fullKey);
        let source = 'cache';
        
        // If not in cache and Supabase is configured, try loading
        if (value === undefined && isPersisted) {
          value = await loadMemory(ns, args.key);
          source = 'persistent';
          // Populate cache
          if (value !== null) {
            memoryStore.set(fullKey, value);
          }
        }
        
        if (value === undefined || value === null) {
          return { found: false, key: args.key, namespace: ns };
        }
        return { found: true, key: args.key, value, namespace: ns, source };
      }
      
      if (tool === 'list_keys') {
        // If Supabase is configured, get keys from there (source of truth)
        if (isPersisted) {
          const keys = await listMemoryKeys(ns);
          if (keys !== null) {
            return { namespace: ns, keys, count: keys.length, source: 'persistent' };
          }
        }
        
        // Fallback to memory cache
        const prefix = `${ns}:`;
        const keys = Array.from(memoryStore.keys())
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length));
        return { namespace: ns, keys, count: keys.length, source: 'cache' };
      }
      
      if (tool === 'delete') {
        const existed = memoryStore.delete(fullKey);
        
        // Delete from Supabase if configured
        let deletedFromDb = false;
        if (isPersisted) {
          deletedFromDb = await deleteMemory(ns, args.key);
        }
        
        return { 
          success: true, 
          deleted: existed || deletedFromDb, 
          key: args.key, 
          namespace: ns 
        };
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Calculator server - math operations
  'calculator': {
    name: 'Calculator',
    description: 'Perform mathematical calculations',
    tools: [
      {
        name: 'evaluate',
        description: 'Evaluate a mathematical expression',
        inputSchema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression (e.g., "2 + 2 * 3")' }
          },
          required: ['expression']
        }
      },
      {
        name: 'convert_units',
        description: 'Convert between units',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'number', description: 'Value to convert' },
            from: { type: 'string', description: 'Source unit' },
            to: { type: 'string', description: 'Target unit' }
          },
          required: ['value', 'from', 'to']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'evaluate') {
        try {
          // Safe math evaluation (no eval)
          const expr = args.expression.replace(/[^0-9+\-*/().%\s]/g, '');
          const result = Function(`"use strict"; return (${expr})`)();
          return { expression: args.expression, result };
        } catch (e) {
          return { error: `Invalid expression: ${e.message}` };
        }
      }
      if (tool === 'convert_units') {
        // Simple unit conversions
        const conversions = {
          'km_to_miles': 0.621371,
          'miles_to_km': 1.60934,
          'kg_to_lbs': 2.20462,
          'lbs_to_kg': 0.453592,
          'c_to_f': (v) => v * 9/5 + 32,
          'f_to_c': (v) => (v - 32) * 5/9,
          'm_to_ft': 3.28084,
          'ft_to_m': 0.3048,
        };
        const key = `${args.from.toLowerCase()}_to_${args.to.toLowerCase()}`;
        const factor = conversions[key];
        if (!factor) {
          return { error: `Unknown conversion: ${args.from} to ${args.to}` };
        }
        const result = typeof factor === 'function' ? factor(args.value) : args.value * factor;
        return { value: args.value, from: args.from, to: args.to, result };
      }
      return { error: 'Unknown tool' };
    }
  },

  // Cryptocurrency prices - real-time prices via CoinGecko
  'crypto-prices': {
    name: 'Crypto Prices',
    description: 'Get real-time cryptocurrency prices and market data',
    tools: [
      {
        name: 'get_price',
        description: 'Get current price of a cryptocurrency',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Crypto symbol (e.g., BTC, ETH, SOL)' },
            currency: { type: 'string', description: 'Fiat currency for price (e.g., USD, EUR). Default: USD' }
          },
          required: ['symbol']
        }
      },
      {
        name: 'get_top_cryptos',
        description: 'Get top cryptocurrencies by market cap',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results (1-20). Default: 10' },
            currency: { type: 'string', description: 'Fiat currency for prices. Default: USD' }
          }
        }
      }
    ],
    execute: async (tool, args) => {
      const symbolMap = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
        'DOGE': 'dogecoin', 'XRP': 'ripple', 'ADA': 'cardano',
        'DOT': 'polkadot', 'MATIC': 'matic-network', 'LINK': 'chainlink',
        'AVAX': 'avalanche-2', 'UNI': 'uniswap', 'LTC': 'litecoin'
      };
      
      if (tool === 'get_price') {
        try {
          const symbol = args.symbol.toUpperCase();
          const coinId = symbolMap[symbol] || symbol.toLowerCase();
          const currency = (args.currency || 'USD').toLowerCase();
          
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`,
            { headers: { 'Accept': 'application/json' } }
          );
          
          if (!res.ok) {
            return { error: `CoinGecko API error: ${res.status}` };
          }
          
          const data = await res.json();
          const coinData = data[coinId];
          
          if (!coinData) {
            return { error: `Unknown cryptocurrency: ${symbol}` };
          }
          
          return {
            symbol: symbol,
            currency: currency.toUpperCase(),
            price: coinData[currency],
            change_24h: coinData[`${currency}_24h_change`]?.toFixed(2) + '%',
            market_cap: coinData[`${currency}_market_cap`],
            formatted: `${symbol}: $${coinData[currency].toLocaleString()} (${coinData[`${currency}_24h_change`]?.toFixed(2)}% 24h)`
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'get_top_cryptos') {
        try {
          const limit = Math.min(args.limit || 10, 20);
          const currency = (args.currency || 'USD').toLowerCase();
          
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1`,
            { headers: { 'Accept': 'application/json' } }
          );
          
          if (!res.ok) {
            return { error: `CoinGecko API error: ${res.status}` };
          }
          
          const data = await res.json();
          
          return {
            currency: currency.toUpperCase(),
            count: data.length,
            cryptos: data.map(c => ({
              rank: c.market_cap_rank,
              symbol: c.symbol.toUpperCase(),
              name: c.name,
              price: c.current_price,
              change_24h: c.price_change_percentage_24h?.toFixed(2) + '%',
              market_cap: c.market_cap
            }))
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Hash server - generate hashes and UUIDs
  'crypto': {
    name: 'Crypto Utils',
    description: 'Generate hashes, UUIDs, and random values',
    tools: [
      {
        name: 'hash',
        description: 'Generate a hash of input text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to hash' },
            algorithm: { type: 'string', description: 'Hash algorithm (md5, sha1, sha256, sha512). Default: sha256' }
          },
          required: ['text']
        }
      },
      {
        name: 'uuid',
        description: 'Generate a UUID',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'number', description: 'UUID version (4 for random). Default: 4' }
          }
        }
      },
      {
        name: 'random',
        description: 'Generate random values',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Type: number, string, hex. Default: number' },
            length: { type: 'number', description: 'Length for string/hex. Default: 16' },
            min: { type: 'number', description: 'Min for number. Default: 0' },
            max: { type: 'number', description: 'Max for number. Default: 100' }
          }
        }
      }
    ],
    execute: async (tool, args) => {
      const crypto = require('crypto');
      
      if (tool === 'hash') {
        const algo = args.algorithm || 'sha256';
        try {
          const hash = crypto.createHash(algo).update(args.text).digest('hex');
          return { algorithm: algo, hash };
        } catch (e) {
          return { error: `Invalid algorithm: ${algo}` };
        }
      }
      if (tool === 'uuid') {
        const uuid = crypto.randomUUID();
        return { uuid };
      }
      if (tool === 'random') {
        const type = args.type || 'number';
        if (type === 'number') {
          const min = args.min || 0;
          const max = args.max || 100;
          const result = Math.floor(Math.random() * (max - min + 1)) + min;
          return { type, min, max, result };
        }
        if (type === 'hex') {
          const length = args.length || 16;
          const result = crypto.randomBytes(length).toString('hex');
          return { type, length, result };
        }
        if (type === 'string') {
          const length = args.length || 16;
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let result = '';
          for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return { type, length, result };
        }
        return { error: `Unknown type: ${type}` };
      }
      return { error: 'Unknown tool' };
    }
  },

  // Web Search server - search the web
  'search': {
    name: 'Web Search',
    description: 'Search the web and get results. Powered by DuckDuckGo.',
    tools: [
      {
        name: 'search',
        description: 'Search the web for information',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            max_results: { type: 'number', description: 'Maximum results to return (1-10). Default: 5' }
          },
          required: ['query']
        }
      },
      {
        name: 'instant_answer',
        description: 'Get an instant answer for a query (definitions, calculations, facts)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Query to look up' }
          },
          required: ['query']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'search') {
        try {
          const query = encodeURIComponent(args.query);
          const maxResults = Math.min(args.max_results || 5, 10);
          
          // Use SearXNG public instance (designed for API access)
          // Fallback chain for reliability
          const searxngInstances = [
            'https://search.bus-hit.me',
            'https://searx.be',
            'https://search.sapti.me'
          ];
          
          let results = [];
          let lastError = null;
          
          for (const instance of searxngInstances) {
            try {
              const res = await fetch(`${instance}/search?q=${query}&format=json&categories=general`, {
                headers: { 
                  'Accept': 'application/json',
                  'User-Agent': 'AutropicAI-MCP/1.0 (+https://tryautropic.com)'
                },
                signal: AbortSignal.timeout(8000)
              });
              
              if (!res.ok) continue;
              
              const data = await res.json();
              
              if (data.results && data.results.length > 0) {
                results = data.results.slice(0, maxResults).map(r => ({
                  title: r.title,
                  url: r.url,
                  snippet: r.content || r.description || ''
                }));
                break; // Success, exit loop
              }
            } catch (e) {
              lastError = e;
              continue; // Try next instance
            }
          }
          
          if (results.length === 0 && lastError) {
            return { error: `Search failed: ${lastError.message}` };
          }
          
          return {
            query: args.query,
            results_count: results.length,
            results
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'instant_answer') {
        try {
          const query = encodeURIComponent(args.query);
          const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`);
          const data = await res.json();
          
          // Check for different types of instant answers
          if (data.AbstractText) {
            return {
              query: args.query,
              type: 'abstract',
              answer: data.AbstractText,
              source: data.AbstractSource,
              url: data.AbstractURL
            };
          }
          
          if (data.Answer) {
            return {
              query: args.query,
              type: 'answer',
              answer: data.Answer,
              answer_type: data.AnswerType
            };
          }
          
          if (data.Definition) {
            return {
              query: args.query,
              type: 'definition',
              definition: data.Definition,
              source: data.DefinitionSource,
              url: data.DefinitionURL
            };
          }
          
          // Check for related topics
          if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const topics = data.RelatedTopics
              .filter(t => t.Text)
              .slice(0, 5)
              .map(t => ({ text: t.Text, url: t.FirstURL }));
            return {
              query: args.query,
              type: 'related',
              topics
            };
          }
          
          return { query: args.query, type: 'none', message: 'No instant answer found. Try a web search instead.' };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Email server - send emails via Resend
  'email': {
    name: 'Email',
    description: 'Send emails programmatically. Requires API key configuration.',
    tools: [
      {
        name: 'send',
        description: 'Send an email',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body (plain text)' },
            html: { type: 'string', description: 'Email body (HTML, optional)' },
            from: { type: 'string', description: 'Sender email (optional, uses default if not set)' },
            api_key: { type: 'string', description: 'Resend API key (required)' }
          },
          required: ['to', 'subject', 'body', 'api_key']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'send') {
        try {
          if (!args.api_key) {
            return { error: 'API key required. Get one free at resend.com' };
          }
          
          const payload = {
            from: args.from || 'AutropicAI <noreply@tryautropic.com>',
            to: [args.to],
            subject: args.subject,
            text: args.body
          };
          
          if (args.html) {
            payload.html = args.html;
          }
          
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${args.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            return { error: data.message || `HTTP ${res.status}`, details: data };
          }
          
          return {
            success: true,
            message_id: data.id,
            to: args.to,
            subject: args.subject
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // JSON server - JSON manipulation
  'json': {
    name: 'JSON Utils',
    description: 'Parse, format, query, and transform JSON',
    tools: [
      {
        name: 'parse',
        description: 'Parse a JSON string and return formatted result',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'JSON string to parse' }
          },
          required: ['text']
        }
      },
      {
        name: 'query',
        description: 'Query JSON with a simple path (e.g., "users.0.name")',
        inputSchema: {
          type: 'object',
          properties: {
            json: { type: 'string', description: 'JSON string' },
            path: { type: 'string', description: 'Dot-notation path' }
          },
          required: ['json', 'path']
        }
      },
      {
        name: 'format',
        description: 'Format/prettify JSON',
        inputSchema: {
          type: 'object',
          properties: {
            json: { type: 'string', description: 'JSON string' },
            indent: { type: 'number', description: 'Indentation spaces. Default: 2' }
          },
          required: ['json']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'parse') {
        try {
          const parsed = JSON.parse(args.text);
          return { success: true, data: parsed, type: typeof parsed };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }
      if (tool === 'query') {
        try {
          const data = JSON.parse(args.json);
          const parts = args.path.split('.');
          let result = data;
          for (const part of parts) {
            result = result[part];
            if (result === undefined) break;
          }
          return { path: args.path, result };
        } catch (e) {
          return { error: e.message };
        }
      }
      if (tool === 'format') {
        try {
          const data = JSON.parse(args.json);
          const formatted = JSON.stringify(data, null, args.indent || 2);
          return { formatted };
        } catch (e) {
          return { error: e.message };
        }
      }
      return { error: 'Unknown tool' };
    }
  },

  // UUID generator
  'uuid': {
    name: 'UUID Generator',
    description: 'Generate universally unique identifiers (UUIDs)',
    tools: [
      {
        name: 'generate',
        description: 'Generate a UUID v4',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of UUIDs to generate (1-100). Default: 1' }
          }
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'generate') {
        const count = Math.min(Math.max(args.count || 1, 1), 100);
        const uuids = [];
        for (let i = 0; i < count; i++) {
          uuids.push(crypto.randomUUID());
        }
        return count === 1 ? { uuid: uuids[0] } : { uuids, count };
      }
      return { error: 'Unknown tool' };
    }
  },

  // Hash generator
  'hash': {
    name: 'Hash Generator',
    description: 'Generate cryptographic hashes (MD5, SHA-1, SHA-256, SHA-512)',
    tools: [
      {
        name: 'generate',
        description: 'Generate a hash of the input text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to hash' },
            algorithm: { type: 'string', description: 'Hash algorithm: md5, sha1, sha256, sha512. Default: sha256' }
          },
          required: ['text']
        }
      },
      {
        name: 'verify',
        description: 'Verify if a hash matches the input text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Original text' },
            hash: { type: 'string', description: 'Hash to verify' },
            algorithm: { type: 'string', description: 'Hash algorithm. Default: sha256' }
          },
          required: ['text', 'hash']
        }
      }
    ],
    execute: async (tool, args) => {
      const crypto = require('crypto');
      const algo = (args.algorithm || 'sha256').toLowerCase();
      const validAlgos = ['md5', 'sha1', 'sha256', 'sha512'];
      
      if (!validAlgos.includes(algo)) {
        return { error: `Invalid algorithm. Use: ${validAlgos.join(', ')}` };
      }
      
      if (tool === 'generate') {
        const hash = crypto.createHash(algo).update(args.text).digest('hex');
        return { text_length: args.text.length, algorithm: algo, hash };
      }
      
      if (tool === 'verify') {
        const computed = crypto.createHash(algo).update(args.text).digest('hex');
        const match = computed.toLowerCase() === args.hash.toLowerCase();
        return { match, algorithm: algo, computed_hash: computed };
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Base64 encoder/decoder
  'base64': {
    name: 'Base64 Encoder/Decoder',
    description: 'Encode and decode Base64 strings',
    tools: [
      {
        name: 'encode',
        description: 'Encode text to Base64',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to encode' }
          },
          required: ['text']
        }
      },
      {
        name: 'decode',
        description: 'Decode Base64 to text',
        inputSchema: {
          type: 'object',
          properties: {
            encoded: { type: 'string', description: 'Base64 string to decode' }
          },
          required: ['encoded']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'encode') {
        const encoded = Buffer.from(args.text, 'utf-8').toString('base64');
        return { original_length: args.text.length, encoded, encoded_length: encoded.length };
      }
      if (tool === 'decode') {
        try {
          const decoded = Buffer.from(args.encoded, 'base64').toString('utf-8');
          return { decoded, decoded_length: decoded.length };
        } catch (e) {
          return { error: 'Invalid Base64 string' };
        }
      }
      return { error: 'Unknown tool' };
    }
  },

  // Random generator
  'random': {
    name: 'Random Generator',
    description: 'Generate random numbers, strings, and passwords',
    tools: [
      {
        name: 'number',
        description: 'Generate a random number',
        inputSchema: {
          type: 'object',
          properties: {
            min: { type: 'number', description: 'Minimum value. Default: 0' },
            max: { type: 'number', description: 'Maximum value. Default: 100' },
            count: { type: 'number', description: 'How many numbers. Default: 1' },
            decimals: { type: 'number', description: 'Decimal places. Default: 0 (integers)' }
          }
        }
      },
      {
        name: 'string',
        description: 'Generate a random string',
        inputSchema: {
          type: 'object',
          properties: {
            length: { type: 'number', description: 'String length. Default: 16' },
            charset: { type: 'string', description: 'Character set: alphanumeric, alpha, numeric, hex. Default: alphanumeric' }
          }
        }
      },
      {
        name: 'password',
        description: 'Generate a secure password',
        inputSchema: {
          type: 'object',
          properties: {
            length: { type: 'number', description: 'Password length. Default: 16' },
            include_symbols: { type: 'boolean', description: 'Include symbols. Default: true' }
          }
        }
      },
      {
        name: 'choice',
        description: 'Pick random item(s) from a list',
        inputSchema: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'string' }, description: 'List of items to choose from' },
            count: { type: 'number', description: 'Number of items to pick. Default: 1' }
          },
          required: ['items']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'number') {
        const min = args.min ?? 0;
        const max = args.max ?? 100;
        const count = Math.min(args.count || 1, 100);
        const decimals = args.decimals || 0;
        
        const numbers = [];
        for (let i = 0; i < count; i++) {
          let num = Math.random() * (max - min) + min;
          num = decimals > 0 ? parseFloat(num.toFixed(decimals)) : Math.floor(num);
          numbers.push(num);
        }
        return count === 1 ? { number: numbers[0] } : { numbers, count };
      }
      
      if (tool === 'string') {
        const length = Math.min(args.length || 16, 256);
        const charsets = {
          alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
          numeric: '0123456789',
          hex: '0123456789abcdef'
        };
        const chars = charsets[args.charset] || charsets.alphanumeric;
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
        return { string: result, length, charset: args.charset || 'alphanumeric' };
      }
      
      if (tool === 'password') {
        const length = Math.min(args.length || 16, 128);
        const includeSymbols = args.include_symbols !== false;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + 
                     (includeSymbols ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '');
        let password = '';
        for (let i = 0; i < length; i++) {
          password += chars[Math.floor(Math.random() * chars.length)];
        }
        return { password, length, includes_symbols: includeSymbols };
      }
      
      if (tool === 'choice') {
        if (!args.items?.length) return { error: 'Items array is required' };
        const count = Math.min(args.count || 1, args.items.length);
        const shuffled = [...args.items].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, count);
        return count === 1 ? { choice: picked[0] } : { choices: picked, count };
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // URL utilities
  'url': {
    name: 'URL Utils',
    description: 'Parse, build, and encode URLs',
    tools: [
      {
        name: 'parse',
        description: 'Parse a URL into its components',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to parse' }
          },
          required: ['url']
        }
      },
      {
        name: 'build',
        description: 'Build a URL from components',
        inputSchema: {
          type: 'object',
          properties: {
            base: { type: 'string', description: 'Base URL' },
            path: { type: 'string', description: 'Path to append' },
            params: { type: 'object', description: 'Query parameters as key-value pairs' }
          },
          required: ['base']
        }
      },
      {
        name: 'encode',
        description: 'URL-encode a string',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to encode' }
          },
          required: ['text']
        }
      },
      {
        name: 'decode',
        description: 'URL-decode a string',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to decode' }
          },
          required: ['text']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'parse') {
        try {
          const url = new URL(args.url);
          const params = {};
          url.searchParams.forEach((v, k) => params[k] = v);
          return {
            href: url.href,
            protocol: url.protocol,
            host: url.host,
            hostname: url.hostname,
            port: url.port || null,
            pathname: url.pathname,
            search: url.search,
            params,
            hash: url.hash || null
          };
        } catch (e) {
          return { error: 'Invalid URL' };
        }
      }
      
      if (tool === 'build') {
        try {
          const url = new URL(args.path || '', args.base);
          if (args.params) {
            Object.entries(args.params).forEach(([k, v]) => url.searchParams.set(k, v));
          }
          return { url: url.href };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'encode') {
        return { encoded: encodeURIComponent(args.text) };
      }
      
      if (tool === 'decode') {
        try {
          return { decoded: decodeURIComponent(args.text) };
        } catch (e) {
          return { error: 'Invalid encoded string' };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // DNS lookup
  'dns': {
    name: 'DNS Lookup',
    description: 'Perform DNS lookups for domains',
    tools: [
      {
        name: 'lookup',
        description: 'Look up DNS records for a domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name to look up' },
            type: { type: 'string', description: 'Record type: A, AAAA, MX, TXT, NS, CNAME. Default: A' }
          },
          required: ['domain']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'lookup') {
        const dns = require('dns').promises;
        const type = (args.type || 'A').toUpperCase();
        
        try {
          let records;
          switch (type) {
            case 'A':
              records = await dns.resolve4(args.domain);
              break;
            case 'AAAA':
              records = await dns.resolve6(args.domain);
              break;
            case 'MX':
              records = await dns.resolveMx(args.domain);
              break;
            case 'TXT':
              records = await dns.resolveTxt(args.domain);
              break;
            case 'NS':
              records = await dns.resolveNs(args.domain);
              break;
            case 'CNAME':
              records = await dns.resolveCname(args.domain);
              break;
            default:
              return { error: `Unsupported record type: ${type}` };
          }
          return { domain: args.domain, type, records };
        } catch (e) {
          return { error: e.message, code: e.code };
        }
      }
      return { error: 'Unknown tool' };
    }
  },

  // Text utilities
  'text': {
    name: 'Text Utils',
    description: 'Text manipulation and analysis utilities',
    tools: [
      {
        name: 'stats',
        description: 'Get statistics about text (word count, char count, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' }
          },
          required: ['text']
        }
      },
      {
        name: 'case',
        description: 'Convert text case',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to convert' },
            to: { type: 'string', description: 'Target case: upper, lower, title, sentence, camel, snake, kebab' }
          },
          required: ['text', 'to']
        }
      },
      {
        name: 'truncate',
        description: 'Truncate text to a specified length',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to truncate' },
            length: { type: 'number', description: 'Maximum length' },
            suffix: { type: 'string', description: 'Suffix to add. Default: ...' }
          },
          required: ['text', 'length']
        }
      },
      {
        name: 'slug',
        description: 'Convert text to URL-safe slug',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to convert' }
          },
          required: ['text']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'stats') {
        const text = args.text || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
        
        return {
          characters: text.length,
          characters_no_spaces: text.replace(/\s/g, '').length,
          words: words.length,
          sentences: sentences.length,
          paragraphs: paragraphs.length,
          lines: text.split('\n').length,
          avg_word_length: words.length ? (words.reduce((a, w) => a + w.length, 0) / words.length).toFixed(1) : 0
        };
      }
      
      if (tool === 'case') {
        const text = args.text || '';
        let result;
        
        switch (args.to?.toLowerCase()) {
          case 'upper':
            result = text.toUpperCase();
            break;
          case 'lower':
            result = text.toLowerCase();
            break;
          case 'title':
            result = text.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
            break;
          case 'sentence':
            result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            break;
          case 'camel':
            result = text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
            break;
          case 'snake':
            result = text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            break;
          case 'kebab':
            result = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            break;
          default:
            return { error: 'Invalid case type. Use: upper, lower, title, sentence, camel, snake, kebab' };
        }
        
        return { original: text, converted: result, case: args.to };
      }
      
      if (tool === 'truncate') {
        const text = args.text || '';
        const length = args.length || 100;
        const suffix = args.suffix ?? '...';
        
        if (text.length <= length) {
          return { text, truncated: false };
        }
        
        return {
          text: text.slice(0, length - suffix.length) + suffix,
          truncated: true,
          original_length: text.length
        };
      }
      
      if (tool === 'slug') {
        const slug = args.text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        return { original: args.text, slug };
      }
      
      return { error: 'Unknown tool' };
    }
  },

  // Regex tester
  'regex': {
    name: 'Regex Tester',
    description: 'Test and execute regular expressions',
    tools: [
      {
        name: 'test',
        description: 'Test if a pattern matches text',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regular expression pattern' },
            text: { type: 'string', description: 'Text to test against' },
            flags: { type: 'string', description: 'Regex flags (g, i, m, etc.). Default: none' }
          },
          required: ['pattern', 'text']
        }
      },
      {
        name: 'match',
        description: 'Find all matches of a pattern in text',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regular expression pattern' },
            text: { type: 'string', description: 'Text to search' },
            flags: { type: 'string', description: 'Regex flags. Default: g' }
          },
          required: ['pattern', 'text']
        }
      },
      {
        name: 'replace',
        description: 'Replace matches of a pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regular expression pattern' },
            text: { type: 'string', description: 'Text to search' },
            replacement: { type: 'string', description: 'Replacement string' },
            flags: { type: 'string', description: 'Regex flags. Default: g' }
          },
          required: ['pattern', 'text', 'replacement']
        }
      }
    ],
    execute: async (tool, args) => {
      try {
        if (tool === 'test') {
          const regex = new RegExp(args.pattern, args.flags || '');
          return { pattern: args.pattern, matches: regex.test(args.text) };
        }
        
        if (tool === 'match') {
          const flags = args.flags || 'g';
          const regex = new RegExp(args.pattern, flags.includes('g') ? flags : flags + 'g');
          const matches = [...args.text.matchAll(regex)].map(m => ({
            match: m[0],
            index: m.index,
            groups: m.groups || null
          }));
          return { pattern: args.pattern, count: matches.length, matches };
        }
        
        if (tool === 'replace') {
          const regex = new RegExp(args.pattern, args.flags || 'g');
          const result = args.text.replace(regex, args.replacement);
          return { original: args.text, result, pattern: args.pattern };
        }
        
        return { error: 'Unknown tool' };
      } catch (e) {
        return { error: `Invalid regex: ${e.message}` };
      }
    }
  },

  // Currency converter
  'currency': {
    name: 'Currency Converter',
    description: 'Convert between currencies using live exchange rates',
    tools: [
      {
        name: 'convert',
        description: 'Convert an amount between currencies',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Amount to convert' },
            from: { type: 'string', description: 'Source currency code (e.g., USD)' },
            to: { type: 'string', description: 'Target currency code (e.g., EUR)' }
          },
          required: ['amount', 'from', 'to']
        }
      },
      {
        name: 'rates',
        description: 'Get current exchange rates for a currency',
        inputSchema: {
          type: 'object',
          properties: {
            base: { type: 'string', description: 'Base currency code. Default: USD' }
          }
        }
      }
    ],
    execute: async (tool, args) => {
      // Using exchangerate-api.com free tier (no key needed for basic use)
      const base = (args.base || args.from || 'USD').toUpperCase();
      
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
        if (!res.ok) {
          return { error: `Failed to fetch rates for ${base}` };
        }
        const data = await res.json();
        
        if (tool === 'rates') {
          return {
            base: data.base,
            date: data.date,
            rates: data.rates
          };
        }
        
        if (tool === 'convert') {
          const to = args.to.toUpperCase();
          const rate = data.rates[to];
          if (!rate) {
            return { error: `Unknown currency: ${to}` };
          }
          const result = args.amount * rate;
          return {
            amount: args.amount,
            from: base,
            to,
            rate,
            result: Math.round(result * 100) / 100
          };
        }
        
        return { error: 'Unknown tool' };
      } catch (e) {
        return { error: e.message };
      }
    }
  },

  // Markdown converter
  'markdown': {
    name: 'Markdown Converter',
    description: 'Convert markdown to HTML and vice versa',
    tools: [
      {
        name: 'to_html',
        description: 'Convert markdown to HTML',
        inputSchema: {
          type: 'object',
          properties: {
            markdown: { type: 'string', description: 'Markdown text to convert' }
          },
          required: ['markdown']
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'to_html') {
        // Simple markdown parser (basic support)
        let html = args.markdown
          // Headers
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          // Bold and italic
          .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          // Code blocks
          .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          // Links and images
          .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
          // Lists
          .replace(/^\s*[-*]\s+(.*$)/gm, '<li>$1</li>')
          // Line breaks
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>');
        
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><h/g, '<h').replace(/<\/h(\d)><\/p>/g, '</h$1>');
        html = html.replace(/<p><li>/g, '<ul><li>').replace(/<\/li><\/p>/g, '</li></ul>');
        
        return { html };
      }
      return { error: 'Unknown tool' };
    }
  },

  // Date/Time utilities
  'datetime': {
    name: 'DateTime Utils',
    description: 'Date and time manipulation utilities',
    tools: [
      {
        name: 'now',
        description: 'Get current date/time in various formats',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: { type: 'string', description: 'Timezone (e.g., America/New_York). Default: UTC' },
            format: { type: 'string', description: 'Output format: iso, unix, human. Default: iso' }
          }
        }
      },
      {
        name: 'parse',
        description: 'Parse a date string',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date string to parse' }
          },
          required: ['date']
        }
      },
      {
        name: 'diff',
        description: 'Calculate difference between two dates',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Start date' },
            to: { type: 'string', description: 'End date (default: now)' }
          },
          required: ['from']
        }
      },
      {
        name: 'add',
        description: 'Add time to a date',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Starting date (default: now)' },
            days: { type: 'number', description: 'Days to add' },
            hours: { type: 'number', description: 'Hours to add' },
            minutes: { type: 'number', description: 'Minutes to add' }
          }
        }
      }
    ],
    execute: async (tool, args) => {
      if (tool === 'now') {
        const now = new Date();
        const tz = args.timezone || 'UTC';
        
        try {
          const formatted = now.toLocaleString('en-US', { timeZone: tz });
          const iso = now.toISOString();
          
          return {
            iso,
            unix: Math.floor(now.getTime() / 1000),
            human: formatted,
            timezone: tz,
            utc_offset: now.getTimezoneOffset()
          };
        } catch (e) {
          return { error: `Invalid timezone: ${tz}` };
        }
      }
      
      if (tool === 'parse') {
        try {
          const date = new Date(args.date);
          if (isNaN(date.getTime())) {
            return { error: 'Could not parse date' };
          }
          return {
            input: args.date,
            iso: date.toISOString(),
            unix: Math.floor(date.getTime() / 1000),
            components: {
              year: date.getUTCFullYear(),
              month: date.getUTCMonth() + 1,
              day: date.getUTCDate(),
              hour: date.getUTCHours(),
              minute: date.getUTCMinutes(),
              second: date.getUTCSeconds(),
              day_of_week: date.getUTCDay()
            }
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'diff') {
        try {
          const from = new Date(args.from);
          const to = args.to ? new Date(args.to) : new Date();
          
          if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            return { error: 'Invalid date' };
          }
          
          const diffMs = to.getTime() - from.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          
          return {
            from: from.toISOString(),
            to: to.toISOString(),
            difference: {
              milliseconds: diffMs,
              seconds: Math.floor(diffMs / 1000),
              minutes: diffMinutes,
              hours: diffHours,
              days: diffDays,
              weeks: Math.floor(diffDays / 7),
              years: (diffDays / 365).toFixed(2)
            }
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      if (tool === 'add') {
        try {
          const date = args.date ? new Date(args.date) : new Date();
          if (isNaN(date.getTime())) {
            return { error: 'Invalid date' };
          }
          
          if (args.days) date.setDate(date.getDate() + args.days);
          if (args.hours) date.setHours(date.getHours() + args.hours);
          if (args.minutes) date.setMinutes(date.getMinutes() + args.minutes);
          
          return {
            original: args.date || 'now',
            added: { days: args.days || 0, hours: args.hours || 0, minutes: args.minutes || 0 },
            result: date.toISOString()
          };
        } catch (e) {
          return { error: e.message };
        }
      }
      
      return { error: 'Unknown tool' };
    }
  }
};

/**
 * Get list of available hosted servers
 */
function listHostedServers() {
  return Object.entries(HOSTED_SERVERS).map(([slug, server]) => ({
    slug,
    name: server.name,
    description: server.description,
    tools: server.tools.map(t => t.name),
    endpoint: `/mcp/${slug}`
  }));
}

/**
 * Get server details including tool schemas
 */
function getHostedServer(slug) {
  const server = HOSTED_SERVERS[slug];
  if (!server) return null;
  return {
    slug,
    name: server.name,
    description: server.description,
    tools: server.tools,
    endpoint: `/mcp/${slug}`
  };
}

/**
 * Execute a tool on a hosted server
 */
async function executeTool(slug, toolName, args) {
  const server = HOSTED_SERVERS[slug];
  if (!server) {
    return { error: `Unknown server: ${slug}` };
  }
  
  const tool = server.tools.find(t => t.name === toolName);
  if (!tool) {
    return { error: `Unknown tool: ${toolName}` };
  }
  
  try {
    const result = await server.execute(toolName, args || {});
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = {
  HOSTED_SERVERS,
  listHostedServers,
  getHostedServer,
  executeTool
};
