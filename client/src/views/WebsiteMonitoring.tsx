import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Play,
  Trash2,
  Lock,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { WebsiteMonitor } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const WebsiteMonitoring: React.FC = () => {
  const { token } = useAuth();
  const [websites, setWebsites] = useState<WebsiteMonitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    check_type: 'HTTP' as 'HTTP' | 'HTTPS' | 'TCP',
    interval_sec: 60,
    timeout_ms: 5000,
    allow_private_ip: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchWebsites = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/websites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWebsites(data.websites || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, [token]);

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSite),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNewSite({
          name: '',
          url: '',
          check_type: 'HTTP',
          interval_sec: 60,
          timeout_ms: 5000,
          allow_private_ip: false,
        });
        fetchWebsites();
      } else {
        setErrorMessage(data.error || 'Failed to add website monitor');
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWebsites();
    } catch {}
  };

  const handleCheckNow = async (id: number) => {
    try {
      await fetch(`/api/websites/${id}/check-now`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWebsites();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Website Uptime Monitoring</h1>
            <p className="text-xs text-text-secondary">
              Availability healthchecks, HTTP/TCP response latencies, SSL certificate validity, and SSRF boundary enforcement
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Target Endpoint
          </button>
        </div>
      </div>

      {/* Website Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {websites.map((site) => {
          const isUp = site.last_status !== null && site.last_status >= 200 && site.last_status < 400;

          return (
            <div
              key={site.id}
              className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-text-primary tracking-tight">{site.name}</h3>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">
                      {site.check_type}
                    </span>
                  </div>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-text-muted hover:text-primary flex items-center gap-1 font-mono truncate max-w-xs"
                  >
                    {site.url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <StatusBadge status={isUp ? 'healthy' : 'critical'} size="sm" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <span className="text-[10px] text-text-muted block">HTTP Status</span>
                  <span className={`font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {site.last_status || 'Failed'}
                  </span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <span className="text-[10px] text-text-muted block">Latency</span>
                  <span className="font-mono text-primary font-medium">
                    {site.last_latency_ms !== null ? `${Math.round(site.last_latency_ms)} ms` : '--'}
                  </span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <span className="text-[10px] text-text-muted block">SSL Expiry</span>
                  <span className="font-mono text-text-primary font-medium">
                    {site.ssl_expiry_days !== null ? `${site.ssl_expiry_days} days` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Clock className="w-3 h-3" />
                  <span>
                    Checked: {site.last_checked_at ? new Date(site.last_checked_at).toLocaleTimeString() : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCheckNow(site.id)}
                    className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-primary transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Check Now
                  </button>
                  <button
                    onClick={() => handleDelete(site.id)}
                    className="p-1 rounded text-text-muted hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Website Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAddWebsite}
            className="bg-surface-elevated border border-border w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">Add Monitored Endpoint</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                Cancel
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-text-secondary block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., My Portfolio / API Service"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-text-secondary block mb-1">Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Check Type</label>
                  <select
                    value={newSite.check_type}
                    onChange={(e) => setNewSite({ ...newSite, check_type: e.target.value as any })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="HTTP">HTTP/HTTPS</option>
                    <option value="TCP">TCP Port Probe</option>
                  </select>
                </div>

                <div>
                  <label className="text-text-secondary block mb-1">Check Interval</label>
                  <select
                    value={newSite.interval_sec}
                    onChange={(e) => setNewSite({ ...newSite, interval_sec: parseInt(e.target.value, 10) })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="30">Every 30s</option>
                    <option value="60">Every 1m</option>
                    <option value="300">Every 5m</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allow_private"
                  checked={newSite.allow_private_ip}
                  onChange={(e) => setNewSite({ ...newSite, allow_private_ip: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-0"
                />
                <label htmlFor="allow_private" className="text-text-muted text-[11px]">
                  Allow LAN / Private RFC1918 IPs (Bypass SSRF Guard)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-xs text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm"
              >
                Save Monitor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
