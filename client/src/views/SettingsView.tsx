import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Bell,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<string | null>(null);

  const fetchSettingsAndAudit = async () => {
    try {
      setIsLoading(true);
      const [resSettings, resAudit] = await Promise.all([
        fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/settings/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resSettings.ok) setSettings((await resSettings.json()).settings || {});
      if (resAudit.ok) setAuditLogs((await resAudit.json()).auditLogs || []);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndAudit();
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving settings...');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveStatus('Settings updated successfully.');
        fetchSettingsAndAudit();
      } else {
        setSaveStatus('Failed to save settings.');
      }
    } catch (e: any) {
      setSaveStatus(e.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus('Changing password...');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwStatus('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        fetchSettingsAndAudit();
      } else {
        setPwStatus(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setPwStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Platform Settings</h1>
        <p className="text-xs text-text-secondary">
          System telemetry thresholds, notification channel credentials, container authorization, and administrative audit trails
        </p>
      </div>

      {saveStatus && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary flex items-center justify-between">
          <span>{saveStatus}</span>
          <button onClick={() => setSaveStatus(null)} className="hover:underline">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Monitoring Thresholds */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Default Alert Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-text-secondary block mb-1">CPU Temp Warning (°C)</label>
              <input
                type="number"
                value={settings.cpu_temp_threshold || '80'}
                onChange={(e) => setSettings({ ...settings, cpu_temp_threshold: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">CPU Usage Sustained (%)</label>
              <input
                type="number"
                value={settings.cpu_usage_threshold || '90'}
                onChange={(e) => setSettings({ ...settings, cpu_usage_threshold: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">RAM Consumption (%)</label>
              <input
                type="number"
                value={settings.ram_usage_threshold || '90'}
                onChange={(e) => setSettings({ ...settings, ram_usage_threshold: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">Storage Space Warning (%)</label>
              <input
                type="number"
                value={settings.disk_usage_threshold || '85'}
                onChange={(e) => setSettings({ ...settings, disk_usage_threshold: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>

        {/* Security & Docker Permissions */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-warning" />
            Privileged Container Lifecycle Controls
          </h3>

          <div className="p-4 rounded-lg bg-surface-elevated border border-border/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-primary block">
                Enable Remote Container Controls (Start / Stop / Restart)
              </span>
              <p className="text-[11px] text-text-muted leading-relaxed max-w-2xl">
                When enabled, authenticated administrators can issue container restart, stop, and start commands.
                Disabled by default to protect existing critical services (e.g., CasaOS, Nginx, MongoDB).
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.enable_docker_controls === 'true'}
                onChange={(e) =>
                  setSettings({ ...settings, enable_docker_controls: e.target.checked ? 'true' : 'false' })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
            </label>
          </div>
        </div>

        {/* Notification Credentials */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Telegram & SMTP Dispatch Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Telegram config */}
            <div className="p-4 rounded-lg bg-surface-elevated border border-border/80 space-y-3">
              <span className="font-semibold text-text-primary block">Telegram Integration</span>
              <div>
                <label className="text-text-secondary block mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  value={settings.telegram_bot_token || ''}
                  onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-text-secondary block mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  placeholder="-1001234567890"
                  value={settings.telegram_chat_id || ''}
                  onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>
            </div>

            {/* SMTP config */}
            <div className="p-4 rounded-lg bg-surface-elevated border border-border/80 space-y-3">
              <span className="font-semibold text-text-primary block">SMTP Email Integration</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-text-secondary block mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.example.com"
                    value={settings.smtp_host || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-text-secondary block mb-1">Port</label>
                  <input
                    type="text"
                    placeholder="587"
                    value={settings.smtp_port || '587'}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-text-secondary block mb-1">Recipient Alert Email</label>
                <input
                  type="email"
                  placeholder="alerts@domain.com"
                  value={settings.smtp_to || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_to: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            Save System Settings
          </button>
        </div>
      </form>

      {/* Admin Password Change */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          Administrator Password
        </h3>

        {pwStatus && (
          <div className="p-3 rounded-lg bg-surface-elevated text-xs font-medium text-primary">
            {pwStatus}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs max-w-xl">
          <div>
            <label className="text-text-secondary block mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-1">New Password (Min 6 chars)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-primary text-xs font-medium transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Security Audit Log */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Administrative Security Audit Trail
          </h3>
          <span className="text-xs text-text-muted">{auditLogs.length} events logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-elevated/70 text-text-muted border-b border-border">
              <tr>
                <th className="px-3 py-2 font-medium">Timestamp</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Details</th>
                <th className="px-3 py-2 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-text-secondary">
              {auditLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-surface-elevated/40">
                  <td className="px-3 py-2 text-text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 text-text-primary font-semibold">{log.username}</td>
                  <td className="px-3 py-2 text-primary font-medium">{log.action}</td>
                  <td className="px-3 py-2 text-text-primary truncate max-w-sm">{log.details}</td>
                  <td className="px-3 py-2 text-text-muted">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
