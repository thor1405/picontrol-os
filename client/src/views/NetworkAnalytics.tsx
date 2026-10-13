import React from 'react';
import {
  Network,
  ArrowDownRight,
  ArrowUpRight,
  Wifi,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useMetrics } from '../context/MetricsContext';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatBitsPerSec, formatBytes } from '../utils/formatters';

export const NetworkAnalytics: React.FC = () => {
  const { telemetry, history } = useMetrics();

  if (!telemetry) return null;
  const { network } = telemetry;

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Network Analytics</h1>
        <p className="text-xs text-text-secondary">
          Gigabit Ethernet & Wi-Fi adapter telemetry, packet loss metrics, throughput graphs, and outbound internet probes
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Download Throughput"
          value={formatBitsPerSec(network.totalRxSpeedBytesPerSec)}
          subtitle="Inbound RX bandwidth"
          icon={ArrowDownRight}
        />
        <MetricCard
          title="Upload Throughput"
          value={formatBitsPerSec(network.totalTxSpeedBytesPerSec)}
          subtitle="Outbound TX bandwidth"
          icon={ArrowUpRight}
        />
        <MetricCard
          title="Internet Latency"
          value={network.internetLatencyMs !== null ? `${network.internetLatencyMs} ms` : 'Checking...'}
          subtitle="Probe target: 1.1.1.1"
          icon={Globe}
          status={network.internetLatencyMs && network.internetLatencyMs < 50 ? 'success' : 'normal'}
        />
        <MetricCard
          title="DNS Query Latency"
          value={network.dnsLatencyMs !== null ? `${network.dnsLatencyMs} ms` : 'Checking...'}
          subtitle="Resolution: cloudflare.com"
          icon={Radio}
          status="success"
        />
      </div>

      {/* Network Bandwidth Time-Series Chart */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Real-Time Throughput Timeline</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Inbound Download
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Outbound Upload
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => formatBitsPerSec(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121826',
                  borderColor: '#263244',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [formatBitsPerSec(Number(value)), 'Throughput']}
              />
              <Area
                type="monotone"
                dataKey="rxSpeed"
                name="Inbound (Download)"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#rxGradient)"
              />
              <Area
                type="monotone"
                dataKey="txSpeed"
                name="Outbound (Upload)"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#txGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Network Interfaces List */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          Detected Network Adapters & Interfaces
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {network.interfaces.map((iface: any) => (
            <div
              key={iface.interface}
              className="p-4 rounded-xl bg-surface-elevated/70 border border-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {iface.interface}
                  </span>
                  <StatusBadge status={iface.operstate} size="sm" />
                </div>
                {iface.speedMbps && (
                  <span className="text-[11px] font-mono text-text-muted">
                    {iface.speedMbps} Mbps Link
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-surface border border-border/60">
                  <span className="text-[10px] text-text-muted block">IPv4 Address</span>
                  <span className="text-text-primary">{iface.ip4 || 'None'}</span>
                </div>
                <div className="p-2 rounded bg-surface border border-border/60">
                  <span className="text-[10px] text-text-muted block">MAC Address</span>
                  <span className="text-text-primary">{iface.mac || 'Unknown'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-text-secondary">
                <span>Total RX: {formatBytes(iface.rxTotalBytes)}</span>
                <span>Total TX: {formatBytes(iface.txTotalBytes)}</span>
                <span className="text-[11px] text-emerald-400">Errors: {iface.rxErrors + iface.txErrors}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
