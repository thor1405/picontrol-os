import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { sendTelegramMessage, sendSmtpAlert } from '../services/alertService';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

const ruleSchema = z.object({
  name: z.string().min(1),
  metric_type: z.string().min(1),
  condition: z.enum(['>', '<', '==', '!=']),
  threshold: z.coerce.number(),
  duration_sec: z.coerce.number().min(5).max(3600),
  severity: z.enum(['critical', 'warning', 'info']),
  enabled: z.boolean().default(true),
});

// Rules CRUD
router.get('/rules', (_req: Request, res: Response) => {
  const rules = db.prepare('SELECT * FROM alert_rules ORDER BY id ASC').all();
  res.json({ rules });
});

router.post('/rules', (req: Request, res: Response) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid rule definition', details: parsed.error.issues });
    return;
  }

  const { name, metric_type, condition, threshold, duration_sec, severity, enabled } = parsed.data;
  const result = db.prepare(`
    INSERT INTO alert_rules (name, metric_type, condition, threshold, duration_sec, severity, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, metric_type, condition, threshold, duration_sec, severity, enabled ? 1 : 0);

  recordAuditLog(req, 'CREATE_ALERT_RULE', `Created alert rule: ${name}`);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

router.put('/rules/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const parsed = ruleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid update payload' });
    return;
  }

  const current = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as any;
  if (!current) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  db.prepare(`
    UPDATE alert_rules
    SET name = ?, metric_type = ?, condition = ?, threshold = ?, duration_sec = ?, severity = ?, enabled = ?
    WHERE id = ?
  `).run(
    parsed.data.name ?? current.name,
    parsed.data.metric_type ?? current.metric_type,
    parsed.data.condition ?? current.condition,
    parsed.data.threshold ?? current.threshold,
    parsed.data.duration_sec ?? current.duration_sec,
    parsed.data.severity ?? current.severity,
    parsed.data.enabled !== undefined ? (parsed.data.enabled ? 1 : 0) : current.enabled,
    id
  );

  recordAuditLog(req, 'UPDATE_ALERT_RULE', `Updated alert rule ID ${id}`);
  res.json({ success: true });
});

router.delete('/rules/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
  recordAuditLog(req, 'DELETE_ALERT_RULE', `Deleted alert rule ID ${id}`);
  res.json({ success: true });
});

// Alert History
router.get('/history', (_req: Request, res: Response) => {
  const history = db.prepare('SELECT * FROM alert_history ORDER BY id DESC LIMIT 150').all();
  res.json({ history });
});

router.post('/:id/acknowledge', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE alert_history SET acknowledged = 1 WHERE id = ?').run(id);
  recordAuditLog(req, 'ACKNOWLEDGE_ALERT', `Acknowledged alert history ID ${id}`);
  res.json({ success: true });
});

// Test Notification Integrations
router.post('/test-telegram', async (_req: Request, res: Response) => {
  try {
    const result = await sendTelegramMessage('🔔 <b>[PiControl OS]</b> Test notification dispatched from Raspberry Pi 5!');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/test-smtp', async (_req: Request, res: Response) => {
  try {
    const result = await sendSmtpAlert('PiControl OS Test Alert', 'This is a test notification email from PiControl OS on Raspberry Pi 5.');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
