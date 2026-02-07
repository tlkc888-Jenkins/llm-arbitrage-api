/**
 * MCPHub Database - SQLite via sql.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'mcphub.db');

let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  
  // Load existing or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('Database loaded from disk');
  } else {
    db = new SQL.Database();
    console.log('Creating new database');
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      readme TEXT,
      
      github_url TEXT,
      npm_package TEXT,
      install_command TEXT,
      
      category TEXT,
      tags TEXT,
      language TEXT,
      license TEXT,
      
      github_stars INTEGER DEFAULT 0,
      github_forks INTEGER DEFAULT 0,
      weekly_installs INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      
      status TEXT DEFAULT 'approved',
      featured INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      
      publisher_id INTEGER,
      
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      display_order INTEGER DEFAULT 0
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_url TEXT NOT NULL,
      submitter_email TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS server_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      view_count INTEGER DEFAULT 0,
      UNIQUE(server_id, date)
    )
  `);
  
  // Seed default categories
  const categories = [
    { name: 'Data & Files', slug: 'data-files', icon: '📁', order: 1 },
    { name: 'Developer Tools', slug: 'developer-tools', icon: '🛠️', order: 2 },
    { name: 'Communication', slug: 'communication', icon: '💬', order: 3 },
    { name: 'Productivity', slug: 'productivity', icon: '📋', order: 4 },
    { name: 'Web & Browser', slug: 'web-browser', icon: '🌐', order: 5 },
    { name: 'AI & ML', slug: 'ai-ml', icon: '🤖', order: 6 },
    { name: 'Finance', slug: 'finance', icon: '💰', order: 7 },
    { name: 'Infrastructure', slug: 'infrastructure', icon: '☁️', order: 8 },
    { name: 'Other', slug: 'other', icon: '📦', order: 99 },
  ];
  
  for (const cat of categories) {
    try {
      db.run(
        `INSERT OR IGNORE INTO categories (name, slug, icon, display_order) VALUES (?, ?, ?, ?)`,
        [cat.name, cat.slug, cat.icon, cat.order]
      );
    } catch (e) { /* ignore duplicates */ }
  }
  
  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  try {
    db.run(sql, params);
    save();
    const result = db.exec("SELECT last_insert_rowid()");
    return { lastInsertRowid: result[0]?.values[0]?.[0] };
  } catch (e) {
    console.error('SQL Error:', e.message, '\nSQL:', sql);
    throw e;
  }
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

// === Server functions ===

const servers = {
  getAll(options = {}) {
    let sql = `SELECT * FROM servers WHERE status = 'approved'`;
    const params = [];
    
    if (options.category) {
      sql += ` AND category = ?`;
      params.push(options.category);
    }
    
    if (options.search) {
      sql += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    if (options.featured) {
      sql += ` AND featured = 1`;
    }
    
    sql += ` ORDER BY ${options.orderBy || 'github_stars'} DESC`;
    
    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }
    
    return query(sql, params);
  },
  
  getBySlug(slug) {
    return get(`SELECT * FROM servers WHERE slug = ?`, [slug]);
  },
  
  create(data) {
    const sql = `
      INSERT INTO servers (name, slug, description, github_url, npm_package, install_command, category, tags, language, license, github_stars, github_forks, status, verified, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.name || '',
      data.slug || '',
      data.description || '',
      data.github_url || null,
      data.npm_package || null,
      data.install_command || null,
      data.category || 'other',
      JSON.stringify(data.tags || []),
      data.language || null,
      data.license || null,
      data.github_stars || 0,
      data.github_forks || 0,
      data.status || 'approved',
      data.verified || 0,
      data.featured || 0
    ];
    
    try {
      db.run(sql, params);
      save();
      const result = db.exec("SELECT last_insert_rowid()");
      return { lastInsertRowid: result[0]?.values[0]?.[0] };
    } catch (e) {
      throw new Error(`Insert failed: ${e.message || e}`);
    }
  },
  
  incrementViews(id) {
    const today = new Date().toISOString().split('T')[0];
    run(`
      INSERT INTO server_views (server_id, date, view_count) VALUES (?, ?, 1)
      ON CONFLICT(server_id, date) DO UPDATE SET view_count = view_count + 1
    `, [id, today]);
    run(`UPDATE servers SET view_count = view_count + 1 WHERE id = ?`, [id]);
  },
  
  count() {
    return get(`SELECT COUNT(*) as count FROM servers WHERE status = 'approved'`)?.count || 0;
  }
};

// === Category functions ===

const categories_db = {
  getAll() {
    return query(`SELECT * FROM categories ORDER BY display_order`);
  },
  
  getBySlug(slug) {
    return get(`SELECT * FROM categories WHERE slug = ?`, [slug]);
  }
};

// === Submission functions ===

const submissions = {
  create(data) {
    return run(
      `INSERT INTO submissions (github_url, submitter_email, notes) VALUES (?, ?, ?)`,
      [data.github_url, data.submitter_email, data.notes]
    );
  },
  
  getPending() {
    return query(`SELECT * FROM submissions WHERE status = 'pending' ORDER BY created_at DESC`);
  },
  
  approve(id) {
    return run(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
  },
  
  reject(id) {
    return run(`UPDATE submissions SET status = 'rejected' WHERE id = ?`, [id]);
  }
};

// === Stats ===

const stats = {
  overview() {
    return {
      totalServers: servers.count(),
      totalCategories: query(`SELECT COUNT(*) as count FROM categories`)[0]?.count || 0,
      pendingSubmissions: query(`SELECT COUNT(*) as count FROM submissions WHERE status = 'pending'`)[0]?.count || 0,
      totalViews: get(`SELECT SUM(view_count) as total FROM servers`)?.total || 0
    };
  }
};

module.exports = {
  initDb,
  save,
  query,
  run,
  get,
  servers,
  categories: categories_db,
  submissions,
  stats
};
