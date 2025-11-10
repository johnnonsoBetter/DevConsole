import React, { useEffect, useState } from 'react';
import { DevConsolePanel, type GitHubConfig } from '../components/DevConsole/DevConsolePanel';
import { Toaster } from 'sonner';
import { initializeBackgroundBridge } from './backgroundBridge';
import { loadGitHubConfig } from '../utils/extensionSettings';
import { SettingsPanel } from '../components/DevConsole/SettingsPanel';
import { Settings } from 'lucide-react';

// Chrome Extension DevTools Panel
// Uses the existing DevConsole UI components

interface DevToolsPanelProps {}

const DevToolsPanel: React.FC<DevToolsPanelProps> = () => {
  const [githubConfig, setGithubConfig] = useState<GitHubConfig | undefined>();
  const [showSettings, setShowSettings] = useState(false);

  // Initialize bridge to background script
  useEffect(() => {
    initializeBackgroundBridge();
  }, []);

  // Load GitHub config from storage
  useEffect(() => {
    loadGitHubConfig().then((config) => {
      if (config) {
        setGithubConfig(config);
      }
    });
  }, []);

  const handleSaveSettings = (config: GitHubConfig) => {
    setGithubConfig(config);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white dark:bg-gray-950 relative">
      {/* Settings Button */}
     

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />

      {/* Main Console */}
      <DevConsolePanel githubConfig={githubConfig} />
      <Toaster position="top-right" />
    </div>
  );
};

export default DevToolsPanel;