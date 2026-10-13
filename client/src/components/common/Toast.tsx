import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClass = 'border-primary/30 bg-surface-elevated text-primary';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClass = 'border-success/30 bg-surface-elevated text-success';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClass = 'border-critical/30 bg-surface-elevated text-critical';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${colorClass}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-semibold text-text-primary">{toast.title}</h4>
              {toast.message && <p className="text-xs text-text-secondary">{toast.message}</p>}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-text-muted hover:text-text-primary p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
