import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  HardDrive,
  Network,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useMetrics } from '../context/MetricsContext';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  formatBytes,
  formatBitsPerSec,
  formatFrequency,
  formatTemperature,
} from '../utils/formatters';

export const Overview: React.FC = () => {
  const { telemetry, history } = useMetrics();
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '6h' | '24h'>('1h');

  if (!telemetry) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-secondary">Establishing telemetry stream...</span>
        </div>
      </div>
    );
  }

  const { cpu, memory, storage, network, system } = telemetry;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-surface border border-border rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Executive Overview</h1>
            <StatusBadge status={system.overallHealth} size="sm" pulse={system.overallHealth === 'critical'} />
          </div>
          <p className="text-xs text-text-secondary">
            Continuous hardware telemetry for {system.model} • Kernel {system.kernel}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs">
            <span className="text-text-muted">Telemetry Mode:</span>
            <span className="font-medium text-emerald-400 capitalize">
              {telemetry.isHardwareLive ? 'Linux Hardware' : 'Dev Simulation'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs">
            <Flame className="w-3.5 h-3.5 text-warning" />
            <span className="text-text-secondary">SoC Temp:</span>
            <span className="font-semibold text-text-primary">
              {formatTemperature(cpu.temperatureCelsius)}
            </span>
          </div>
        </div>
      </div>

      {/* Main 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <MetricCard
          title="CPU Utilization"
          value={cpu.totalUsagePercent}
          unit="%"
          subtitle={`Clock: ${formatFrequency(cpu.frequencyMhz)} • 4 Cores`}
          icon={Cpu}
          progressPercent={cpu.totalUsagePercent}
          status={cpu.totalUsagePercent > 85 ? 'critical' : cpu.totalUsagePercent > 70 ? 'warning' : 'normal'}
        >
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {cpu.cores.map((c: any) => (
              <div key={c.coreId} className="flex flex-col items-center">
                <div className="w-full h-8 bg-surface-elevated rounded flex items-end p-0.5">
                  <div
                    className="w-full bg-primary rounded-sm transition-all duration-300"
                    style={{ height: `${Math.max(5, c.usagePercent)}%` }}
                  />
                </div>
                <span className="text-[9px] text-text-muted mt-1">C{c.coreId}</span>
              </div>
            ))}
          </div>
        </MetricCard>

        {/* Memory Card */}
        <MetricCard
          title="Memory (RAM)"
          value={memory.usagePercent}
          unit="%"
          subtitle={`${formatBytes(memory.usedBytes)} used of ${formatBytes(memory.totalBytes)}`}
          icon={Layers}
          progressPercent={memory.usagePercent}
          status={memory.usagePercent > 88 ? 'critical' : memory.usagePercent > 75 ? 'warning' : 'normal'}
        >
          <div className="flex justify-between items-center text-[11px] text-text-muted pt-2 border-t border-border/50">
            <span>Avail: {formatBytes(memory.availableBytes)}</span>
            <span>Swap: {memory.swapUsagePercent}%</span>
          </div>
        </MetricCard>

        {/* Storage Card */}
        <MetricCard
          title="Storage Capacity"
          value={storage.overallUsagePercent}
          unit="%"
          subtitle={`${formatBytes(storage.totalUsedBytes)} of ${formatBytes(storage.totalCapacityBytes)}`}
          icon={HardDrive}
          progressPercent={storage.overallUsagePercent}
          status={storage.overallUsagePercent > 85 ? 'warning' : 'normal'}
        >
          <div className="flex justify-between items-center text-[11px] text-text-muted pt-2 border-t border-border/50">
            <span>Mounts: {storage.mounts.length}</span>
            <span>Free: {formatBytes(storage.totalAvailableBytes)}</span>
          </div>
        </MetricCard>

        {/* Network Card */}
        <MetricCard
          title="Network Bandwidth"
          value={formatBitsPerSec(network.totalRxSpeedBytesPerSec)}
          subtitle={`Upload: ${formatBitsPerSec(network.totalTxSpeedBytesPerSec)}`}
          icon={Network}
          status={network.gatewayStatus === 'connected' ? 'success' : 'warning'}
        >
          <div className="flex justify-between items-center text-[11px] text-text-muted pt-2 border-t border-border/50">
            <span className="flex items-center gap-1 text-emerald-400">
              <ArrowDownRight className="w-3 h-3" /> {formatBitsPerSec(network.totalRxSpeedBytesPerSec)}
            </span>
            <span className="flex items-center gap-1 text-primary">
              <ArrowUpRight className="w-3 h-3" /> {formatBitsPerSec(network.totalTxSpeedBytesPerSec)}
            </span>
          </div>
        </MetricCard>
      </div>

      {/* Real-time Telemetry Trend Chart */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Live Subsystem Telemetry</h3>
            </div>
            <p className="text-xs text-text-secondary">
              Real-time multi-metric stream sampling at 1500ms intervals
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-lg border border-border">
            {(['15m', '1h', '6h', '24h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  timeRange === r
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history.length > 0 ? history : [{ time: '00:00', cpu: 15, temp: 44, ram: 40 }]}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121826',
                  borderColor: '#263244',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU Utilization (%)"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#cpuGradient)"
              />
              <Area
                type="monotone"
                dataKey="temp"
                name="SoC Temp (°C)"
                stroke="#F59E0B"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#tempGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-border/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" /> CPU Utilization
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" /> Temperature (°C)
            </span>
          </div>
          <span className="font-mono text-[11px] text-text-muted">
            Buffer: {history.length} samples
          </span>
        </div>
      </div>

      {/* Subsystem Health Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Health status summary */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Infrastructure Health Status
          </h3>
          <div className="space-y-2">
            {system.healthReasons.map((reason: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-text-secondary bg-surface-elevated/60 p-2.5 rounded-lg border border-border/50"
              >
                <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Storage Mounts Overview */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            Primary Storage Mounts
          </h3>
          <div className="space-y-2.5">
            {storage.mounts.slice(0, 3).map((mount: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-text-primary">
                    {mount.mountPath} {mount.isCasaOsData && <span className="text-[10px] text-primary">(CasaOS DATA)</span>}
                  </span>
                  <span className="text-text-secondary">
                    {formatBytes(mount.usedBytes)} / {formatBytes(mount.totalBytes)} ({mount.usagePercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${mount.usagePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
