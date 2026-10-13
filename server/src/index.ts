import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initDatabase } from './db/database';
import { authMiddleware } from './middleware/auth';
import { helmetMiddleware, corsMiddleware, apiRateLimiter } from './middleware/security';
import { startWebsiteMonitorScheduler } from './services/uptimeService';

import authRoutes from './routes/auth';
import metricsRoutes from './routes/metrics';
import dockerRoutes from './routes/docker';
import servicesRoutes from './routes/services';
import websitesRoutes from './routes/websites';
import logsRoutes from './routes/logs';
import alertsRoutes from './routes/alerts';
import settingsRoutes from './routes/settings';

// Initialize Database & Background Schedulers
initDatabase();
startWebsiteMonitorScheduler();

const app = express();

// Security and Parsers
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Raspberry Pi 5',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes (unprotected endpoints are allowed internally)
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/docker', authMiddleware, dockerRoutes);
app.use('/api/services', authMiddleware, servicesRoutes);
app.use('/api/websites', authMiddleware, websitesRoutes);
app.use('/api/logs', authMiddleware, logsRoutes);
app.use('/api/alerts', authMiddleware, alertsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

// Static client hosting for production deployment
const candidatePaths = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, 'public'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];

const staticPath = candidatePaths.find((p) => fs.existsSync(p));

if (staticPath) {
  console.log(`[Static] Serving frontend from: ${staticPath}`);
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  console.warn('[Static] Warning: No frontend build directory found in:', candidatePaths);
  app.get('*', (_req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>PiControl OS — API Ready</title>
        <style>
          body { background: #080B12; color: #F8FAFC; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #121826; border: 1px solid #263244; padding: 32px; border-radius: 16px; max-width: 480px; text-align: center; }
          h2 { color: #3B82F6; margin-top: 0; }
          p { color: #94A3B8; font-size: 14px; line-height: 1.5; }
          code { background: #192233; color: #06B6D4; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>PiControl OS Backend is Online</h2>
          <p>The API server is running on port 8090, but the frontend static assets are currently building or not yet placed in <code>public/</code>.</p>
          <p>API Health: <a href="/api/health" style="color: #10B981;">/api/health</a></p>
        </div>
      </body>
      </html>
    `);
  });
}

const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  PiControl OS Server running on port ${config.PORT}`);
  console.log(`  Access dashboard: http://localhost:${config.PORT}`);
  console.log(`  Live telemetry SSE: http://localhost:${config.PORT}/api/metrics/live`);
  console.log(`=======================================================`);
});

export default app;
