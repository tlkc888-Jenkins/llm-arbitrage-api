/**
 * Universal API Proxy
 * Wraps any OpenAPI-defined API as an MCP tool
 * 
 * This is how we get to 22,000 tools - auto-proxy everything.
 */

const fetch = require('node-fetch');

class ApiProxy {
  constructor(toolRegistry) {
    this.registry = toolRegistry; // Map of slug -> tool definition
  }

  /**
   * Load tools from imported JSON
   */
  loadFromFile(filepath) {
    const tools = require(filepath);
    for (const tool of tools) {
      this.registry.set(tool.slug, tool);
    }
    console.log(`Loaded ${tools.length} proxied tools`);
  }

  /**
   * Handle MCP tool call by proxying to actual API
   */
  async call(slug, toolName, args) {
    const tool = this.registry.get(slug);
    if (!tool) {
      throw new Error(`Unknown tool: ${slug}`);
    }

    const endpoint = tool.endpoint;
    if (!endpoint?.baseUrl) {
      throw new Error(`Tool ${slug} has no configured endpoint`);
    }

    // Build URL with path parameters
    let url = endpoint.baseUrl + endpoint.path;
    const queryParams = new URLSearchParams();
    const headers = { 'Content-Type': 'application/json' };

    // Process parameters
    for (const param of endpoint.parameters || []) {
      const value = args[param.name];
      if (value === undefined) {
        if (param.required) {
          throw new Error(`Missing required parameter: ${param.name}`);
        }
        continue;
      }

      switch (param.in) {
        case 'path':
          url = url.replace(`{${param.name}}`, encodeURIComponent(value));
          break;
        case 'query':
          queryParams.set(param.name, value);
          break;
        case 'header':
          headers[param.name] = value;
          break;
      }
    }

    // Add query string
    const qs = queryParams.toString();
    if (qs) url += '?' + qs;

    // Make request
    const fetchOptions = {
      method: endpoint.method || 'GET',
      headers,
      timeout: 30000
    };

    if (endpoint.method === 'POST' && args.body) {
      fetchOptions.body = JSON.stringify(args.body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        return {
          error: true,
          status: response.status,
          message: `API returned ${response.status}`
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return { content: await response.json() };
      } else {
        return { content: await response.text() };
      }
    } catch (error) {
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Get tool schema for MCP
   */
  getToolSchema(slug) {
    const tool = this.registry.get(slug);
    if (!tool) return null;

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        properties: (tool.endpoint?.parameters || []).reduce((acc, param) => {
          acc[param.name] = {
            type: param.schema?.type || 'string',
            description: param.description || param.name
          };
          return acc;
        }, {}),
        required: (tool.endpoint?.parameters || [])
          .filter(p => p.required)
          .map(p => p.name)
      }
    };
  }

  /**
   * List all available tools
   */
  listTools(category = null, limit = 100, offset = 0) {
    let tools = Array.from(this.registry.values());
    
    if (category) {
      tools = tools.filter(t => t.category === category);
    }
    
    return {
      total: tools.length,
      tools: tools.slice(offset, offset + limit).map(t => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        category: t.category,
        provider: t.provider
      }))
    };
  }

  /**
   * Search tools by query
   */
  searchTools(query, limit = 20) {
    const q = query.toLowerCase();
    const tools = Array.from(this.registry.values());
    
    return tools
      .filter(t => 
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.provider?.toLowerCase().includes(q)
      )
      .slice(0, limit)
      .map(t => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        category: t.category
      }));
  }
}

module.exports = { ApiProxy };
