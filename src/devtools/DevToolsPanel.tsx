import React from 'react';
import { DevConsolePanel } from '../components/DevConsole/DevConsolePanel';

// Chrome Extension DevTools Panel
// Uses the existing DevConsole UI components

interface DevToolsPanelProps {}

const DevToolsPanel: React.FC<DevToolsPanelProps> = () => {
  // The DevConsolePanel component handles everything
  // In a Chrome extension context, it will adapt automatically
  return (
    <div className="h-screen w-full overflow-hidden">
      <DevConsolePanel />
    </div>
  );
};

export default DevToolsPanel;