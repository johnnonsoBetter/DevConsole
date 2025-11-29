/**
 * DevConsolePanel Component
 * Main developer console with tabs for logs, network, GraphQL, AI APIs, and tools
 * Provides comprehensive debugging and development utilities
 */

import {
    Activity,
    BookOpen,
    Download,
    Github,
    Info,
    Network,
    RefreshCw,
    Send,
    Settings,
    Terminal,
    Zap
} from 'lucide-react';
import { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
    copyContextPackToClipboard,
    createContextPack,
    exportContextPack,
} from '../../lib/devConsole/contextPacker';
import {
    useDevConsoleStore
} from '../../utils/stores/devConsole';
const GraphQLExplorer = lazy(() => import('../DevConsole/GraphQLExplorerV2').then(module => ({default: module.GraphQLExplorerV2})));

import { StickyNoteButton } from '../../features/notes';
import { useCodeActionsStore, useGitHubIssueSlideoutStore } from '../../utils/stores';
import { useAISettingsStore } from '../../utils/stores/aiSettings';
import { useGitHubSettingsStore } from '../../utils/stores/githubSettings';
import { BetterTabs } from '../ui/better-tabs';
import { GitHubIssueSlideout } from './GitHubIssueSlideout';
import { GitHubIssuesTab } from './GitHubIssuesTab';
import { CodeActionsPanel } from './panels/CodeActionsPanel';
import { LogsPanel } from './panels/LogsPanel';
import { NetworkPanel } from './panels/NetworkPanel';
import { NotesPanel } from './panels/NotesPanel';
import { ThemeToggle } from './ThemeToggle';
import { UnifiedSettingsPanel } from './UnifiedSettingsPanel';

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
const CONSOLE_TABS = [
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'actions', label: 'Actions', icon: Send },
  { id: 'graphql', label: 'GraphQL', icon: Zap },
  { id: 'tools', label: 'Tools', icon: Activity },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;


// ============================================================================
// MAIN DEVELOPER CONSOLE COMPONENT
// ============================================================================

export interface DevConsolePanelProps {
  githubConfig?: GitHubConfig;
}

export function DevConsolePanel({ githubConfig }: DevConsolePanelProps = {}) {
  const { unreadErrorCount } = useDevConsoleStore();
  const [activeTab, setActiveTab] = useState<string>(CONSOLE_TABS[0].id);

  const githubSettings = useGitHubSettingsStore();
  // Load AI and GitHub settings globally when DevConsole mounts
  const { loadSettings: loadAISettings } = useAISettingsStore();
  const { loadSettings: loadGitHubSettings } = useGitHubSettingsStore();
  
  useEffect(() => {
    // Load settings once on mount
    loadAISettings();
    loadGitHubSettings();
  }, [loadAISettings, loadGitHubSettings]);

  const githubSlideoutStore = useGitHubIssueSlideoutStore();

  // Get pending actions count for badge
  const pendingActionsCount = useCodeActionsStore((state) =>
    state.actions.filter(
      (a) => a.status === 'queued' || a.status === 'sending' || a.status === 'processing'
    ).length
  );

  // Use prop githubConfig if provided, otherwise use settings from store
  const effectiveGithubConfig =
    githubConfig ||
    (githubSettings.username && githubSettings.repo && githubSettings.token
      ? {
          username: githubSettings.username,
          repo: githubSettings.repo,
          token: githubSettings.token,
        }
      : null);


  // Transform CONSOLE_TABS into BetterTabs format
  const betterTabs = useMemo(
    () =>
      CONSOLE_TABS.map((tab) => {
        const IconComponent = tab.icon;
        // Determine badge for each tab
        let badge: number | undefined;
        if (tab.id === 'logs' && unreadErrorCount > 0) {
          badge = unreadErrorCount;
        } else if (tab.id === 'actions' && pendingActionsCount > 0) {
          badge = pendingActionsCount;
        }
        
        return {
          id: tab.id,
          label: tab.label,
          icon: <IconComponent className="w-4 h-4" />,
          badge,
          content: (
            <>
              {tab.id === 'logs' && (
                <LogsPanel
                  githubConfig={effectiveGithubConfig || undefined}
                />
              )}
              {tab.id === 'network' && <NetworkPanel />}
              {tab.id === 'notes' && <NotesPanel />}
              {tab.id === 'actions' && <CodeActionsPanel />}
              {tab.id === 'graphql' && <GraphQLExplorer />}
              {tab.id === 'tools' && <ToolsPanel />}
              {tab.id === 'github' && (
                <GitHubIssuesTab
                  githubConfig={effectiveGithubConfig || undefined}
                  onOpenSettings={() => setActiveTab('settings')}
                />
              )}
              {tab.id === 'settings' && <UnifiedSettingsPanel />}
            </>
          ),
        };
      }),
    [effectiveGithubConfig, unreadErrorCount, pendingActionsCount]
  );

  return (
    <>
      {/* GitHub Issue Slideout - Available from any tab */}
      <GitHubIssueSlideout
        isOpen={githubSlideoutStore.isOpen}
        onClose={() => githubSlideoutStore.close()}
        githubConfig={effectiveGithubConfig || undefined}
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
          <div className="flex  items-center gap-2">
            <ThemeToggle size="sm" className="sm:h-9 sm:w-9" />

          

            {/* Sticky Note Button - Quick note-taking */}
            <StickyNoteButton />
          </div>
        </div>

        {/* Enhanced Tabs with animations */}
        <BetterTabs
          tabs={betterTabs}
          defaultTab="logs"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="default"
          className="flex-1"
        />
      </div>
    </>
  );
}

// ============================================================================
// TOOLS PANEL
// ============================================================================

/**
 * ToolsPanel Component
 * Provides developer utilities for exporting data and creating context packs
 */
function ToolsPanel() {
  const { logsToBeExported, clearAll } = useDevConsoleStore();
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Create and export a comprehensive context pack
   * Includes screenshots, logs, network requests, and metadata
   */
  const handleCreateContextPack = useCallback(async () => {
    setIsGenerating(true);
    try {
      const pack = await createContextPack({
        includeScreenshot: true,
        eventCount: 20,
        networkCount: 10,
      });

      // Try to copy to clipboard first
      const copied = await copyContextPackToClipboard(pack);

      if (copied) {
        alert('📋 Context pack copied to clipboard!\n\nPaste into your issue tracker.');
      } else {
        // Fallback: download as file
        exportContextPack(pack);
        alert('📦 Context pack downloaded!\n\nAttach to your issue tracker.');
      }
    } catch (error) {
      console.error('Failed to create context pack:', error);
      alert('❌ Failed to create context pack. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Export all logs as JSON to clipboard
   */
  const handleExportLogs = useCallback(async () => {
    const data = logsToBeExported || "";
    try {
      await navigator.clipboard.writeText(data);
      alert('📋 Logs copied to clipboard!');
    } catch (error) {
      console.error('Clipboard error:', error);
      // Fallback: use textarea method
      const textArea = document.createElement('textarea');
      textArea.value = data;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('📋 Logs copied to clipboard!');
    }
  }, [logsToBeExported]);

  /**
   * Clear all console data with confirmation
   */
  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all console data?')) {
      clearAll();
    }
  }, [clearAll]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Developer Tools
        </h3>
        <p className="text-sm text-muted-foreground">Export data and manage console state</p>
      </div>

      {/* Featured Context Pack Tool */}
      <div className="card bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 border-primary/10 hover:border-primary/20 transition-all duration-200">
        <button
          onClick={handleCreateContextPack}
          disabled={isGenerating}
          className="w-full p-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-apple-sm">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {isGenerating ? 'Capturing Context...' : 'Export Context Pack'}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Creates a comprehensive debug package with screenshot, route, events, and network
                data
              </p>
              <div className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                <span>{isGenerating ? 'Processing...' : 'Copy to Clipboard'}</span>
                {isGenerating && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportLogs}
            className="card hover:shadow-apple-sm transition-all duration-200 p-4 text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Download className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Export Logs
            </h5>
            <p className="text-xs text-muted-foreground">Copy all console data as JSON</p>
          </button>

          <button
            onClick={handleClearAll}
            className="card hover:shadow-apple-sm transition-all duration-200 p-4 text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/15 transition-colors">
                <Github className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Clear All Data
            </h5>
            <p className="text-xs text-muted-foreground">Reset logs and network history</p>
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="card bg-info/5 border-info/20">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-info" />
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                💡 Pro Tip
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                To create a GitHub issue, go to the <strong>Logs</strong> tab, select an error or
                warning, and click <strong>"Create Issue"</strong> in the details panel for
                automatic issue creation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
