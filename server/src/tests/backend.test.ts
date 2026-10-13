import assert from 'node:assert';
import test from 'node:test';
import { isPrivateOrLoopbackIp } from '../services/uptimeService';
import { collectSystemTelemetry } from '../collectors/systemCollector';
import { db, initDatabase } from '../db/database';
import bcrypt from 'bcryptjs';

test('Database initializes required tables and seeds admin user', () => {
  initDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
  assert.ok(user, 'Admin user should be seeded');
  assert.strictEqual(user.username, 'admin');
  assert.ok(bcrypt.compareSync('picontrol2026', user.password_hash), 'Default admin password should match');

  const settings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  assert.ok(settings.count >= 5, 'Default settings should be seeded');

  const rules = db.prepare('SELECT COUNT(*) as count FROM alert_rules').get() as { count: number };
  assert.ok(rules.count >= 4, 'Default alert rules should be seeded');
});

test('SSRF Guard blocks private, loopback, and local IP addresses', () => {
  assert.strictEqual(isPrivateOrLoopbackIp('127.0.0.1'), true, 'Should block 127.0.0.1');
  assert.strictEqual(isPrivateOrLoopbackIp('localhost'), true, 'Should block localhost');
  assert.strictEqual(isPrivateOrLoopbackIp('::1'), true, 'Should block ::1');
  assert.strictEqual(isPrivateOrLoopbackIp('192.168.1.1'), true, 'Should block 192.168.x.x');
  assert.strictEqual(isPrivateOrLoopbackIp('10.0.0.5'), true, 'Should block 10.x.x.x');
  assert.strictEqual(isPrivateOrLoopbackIp('172.16.0.1'), true, 'Should block 172.16.x.x');
  assert.strictEqual(isPrivateOrLoopbackIp('169.254.169.254'), true, 'Should block cloud metadata link-local');

  // Allowed public IPs and hostnames
  assert.strictEqual(isPrivateOrLoopbackIp('1.1.1.1'), false, 'Should allow 1.1.1.1');
  assert.strictEqual(isPrivateOrLoopbackIp('8.8.8.8'), false, 'Should allow 8.8.8.8');
  assert.strictEqual(isPrivateOrLoopbackIp('github.com'), false, 'Should allow public domain');
});

test('System Telemetry returns structured Raspberry Pi metrics with valid memory accounting', () => {
  const telemetry = collectSystemTelemetry();
  assert.ok(telemetry.system.hostname, 'Hostname must be defined');
  assert.ok(telemetry.system.model, 'Model must be defined');
  assert.ok(['healthy', 'warning', 'critical'].includes(telemetry.system.overallHealth), 'Overall health must be valid state');

  // CPU
  assert.ok(telemetry.cpu.totalUsagePercent >= 0 && telemetry.cpu.totalUsagePercent <= 100, 'CPU usage must be between 0 and 100');
  assert.ok(telemetry.cpu.cores.length >= 1, 'At least 1 CPU core must be reported');
  assert.ok(telemetry.cpu.temperatureCelsius > 0, 'CPU temperature must be positive');

  // Memory accounting
  assert.ok(telemetry.memory.totalBytes > 0, 'Total RAM must be greater than 0');
  assert.ok(telemetry.memory.availableBytes > 0, 'Available RAM must be greater than 0');
  assert.ok(telemetry.memory.usedBytes <= telemetry.memory.totalBytes, 'Used RAM cannot exceed total RAM');
  assert.ok(telemetry.memory.usagePercent >= 0 && telemetry.memory.usagePercent <= 100, 'RAM usage percent must be between 0 and 100');

  // Storage
  assert.ok(telemetry.storage.mounts.length >= 1, 'At least root filesystem mount must be present');
});

test('Service Collector returns comprehensive dynamic service states', async () => {
  const { checkAllServices } = await import('../collectors/serviceCollector');
  const services = await checkAllServices();
  assert.ok(Array.isArray(services), 'Services must be an array');
  assert.ok(services.length >= 6, 'Must monitor at least 6 core server services');

  for (const s of services) {
    assert.ok(s.id, 'Service ID must be defined');
    assert.ok(s.name, 'Service name must be defined');
    assert.ok(['active', 'inactive', 'failed', 'not_installed'].includes(s.status), `Valid status required for ${s.id}`);
    assert.ok(s.uptimeHours >= 0, `Uptime hours must be >= 0 for ${s.id}`);
  }
});

test('Prometheus Client translates PromQL and returns structured time-series', async () => {
  const { queryPrometheusRange } = await import('../collectors/prometheusClient');
  const now = Math.floor(Date.now() / 1000);
  const series = await queryPrometheusRange('node_cpu_utilization', now - 3600, now, 60);
  assert.ok(Array.isArray(series), 'Series must be an array');
  assert.ok(series.length > 0, 'Must return at least one time series');
  assert.ok(series[0].points.length > 0, 'Must have data points');
  assert.ok(typeof series[0].points[0].value === 'number', 'Point value must be numeric');
});

