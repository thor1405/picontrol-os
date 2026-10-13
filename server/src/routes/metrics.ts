import { Router, Request, Response } from 'express';
import { collectSystemTelemetry, SystemTelemetry } from '../collectors/systemCollector';
import { queryPrometheusRange } from '../collectors/prometheusClient';
import { evaluateTelemetryAlerts } from '../services/alertService';
import { config } from '../config';

const router = Router();

// Current snapshot
router.get('/current', (_req: Request, res: Response) => {
  const telemetry = collectSystemTelemetry();
  res.json(telemetry);
});

// Server-Sent Events (SSE) live telemetry stream
router.get('/live', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering
  res.flushHeaders();

  // Send initial telemetry immediately
  const initial = collectSystemTelemetry();
  res.write(`data: ${JSON.stringify(initial)}\n\n`);

  // Interval timer for real-time telemetry updates
  const timer = setInterval(async () => {
    try {
      const telemetry = collectSystemTelemetry();
      res.write(`data: ${JSON.stringify(telemetry)}\n\n`);

      // Evaluate alerts asynchronously
      evaluateTelemetryAlerts(telemetry).catch(() => {});
    } catch (e) {
      // Stream error handling
    }
  }, config.METRICS_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(timer);
  });
});

// Historical query endpoint
router.get('/historical', async (req: Request, res: Response) => {
  const query = (req.query.query as string) || 'node_cpu_utilization';
  const range = (req.query.range as string) || '1h'; // 15m, 1h, 6h, 24h, 7d, 30d

  const nowSec = Math.floor(Date.now() / 1000);
  let durationSec = 3600;
  let stepSec = 15;

  switch (range) {
    case '15m':
      durationSec = 15 * 60;
      stepSec = 5;
      break;
    case '1h':
      durationSec = 3600;
      stepSec = 15;
      break;
    case '6h':
      durationSec = 6 * 3600;
      stepSec = 60;
      break;
    case '24h':
      durationSec = 24 * 3600;
      stepSec = 120;
      break;
    case '7d':
      durationSec = 7 * 86400;
      stepSec = 600;
      break;
    case '30d':
      durationSec = 30 * 86400;
      stepSec = 1800;
      break;
    default:
      durationSec = 3600;
      stepSec = 15;
  }

  const startSec = nowSec - durationSec;
  const series = await queryPrometheusRange(query, startSec, nowSec, stepSec);

  res.json({
    query,
    range,
    stepSec,
    start: startSec,
    end: nowSec,
    series,
  });
});

export default router;
