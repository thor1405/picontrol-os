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
const staticPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
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
