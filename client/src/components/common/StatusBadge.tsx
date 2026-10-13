import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', pulse = false }) => {
  const norm = status.toLowerCase();

  let colorClasses = 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  let dotClass = 'bg-slate-400';

  if (['healthy', 'active', 'running', 'up', 'connected'].includes(norm)) {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    dotClass = 'bg-emerald-400';
  } else if (['warning', 'degraded', 'starting', 'paused'].includes(norm)) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotClass = 'bg-amber-400';
  } else if (['critical', 'failed', 'down', 'exited', 'unhealthy', 'disconnected'].includes(norm)) {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotClass = 'bg-rose-400';
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        colorClasses
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', dotClass, pulse && 'animate-ping')} />
      {status}
    </span>
  );
};
