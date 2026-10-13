import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Layers,
  HardDrive,
  Network,
  Boxes,
  Server,
  Globe,
  Terminal,
  Bell,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMetrics } from '../../context/MetricsContext';

export type NavSection =
  | 'overview'
  | 'performance'
  | 'cpu'
  | 'memory'
  | 'storage'
  | 'network'
  | 'docker'
  | 'services'
  | 'websites'
  | 'logs'
  | 'alerts'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { telemetry } = useMetrics();

  const navItems: Array<{ id: NavSection; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'performance', label: 'System Performance', icon: Activity },
    { id: 'cpu', label: 'CPU & Temperature', icon: Cpu },
    { id: 'memory', label: 'Memory & Processes', icon: Layers },
    { id: 'storage', label: 'Storage & Disks', icon: HardDrive },
    { id: 'network', label: 'Network Analytics', icon: Network },
    { id: 'docker', label: 'Docker Containers', icon: Boxes },
    { id: 'services', label: 'Applications & Services', icon: Server },
    { id: 'websites', label: 'Website Monitoring', icon: Globe },
    { id: 'logs', label: 'System Logs', icon: Terminal },
    { id: 'alerts', label: 'Alerts & Notifications', icon: Bell },
    { id: 'analytics', label: 'Historical Analytics', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={clsx(
        'bg-sidebar border-r border-border h-screen flex flex-col transition-all duration-300 select-none z-30 sticky top-0',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
            <span className="font-bold text-white tracking-wider text-sm">Pi</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-semibold text-text-primary text-sm tracking-tight flex items-center gap-1.5">
                PiControl <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">OS</span>
              </span>
              <span className="text-[10px] text-text-muted truncate">Raspberry Pi 5 Server</span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={clsx(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {/* Status dot for Overview */}
              {item.id === 'overview' && telemetry && (
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full ml-auto',
                    telemetry.system.overallHealth === 'healthy'
                      ? 'bg-emerald-500'
                      : telemetry.system.overallHealth === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-border/80 bg-sidebar/50">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>CasaOS Compatible</span>
              </span>
              <span className="text-[10px] font-mono text-primary">v1.0.0</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="System Online" />
          </div>
        )}
      </div>
    </aside>
  );
};
