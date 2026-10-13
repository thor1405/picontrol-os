import { Request } from 'express';
import { db } from '../db/database';

export function recordAuditLog(req: Request, action: string, details: string): void {
  try {
    const userId = req.user?.id || null;
    const username = req.user?.username || 'anonymous';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, action, details, ipAddress);
  } catch (err) {
    console.error('[Audit Log] Failed to write audit log:', err);
  }
}
