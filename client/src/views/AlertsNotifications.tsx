import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  Clock,
  Mail,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { AlertRule, AlertHistoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const AlertsNotifications: React.FC = () => {
  const { token } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    metric_type: 'cpu_temp',
    condition: '>' as '>' | '<' | '==' | '!=',
    threshold: 80,
    duration_sec: 60,
    severity: 'warning' as 'critical' | 'warning' | 'info',
  });

  const fetchData = async () => {
    try {
      const [resRules, resHistory] = await Promise.all([
        fetch('/api/alerts/rules', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/alerts/history', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resRules.ok) setRules((await resRules.json()).rules || []);
      if (resHistory.ok) setHistory((await resHistory.json()).history || []);
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newRule, enabled: true }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewRule({
          name: '',
          metric_type: 'cpu_temp',
          condition: '>',
          threshold: 80,
          duration_sec: 60,
          severity: 'warning',
        });
        fetchData();
      }
    } catch {}
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await fetch(`/api/alerts/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch {}
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await fetch(`/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch {}
  };

  const testTelegram = async () => {
    setTelegramStatus('Sending...');
    try {
      const res = await fetch('/api/alerts/test-telegram', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTelegramStatus(data.message || (data.success ? 'Sent successfully' : 'Failed'));
    } catch (e: any) {
      setTelegramStatus(e.message);
    }
  };

  const testSmtp = async () => {
    setSmtpStatus('Sending...');
    try {
      const res = await fetch('/api/alerts/test-smtp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSmtpStatus(data.message || (data.success ? 'Sent successfully' : 'Failed'));
    } catch (e: any) {
      setSmtpStatus(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Alerts & Notifications</h1>
            <p className="text-xs text-text-secondary">
              Continuous threshold evaluation, anti-spam notification cooldowns, and Telegram & SMTP dispatch channels
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Alert Rule
          </button>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {history.filter((h) => h.state === 'active').length > 0 && (
        <div className="bg-critical/10 border border-critical/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-critical font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Active Triggered Subsystem Incidents</span>
          </div>

          <div className="space-y-2">
            {history
              .filter((h) => h.state === 'active')
              .map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-surface border border-critical/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium text-text-primary">
                      <span>{alert.rule_name}</span>
                      <StatusBadge status={alert.severity} size="sm" pulse />
                    </div>
                    <p className="text-text-secondary">{alert.message}</p>
                  </div>

                  {!alert.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 rounded bg-critical text-white text-xs font-semibold hover:bg-rose-600 transition-colors shadow-sm"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="text-[11px] text-text-muted">Acknowledged</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Notification Dispatch Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telegram Bot */}
        <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-secondary" />
              <h3 className="font-semibold text-sm text-text-primary">Telegram Push Bot</h3>
            </div>
            <button
              onClick={testTelegram}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors"
            >
              <Send className="w-3 h-3 text-secondary" /> Test Push
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            Instant priority incident notifications with HTML formatting delivered to your mobile Telegram client
          </p>
          {telegramStatus && (
            <div className="p-2 rounded bg-surface-elevated text-[11px] font-mono text-secondary">
              {telegramStatus}
            </div>
          )}
        </div>

        {/* Email SMTP */}
        <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-text-primary">Email SMTP Relay</h3>
            </div>
            <button
              onClick={testSmtp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors"
            >
              <Send className="w-3 h-3 text-primary" /> Test Email
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            Outbound SMTP alerts for sustained outages, server restart events, and hardware temperature spikes
          </p>
          {smtpStatus && (
            <div className="p-2 rounded bg-surface-elevated text-[11px] font-mono text-primary">
              {smtpStatus}
            </div>
          )}
        </div>
      </div>

      {/* Configured Alert Rules */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Active Monitoring Rules ({rules.length})
        </h3>

        <div className="divide-y divide-border/40">
          {rules.map((r) => (
            <div key={r.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary">{r.name}</span>
                  <StatusBadge status={r.severity} size="sm" />
                </div>
                <p className="text-text-muted font-mono">
                  Trigger condition: {r.metric_type} {r.condition} {r.threshold} (duration: {r.duration_sec}s)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteRule(r.id)}
                  className="p-1 rounded text-text-muted hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Alert Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateRule}
            className="bg-surface-elevated border border-border w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">Create Alert Threshold Rule</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-text-secondary block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Thermal Spike"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Target Metric</label>
                  <select
                    value={newRule.metric_type}
                    onChange={(e) => setNewRule({ ...newRule, metric_type: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="cpu_temp">CPU Temperature (°C)</option>
                    <option value="cpu_usage">CPU Usage (%)</option>
                    <option value="ram_usage">RAM Usage (%)</option>
                    <option value="disk_usage">Storage Usage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-text-secondary block mb-1">Condition</label>
                  <select
                    value={newRule.condition}
                    onChange={(e) => setNewRule({ ...newRule, condition: e.target.value as any })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value="<">Less than (&lt;)</option>
                    <option value="==">Equal to (==)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary block mb-1">Threshold Value</label>
                  <input
                    type="number"
                    required
                    value={newRule.threshold}
                    onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-text-secondary block mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
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
                Save Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
