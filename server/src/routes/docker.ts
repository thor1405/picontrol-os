import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { listContainers, executeContainerAction, getContainerLogs } from '../collectors/dockerCollector';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

const actionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart']),
});

router.get('/containers', async (_req: Request, res: Response) => {
  try {
    const containers = await listContainers();
    res.json({ containers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list containers' });
  }
});

router.post('/containers/:id/action', async (req: Request, res: Response) => {
  const containerId = req.params.id;
  const parsed = actionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid action. Must be start, stop, or restart.' });
    return;
  }

  try {
    const result = await executeContainerAction(containerId, parsed.data.action);
    recordAuditLog(
      req,
      'CONTAINER_ACTION',
      `Executed ${parsed.data.action} on container ${containerId}: ${result.message}`
    );
    res.json(result);
  } catch (error: any) {
    recordAuditLog(
      req,
      'CONTAINER_ACTION_FAILED',
      `Failed to ${parsed.data.action} container ${containerId}: ${error.message}`
    );
    res.status(403).json({ error: error.message });
  }
});

router.get('/containers/:id/logs', async (req: Request, res: Response) => {
  const containerId = req.params.id;
  const tail = parseInt(req.query.tail as string, 10) || 100;
  try {
    const logs = await getContainerLogs(containerId, tail);
    res.json({ containerId, logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
});

export default router;
