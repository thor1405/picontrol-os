import http from 'http';
import https from 'https';
import tls from 'tls';
import net from 'net';
import { db } from '../db/database';

export interface WebsiteRow {
  id: number;
  name: string;
  url: string;
  check_type: 'HTTP' | 'HTTPS' | 'TCP';
  interval_sec: number;
  timeout_ms: number;
  allow_private_ip: number;
  is_active: number;
  last_status: number | null;
  last_latency_ms: number | null;
  last_checked_at: string | null;
  ssl_expiry_days: number | null;
  ssl_issuer: string | null;
  created_at: string;
}

export interface UptimeCheckResult {
  isUp: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage?: string;
  sslExpiryDays?: number;
  sslIssuer?: string;
}

// Strict SSRF Validator
export function isPrivateOrLoopbackIp(host: string): boolean {
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) {
    return true;
  }
  // Check IPv4 private RFC1918 ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const oct1 = parseInt(ipv4Match[1], 10);
    const oct2 = parseInt(ipv4Match[2], 10);
    if (oct1 === 10) return true; // 10.0.0.0/8
    if (oct1 === 127) return true; // 127.0.0.0/8
    if (oct1 === 169 && oct2 === 254) return true; // 169.254.0.0/16 Link-local
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true; // 172.16.0.0/12
    if (oct1 === 192 && oct2 === 168) return true; // 192.168.0.0/16
  }
  return false;
}

export async function checkWebsiteUptime(site: WebsiteRow): Promise<UptimeCheckResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(site.url);
  } catch {
    return { isUp: false, statusCode: null, latencyMs: 0, errorMessage: 'Invalid URL format' };
  }

  // SSRF check
  if (!site.allow_private_ip && isPrivateOrLoopbackIp(parsedUrl.hostname)) {
    return {
      isUp: false,
      statusCode: null,
      latencyMs: 0,
      errorMessage: 'SSRF Protection: Requests to private/loopback addresses are blocked without authorization',
    };
  }

  const startTime = Date.now();

  if (site.check_type === 'TCP') {
    const port = parseInt(parsedUrl.port, 10) || (parsedUrl.protocol === 'https:' ? 443 : 80);
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(site.timeout_ms);

      socket.connect(port, parsedUrl.hostname, () => {
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        resolve({ isUp: true, statusCode: 200, latencyMs });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ isUp: false, statusCode: null, latencyMs: Date.now() - startTime, errorMessage: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ isUp: false, statusCode: null, latencyMs: site.timeout_ms, errorMessage: 'Connection timed out' });
      });
    });
  }

  // HTTP or HTTPS check
  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    let sslExpiryDays: number | undefined;
    let sslIssuer: string | undefined;

    const req = client.get(
      site.url,
      {
        timeout: site.timeout_ms,
        rejectUnauthorized: false, // Allow self-signed certs with detection
        headers: {
          'User-Agent': 'PiControl-OS-Monitor/1.0',
        },
      },
      (res) => {
        const latencyMs = Date.now() - startTime;

        if (isHttps && (res.socket as tls.TLSSocket)?.getPeerCertificate) {
          try {
            const cert = (res.socket as tls.TLSSocket).getPeerCertificate();
            if (cert && cert.valid_to) {
              const expiryDate = new Date(cert.valid_to);
              const rawIssuer = cert.issuer?.O || cert.issuer?.CN || 'Unknown CA';
              sslIssuer = Array.isArray(rawIssuer) ? rawIssuer[0] : rawIssuer;
            }
          } catch {}
        }

        const isUp = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          isUp,
          statusCode: res.statusCode || null,
          latencyMs,
          sslExpiryDays,
          sslIssuer,
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        isUp: false,
        statusCode: null,
        latencyMs: Date.now() - startTime,
        errorMessage: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        isUp: false,
        statusCode: null,
        latencyMs: site.timeout_ms,
        errorMessage: 'HTTP request timed out',
      });
    });
  });
}

// Background poller running checks on active websites
let isRunning = false;

export function startWebsiteMonitorScheduler(): void {
  if (isRunning) return;
  isRunning = true;

  const runCycle = async () => {
    try {
      const sites = db.prepare('SELECT * FROM websites WHERE is_active = 1').all() as WebsiteRow[];
      const now = Date.now();

      for (const site of sites) {
        const lastChecked = site.last_checked_at ? new Date(site.last_checked_at).getTime() : 0;
        if (now - lastChecked >= site.interval_sec * 1000) {
          const result = await checkWebsiteUptime(site);
          const timestamp = new Date().toISOString();

          // Update website status
          db.prepare(`
            UPDATE websites
            SET last_status = ?, last_latency_ms = ?, last_checked_at = ?, ssl_expiry_days = ?, ssl_issuer = ?
            WHERE id = ?
          `).run(
            result.statusCode || 0,
            result.latencyMs,
            timestamp,
            result.sslExpiryDays !== undefined ? result.sslExpiryDays : site.ssl_expiry_days,
            result.sslIssuer || site.ssl_issuer,
            site.id
          );

          // Insert into history
          db.prepare(`
            INSERT INTO uptime_history (website_id, status_code, latency_ms, is_up, error_message, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            site.id,
            result.statusCode || 0,
            result.latencyMs,
            result.isUp ? 1 : 0,
            result.errorMessage || null,
            timestamp
          );

          // Prune older history beyond 500 entries per site
          db.prepare(`
            DELETE FROM uptime_history
            WHERE id IN (
              SELECT id FROM uptime_history WHERE website_id = ? ORDER BY id DESC LIMIT -1 OFFSET 500
            )
          `).run(site.id);
        }
      }
    } catch (e) {
      console.error('[Uptime Monitor] Poller cycle error:', e);
    }
  };

  // Run initial check and then poll every 10 seconds
  setTimeout(runCycle, 2000);
  setInterval(runCycle, 10000);
}
