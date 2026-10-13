import React from 'react';
import {
  Cpu,
  Flame,
  Zap,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';
import { MetricCard } from '../components/common/MetricCard';
import { formatFrequency, formatTemperature, formatBytes } from '../utils/formatters';

export const CpuTemperature: React.FC = () => {
  const { telemetry } = useMetrics();

  if (!telemetry) return null;
  const { cpu, processes } = telemetry;
  const { throttling } = cpu;

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">CPU & Temperature</h1>
        <p className="text-xs text-text-secondary">
          Raspberry Pi 5 Broadcom BCM2712 quad-core Cortex-A76 telemetry, thermal envelope, and power PMIC throttling flags
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Utilization"
          value={cpu.totalUsagePercent}
          unit="%"
          icon={Cpu}
          progressPercent={cpu.totalUsagePercent}
          status={cpu.totalUsagePercent > 85 ? 'critical' : cpu.totalUsagePercent > 70 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="SoC Thermal Sensor"
          value={formatTemperature(cpu.temperatureCelsius)}
          subtitle="thermal_zone0"
          icon={Flame}
          progressPercent={(cpu.temperatureCelsius / 85) * 100}
          status={cpu.temperatureCelsius > 80 ? 'critical' : cpu.temperatureCelsius > 70 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="Clock Frequency"
          value={formatFrequency(cpu.frequencyMhz)}
          subtitle="Base: 1.50 GHz • Max: 2.40 GHz"
          icon={Zap}
          progressPercent={(cpu.frequencyMhz / 2400) * 100}
        />
        <MetricCard
          title="Throttling State"
          value={throttling.currentlyThrottled ? 'Active' : 'Nominal'}
          subtitle={`Bitmask: 0x${throttling.rawBitmask.toString(16)}`}
          icon={Gauge}
          status={throttling.currentlyThrottled || throttling.underVoltage ? 'critical' : 'success'}
        />
      </div>

      {/* Raspberry Pi 5 Hardware Throttling Bitmask Decoder */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Raspberry Pi 5 PMIC & Thermal Throttling Status
            </h3>
            <p className="text-xs text-text-secondary">
              Real-time hardware status decoded directly from vcgencmd / firmware bitmask
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-elevated text-primary border border-border">
            Raw: 0x{throttling.rawBitmask.toString(16).padStart(5, '0')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Under-voltage Detected', active: throttling.underVoltage, desc: 'Input voltage dropped below threshold' },
            { label: 'ARM Frequency Capped', active: throttling.frequencyCapped, desc: 'Clock capped to protect silicon' },
            { label: 'Currently Throttled', active: throttling.currentlyThrottled, desc: 'Thermal throttling currently active' },
            { label: 'Soft Temperature Limit', active: throttling.softTempLimit, desc: 'Soft temp throttling active' },
            { label: 'Past Under-voltage Occurred', active: throttling.hasUnderVoltageOccurred, desc: 'Historical under-voltage recorded since boot' },
            { label: 'Past Throttling Occurred', active: throttling.hasThrottlingOccurred, desc: 'Historical thermal throttling recorded since boot' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs space-y-1 transition-colors ${
                item.active
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-surface-elevated/40 border-border/50 text-text-secondary'
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span>{item.label}</span>
                {item.active ? (
                  <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">Active</span>
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <p className="text-[11px] text-text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top CPU Processes */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Top CPU-Consuming Processes</h3>
          </div>
          <span className="text-xs text-text-muted">Real-time Linux process table</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated/70 text-text-muted border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium">PID</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">CPU %</th>
                <th className="px-3 py-2 font-medium">RAM %</th>
                <th className="px-3 py-2 font-medium">RSS</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {processes.topCpu.slice(0, 8).map((p: any) => (
                <tr key={p.pid} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-3 py-2 text-text-primary">{p.pid}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.user}</td>
                  <td className="px-3 py-2 font-bold text-primary">{p.cpuPercent}%</td>
                  <td className="px-3 py-2 text-text-secondary">{p.memoryPercent}%</td>
                  <td className="px-3 py-2 text-text-muted">{formatBytes(p.rssBytes)}</td>
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
