import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  progressPercent?: number;
  status?: 'normal' | 'warning' | 'critical' | 'success';
  className?: string;
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  progressPercent,
  status = 'normal',
  className,
  children,
}) => {
  let progressColor = 'bg-primary';
  let badgeColor = 'text-primary bg-primary/10 border-primary/20';

  if (status === 'warning') {
    progressColor = 'bg-warning';
    badgeColor = 'text-warning bg-warning/10 border-warning/20';
  } else if (status === 'critical') {
    progressColor = 'bg-critical';
    badgeColor = 'text-critical bg-critical/10 border-critical/20';
  } else if (status === 'success') {
    progressColor = 'bg-success';
    badgeColor = 'text-success bg-success/10 border-success/20';
  }

  return (
    <div
      className={clsx(
        'bg-surface border border-border hover:border-border-light transition-all duration-200 rounded-xl p-5 shadow-sm relative overflow-hidden group',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {title}
          </span>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl lg:text-3xl font-semibold tracking-tight text-text-primary">
              {value}
            </span>
            {unit && <span className="text-sm font-medium text-text-secondary">{unit}</span>}
          </div>
        </div>

        {Icon && (
          <div className={clsx('p-2.5 rounded-lg border', badgeColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {progressPercent !== undefined && (
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
            <div
              className={clsx('h-full transition-all duration-500 rounded-full', progressColor)}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {subtitle && (
        <p className="mt-3 text-xs text-text-secondary line-clamp-1">
          {subtitle}
        </p>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};
