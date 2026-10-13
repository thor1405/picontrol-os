import React, { useState, useEffect } from 'react';
import {
  LineChart as ChartIcon,
  Download,
  Calendar,
  Activity,
  Layers,
  Flame,
  Network,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { MetricCard } from '../components/common/MetricCard';

export const HistoricalAnalytics: React.FC = () => {
  const { token } = useAuth();
  const [range, setRange] = useState<'15m' | '1h' | '6h' | '24h' | '7d' | '30d'>('1h');
  const [metricQuery, setMetricQuery] = useState('node_cpu_utilization');
  const [chartData, setChartData] = useState<Array<{ time: string; value: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistorical = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/metrics/historical?query=${metricQuery}&range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const points = data.series && data.series[0] ? data.series[0].points : [];
        const formatted = points.map((p: any) => ({
          time: new Date(p.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: p.value,
        }));
        setChartData(formatted);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorical();
  }, [range, metricQuery, token]);

  const values = chartData.map((d) => d.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 0;
  const avgVal = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const curVal = values.length ? values[values.length - 1] : 0;

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Timestamp,Value\n' +
      chartData.map((e) => `"${e.time}",${e.value}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `picontrol-${metricQuery}-${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Historical Analytics</h1>
            <p className="text-xs text-text-secondary">
              Prometheus TSDB query interface for multi-day capacity planning and anomaly detection
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Range and Query Selectors */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-lg border border-border flex-wrap">
          {[
            { id: 'node_cpu_utilization', label: 'CPU Usage', icon: Cpu },
            { id: 'node_cpu_temp', label: 'SoC Temp', icon: Flame },
            { id: 'node_ram_usage', label: 'RAM Usage', icon: Layers },
            { id: 'node_network_throughput', label: 'Network I/O', icon: Network },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMetricQuery(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  metricQuery === m.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Time-Range Selector */}
        <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-border">
          {(['15m', '1h', '6h', '24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Current Value" value={curVal.toFixed(1)} icon={Activity} />
        <MetricCard title="Window Average" value={avgVal.toFixed(1)} icon={Activity} />
        <MetricCard title="Window Peak (Max)" value={maxVal.toFixed(1)} icon={Activity} status={maxVal > 85 ? 'warning' : 'normal'} />
        <MetricCard title="Window Valley (Min)" value={minVal.toFixed(1)} icon={Activity} />
      </div>

      {/* Main Historical Chart */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Prometheus TSDB Series • {range.toUpperCase()} Window
          </h3>
          <span className="font-mono text-xs text-text-muted">
            {chartData.length} data points
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
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
                dataKey="value"
                name="Metric Value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#histGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
