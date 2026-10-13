import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  Terminal,
  ShieldAlert,
  Search,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ContainerInfo } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { formatBytes } from '../utils/formatters';

export const DockerContainers: React.FC = () => {
  const { token } = useAuth();
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContainer, setSelectedContainer] = useState<ContainerInfo | null>(null);
  const [actionTarget, setActionTarget] = useState<{ container: ContainerInfo; action: 'start' | 'stop' | 'restart' } | null>(null);
  const [containerLogs, setContainerLogs] = useState<string[] | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchContainers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/docker/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContainers(data.containers || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, [token]);

  const handleExecuteAction = async () => {
    if (!actionTarget) return;
    try {
      const res = await fetch(`/api/docker/containers/${actionTarget.container.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: actionTarget.action }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(data.message || `Action ${actionTarget.action} executed.`);
        fetchContainers();
      } else {
        setNotice(`Action blocked: ${data.error}`);
      }
    } catch (e: any) {
      setNotice(`Failed to execute: ${e.message}`);
    } finally {
      setActionTarget(null);
    }
  };

  const openLogs = async (c: ContainerInfo) => {
    setSelectedContainer(c);
    setLogLoading(true);
    try {
      const res = await fetch(`/api/docker/containers/${c.id}/logs?tail=80`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContainerLogs(data.logs || []);
      }
    } catch {
      setContainerLogs(['Failed to load container logs.']);
    } finally {
      setLogLoading(false);
    }
  };

  const filtered = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Docker Containers</h1>
            <p className="text-xs text-text-secondary">
              Virtualization engine telemetry, resource accounting, CasaOS application tags, and scoped lifecycle management
            </p>
          </div>
          <button
            onClick={fetchContainers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-xs text-text-primary flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-primary hover:underline font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search containers or images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary placeholder:text-text-muted"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-text-secondary w-full sm:w-auto justify-end">
          <span>Total: <b className="text-text-primary">{containers.length}</b></span>
          <span>Running: <b className="text-emerald-400">{containers.filter((c) => c.state === 'running').length}</b></span>
          <span>CasaOS Apps: <b className="text-primary">{containers.filter((c) => c.isCasaOs).length}</b></span>
        </div>
      </div>

      {/* Containers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-text-primary tracking-tight">{c.name}</h3>
                  {c.isCasaOs && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-medium">
                      CasaOS
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted font-mono truncate max-w-xs">{c.image}</p>
              </div>
              <StatusBadge status={c.state} size="sm" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-surface-elevated border border-border/50">
                <span className="text-[10px] text-text-muted block">CPU Load</span>
                <span className="font-mono font-medium text-text-primary">{c.cpuPercent}%</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-elevated border border-border/50">
                <span className="text-[10px] text-text-muted block">Memory</span>
                <span className="font-mono font-medium text-text-primary">{formatBytes(c.memoryUsageBytes)}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-elevated border border-border/50">
                <span className="text-[10px] text-text-muted block">Health</span>
                <span className="font-mono font-medium text-emerald-400 capitalize">{c.health}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
              <button
                onClick={() => openLogs(c)}
                className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-[11px] font-medium transition-colors"
              >
                <Terminal className="w-3.5 h-3.5 text-primary" /> View Logs
              </button>

              <div className="flex items-center gap-1.5">
                {c.state === 'running' ? (
                  <>
                    <button
                      onClick={() => setActionTarget({ container: c, action: 'restart' })}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-secondary hover:text-text-primary"
                      title="Restart container"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setActionTarget({ container: c, action: 'stop' })}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-rose-500/20 border border-border text-rose-400"
                      title="Stop container"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActionTarget({ container: c, action: 'start' })}
                    className="p-1.5 rounded-lg bg-surface-elevated hover:bg-emerald-500/20 border border-border text-emerald-400"
                    title="Start container"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!actionTarget}
        title={`Confirm Container ${actionTarget?.action.toUpperCase()}`}
        message={`Are you sure you want to ${actionTarget?.action} container "${actionTarget?.container.name}" (${actionTarget?.container.id})? Note: Container actions must be enabled in Settings first.`}
        confirmLabel={`Yes, ${actionTarget?.action}`}
        isDestructive={actionTarget?.action === 'stop'}
        onConfirm={handleExecuteAction}
        onCancel={() => setActionTarget(null)}
      />

      {/* Logs Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-elevated border border-border w-full max-w-3xl rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-text-primary">
                  Logs: {selectedContainer.name} ({selectedContainer.id})
                </h3>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="text-text-muted hover:text-text-primary text-xs px-2 py-1 rounded bg-surface border border-border"
              >
                Close
              </button>
            </div>

            <div className="h-80 bg-background border border-border rounded-lg p-3 font-mono text-[11px] text-text-secondary overflow-y-auto space-y-1">
              {logLoading ? (
                <div className="flex justify-center items-center h-full">Loading container logs...</div>
              ) : (
                containerLogs?.map((l, i) => (
                  <div key={i} className="leading-relaxed hover:text-text-primary">
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
