import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SystemTelemetry } from '../types';
import { useAuth } from './AuthContext';

export interface TelemetryHistoryPoint {
  time: string;
  cpu: number;
  temp: number;
  ram: number;
  rxSpeed: number;
  txSpeed: number;
}

interface MetricsContextType {
  telemetry: SystemTelemetry | null;
  history: TelemetryHistoryPoint[];
  isConnected: boolean;
  isPaused: boolean;
  togglePause: () => void;
  lastUpdate: Date | null;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [history, setHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsConnected(false);
      return;
    }

    const eventSource = new EventSource(`/api/metrics/live?token=${encodeURIComponent(token)}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (isPausedRef.current) return;
      try {
        const data: SystemTelemetry = JSON.parse(event.data);
        setTelemetry(data);
        setLastUpdate(new Date());

        const point: TelemetryHistoryPoint = {
          time: new Date().toTimeString().split(' ')[0],
          cpu: data.cpu.totalUsagePercent,
          temp: data.cpu.temperatureCelsius,
          ram: data.memory.usagePercent,
          rxSpeed: data.network.totalRxSpeedBytesPerSec,
          txSpeed: data.network.totalTxSpeedBytesPerSec,
        };

        setHistory((prev) => {
          const next = [...prev, point];
          return next.slice(-40); // Keep last 40 ticks (~60 seconds)
        });
      } catch (e) {
        console.error('Failed to parse telemetry stream:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, token]);

  const togglePause = () => setIsPaused((p) => !p);

  return (
    <MetricsContext.Provider
      value={{
        telemetry,
        history,
        isConnected,
        isPaused,
        togglePause,
        lastUpdate,
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
};

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) throw new Error('useMetrics must be used within a MetricsProvider');
  return context;
};
