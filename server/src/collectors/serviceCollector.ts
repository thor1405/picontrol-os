import net from 'net';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { findHostPath } from './systemCollector';
import { listContainers } from './dockerCollector';

export interface ServiceStatus {
  id: string;
  name: string;
  category: 'system' | 'web' | 'database' | 'networking' | 'application';
  status: 'active' | 'inactive' | 'failed' | 'not_installed';
  checkType: 'tcp' | 'socket' | 'systemd' | 'process';
  port?: number;
  uptimeHours: number;
  description: string;
  lastChecked: string;
}

function checkTcpPort(port: number, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

// Discovers the default Docker host gateway IP from /proc/net/route
let cachedGatewayIp: string | null = null;
function getHostGatewayIp(): string {
  if (cachedGatewayIp) return cachedGatewayIp;
  if (process.env.HOST_GATEWAY) {
    cachedGatewayIp = process.env.HOST_GATEWAY;
    return cachedGatewayIp;
  }

  const routePath = findHostPath('proc/net/route') || (fs.existsSync('/proc/net/route') ? '/proc/net/route' : null);
  if (routePath) {
    try {
      const lines = fs.readFileSync(routePath, 'utf8').split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[1] === '00000000') {
          const hex = parts[2];
          if (hex && hex !== '00000000') {
            const b1 = parseInt(hex.substring(6, 8), 16);
            const b2 = parseInt(hex.substring(4, 6), 16);
            const b3 = parseInt(hex.substring(2, 4), 16);
            const b4 = parseInt(hex.substring(0, 2), 16);
            cachedGatewayIp = `${b4}.${b3}.${b2}.${b1}`;
            return cachedGatewayIp;
          }
        }
      }
    } catch {}
  }

  cachedGatewayIp = '172.17.0.1';
  return cachedGatewayIp;
}

async function checkServiceTcp(port: number): Promise<boolean> {
  const hostsToTry = [
    process.env.HOST_GATEWAY,
    'host.docker.internal',
    getHostGatewayIp(),
    '172.17.0.1',
    '127.0.0.1',
  ].filter(Boolean) as string[];

  // Probe in parallel for fast response
  const results = await Promise.all(hostsToTry.map((h) => checkTcpPort(port, h, 600)));
  return results.some(Boolean);
}

function getRunningProcessNames(): Set<string> {
  const procBases = [findHostPath('proc'), '/proc'].filter(Boolean) as string[];
  const names = new Set<string>();

  for (const procBase of procBases) {
    try {
      const entries = fs.readdirSync(procBase);
      for (const entry of entries) {
        if (!/^\d+$/.test(entry)) continue;
        try {
          const commFile = path.join(procBase, entry, 'comm');
          if (fs.existsSync(commFile)) {
            const comm = fs.readFileSync(commFile, 'utf8').trim().toLowerCase();
            names.add(comm);
          }
        } catch {}
      }
      if (names.size > 0) break;
    } catch {}
  }

  return names;
}

function getHostUptimeHours(): number {
  const uptimePath = findHostPath('proc/uptime') || (fs.existsSync('/proc/uptime') ? '/proc/uptime' : null);
  if (uptimePath) {
    try {
      const raw = fs.readFileSync(uptimePath, 'utf8').trim().split(/\s+/)[0];
      const sec = parseFloat(raw);
      if (!isNaN(sec) && sec > 0) {
        return Math.max(1, Math.floor(sec / 3600));
      }
    } catch {}
  }
  return 120;
}

function checkSystemdService(serviceName: string): 'active' | 'inactive' | 'failed' | 'not_installed' {
  if (process.platform !== 'linux') return 'not_installed';
  try {
    const out = execSync(`systemctl is-active ${serviceName} 2>/dev/null`, { timeout: 1000 }).toString().trim();
    if (out === 'active') return 'active';
    if (out === 'inactive') return 'inactive';
    if (out === 'failed') return 'failed';
    return 'not_installed';
  } catch {
    return 'not_installed';
  }
}

export async function checkAllServices(): Promise<ServiceStatus[]> {
  const timestamp = new Date().toISOString();
  const hostUptime = getHostUptimeHours();

  // 1. Parallel TCP port probes
  const [sshUp, nginxUp, mongoUp, sambaUp] = await Promise.all([
    checkServiceTcp(22),
    checkServiceTcp(80).then(async (up) => up || (await checkServiceTcp(443))),
    checkServiceTcp(27017),
    checkServiceTcp(445).then(async (up) => up || (await checkServiceTcp(139))),
  ]);

  // 2. Discover running host processes
  const runningProcs = getRunningProcessNames();

  // 3. Discover running Docker containers
  let runningContainers: any[] = [];
  try {
    runningContainers = await listContainers();
  } catch {}

  const hasContainer = (matcher: string) =>
    runningContainers.some(
      (c) =>
        c.state === 'running' &&
        (c.name.toLowerCase().includes(matcher) || c.image.toLowerCase().includes(matcher))
    );

  // Status resolutions
  const isNginxActive = nginxUp || runningProcs.has('nginx') || hasContainer('nginx');
  const isSshActive = sshUp || runningProcs.has('sshd') || checkSystemdService('ssh') === 'active';
  const isSambaActive = sambaUp || runningProcs.has('smbd') || runningProcs.has('nmbd') || checkSystemdService('smbd') === 'active';
  const isMongoActive = mongoUp || runningProcs.has('mongod') || hasContainer('mongo');
  const isCloudflaredActive = runningProcs.has('cloudflared') || hasContainer('cloudflared') || checkSystemdService('cloudflared') === 'active';
  const isCasaOsActive =
    runningProcs.has('casaos-gateway') ||
    runningProcs.has('casaos') ||
    runningProcs.has('casaos-user-ser') ||
    hasContainer('casaos') ||
    fs.existsSync('/DATA') ||
    Boolean(findHostPath('DATA'));
  const isNodeActive = runningProcs.has('node') || hasContainer('node') || process.release.name === 'node';
  const isDockerActive =
    fs.existsSync('/var/run/docker.sock') ||
    runningProcs.has('dockerd') ||
    checkSystemdService('docker') === 'active';

  const services: ServiceStatus[] = [
    {
      id: 'nginx',
      name: 'Nginx Web Server',
      category: 'web',
      status: isNginxActive ? 'active' : 'inactive',
      checkType: 'tcp',
      port: 80,
      uptimeHours: isNginxActive ? hostUptime : 0,
      description: 'Reverse proxy and HTTP edge server routing web applications',
      lastChecked: timestamp,
    },
    {
      id: 'docker',
      name: 'Docker Daemon',
      category: 'system',
      status: isDockerActive ? 'active' : 'inactive',
      checkType: 'socket',
      uptimeHours: isDockerActive ? hostUptime : 0,
      description: 'Container virtualization runtime engine',
      lastChecked: timestamp,
    },
    {
      id: 'casaos',
      name: 'CasaOS Management Engine',
      category: 'system',
      status: isCasaOsActive ? 'active' : 'not_installed',
      checkType: 'process',
      port: 80,
      uptimeHours: isCasaOsActive ? hostUptime : 0,
      description: 'Simple and elegant cloud OS ecosystem for home servers',
      lastChecked: timestamp,
    },
    {
      id: 'ssh',
      name: 'OpenSSH Server',
      category: 'system',
      status: isSshActive ? 'active' : 'inactive',
      checkType: 'tcp',
      port: 22,
      uptimeHours: isSshActive ? hostUptime : 0,
      description: 'Secure shell remote terminal access',
      lastChecked: timestamp,
    },
    {
      id: 'samba',
      name: 'Samba File Sharing',
      category: 'networking',
      status: isSambaActive ? 'active' : 'inactive',
      checkType: 'tcp',
      port: 445,
      uptimeHours: isSambaActive ? hostUptime : 0,
      description: 'SMB/CIFS file and printer sharing for local storage drives',
      lastChecked: timestamp,
    },
    {
      id: 'cloudflared',
      name: 'Cloudflare Tunnel (cloudflared)',
      category: 'networking',
      status: isCloudflaredActive ? 'active' : 'not_installed',
      checkType: 'process',
      uptimeHours: isCloudflaredActive ? hostUptime : 0,
      description: 'Encrypted outbound tunnel for secure remote access without port forwarding',
      lastChecked: timestamp,
    },
    {
      id: 'mongodb',
      name: 'MongoDB Database Server',
      category: 'database',
      status: isMongoActive ? 'active' : 'not_installed',
      checkType: 'tcp',
      port: 27017,
      uptimeHours: isMongoActive ? hostUptime : 0,
      description: 'NoSQL document database for hosted web applications',
      lastChecked: timestamp,
    },
    {
      id: 'node-apps',
      name: 'Node.js & Express Applications',
      category: 'application',
      status: isNodeActive ? 'active' : 'inactive',
      checkType: 'process',
      uptimeHours: isNodeActive ? hostUptime : 0,
      description: 'Active backend Node.js microservices and web servers',
      lastChecked: timestamp,
    },
  ];

  return services;
}
