import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

export interface UrlRecord {
  id: number;
  short_code: string;
  long_url: string;
  title: string | null;
  created_at: string;
  expires_at: string | null;
  click_count: number;
  is_active: number;
}

export interface ClickRecord {
  id: number;
  short_code: string;
  clicked_at: string;
  ip_hash: string | null;
  user_agent: string | null;
  referrer: string | null;
}

let dbInstance: Database | null = null;
const DB_FILE_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'shortener.sqlite');

/**
 * Persists the in-memory SQLite database to disk.
 */
export function saveDatabase(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (error) {
    console.error('Failed to persist SQLite database to disk:', error);
  }
}

/**
 * Initializes SQLite database and runs schema migrations.
 */
export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing database file, creating fresh database:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Run schema initialization
  const schema = `
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT NOT NULL UNIQUE,
      long_url TEXT NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      click_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
    CREATE INDEX IF NOT EXISTS idx_urls_long_url ON urls(long_url);
    CREATE INDEX IF NOT EXISTS idx_urls_click_count ON urls(click_count DESC);

    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT NOT NULL,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_hash TEXT,
      user_agent TEXT,
      referrer TEXT,
      FOREIGN KEY (short_code) REFERENCES urls(short_code) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_clicks_short_code ON clicks(short_code);
    CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at DESC);
  `;

  dbInstance.run(schema);
  saveDatabase();
  console.log(`Database initialized successfully at: ${DB_FILE_PATH}`);

  return dbInstance;
}

/**
 * Helper to query a single row as an object.
 */
function queryOne<T>(sql: string, params: any[] = []): T | null {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  let result: T | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as T;
  }
  stmt.free();
  return result;
}

/**
 * Helper to query multiple rows as objects.
 */
function queryAll<T>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

/**
 * Data Access Methods
 */

export const urlModel = {
  /**
   * Find URL record by short code.
   */
  findByShortCode(shortCode: string): UrlRecord | null {
    return queryOne<UrlRecord>(
      'SELECT id, short_code, long_url, title, created_at, expires_at, click_count, is_active FROM urls WHERE short_code = ? AND is_active = 1 LIMIT 1',
      [shortCode]
    );
  },

  /**
   * Find existing active non-expired URL record by exact long URL.
   */
  findByLongUrl(longUrl: string): UrlRecord | null {
    return queryOne<UrlRecord>(
      `SELECT id, short_code, long_url, title, created_at, expires_at, click_count, is_active 
       FROM urls 
       WHERE long_url = ? 
         AND is_active = 1 
         AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
       ORDER BY id DESC LIMIT 1`,
      [longUrl]
    );
  },

  /**
   * Insert a new short URL.
   */
  create(data: {
    shortCode: string;
    longUrl: string;
    title?: string | null;
    expiresAt?: string | null;
  }): UrlRecord {
    if (!dbInstance) throw new Error('Database not initialized');

    dbInstance.run(
      `INSERT INTO urls (short_code, long_url, title, expires_at, created_at, click_count, is_active)
       VALUES (?, ?, ?, ?, datetime('now'), 0, 1)`,
      [data.shortCode, data.longUrl, data.title || null, data.expiresAt || null]
    );

    saveDatabase();

    const created = this.findByShortCode(data.shortCode);
    if (!created) {
      throw new Error('Failed to retrieve newly created short URL');
    }
    return created;
  },

  /**
   * Increment click count and log click metadata.
   */
  recordClick(
    shortCode: string,
    meta: { ipHash?: string; userAgent?: string; referrer?: string }
  ): void {
    if (!dbInstance) return;

    dbInstance.run(
      'UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?',
      [shortCode]
    );

    dbInstance.run(
      `INSERT INTO clicks (short_code, ip_hash, user_agent, referrer, clicked_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [
        shortCode,
        meta.ipHash || null,
        meta.userAgent || null,
        meta.referrer || null,
      ]
    );

    saveDatabase();
  },

  /**
   * Get stats for a short code including recent clicks.
   */
  getStats(shortCode: string): {
    url: UrlRecord | null;
    recentClicks: ClickRecord[];
    isExpired: boolean;
  } {
    const url = this.findByShortCode(shortCode);
    if (!url) {
      return { url: null, recentClicks: [], isExpired: false };
    }

    const isExpired = !!url.expires_at && new Date(url.expires_at).getTime() < Date.now();

    const recentClicks = queryAll<ClickRecord>(
      'SELECT id, short_code, clicked_at, ip_hash, user_agent, referrer FROM clicks WHERE short_code = ? ORDER BY clicked_at DESC LIMIT 50',
      [shortCode]
    );

    return {
      url,
      recentClicks,
      isExpired,
    };
  },

  /**
   * Get top N most-clicked links.
   */
  getTopLinks(limit: number = 5): UrlRecord[] {
    return queryAll<UrlRecord>(
      `SELECT id, short_code, long_url, title, created_at, expires_at, click_count, is_active 
       FROM urls 
       WHERE is_active = 1 
       ORDER BY click_count DESC, id DESC 
       LIMIT ?`,
      [limit]
    );
  },

  /**
   * Get recent links with optional search / filter.
   */
  getAllLinks(limit: number = 20): UrlRecord[] {
    return queryAll<UrlRecord>(
      `SELECT id, short_code, long_url, title, created_at, expires_at, click_count, is_active 
       FROM urls 
       ORDER BY id DESC 
       LIMIT ?`,
      [limit]
    );
  },

  /**
   * Delete or soft-delete a URL.
   */
  deleteByShortCode(shortCode: string): boolean {
    if (!dbInstance) return false;
    const existing = queryOne<{ id: number }>('SELECT id FROM urls WHERE short_code = ?', [shortCode]);
    if (!existing) return false;
    dbInstance.run('DELETE FROM urls WHERE short_code = ?', [shortCode]);
    dbInstance.run('DELETE FROM clicks WHERE short_code = ?', [shortCode]);
    saveDatabase();
    return true;
  },

  /**
   * Get overall system metrics.
   */
  getGlobalMetrics(): {
    totalUrls: number;
    totalClicks: number;
    activeUrls: number;
  } {
    const totalUrlsRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM urls') || { count: 0 };
    const totalClicksRow = queryOne<{ total: number }>('SELECT SUM(click_count) as total FROM urls') || { total: 0 };
    const activeUrlsRow = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM urls WHERE is_active = 1 AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))`
    ) || { count: 0 };

    return {
      totalUrls: Number(totalUrlsRow.count || 0),
      totalClicks: Number(totalClicksRow.total || 0),
      activeUrls: Number(activeUrlsRow.count || 0),
    };
  }
};
