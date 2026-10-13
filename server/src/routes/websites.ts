import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { checkWebsiteUptime, isPrivateOrLoopbackIp, WebsiteRow } from '../services/uptimeService';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

const websiteSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  check_type: z.enum(['HTTP', 'HTTPS', 'TCP']).default('HTTP'),
  interval_sec: z.coerce.number().min(10).max(86400).default(60),
  timeout_ms: z.coerce.number().min(500).max(30000).default(5000),
  allow_private_ip: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

router.get('/', (_req: Request, res: Response) => {
  const websites = db.prepare('SELECT * FROM websites ORDER BY id ASC').all();
  res.json({ websites });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = websiteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const { name, url, check_type, interval_sec, timeout_ms, allow_private_ip, is_active } = parsed.data;

  // SSRF guard check
  const host = new URL(url).hostname;
  if (!allow_private_ip && isPrivateOrLoopbackIp(host)) {
    res.status(403).json({
      error: 'SSRF Protection: Requests to loopback or private RFC1918 IPs are prohibited unless explicitly enabled.',
    });
    return;
  }

  const result = db.prepare(`
    INSERT INTO websites (name, url, check_type, interval_sec, timeout_ms, allow_private_ip, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, url, check_type, interval_sec, timeout_ms, allow_private_ip ? 1 : 0, is_active ? 1 : 0);

  const newId = Number(result.lastInsertRowid);
  const createdSite = db.prepare('SELECT * FROM websites WHERE id = ?').get(newId) as WebsiteRow;

  // Trigger initial immediate check
  checkWebsiteUptime(createdSite).then((probe) => {
    db.prepare(`
      UPDATE websites
      SET last_status = ?, last_latency_ms = ?, last_checked_at = datetime('now'), ssl_expiry_days = ?, ssl_issuer = ?
      WHERE id = ?
    `).run(probe.statusCode || 0, probe.latencyMs, probe.sslExpiryDays || null, probe.sslIssuer || null, newId);
  }).catch(() => {});

  recordAuditLog(req, 'CREATE_WEBSITE_MONITOR', `Added monitor for ${name} (${url})`);
  res.status(201).json({ website: createdSite });
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const parsed = websiteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const current = db.prepare('SELECT * FROM websites WHERE id = ?').get(id) as WebsiteRow | undefined;
  if (!current) {
    res.status(404).json({ error: 'Website monitor not found' });
    return;
  }

  const name = parsed.data.name ?? current.name;
  const url = parsed.data.url ?? current.url;
  const check_type = parsed.data.check_type ?? current.check_type;
  const interval_sec = parsed.data.interval_sec ?? current.interval_sec;
  const timeout_ms = parsed.data.timeout_ms ?? current.timeout_ms;
  const allow_private_ip = parsed.data.allow_private_ip !== undefined ? (parsed.data.allow_private_ip ? 1 : 0) : current.allow_private_ip;
  const is_active = parsed.data.is_active !== undefined ? (parsed.data.is_active ? 1 : 0) : current.is_active;

  db.prepare(`
    UPDATE websites
    SET name = ?, url = ?, check_type = ?, interval_sec = ?, timeout_ms = ?, allow_private_ip = ?, is_active = ?
    WHERE id = ?
  `).run(name, url, check_type, interval_sec, timeout_ms, allow_private_ip, is_active, id);

  recordAuditLog(req, 'UPDATE_WEBSITE_MONITOR', `Updated monitor for ${name}`);
  res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const site = db.prepare('SELECT name FROM websites WHERE id = ?').get(id) as { name: string } | undefined;

  db.prepare('DELETE FROM websites WHERE id = ?').run(id);
  db.prepare('DELETE FROM uptime_history WHERE website_id = ?').run(id);

  recordAuditLog(req, 'DELETE_WEBSITE_MONITOR', `Deleted monitor ID ${id} (${site?.name})`);
  res.json({ success: true });
});

router.get('/:id/history', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const history = db.prepare(`
    SELECT * FROM uptime_history
    WHERE website_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(id);

  res.json({ history });
});

router.post('/:id/check-now', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const site = db.prepare('SELECT * FROM websites WHERE id = ?').get(id) as WebsiteRow | undefined;
  if (!site) {
    res.status(404).json({ error: 'Website monitor not found' });
    return;
  }

  const result = await checkWebsiteUptime(site);
  db.prepare(`
    UPDATE websites
    SET last_status = ?, last_latency_ms = ?, last_checked_at = datetime('now'), ssl_expiry_days = ?, ssl_issuer = ?
    WHERE id = ?
  `).run(result.statusCode || 0, result.latencyMs, result.sslExpiryDays || null, result.sslIssuer || null, id);

  res.json({ result });
});

export default router;
