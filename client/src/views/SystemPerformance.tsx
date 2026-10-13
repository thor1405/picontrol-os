import React from 'react';
import { Activity, Gauge, Server, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';
import { MetricCard } from '../components/common/MetricCard';
import { formatUptime } from '../utils/formatters';

export const SystemPerformance: React.FC = () => {
  const { telemetry } = useMetrics();

  if (!telemetry) return null;
  const { cpu, system } = telemetry;
  const [load1, load5, load15] = cpu.loadAverage;
  const cores = cpu.coreCount || 4;

  const saturation1 = Math.min(100, Math.round((load1 / cores) * 100));
  const saturation5 = Math.min(100, Math.round((load5 / cores) * 100));
  const saturation15 = Math.min(100, Math.round((load15 / cores) * 100));

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">System Performance</h1>
        <p className="text-xs text-text-secondary">
          Kernel scheduler load distribution, saturation ratios, and processor queue efficiency
        </p>
      </div>

      {/* 3 Load Average Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="1-Minute Load Average"
          value={load1.toFixed(2)}
          subtitle={`Capacity Saturation: ${saturation1}% on ${cores} cores`}
          icon={Gauge}
          progressPercent={saturation1}
          status={saturation1 > 100 ? 'critical' : saturation1 > 75 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="5-Minute Load Average"
          value={load5.toFixed(2)}
          subtitle={`Capacity Saturation: ${saturation5}% on ${cores} cores`}
          icon={Gauge}
          progressPercent={saturation5}
          status={saturation5 > 100 ? 'critical' : saturation5 > 75 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="15-Minute Load Average"
          value={load15.toFixed(2)}
          subtitle={`Capacity Saturation: ${saturation15}% on ${cores} cores`}
          icon={Gauge}
          progressPercent={saturation15}
          status={saturation15 > 100 ? 'critical' : saturation15 > 75 ? 'warning' : 'normal'}
        />
      </div>

      {/* Scheduler & Queue Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Scheduler Saturation Evaluation
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-surface-elevated border border-border text-xs space-y-1">
              <div className="flex justify-between font-medium">
                <span className="text-text-primary">Current Execution Queue:</span>
                <span className={load1 > cores ? 'text-critical' : 'text-emerald-400'}>
                  {load1 > cores ? 'Saturated (Tasks Waiting)' : 'Optimal (Zero Queue Stalling)'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                RPi 5 has {cores} physical Cortex-A76 cores. Maximum unthrottled concurrent throughput is {cores}.00.
              </p>
            </div>

            <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-surface-elevated/50 border border-border/40">
              <span className="text-text-secondary">System Uptime</span>
              <span className="font-mono text-text-primary font-medium">{formatUptime(system.uptimeSeconds)}</span>
            </div>

            <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-surface-elevated/50 border border-border/40">
              <span className="text-text-secondary">Linux Kernel Version</span>
              <span className="font-mono text-text-primary font-medium">{system.kernel}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            Cortex-A76 Core Distribution
          </h3>

          <div className="space-y-3">
            {cpu.cores.map((c: any) => (
              <div key={c.coreId} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-text-primary">Core {c.coreId} (ARM Cortex-A76)</span>
                  <span className="font-medium text-primary">{c.usagePercent}%</span>
                </div>
                <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${c.usagePercent}%` }}
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
