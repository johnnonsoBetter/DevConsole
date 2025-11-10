/**
 * DevConsolePanel Component - Refactored
 * Main developer console with tabs for logs, network, GraphQL, AI APIs, and tools
 * Provides comprehensive debugging and development utilities
 * ALL panels are lazy-loaded for optimal performance
 */

import {
  Terminal,
  Network,
  Activity,
  Zap,
  Sparkles,
  Settings,
  Camera,
  Github,
  Download,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { useState, useCallback, lazy, Suspense } from 'react';
import { useDevConsoleStore } from '../../utils/stores/devConsole';
import type { ConsoleTab } from '../../utils/stores/devConsole';
import { useGitHubSettings } from '../../hooks/useGitHubSettings';
import { ThemeToggle } from './ThemeToggle';
import { GitHubIssueSlideout } from './GitHubIssueSlideout';

// ============================================================================
// LAZY LOADED PANELS - Improves initial load time
// ============================================================================

const LogsPanel = lazy(() => import('./panels').then(module => ({ default: module.LogsPanel })));
const NetworkPanel = lazy(() => import('./panels').then(module => ({ default: module.NetworkPanel })));
const GraphQLExplorer = lazy(() => import('./GraphQLExplorer').then(module => ({ default: module.GraphQLExplorer })));
const AIPanel = lazy(() => import('./AIPanel').then(module => ({ default: module.AIPanel })));
const ToolsPanel = lazy(() => import('./panels').then(module => ({ default: module.ToolsPanel })));
const GitHubSettingsPanel = lazy(() => import('./GitHubSettingsPanel').then(module => ({ default: module.GitHubSettingsPanel })));

// ============================================================================
// TYPES
// ============================================================================

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Tab configuration with icons and labels */
const CONSOLE_TABS: Array<{ id: ConsoleTab; label: string; icon: any }> = [
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'graphql', label: 'GraphQL', icon: Zap },
  { id: 'ai', label: 'AI APIs', icon: Sparkles },
  { id: 'tools', label: 'Tools', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ============================================================================
// LOADING FALLBACK COMPONENT
// ============================================================================

function PanelLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading panel...</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DEVELOPER CONSOLE COMPONENT
// ============================================================================

export interface DevConsolePanelProps {
  githubConfig?: GitHubConfig;
}

export function DevConsolePanel({ githubConfig }: DevConsolePanelProps = {}) {
  const { activeTab, unreadErrorCount, setActiveTab, logsToBeExported } = useDevConsoleStore();
  const { settings: githubSettings } = useGitHubSettings();
  const [showGitHubIssueSlideout, setShowGitHubIssueSlideout] = useState(false);

  // Use prop githubConfig if provided, otherwise use settings from hook
  const effectiveGithubConfig =
    githubConfig ||
    (githubSettings
      ? {
          username: githubSettings.username,
          repo: githubSettings.repo,
          token: githubSettings.token,
        }
      : null);

  /**
   * Capture screenshot of current tab
   * Downloads as PNG file with timestamp
   */
  const handleCaptureScreenshot = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        alert('❌ Unable to capture screenshot: No active tab found');
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `screenshot-${Date.now()}.png`;
      link.click();

      console.log('📸 Screenshot captured successfully!');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert(
        '❌ Failed to capture screenshot. Make sure the extension has the necessary permissions.'
      );
    }
  }, []);

  /**
   * Export all data as JSON file
   */
  const handleExportData = useCallback(() => {
    const data = logsToBeExported || '';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devconsole-${Date.now()}.json`;
    a.click();
    // Clean up blob URL to prevent memory leak
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [logsToBeExported]);

  return (
    <>
      {/* GitHub Issue Slideout - Available from any tab */}
      <GitHubIssueSlideout
        isOpen={showGitHubIssueSlideout}
        onClose={() => setShowGitHubIssueSlideout(false)}
        selectedLog={null}
        githubConfig={effectiveGithubConfig || undefined}
        onOpenSettings={() => setActiveTab('settings')}
      />

      <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-secondary/5">
          {/* Left: Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Developer Console
              </h2>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</p>
            </div>

            {unreadErrorCount > 0 && (
              <div className="px-2 py-0.5 bg-destructive text-white text-xs font-semibold rounded-full">
                {unreadErrorCount} errors
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" className="sm:h-9 sm:w-9" />

            {/* Screenshot Button */}
            <button
              onClick={handleCaptureScreenshot}
              className="relative p-2 flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
              title="Capture Screenshot"
              aria-label="Capture screenshot of current page"
            >
              <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
              title="Open Settings"
              aria-label="Open GitHub integration settings"
            >
              <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors" />
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportData}
              className="relative p-2 flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
              title="Export All Data"
              aria-label="Export all console data as JSON"
            >
              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors" />
            </button>

            {/* GitHub Create Issue Button */}
            {effectiveGithubConfig?.username &&
              effectiveGithubConfig?.repo &&
              effectiveGithubConfig?.token && (
                <button
                  onClick={() => setShowGitHubIssueSlideout(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-success hover:bg-success/90 text-white rounded-lg text-sm font-medium transition-colors shadow-apple-sm shrink-0"
                  title="Create GitHub Issue"
                >
                  <Github className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Issue</span>
                </button>
              )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ConsoleTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <TabsList className="w-full h-auto justify-start overflow-x-auto scrollbar-hide md:scrollbar-thin">
              {CONSOLE_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 min-h-[40px] min-w-fit data-[state=active]:scale-[0.98] sm:data-[state=active]:scale-100"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline truncate">{tab.label}</span>
                    <span className="sm:hidden text-xs font-medium">{tab.label.slice(0, 3)}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Content with Lazy Loading */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="logs" className="h-full m-0">
              <Suspense fallback={<PanelLoadingFallback />}>
                <LogsPanel
                  githubConfig={effectiveGithubConfig || undefined}
                  onOpenSettings={() => setActiveTab('settings')}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="network" className="h-full m-0">
              <Suspense fallback={<PanelLoadingFallback />}>
                <NetworkPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="graphql" className="h-full m-0">
              <Suspense fallback={<PanelLoadingFallback />}>
                <GraphQLExplorer />
              </Suspense>
            </TabsContent>

            <TabsContent value="ai" className="h-full m-0">
              <Suspense fallback={<PanelLoadingFallback />}>
                <AIPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="tools" className="h-full m-0">
              <Suspense fallback={<PanelLoadingFallback />}>
                <ToolsPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0">
              <Suspense fallback={<PanelLoadingFallback />}>
                <GitHubSettingsPanel />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
