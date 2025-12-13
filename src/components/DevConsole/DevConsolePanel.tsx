/**
 * DevConsolePanel Component
 * Main developer console with tabs for logs, network, GraphQL, AI APIs, and tools
 * Provides comprehensive debugging and development utilities
 */

import {
  // Activity, // TODO: Re-enable when Tools panel is needed
  BookOpen,
  // Download, // TODO: Re-enable when Tools panel is needed
  Github,
  // Info, // TODO: Re-enable when Tools panel is needed
  // Monitor, // TODO: Re-enable when Terminal Stream API is ready
  Network,
  // RefreshCw, // TODO: Re-enable when Tools panel is needed
  Settings,
  Terminal,
  Video,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { GraphQLIcon, LogoIcon, VSCodeIcon } from '../../icons';
// TODO: Re-enable when Tools panel is needed
// import {
//     copyContextPackToClipboard,
//     createContextPack,
//     exportContextPack,
// } from '../../lib/devConsole/contextPacker';
import {
  useDevConsoleStore
} from '../../utils/stores/devConsole';
const GraphQLExplorer = lazy(() => import('../DevConsole/GraphQLExplorerV2').then(module => ({default: module.GraphQLExplorerV2})));

import { StickyNoteButton } from '../../features/notes';
import { useCodeActionsStore, useGitHubIssueSlideoutStore } from '../../utils/stores';
// import { useTerminalStreamStore } from '../../utils/stores'; // TODO: Re-enable when Terminal Stream API is ready
import { useAISettingsStore } from '../../utils/stores/aiSettings';
import { useGitHubSettingsStore } from '../../utils/stores/githubSettings';
import { BetterTabs } from '../ui/better-tabs';
import { AutofillToggle } from './AutofillToggle';
import { EnvironmentBadge } from './EnvironmentBadge';
import { GitHubIssueSlideout } from './GitHubIssueSlideout';
import { GitHubIssuesTab } from './GitHubIssuesTab';
import { CodeActionsPanel } from './panels/CodeActionsPanel';
import { LogsPanel } from './panels/LogsPanel';
import { NetworkPanel } from './panels/NetworkPanel';
import { NotesPanel } from './panels/NotesPanel';
// import { TerminalPanel } from './panels/TerminalPanel'; // TODO: Re-enable when Terminal Stream API is ready
import { VideoCallPanel } from './panels/VideoCallPanel';
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
  // { id: 'terminal', label: 'Terminal', icon: Monitor }, // TODO: Re-enable when Terminal Stream API is ready
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'actions', label: 'Actions', icon: VSCodeIcon },
  { id: 'graphql', label: 'GraphQL', icon: GraphQLIcon },
  // { id: 'tools', label: 'Tools', icon: Activity }, // TODO: Re-enable Tools panel when needed
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type DevConsoleTabId = (typeof CONSOLE_TABS)[number]['id'];

const DEVTOOLS_REQUESTED_TAB_KEY = 'devconsole.requestedTab';
const DEVTOOLS_REQUESTED_TAB_AT_KEY = 'devconsole.requestedTabAt';
const DEVTOOLS_REQUEST_TTL_MS = 2 * 60 * 1000;


// ============================================================================
// MAIN DEVELOPER CONSOLE COMPONENT
// ============================================================================

export interface DevConsolePanelProps {
  githubConfig?: GitHubConfig;
  /** When true, uses compact mobile-like layout regardless of viewport size (e.g., when embedded in a sidebar) */
  compact?: boolean;
  /** Optional list of tab IDs to show. If not provided, all tabs are shown. */
  allowedTabs?: string[];
}

export function DevConsolePanel({ githubConfig, compact = false, allowedTabs }: DevConsolePanelProps = {}) {
  const { unreadErrorCount } = useDevConsoleStore();
  
  // Filter tabs based on allowedTabs prop
  const filteredTabs = allowedTabs 
    ? CONSOLE_TABS.filter(tab => allowedTabs.includes(tab.id))
    : CONSOLE_TABS;
  
  const [activeTab, setActiveTab] = useState<string>(filteredTabs[0]?.id || CONSOLE_TABS[0].id);

  const githubSettings = useGitHubSettingsStore();
  // Load AI and GitHub settings globally when DevConsole mounts
  const { loadSettings: loadAISettings } = useAISettingsStore();
  const { loadSettings: loadGitHubSettings } = useGitHubSettingsStore();
  
  useEffect(() => {
    // Load settings once on mount
    loadAISettings();
    loadGitHubSettings();
  }, [loadAISettings, loadGitHubSettings]);

  // Allow the extension popup to "queue" a tab to focus when DevTools opens.
  useEffect(() => {
    const isAllowedTab = (tabId: DevConsoleTabId) => !allowedTabs || allowedTabs.includes(tabId);

    const applyRequestedTab = async (requestedTab?: unknown, requestedAt?: unknown) => {
      if (typeof requestedTab !== 'string') return;
      const tabId = requestedTab as DevConsoleTabId;
      if (!isAllowedTab(tabId)) return;

      const atMs = typeof requestedAt === 'number' ? requestedAt : undefined;
      if (atMs && Date.now() - atMs > DEVTOOLS_REQUEST_TTL_MS) {
        await chrome.storage.local.remove([DEVTOOLS_REQUESTED_TAB_KEY, DEVTOOLS_REQUESTED_TAB_AT_KEY]);
        return;
      }

      setActiveTab(tabId);
      await chrome.storage.local.remove([DEVTOOLS_REQUESTED_TAB_KEY, DEVTOOLS_REQUESTED_TAB_AT_KEY]);
    };

    (async () => {
      try {
        const result = await chrome.storage.local.get([
          DEVTOOLS_REQUESTED_TAB_KEY,
          DEVTOOLS_REQUESTED_TAB_AT_KEY,
        ]);
        await applyRequestedTab(result[DEVTOOLS_REQUESTED_TAB_KEY], result[DEVTOOLS_REQUESTED_TAB_AT_KEY]);
      } catch {
        // ignore
      }
    })();

    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      const change = changes[DEVTOOLS_REQUESTED_TAB_KEY];
      if (!change?.newValue) return;
      void applyRequestedTab(change.newValue, changes[DEVTOOLS_REQUESTED_TAB_AT_KEY]?.newValue);
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [allowedTabs]);

  const githubSlideoutStore = useGitHubIssueSlideoutStore();

  // Get pending actions count for badge
  const pendingActionsCount = useCodeActionsStore((state) =>
    state.actions.filter(
      (a) => a.status === 'queued' || a.status === 'sending' || a.status === 'processing'
    ).length
  );

  // Get terminal stream message count for badge
  // const terminalMessageCount = useTerminalStreamStore((state) => state.totalMessagesReceived); // TODO: Re-enable when Terminal Stream API is ready

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


  // Transform filteredTabs into BetterTabs format
  const betterTabs = useMemo(
    () =>
      filteredTabs.map((tab) => {
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
              {/* {tab.id === 'terminal' && <TerminalPanel />} */}{/* TODO: Re-enable when Terminal Stream API is ready */}
              {tab.id === 'notes' && <NotesPanel />}
              {tab.id === 'video' && <VideoCallPanel onOpenSettings={() => setActiveTab('settings')} />}
              {tab.id === 'actions' && <CodeActionsPanel />}
              {tab.id === 'graphql' && (
                <Suspense fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <GraphQLIcon className="w-12 h-12 text-[#E10098] mx-auto mb-3 animate-pulse" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading GraphQL Explorer...</p>
                    </div>
                  </div>
                }>
                  <GraphQLExplorer />
                </Suspense>
              )}
              {/* {tab.id === 'tools' && <ToolsPanel />} */}{/* TODO: Re-enable when Tools panel is needed */}
              {tab.id === 'github' && (
                <GitHubIssuesTab
                  githubConfig={effectiveGithubConfig || undefined}
                  onOpenSettings={() => setActiveTab('settings')}
                  compact={compact}
                />
              )}
              {tab.id === 'settings' && <UnifiedSettingsPanel />}
            </>
          ),
        };
      }),
    [effectiveGithubConfig, unreadErrorCount, pendingActionsCount, filteredTabs, compact]
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
              <div className='w-11 h-11 rounded-lg bg-primary flex items-center justify-center' >
              <LogoIcon size={40} className=" text-gray-50 w-10 h-10" />

              </div>
            
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                DevConsole
              </h2>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</p>
            </div>

            {/* Environment Badge - shows Dev Mode or Remote */}
            <EnvironmentBadge compact />

            {unreadErrorCount > 0 && (
              <div className="px-2 py-0.5 bg-destructive text-white text-xs font-semibold rounded-full">
                {unreadErrorCount} errors
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex  items-center gap-2">
            <AutofillToggle size="sm" className="sm:h-9 sm:w-9" />
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
