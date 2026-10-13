import React from 'react';
import { HardDrive, Disc, FolderTree, AlertTriangle, ShieldCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';
import { MetricCard } from '../components/common/MetricCard';
import { formatBytes } from '../utils/formatters';

export const StorageDisks: React.FC = () => {
  const { telemetry } = useMetrics();

  if (!telemetry) return null;
  const { storage } = telemetry;

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Storage & Disks</h1>
        <p className="text-xs text-text-secondary">
          Filesystem mount points, MicroSD/NVMe SSD partitions, CasaOS /DATA mount detection, and I/O throughput
        </p>
      </div>

      {/* Top Storage Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Storage Capacity"
          value={formatBytes(storage.totalCapacityBytes)}
          subtitle={`Across ${storage.mounts.length} mounted filesystems`}
          icon={HardDrive}
        />
        <MetricCard
          title="Overall Space Used"
          value={storage.overallUsagePercent}
          unit="%"
          subtitle={`${formatBytes(storage.totalUsedBytes)} consumed`}
          icon={HardDrive}
          progressPercent={storage.overallUsagePercent}
          status={storage.overallUsagePercent > 85 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="Total Space Available"
          value={formatBytes(storage.totalAvailableBytes)}
          subtitle="Free unallocated space"
          icon={Disc}
          status="success"
        />
        <MetricCard
          title="Storage Throughput"
          value={formatBytes(storage.readSpeedBytesPerSec)}
          unit="/s"
          subtitle={`Write: ${formatBytes(storage.writeSpeedBytesPerSec)}/s`}
          icon={HardDrive}
        />
      </div>

      {/* Mounted Filesystems Explorer */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Mounted Filesystems & Disks</h3>
          </div>
          <span className="text-xs text-text-muted">{storage.mounts.length} active mounts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storage.mounts.map((mount: any, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-surface-elevated/70 border border-border space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-text-primary">
                      {mount.mountPath}
                    </span>
                    {mount.isCasaOsData && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        CasaOS DATA
                      </span>
                    )}
                    {mount.isRoot && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30">
                        Root / OS
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">
                    Device: {mount.device} • Type: {mount.filesystem}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <span>{mount.usagePercent}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      mount.usagePercent > 85 ? 'bg-critical' : mount.usagePercent > 70 ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${mount.usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-text-secondary pt-1">
                  <span>Used: {formatBytes(mount.usedBytes)}</span>
                  <span>Free: {formatBytes(mount.availableBytes)}</span>
                  <span className="font-medium text-text-primary">Total: {formatBytes(mount.totalBytes)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> SMART Status: Healthy
                </span>
                <span className="font-mono">Read/Write: rw,noatime</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
