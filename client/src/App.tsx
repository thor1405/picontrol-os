import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MetricsProvider } from './context/MetricsContext';
import { Shell } from './components/layout/Shell';
import { NavSection } from './components/layout/Sidebar';
import { LoginView } from './views/LoginView';

// 13 Views
import { Overview } from './views/Overview';
import { SystemPerformance } from './views/SystemPerformance';
import { CpuTemperature } from './views/CpuTemperature';
import { MemoryProcesses } from './views/MemoryProcesses';
import { StorageDisks } from './views/StorageDisks';
import { NetworkAnalytics } from './views/NetworkAnalytics';
import { DockerContainers } from './views/DockerContainers';
import { ApplicationsServices } from './views/ApplicationsServices';
import { WebsiteMonitoring } from './views/WebsiteMonitoring';
import { SystemLogs } from './views/SystemLogs';
import { AlertsNotifications } from './views/AlertsNotifications';
import { HistoricalAnalytics } from './views/HistoricalAnalytics';
import { SettingsView } from './views/SettingsView';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Loading PiControl OS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <MetricsProvider>
      <Shell currentSection={currentSection} onSelectSection={setCurrentSection}>
        {currentSection === 'overview' && <Overview />}
        {currentSection === 'performance' && <SystemPerformance />}
        {currentSection === 'cpu' && <CpuTemperature />}
        {currentSection === 'memory' && <MemoryProcesses />}
        {currentSection === 'storage' && <StorageDisks />}
        {currentSection === 'network' && <NetworkAnalytics />}
        {currentSection === 'docker' && <DockerContainers />}
        {currentSection === 'services' && <ApplicationsServices />}
        {currentSection === 'websites' && <WebsiteMonitoring />}
        {currentSection === 'logs' && <SystemLogs />}
        {currentSection === 'alerts' && <AlertsNotifications />}
        {currentSection === 'analytics' && <HistoricalAnalytics />}
        {currentSection === 'settings' && <SettingsView />}
      </Shell>
    </MetricsProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
