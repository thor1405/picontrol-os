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

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'unknown';
  status: string;
  created: number;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;
  rxBytes: number;
  txBytes: number;
  restartCount: number;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  isCasaOs: boolean;
  ports: Array<{ hostPort?: number; containerPort: number; protocol: string }>;
}

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

export interface WebsiteMonitor {
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

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'journald' | 'docker' | 'nginx' | 'picontrol';
  service: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface AlertRule {
  id: number;
  name: string;
  metric_type: string;
  condition: '>' | '<' | '==' | '!=';
  threshold: number;
  duration_sec: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: number;
}

export interface AlertHistoryItem {
  id: number;
  rule_id: number | null;
  rule_name: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value: number;
  state: 'active' | 'resolved';
  started_at: string;
  resolved_at: string | null;
  acknowledged: number;
}

export interface User {
  id: number;
  username: string;
  role: string;
}
