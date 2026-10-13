import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Search,
  Filter,
  Download,
  RefreshCw,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { LogEntry } from '../types';
import { useAuth } from '../context/AuthContext';

export const SystemLogs: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (source) params.set('source', source);
      if (level) params.set('level', level);
      if (search) params.set('search', search);
      params.set('limit', '150');

      const res = await fetch(`/api/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [source, level, search, token]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, source, level, search]);

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.service}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `picontrol-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">System Logs</h1>
            <p className="text-xs text-text-secondary">
              Aggregated systemd journal, Docker containers, and Nginx logs with automated credential and secret masking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                autoRefresh
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-surface-elevated border-border text-text-secondary'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
              Auto-refresh
            </button>

            <button
              onClick={handleDownloadLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search log messages, services, or errors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder:text-text-muted"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All Log Sources</option>
            <option value="journald">Systemd Journal</option>
            <option value="docker">Docker Containers</option>
            <option value="nginx">Nginx Access/Error</option>
          </select>

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All Levels</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
        </div>
      </div>

      {/* Log Console Viewer */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="h-10 bg-surface-elevated/70 border-b border-border px-4 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="font-mono">{logs.length} entries streaming</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Secret Redaction Active
          </div>
        </div>

        <div className="h-[480px] bg-background/95 p-4 font-mono text-[11px] overflow-y-auto space-y-1 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-muted text-xs">
              No matching log records found.
            </div>
          ) : (
            logs.map((log) => {
              let levelColor = 'text-primary';
              if (log.level === 'warn') levelColor = 'text-warning font-bold';
              if (log.level === 'error') levelColor = 'text-critical font-bold';

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-0.5 hover:bg-surface/50 rounded px-1 transition-colors leading-relaxed"
                >
                  <span className="text-text-muted select-none flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`w-12 text-center uppercase text-[10px] px-1 rounded bg-surface-elevated flex-shrink-0 ${levelColor}`}>
                    {log.level}
                  </span>
                  <span className="text-secondary flex-shrink-0 font-semibold max-w-[130px] truncate">
                    [{log.service}]
                  </span>
                  <span className="text-text-secondary flex-1 break-all">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
