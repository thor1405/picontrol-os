import React from 'react';
import { Layers, Database, HardDrive, Terminal } from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';
import { MetricCard } from '../components/common/MetricCard';
import { formatBytes } from '../utils/formatters';

export const MemoryProcesses: React.FC = () => {
  const { telemetry } = useMetrics();

  if (!telemetry) return null;
  const { memory, processes } = telemetry;

  const usedPct = memory.usagePercent;
  const cachePct = parseFloat(((memory.cachedAndBufferedBytes / memory.totalBytes) * 100).toFixed(1));
  const freePct = parseFloat(((memory.freeBytes / memory.totalBytes) * 100).toFixed(1));

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Memory & Processes</h1>
        <p className="text-xs text-text-secondary">
          Accurate Linux memory accounting via /proc/meminfo, reclaimable page cache, and process memory maps
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Physical RAM"
          value={formatBytes(memory.totalBytes)}
          subtitle={`Available: ${formatBytes(memory.availableBytes)}`}
          icon={Layers}
        />
        <MetricCard
          title="RAM Utilization"
          value={memory.usagePercent}
          unit="%"
          subtitle={`${formatBytes(memory.usedBytes)} active memory`}
          icon={Layers}
          progressPercent={memory.usagePercent}
          status={memory.usagePercent > 88 ? 'critical' : memory.usagePercent > 75 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="Buffers & Cached"
          value={formatBytes(memory.cachedAndBufferedBytes)}
          subtitle="Reclaimable kernel filesystem cache"
          icon={Database}
          progressPercent={cachePct}
        />
        <MetricCard
          title="Swap Storage"
          value={memory.swapUsagePercent}
          unit="%"
          subtitle={`${formatBytes(memory.swapUsedBytes)} of ${formatBytes(memory.swapTotalBytes)}`}
          icon={HardDrive}
          progressPercent={memory.swapUsagePercent}
          status={memory.swapUsagePercent > 50 ? 'warning' : 'normal'}
        />
      </div>

      {/* Linux Memory Accounting Stack Bar */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Linux Memory Distribution Breakdown</h3>

        <div className="space-y-2">
          <div className="h-4 w-full bg-surface-elevated rounded-full flex overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${usedPct}%` }}
              title={`Used: ${formatBytes(memory.usedBytes)} (${usedPct}%)`}
            />
            <div
              className="h-full bg-secondary transition-all duration-500"
              style={{ width: `${cachePct}%` }}
              title={`Cached/Buffers: ${formatBytes(memory.cachedAndBufferedBytes)} (${cachePct}%)`}
            />
            <div
              className="h-full bg-emerald-500/40 transition-all duration-500"
              style={{ width: `${freePct}%` }}
              title={`Completely Free: ${formatBytes(memory.freeBytes)} (${freePct}%)`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary pt-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Active Used: {formatBytes(memory.usedBytes)} ({usedPct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                Page Cache/Buffers: {formatBytes(memory.cachedAndBufferedBytes)} ({cachePct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                Unallocated Free: {formatBytes(memory.freeBytes)} ({freePct}%)
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-medium">
              Real Available: {formatBytes(memory.availableBytes)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Memory Processes */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Highest Memory-Consuming Processes</h3>
          </div>
          <span className="text-xs text-text-muted">Sorted by Resident Set Size (RSS)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated/70 text-text-muted border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium">PID</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">RSS Memory</th>
                <th className="px-3 py-2 font-medium">RAM %</th>
                <th className="px-3 py-2 font-medium">CPU %</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {processes.topMemory.slice(0, 8).map((p: any) => (
                <tr key={p.pid} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-3 py-2 text-text-primary">{p.pid}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.user}</td>
                  <td className="px-3 py-2 font-bold text-secondary">{formatBytes(p.rssBytes)}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.memoryPercent}%</td>
                  <td className="px-3 py-2 text-text-muted">{p.cpuPercent}%</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-surface-elevated text-[10px] text-text-secondary">
                      {p.state}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-primary truncate max-w-xs">{p.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
