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
const HOSTED_SERVERS = {
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
