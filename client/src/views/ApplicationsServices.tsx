import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Server } from 'lucide-react';
import { ServiceStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const ApplicationsServices: React.FC = () => {
  const { token } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/services/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.services && data.services.length > 0) {
          setServices(data.services);
        }
      }
    } catch (e) {
      console.error('Failed to probe services:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="p-5 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Applications & Services</h1>
            <p className="text-xs text-text-secondary">
              Health, uptime, port bindings, and operational status of server daemons and hosted services
            </p>
          </div>
          <button
            onClick={fetchServices}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-xs text-text-primary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {isLoading && services.length === 0 ? (
        <div className="p-12 rounded-xl bg-surface border border-border text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Probing host ports and service daemons...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 rounded-xl bg-surface border border-border text-center space-y-3">
          <Server className="w-8 h-8 text-text-muted mx-auto" />
          <h3 className="text-sm font-semibold text-text-primary">No Services Reported</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Unable to connect to the service monitoring daemon. Click below to probe again.
          </p>
          <button
            onClick={fetchServices}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover"
          >
            Probe Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-text-primary">{svc.name}</h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">
                      {svc.category}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{svc.description}</p>
                </div>
                <StatusBadge status={svc.status} size="sm" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <span className="text-[10px] text-text-muted block">Check Type</span>
                  <span className="font-mono text-text-primary uppercase font-medium">{svc.checkType}</span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <span className="text-[10px] text-text-muted block">Binding Port</span>
                  <span className="font-mono text-primary font-medium">{svc.port || 'Socket/Proc'}</span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <span className="text-[10px] text-text-muted block">Continuous Uptime</span>
                  <span className="font-mono text-emerald-500 font-medium">{svc.uptimeHours} hrs</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted">
                <span>Last Probe: {new Date(svc.lastChecked).toLocaleTimeString()}</span>
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Isolated & Monitored
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
