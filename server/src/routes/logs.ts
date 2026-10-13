import { Router, Request, Response } from 'express';
import { fetchSystemLogs } from '../services/logService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const source = req.query.source as string | undefined;
  const service = req.query.service as string | undefined;
  const level = req.query.level as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 150;

  try {
    const logs = await fetchSystemLogs({ source, service, level, search, limit });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch logs' });
  }
});

export default router;
