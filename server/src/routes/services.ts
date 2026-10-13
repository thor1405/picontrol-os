import { Router, Request, Response } from 'express';
import { checkAllServices } from '../collectors/serviceCollector';

const router = Router();

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const services = await checkAllServices();
    res.json({ services });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check services' });
  }
});

export default router;
