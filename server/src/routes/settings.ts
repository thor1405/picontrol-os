import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  res.json({ settings });
});

router.put('/', (req: Request, res: Response) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Settings update body must be a key-value object' });
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  for (const [key, value] of Object.entries(updates)) {
    upsert.run(key, String(value));
  }

  recordAuditLog(req, 'UPDATE_SETTINGS', `Updated settings keys: ${Object.keys(updates).join(', ')}`);
  res.json({ success: true, message: 'Settings saved successfully' });
});

router.get('/audit-logs', (_req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
  res.json({ auditLogs: logs });
});

export default router;
