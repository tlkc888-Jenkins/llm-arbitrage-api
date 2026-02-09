/**
 * Hosted MCP Servers — Runtime provision without installation
 * 
 * These are lightweight MCP servers hosted directly on AutropicAI.
 * Agents can use them immediately via SSE without any local setup.
 */

// Simple in-memory storage for the memory server
const memoryStore = new Map();

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
      
      if (tool === 'store') {
        memoryStore.set(fullKey, args.value);
        return { success: true, key: args.key, namespace: ns };
      }
      if (tool === 'retrieve') {
        const value = memoryStore.get(fullKey);
        if (value === undefined) {
          return { found: false, key: args.key, namespace: ns };
        }
        return { found: true, key: args.key, value, namespace: ns };
      }
      if (tool === 'list_keys') {
        const prefix = `${ns}:`;
        const keys = Array.from(memoryStore.keys())
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length));
        return { namespace: ns, keys, count: keys.length };
      }
      if (tool === 'delete') {
        const existed = memoryStore.delete(fullKey);
        return { success: true, deleted: existed, key: args.key, namespace: ns };
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
