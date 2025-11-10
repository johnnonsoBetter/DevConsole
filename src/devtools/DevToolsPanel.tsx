import React, { useEffect, useState } from 'react';
import { DevConsolePanel, type GitHubConfig } from '../components/DevConsole/DevConsolePanel';
import { Toaster } from 'sonner';
import { initializeBackgroundBridge } from './backgroundBridge';
import { loadGitHubConfig } from '@/utils/extensionSettings';

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
   const  _loadGitHubConfig = async () => {
      const config = await loadGitHubConfig(); 
      if (config) {
        setGithubConfig(config);
      }
    }

    _loadGitHubConfig()
  }, []);

  const handleSaveSettings = (config: GitHubConfig) => {
    setGithubConfig(config);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white dark:bg-gray-950 relative">
      {/* Settings Button */}
     

   
      {/* Main Console */}
      <DevConsolePanel githubConfig={githubConfig} />
    </div>
  );
};

export default DevToolsPanel;