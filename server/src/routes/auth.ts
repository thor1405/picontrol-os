import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/database';
import { config } from '../config';
import { authRateLimiter } from '../middleware/security';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.get('/setup-status', (_req: Request, res: Response) => {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  res.json({
    needsSetup: userCount === 0,
    version: '1.0.0',
    platform: 'Raspberry Pi 5',
  });
});

router.post('/login', authRateLimiter, (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const { username, password } = result.data;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const payload = { id: user.id, username: user.username, role: user.role };
  const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });

  res.cookie('picontrol_session', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  recordAuditLog(req, 'LOGIN', `User ${username} logged in successfully`);

  res.json({
    token,
    user: payload,
  });
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('picontrol_session');
  recordAuditLog(req, 'LOGOUT', `User ${req.user?.username || 'user'} logged out`);
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

router.post('/change-password', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user || !bcrypt.compareSync(parsed.data.currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(parsed.data.newPassword, salt);

  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newHash, req.user.id);

  recordAuditLog(req, 'PASSWORD_CHANGE', `User ${req.user.username} changed password`);
  res.json({ success: true, message: 'Password changed successfully' });
});

export default router;
