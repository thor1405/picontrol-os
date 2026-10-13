import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config';

// Ensure data directory exists
if (!fs.existsSync(config.DATA_DIR)) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}

const dbPath = path.join(config.DATA_DIR, 'picontrol.db');
export const db = new DatabaseSync(dbPath);

export function initDatabase(): void {
  // WAL mode for high concurrency
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      check_type TEXT NOT NULL DEFAULT 'HTTP',
      interval_sec INTEGER NOT NULL DEFAULT 60,
      timeout_ms INTEGER NOT NULL DEFAULT 5000,
      allow_private_ip INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_status INTEGER,
      last_latency_ms REAL,
      last_checked_at TEXT,
      ssl_expiry_days INTEGER,
      ssl_issuer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uptime_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER NOT NULL,
      status_code INTEGER,
      latency_ms REAL,
      is_up INTEGER NOT NULL,
      error_message TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      condition TEXT NOT NULL,
      threshold REAL NOT NULL,
      duration_sec INTEGER NOT NULL DEFAULT 60,
      severity TEXT NOT NULL DEFAULT 'warning',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER,
      rule_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      value REAL NOT NULL,
      state TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default admin if table is empty
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCheck.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(config.DEFAULT_ADMIN_PASSWORD, salt);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(config.DEFAULT_ADMIN_USER, hash, 'admin');
    console.log(`[Database] Initialized default admin user: ${config.DEFAULT_ADMIN_USER}`);
  }

  // Seed default settings if empty
  const defaultSettings: Record<string, string> = {
    'cpu_temp_threshold': '80',
    'cpu_usage_threshold': '90',
    'ram_usage_threshold': '90',
    'disk_usage_threshold': '85',
    'enable_docker_controls': config.ENABLE_DOCKER_CONTROLS ? 'true' : 'false',
    'allow_private_ip_checks': config.ALLOW_PRIVATE_IP_CHECKS ? 'true' : 'false',
    'telegram_bot_token': '',
    'telegram_chat_id': '',
    'telegram_enabled': 'false',
    'smtp_host': '',
    'smtp_port': '587',
    'smtp_user': '',
    'smtp_pass': '',
    'smtp_to': '',
    'smtp_enabled': 'false',
    'metrics_retention_days': '15',
  };

  const getSetting = db.prepare('SELECT key FROM settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaultSettings)) {
    if (!getSetting.get(k)) {
      insertSetting.run(k, v);
    }
  }

  // Seed default alert rules if empty
  const ruleCheck = db.prepare('SELECT COUNT(*) as count FROM alert_rules').get() as { count: number };
  if (ruleCheck.count === 0) {
    const insertRule = db.prepare(`
      INSERT INTO alert_rules (name, metric_type, condition, threshold, duration_sec, severity, enabled)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertRule.run('High CPU Temperature', 'cpu_temp', '>', 80, 60, 'critical');
    insertRule.run('High CPU Utilization', 'cpu_usage', '>', 90, 120, 'warning');
    insertRule.run('High Memory Utilization', 'ram_usage', '>', 90, 120, 'warning');
    insertRule.run('Low Disk Storage Space', 'disk_usage', '>', 85, 300, 'warning');
    insertRule.run('Website Down', 'website_down', '==', 0, 30, 'critical');
    insertRule.run('Docker Container Stopped', 'docker_stopped', '==', 1, 30, 'warning');
  }

  // Seed default monitored websites if empty (e.g., Cloudflare DNS & local sample)
  const siteCheck = db.prepare('SELECT COUNT(*) as count FROM websites').get() as { count: number };
  if (siteCheck.count === 0) {
    const insertSite = db.prepare(`
      INSERT INTO websites (name, url, check_type, interval_sec, timeout_ms, allow_private_ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertSite.run('Cloudflare DNS Portal', 'https://1.1.1.1', 'HTTP', 60, 5000, 0);
    insertSite.run('Raspberry Pi Foundation', 'https://www.raspberrypi.com', 'HTTP', 60, 5000, 0);
  }
}
