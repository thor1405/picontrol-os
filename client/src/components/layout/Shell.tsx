import React, { useState } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { TopNav } from './TopNav';

interface ShellProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  currentSection,
  onSelectSection,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={onSelectSection}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
