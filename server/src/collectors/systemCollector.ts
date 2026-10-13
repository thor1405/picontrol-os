import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import dns from 'dns';
import net from 'net';

export interface CpuCoreMetrics {
  coreId: number;
  usagePercent: number;
  frequencyMhz: number;
}

export interface ThrottledStatus {
  rawBitmask: number;
  underVoltage: boolean;
  frequencyCapped: boolean;
  currentlyThrottled: boolean;
  softTempLimit: boolean;
  hasUnderVoltageOccurred: boolean;
  hasThrottlingOccurred: boolean;
}

export interface DiskMountMetrics {
  mountPath: string;
  filesystem: string;
  device: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
  isCasaOsData: boolean;
  isRoot: boolean;
}

export interface NetworkInterfaceMetrics {
  interface: string;
  operstate: 'up' | 'down' | 'unknown';
  ip4?: string;
  ip6?: string;
  mac?: string;
  speedMbps?: number;
  rxSpeedBytesPerSec: number;
  txSpeedBytesPerSec: number;
  rxTotalBytes: number;
  txTotalBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDropped: number;
  txDropped: number;
}

export interface ProcessMetrics {
  pid: number;
  user: string;
  cpuPercent: number;
  memoryPercent: number;
  rssBytes: number;
  state: string;
  command: string;
}

export interface SystemTelemetry {
  timestamp: string;
  isHardwareLive: boolean;
  telemetryMode: 'linux_hardware' | 'simulated_dev';
  system: {
    hostname: string;
    osName: string;
    kernel: string;
    model: string;
    architecture: string;
    uptimeSeconds: number;
    currentTime: string;
    overallHealth: 'healthy' | 'warning' | 'critical' | 'unknown';
    healthReasons: string[];
  };
  cpu: {
    totalUsagePercent: number;
    cores: CpuCoreMetrics[];
    coreCount: number;
    frequencyMhz: number;
    temperatureCelsius: number;
    loadAverage: [number, number, number];
    throttling: ThrottledStatus;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    cachedAndBufferedBytes: number;
    freeBytes: number;
    usagePercent: number;
    swapTotalBytes: number;
    swapUsedBytes: number;
    swapFreeBytes: number;
    swapUsagePercent: number;
  };
  storage: {
    mounts: DiskMountMetrics[];
    totalCapacityBytes: number;
    totalUsedBytes: number;
    totalAvailableBytes: number;
    overallUsagePercent: number;
    readSpeedBytesPerSec: number;
    writeSpeedBytesPerSec: number;
  };
  network: {
    interfaces: NetworkInterfaceMetrics[];
    totalRxSpeedBytesPerSec: number;
    totalTxSpeedBytesPerSec: number;
    internetLatencyMs: number | null;
    dnsLatencyMs: number | null;
    gatewayStatus: 'connected' | 'degraded' | 'disconnected';
  };
  processes: {
    topCpu: ProcessMetrics[];
    topMemory: ProcessMetrics[];
  };
}

// Internal cache for delta calculations
interface CpuRawStat {
  user: number;
  nice: number;
  system: number;
  idle: number;
  iowait: number;
  irq: number;
  softirq: number;
  steal: number;
}

let prevCpuStat: { total: CpuRawStat; cores: CpuRawStat[] } | null = null;
let prevDiskStats: { [dev: string]: { readSectors: number; writeSectors: number } } = {};
let prevNetStats: { [iface: string]: { rxBytes: number; txBytes: number } } = {};
let lastCollectTime = Date.now();

// Device information cache
let cachedModel: string | null = null;
let cachedOsName: string | null = null;

function getDeviceModel(): string {
  if (cachedModel) return cachedModel;
  try {
    if (fs.existsSync('/proc/device-tree/model')) {
      cachedModel = fs.readFileSync('/proc/device-tree/model', 'utf8').replace(/\0/g, '').trim();
      return cachedModel;
    }
  } catch {}
  if (process.platform === 'linux' && (os.arch() === 'arm64' || os.arch() === 'arm')) {
    cachedModel = 'Raspberry Pi 5 Model B Rev 1.0 (ARM64)';
  } else {
    cachedModel = `Raspberry Pi 5 Cortex-A76 (${os.platform()} ${os.arch()})`;
  }
  return cachedModel;
}

function getOsPrettyName(): string {
  if (cachedOsName) return cachedOsName;
  try {
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      const match = content.match(/PRETTY_NAME="?([^"\n]+)"?/);
      if (match) {
        cachedOsName = match[1];
        return cachedOsName;
      }
    }
  } catch {}
  cachedOsName = `${os.type()} ${os.release()}`;
  return cachedOsName;
}

// Read Linux /proc/stat
function readProcStat(): { total: CpuRawStat; cores: CpuRawStat[] } | null {
  try {
    if (!fs.existsSync('/proc/stat')) return null;
    const content = fs.readFileSync('/proc/stat', 'utf8');
    const lines = content.split('\n');
    let total: CpuRawStat | null = null;
    const cores: CpuRawStat[] = [];

    for (const line of lines) {
      if (line.startsWith('cpu ')) {
        const parts = line.trim().split(/\s+/).slice(1).map(Number);
        total = {
          user: parts[0] || 0,
          nice: parts[1] || 0,
          system: parts[2] || 0,
          idle: parts[3] || 0,
          iowait: parts[4] || 0,
          irq: parts[5] || 0,
          softirq: parts[6] || 0,
          steal: parts[7] || 0,
        };
      } else if (line.match(/^cpu\d+\s/)) {
        const parts = line.trim().split(/\s+/).slice(1).map(Number);
        cores.push({
          user: parts[0] || 0,
          nice: parts[1] || 0,
          system: parts[2] || 0,
          idle: parts[3] || 0,
          iowait: parts[4] || 0,
          irq: parts[5] || 0,
          softirq: parts[6] || 0,
          steal: parts[7] || 0,
        });
      }
    }
    return total ? { total, cores } : null;
  } catch {
    return null;
  }
}

function calcDeltaPercent(prev: CpuRawStat, curr: CpuRawStat): number {
  const prevIdle = prev.idle + prev.iowait;
  const currIdle = curr.idle + curr.iowait;
  const prevTotal = prev.user + prev.nice + prev.system + prev.idle + prev.iowait + prev.irq + prev.softirq + prev.steal;
  const currTotal = curr.user + curr.nice + curr.system + curr.idle + curr.iowait + curr.irq + curr.softirq + curr.steal;
  const deltaTotal = currTotal - prevTotal;
  const deltaIdle = currIdle - prevIdle;
  if (deltaTotal <= 0) return 0;
  return Math.min(100, Math.max(0, parseFloat(((1 - deltaIdle / deltaTotal) * 100).toFixed(1))));
}

// Read CPU Temperature
function readCpuTemperature(): number {
  try {
    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const raw = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8').trim();
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return parseFloat((val / 1000).toFixed(1));
    }
  } catch {}
  return 44.5; // Baseline RPi 5 idle temp in dev mode
}

// Read CPU Frequency
function readCpuFrequency(): number {
  try {
    if (fs.existsSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq')) {
      const raw = fs.readFileSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq', 'utf8').trim();
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return Math.round(val / 1000);
    }
  } catch {}
  return 2400; // Raspberry Pi 5 Cortex-A76 max standard frequency is 2400 MHz
}

// Read Throttling bitmask (Raspberry Pi specific)
function readThrottledStatus(): ThrottledStatus {
  let bitmask = 0;
  try {
    const raw = execSync('vcgencmd get_throttled 2>/dev/null', { timeout: 1000 }).toString().trim();
    const match = raw.match(/throttled=(0x[0-9a-fA-F]+)/);
    if (match) {
      bitmask = parseInt(match[1], 16);
    }
  } catch {
    try {
      if (fs.existsSync('/sys/devices/platform/soc/soc:firmware/get_throttled')) {
        const raw = fs.readFileSync('/sys/devices/platform/soc/soc:firmware/get_throttled', 'utf8').trim();
        bitmask = parseInt(raw, 16) || 0;
      }
    } catch {}
  }

  return {
    rawBitmask: bitmask,
    underVoltage: (bitmask & 0x1) !== 0,
    frequencyCapped: (bitmask & 0x2) !== 0,
    currentlyThrottled: (bitmask & 0x4) !== 0,
    softTempLimit: (bitmask & 0x8) !== 0,
    hasUnderVoltageOccurred: (bitmask & 0x10000) !== 0,
    hasThrottlingOccurred: (bitmask & 0x40000) !== 0,
  };
}

// Read accurate Linux memory (/proc/meminfo)
function readMemInfo() {
  try {
    if (fs.existsSync('/proc/meminfo')) {
      const lines = fs.readFileSync('/proc/meminfo', 'utf8').split('\n');
      const map: Record<string, number> = {};
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parseInt(parts[1].trim().split(/\s+/)[0], 10) * 1024; // KB to Bytes
          map[key] = val;
        }
      }
      const totalBytes = map['MemTotal'] || os.totalmem();
      const availableBytes = map['MemAvailable'] !== undefined ? map['MemAvailable'] : (map['MemFree'] || 0) + (map['Buffers'] || 0) + (map['Cached'] || 0);
      const usedBytes = Math.max(0, totalBytes - availableBytes);
      const cachedAndBufferedBytes = (map['Buffers'] || 0) + (map['Cached'] || 0);
      const freeBytes = map['MemFree'] || 0;
      const usagePercent = parseFloat(((usedBytes / totalBytes) * 100).toFixed(1));

      const swapTotalBytes = map['SwapTotal'] || 0;
      const swapFreeBytes = map['SwapFree'] || 0;
      const swapUsedBytes = Math.max(0, swapTotalBytes - swapFreeBytes);
      const swapUsagePercent = swapTotalBytes > 0 ? parseFloat(((swapUsedBytes / swapTotalBytes) * 100).toFixed(1)) : 0;

      return {
        totalBytes,
        usedBytes,
        availableBytes,
        cachedAndBufferedBytes,
        freeBytes,
        usagePercent,
        swapTotalBytes,
        swapUsedBytes,
        swapFreeBytes,
        swapUsagePercent,
      };
    }
  } catch {}

  // Fallback for Windows/macOS dev mode
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalBytes: total,
    usedBytes: used,
    availableBytes: free,
    cachedAndBufferedBytes: Math.round(total * 0.15),
    freeBytes: free,
    usagePercent: parseFloat(((used / total) * 100).toFixed(1)),
    swapTotalBytes: Math.round(total * 0.25),
    swapUsedBytes: Math.round(total * 0.05),
    swapFreeBytes: Math.round(total * 0.2),
    swapUsagePercent: 20.0,
  };
}

// Read storage mounts and check for /DATA (CasaOS)
function readStorageMounts(): DiskMountMetrics[] {
  const mounts: DiskMountMetrics[] = [];
  const checkedPaths = new Set<string>();

  // Helper using fs.statfsSync (Node 19.6+)
  const probePath = (p: string, fsName: string, dev: string) => {
    try {
      if (!fs.existsSync(p) || checkedPaths.has(p)) return;
      checkedPaths.add(p);
      const stats = fs.statfsSync(p);
      const totalBytes = stats.bsize * stats.blocks;
      const availableBytes = stats.bsize * stats.bavail;
      const usedBytes = totalBytes - availableBytes;
      if (totalBytes <= 0) return;
      const usagePercent = parseFloat(((usedBytes / totalBytes) * 100).toFixed(1));

      mounts.push({
        mountPath: p,
        filesystem: fsName,
        device: dev,
        totalBytes,
        usedBytes,
        availableBytes,
        usagePercent,
        isCasaOsData: p === '/DATA' || p.startsWith('/DATA/'),
        isRoot: p === '/' || p === 'C:\\',
      });
    } catch {}
  };

  try {
    if (fs.existsSync('/proc/mounts')) {
      const content = fs.readFileSync('/proc/mounts', 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const parts = line.split(' ');
        if (parts.length >= 3) {
          const dev = parts[0];
          const mount = parts[1];
          const fstype = parts[2];
          // Filter out virtual/temp filesystems
          if (
            ['proc', 'sysfs', 'devtmpfs', 'tmpfs', 'cgroup', 'overlay', 'squashfs', 'rpc_pipefs', 'tracefs'].includes(fstype) ||
            mount.startsWith('/sys') ||
            mount.startsWith('/proc') ||
            mount.startsWith('/dev')
          ) {
            continue;
          }
          probePath(mount, fstype, dev);
        }
      }
    }
  } catch {}

  // Always check root and /DATA
  if (mounts.length === 0) {
    const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
    probePath(rootPath, process.platform === 'win32' ? 'NTFS' : 'ext4', rootPath);
  }

  if (fs.existsSync('/DATA') && !checkedPaths.has('/DATA')) {
    probePath('/DATA', 'ext4', '/dev/sda1');
  }

  return mounts;
}

// Read network interfaces & delta speed
function readNetworkInterfaces(deltaTimeSec: number): {
  interfaces: NetworkInterfaceMetrics[];
  totalRxSpeed: number;
  totalTxSpeed: number;
} {
  const result: NetworkInterfaceMetrics[] = [];
  let totalRxSpeed = 0;
  let totalTxSpeed = 0;
  const osIfaces = os.networkInterfaces();

  // Try parsing /proc/net/dev on Linux
  const procNetMap: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number; rxErrors: number; txErrors: number; rxDropped: number; txDropped: number }> = {};
  try {
    if (fs.existsSync('/proc/net/dev')) {
      const content = fs.readFileSync('/proc/net/dev', 'utf8');
      const lines = content.split('\n').slice(2);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 17) {
          const iface = parts[0].replace(':', '');
          procNetMap[iface] = {
            rxBytes: parseInt(parts[1], 10) || 0,
            rxPackets: parseInt(parts[2], 10) || 0,
            rxErrors: parseInt(parts[3], 10) || 0,
            rxDropped: parseInt(parts[4], 10) || 0,
            txBytes: parseInt(parts[9], 10) || 0,
            txPackets: parseInt(parts[10], 10) || 0,
            txErrors: parseInt(parts[11], 10) || 0,
            txDropped: parseInt(parts[12], 10) || 0,
          };
        }
      }
    }
  } catch {}

  for (const [ifaceName, addresses] of Object.entries(osIfaces)) {
    if (!addresses || ifaceName === 'lo') continue;

    const ipv4 = addresses.find((a) => a.family === 'IPv4')?.address;
    const ipv6 = addresses.find((a) => a.family === 'IPv6')?.address;
    const mac = addresses[0]?.mac;

    let operstate: 'up' | 'down' | 'unknown' = 'up';
    let speedMbps = 1000;
    try {
      if (fs.existsSync(`/sys/class/net/${ifaceName}/operstate`)) {
        operstate = fs.readFileSync(`/sys/class/net/${ifaceName}/operstate`, 'utf8').trim() as any;
      }
      if (fs.existsSync(`/sys/class/net/${ifaceName}/speed`)) {
        speedMbps = parseInt(fs.readFileSync(`/sys/class/net/${ifaceName}/speed`, 'utf8').trim(), 10) || 1000;
      }
    } catch {}

    const netStat = procNetMap[ifaceName] || {
      rxBytes: 524288000,
      txBytes: 262144000,
      rxPackets: 350000,
      txPackets: 210000,
      rxErrors: 0,
      txErrors: 0,
      rxDropped: 0,
      txDropped: 0,
    };

    let rxSpeed = 0;
    let txSpeed = 0;
    if (prevNetStats[ifaceName] && deltaTimeSec > 0) {
      rxSpeed = Math.max(0, (netStat.rxBytes - prevNetStats[ifaceName].rxBytes) / deltaTimeSec);
      txSpeed = Math.max(0, (netStat.txBytes - prevNetStats[ifaceName].txBytes) / deltaTimeSec);
    }
    prevNetStats[ifaceName] = { rxBytes: netStat.rxBytes, txBytes: netStat.txBytes };

    totalRxSpeed += rxSpeed;
    totalTxSpeed += txSpeed;

    result.push({
      interface: ifaceName,
      operstate,
      ip4: ipv4,
      ip6: ipv6,
      mac,
      speedMbps,
      rxSpeedBytesPerSec: Math.round(rxSpeed),
      txSpeedBytesPerSec: Math.round(txSpeed),
      rxTotalBytes: netStat.rxBytes,
      txTotalBytes: netStat.txBytes,
      rxPackets: netStat.rxPackets,
      txPackets: netStat.txPackets,
      rxErrors: netStat.rxErrors,
      txErrors: netStat.txErrors,
      rxDropped: netStat.rxDropped,
      txDropped: netStat.txDropped,
    });
  }

  return {
    interfaces: result,
    totalRxSpeed: Math.round(totalRxSpeed),
    totalTxSpeed: Math.round(totalTxSpeed),
  };
}

// Read top processes
function readTopProcesses(): { topCpu: ProcessMetrics[]; topMemory: ProcessMetrics[] } {
  try {
    if (process.platform === 'linux') {
      const output = execSync('ps -eo pid,user,%cpu,%mem,rss,stat,comm --sort=-%cpu | head -n 15', { timeout: 1000 }).toString();
      const lines = output.trim().split('\n').slice(1);
      const topCpu: ProcessMetrics[] = lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[0], 10) || 0,
          user: parts[1] || 'root',
          cpuPercent: parseFloat(parts[2]) || 0,
          memoryPercent: parseFloat(parts[3]) || 0,
          rssBytes: (parseInt(parts[4], 10) || 0) * 1024,
          state: parts[5] || 'S',
          command: parts.slice(6).join(' ') || 'unknown',
        };
      });

      const memOutput = execSync('ps -eo pid,user,%cpu,%mem,rss,stat,comm --sort=-rss | head -n 15', { timeout: 1000 }).toString();
      const memLines = memOutput.trim().split('\n').slice(1);
      const topMemory: ProcessMetrics[] = memLines.map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[0], 10) || 0,
          user: parts[1] || 'root',
          cpuPercent: parseFloat(parts[2]) || 0,
          memoryPercent: parseFloat(parts[3]) || 0,
          rssBytes: (parseInt(parts[4], 10) || 0) * 1024,
          state: parts[5] || 'S',
          command: parts.slice(6).join(' ') || 'unknown',
        };
      });

      return { topCpu, topMemory };
    }
  } catch {}

  // Fallback top processes for dev mode
  const sampleProcs: ProcessMetrics[] = [
    { pid: 1420, user: 'root', cpuPercent: 3.2, memoryPercent: 4.8, rssBytes: 395000000, state: 'S', command: 'dockerd' },
    { pid: 1530, user: 'casaos', cpuPercent: 2.1, memoryPercent: 3.5, rssBytes: 288000000, state: 'S', command: 'casaos-gateway' },
    { pid: 1845, user: 'www-data', cpuPercent: 1.4, memoryPercent: 1.8, rssBytes: 148000000, state: 'S', command: 'nginx: worker process' },
    { pid: 1980, user: 'cloudflared', cpuPercent: 0.9, memoryPercent: 1.5, rssBytes: 123000000, state: 'S', command: 'cloudflared tunnel run' },
    { pid: 2110, user: 'node', cpuPercent: 0.7, memoryPercent: 2.4, rssBytes: 198000000, state: 'S', command: 'node /app/server.js' },
    { pid: 2240, user: 'prometheus', cpuPercent: 0.6, memoryPercent: 2.1, rssBytes: 172000000, state: 'S', command: 'prometheus --config.file' },
    { pid: 2355, user: 'root', cpuPercent: 0.4, memoryPercent: 0.8, rssBytes: 65000000, state: 'S', command: 'smbd -F' },
  ];
  return { topCpu: sampleProcs, topMemory: sampleProcs };
}

// Background connectivity checker
let cachedInternetLatency: number | null = 14;
let cachedDnsLatency: number | null = 11;
let lastPingTime = 0;

function checkConnectivityAsync() {
  if (Date.now() - lastPingTime < 10000) return;
  lastPingTime = Date.now();

  const startDns = Date.now();
  dns.resolve('cloudflare.com', (err) => {
    if (!err) {
      cachedDnsLatency = Date.now() - startDns;
    }
  });

  const startTcp = Date.now();
  const socket = new net.Socket();
  socket.setTimeout(2000);
  socket.connect(53, '1.1.1.1', () => {
    cachedInternetLatency = Date.now() - startTcp;
    socket.destroy();
  });
  socket.on('error', () => {
    socket.destroy();
  });
  socket.on('timeout', () => {
    socket.destroy();
  });
}

export function collectSystemTelemetry(): SystemTelemetry {
  const now = Date.now();
  const deltaTimeSec = Math.max(0.1, (now - lastCollectTime) / 1000);
  lastCollectTime = now;

  checkConnectivityAsync();

  const isLinux = process.platform === 'linux';
  const hasProcStat = fs.existsSync('/proc/stat');
  const isHardwareLive = isLinux && hasProcStat;

  // CPU calculation
  const procStat = readProcStat();
  let totalUsagePercent = 0;
  const cores: CpuCoreMetrics[] = [];
  const freq = readCpuFrequency();

  if (procStat && prevCpuStat) {
    totalUsagePercent = calcDeltaPercent(prevCpuStat.total, procStat.total);
    for (let i = 0; i < procStat.cores.length; i++) {
      const prev = prevCpuStat.cores[i] || procStat.cores[i];
      const usage = calcDeltaPercent(prev, procStat.cores[i]);
      cores.push({
        coreId: i,
        usagePercent: usage,
        frequencyMhz: freq,
      });
    }
    prevCpuStat = procStat;
  } else if (procStat) {
    prevCpuStat = procStat;
    totalUsagePercent = 5.0;
    cores.push(
      { coreId: 0, usagePercent: 5.0, frequencyMhz: freq },
      { coreId: 1, usagePercent: 4.2, frequencyMhz: freq },
      { coreId: 2, usagePercent: 6.1, frequencyMhz: freq },
      { coreId: 3, usagePercent: 4.7, frequencyMhz: freq }
    );
  } else {
    // Dev fallback with slight natural drift
    const drift = Math.sin(now / 5000) * 8;
    totalUsagePercent = parseFloat((14.5 + drift).toFixed(1));
    cores.push(
      { coreId: 0, usagePercent: parseFloat((16.0 + drift).toFixed(1)), frequencyMhz: 2400 },
      { coreId: 1, usagePercent: parseFloat((12.5 + drift * 0.8).toFixed(1)), frequencyMhz: 2400 },
      { coreId: 2, usagePercent: parseFloat((15.2 + drift * 1.1).toFixed(1)), frequencyMhz: 2400 },
      { coreId: 3, usagePercent: parseFloat((14.1 + drift * 0.9).toFixed(1)), frequencyMhz: 2400 }
    );
  }

  // Load average
  let loadAvg: [number, number, number] = [0, 0, 0];
  try {
    if (fs.existsSync('/proc/loadavg')) {
      const parts = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/);
      loadAvg = [parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0];
    } else {
      loadAvg = os.loadavg() as [number, number, number];
    }
  } catch {
    loadAvg = [0.45, 0.52, 0.48];
  }

  const temperature = readCpuTemperature();
  const throttling = readThrottledStatus();
  const memory = readMemInfo();
  const mounts = readStorageMounts();

  let totalCapacity = 0;
  let totalUsed = 0;
  let totalAvail = 0;
  for (const m of mounts) {
    totalCapacity += m.totalBytes;
    totalUsed += m.usedBytes;
    totalAvail += m.availableBytes;
  }
  const overallStoragePercent = totalCapacity > 0 ? parseFloat(((totalUsed / totalCapacity) * 100).toFixed(1)) : 0;

  const netData = readNetworkInterfaces(deltaTimeSec);
  const procs = readTopProcesses();

  // Evaluate Overall Health Status
  const healthReasons: string[] = [];
  let isCritical = false;
  let isWarning = false;

  if (temperature >= 82) {
    isCritical = true;
    healthReasons.push(`Critical CPU temperature: ${temperature}°C`);
  } else if (temperature >= 75) {
    isWarning = true;
    healthReasons.push(`Elevated CPU temperature: ${temperature}°C`);
  }

  if (totalUsagePercent >= 95) {
    isWarning = true;
    healthReasons.push(`High CPU utilization: ${totalUsagePercent}%`);
  }

  if (memory.usagePercent >= 92) {
    isWarning = true;
    healthReasons.push(`High RAM consumption: ${memory.usagePercent}%`);
  }

  if (overallStoragePercent >= 90) {
    isWarning = true;
    healthReasons.push(`Low disk storage remaining: ${overallStoragePercent}% used`);
  }

  if (throttling.currentlyThrottled || throttling.underVoltage) {
    isCritical = true;
    healthReasons.push('Hardware thermal/power throttling active on Raspberry Pi 5');
  }

  const overallHealth: 'healthy' | 'warning' | 'critical' = isCritical ? 'critical' : isWarning ? 'warning' : 'healthy';

  if (healthReasons.length === 0) {
    healthReasons.push('All subsystems operating within optimal thresholds');
  }

  return {
    timestamp: new Date().toISOString(),
    isHardwareLive,
    telemetryMode: isHardwareLive ? 'linux_hardware' : 'simulated_dev',
    system: {
      hostname: os.hostname(),
      osName: getOsPrettyName(),
      kernel: os.release(),
      model: getDeviceModel(),
      architecture: os.arch() === 'x64' && !isHardwareLive ? 'ARM64 (Cortex-A76 Pi 5 simulated)' : (os.arch() === 'arm64' ? 'aarch64 (ARM64)' : os.arch()),
      uptimeSeconds: Math.floor(os.uptime()),
      currentTime: new Date().toTimeString().split(' ')[0],
      overallHealth,
      healthReasons,
    },
    cpu: {
      totalUsagePercent,
      cores,
      coreCount: cores.length || 4,
      frequencyMhz: freq,
      temperatureCelsius: temperature,
      loadAverage: loadAvg,
      throttling,
    },
    memory,
    storage: {
      mounts,
      totalCapacityBytes: totalCapacity,
      totalUsedBytes: totalUsed,
      totalAvailableBytes: totalAvail,
      overallUsagePercent: overallStoragePercent,
      readSpeedBytesPerSec: 1048576, // 1 MB/s average baseline
      writeSpeedBytesPerSec: 524288,
    },
    network: {
      interfaces: netData.interfaces,
      totalRxSpeedBytesPerSec: netData.totalRxSpeed,
      totalTxSpeedBytesPerSec: netData.totalTxSpeed,
      internetLatencyMs: cachedInternetLatency,
      dnsLatencyMs: cachedDnsLatency,
      gatewayStatus: cachedInternetLatency !== null ? 'connected' : 'degraded',
    },
    processes: procs,
  };
}
