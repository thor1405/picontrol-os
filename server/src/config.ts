import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8090),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('picontrol-secret-change-in-production-key-rpi5'),
  PROMETHEUS_URL: z.string().default('http://localhost:9090'),
  DOCKER_SOCKET: z.string().default(
    process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'
  ),
  DATA_DIR: z.string().default(path.resolve(process.cwd(), 'data')),
  DEFAULT_ADMIN_USER: z.string().default('admin'),
  DEFAULT_ADMIN_PASSWORD: z.string().default('picontrol2026'),
  ALLOW_PRIVATE_IP_CHECKS: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  ENABLE_DOCKER_CONTROLS: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  METRICS_INTERVAL_MS: z.coerce.number().default(1500),
});

export const config = envSchema.parse(process.env);
