import React, { useState, useEffect } from 'react';
import {
  Clock,
  Radio,
  Play,
  Pause,
  LogOut,
  User,
  Server,
  Cpu,
  Sun,
  Moon,
} from 'lucide-react';
import { useMetrics } from '../../context/MetricsContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { formatUptime } from '../../utils/formatters';

export const TopNav: React.FC = () => {
  const { telemetry, isConnected, isPaused, togglePause, lastUpdate } = useMetrics();
  const { user, logout } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('picontrol_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('picontrol_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const health = telemetry?.system.overallHealth || 'healthy';

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Device & System Info */}
      <div className="flex items-center gap-3 lg:gap-6">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-text-primary tracking-tight">
            {telemetry?.system.hostname || 'raspberrypi'}
          </span>
          <span className="hidden md:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border">
            {telemetry?.system.model || 'Raspberry Pi 5'}
          </span>
          <span className="hidden lg:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">
            {telemetry?.system.architecture || 'ARM64'}
          </span>
        </div>

        {/* Live System Health Pill */}
        <div className="hidden sm:flex items-center gap-2">
          <StatusBadge status={health} size="sm" pulse={health === 'critical'} />
        </div>
      </div>

      {/* Right Controls: Stream controls, Clock, Uptime, Profile */}
      <div className="flex items-center gap-3 lg:gap-5">
        {/* Live SSE Stream Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            <Radio className={`w-3 h-3 ${isConnected && !isPaused ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">
              {isConnected ? (isPaused ? 'Paused' : 'Live Stream') : 'Offline'}
            </span>
          </div>

          <button
            onClick={togglePause}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-colors"
            title={isPaused ? 'Resume Real-time Updates' : 'Pause Real-time Updates'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-primary" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* System Uptime */}
        {telemetry && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-text-secondary">
            <Cpu className="w-3.5 h-3.5 text-text-muted" />
            <span>Up {formatUptime(telemetry.system.uptimeSeconds)}</span>
          </div>
        )}

        {/* Local Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-text-secondary">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>{timeStr || '00:00:00'}</span>
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 text-xs"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-secondary">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="hidden sm:inline text-xs font-medium text-text-primary">
              {user?.username || 'admin'}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-surface-elevated transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
