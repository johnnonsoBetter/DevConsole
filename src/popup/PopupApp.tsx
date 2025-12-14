/**
 * DevConsole Popup Application
 * Compact control center for the extension popup menu.
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Github,
  Keyboard,
  Network,
  RefreshCcw,
  Settings,
  Terminal,
  Trash2,
  Video,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AutofillToggle } from '../components/DevConsole/AutofillToggle';
import {
  AISettingsSection,
  GeneralSettingsSection,
  GitHubSettingsSection,
  GraphQLSettingsSection,
  RaindropSettingsSection,
  UnsplashSettingsSection,
  WebhookSettingsSection,
} from '../components/DevConsole/UnifiedSettingsPanel';
import { BetterTabs } from '../components/ui/better-tabs';
import { NotesService, type Note, useNotesStore } from '../features/notes';
import { GraphQLIcon, LogoIcon, RaindropIcon, UnsplashIcon, VSCodeIcon } from '../icons';
import { cn } from '../utils';
import { formatEndpoint, getDomain } from '../utils/formatUtils';
import { useAutofillSettingsStore } from '../utils/stores/autofillSettings';
import { type CodeAction, useCodeActionsStore } from '../utils/stores/codeActions';
import { humanizeTime } from '../utils/timeUtils';

// ============================================================================
// TYPES
// ============================================================================

type PopupViewMode = 'main' | 'settings' | 'notes';

type DevConsoleTabId =
  | 'logs'
  | 'network'
  | 'notes'
  | 'video'
  | 'actions'
  | 'graphql'
  | 'github'
  | 'settings';

interface ActiveTabInfo {
  id: number;
  url?: string;
  title?: string;
  domain?: string;
  protocol?: string;
  isSupported: boolean;
  unsupportedReason?: string;
}

type BackgroundLogLevel =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'debug'
  | 'ui'
  | 'db'
  | 'api';

interface BackgroundLogEntry {
  id: string;
  timestamp: number;
  level: BackgroundLogLevel;
  message: string;
  args?: any[];
  source?: { file?: string; line?: number; column?: number; raw?: string };
  tabId: number;
}

interface BackgroundNetworkRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  tabId: number;
}

interface BackgroundSettings {
  autoScroll?: boolean;
  maxLogs?: number;
  networkMonitoring?: boolean;
  darkMode?: boolean;
}

interface BackgroundStateResponse {
  logs: BackgroundLogEntry[];
  networkRequests: BackgroundNetworkRequest[];
  isRecording: boolean;
  settings: BackgroundSettings;
}

interface AutofillStats {
  fillCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEVTOOLS_REQUESTED_TAB_KEY = 'devconsole.requestedTab';
const DEVTOOLS_REQUESTED_TAB_AT_KEY = 'devconsole.requestedTabAt';

const BLOCKED_PROTOCOLS = new Set([
  'chrome:',
  'chrome-extension:',
  'about:',
  'moz-extension:',
  'edge:',
  'devtools:',
]);

// ============================================================================
// RUNTIME MESSAGE HELPERS
// ============================================================================

function sendRuntimeMessageNoResponse(message: any) {
  try {
    chrome.runtime.sendMessage(message, () => {
      const err = chrome.runtime.lastError;
      if (!err) return;
      if (
        /message channel closed/i.test(err.message ?? '') ||
        /message port closed/i.test(err.message ?? '') ||
        /extension context invalidated/i.test(err.message ?? '')
      ) {
        return;
      }
      console.warn('[Popup] Message failed:', err.message);
    });
  } catch (error) {
    console.warn('[Popup] Message failed:', error);
  }
}

function sendRuntimeMessageWithResponse<TResponse>(message: any): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: TResponse) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(err);
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function getActiveTabInfo(): Promise<ActiveTabInfo | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return null;

  const url = tab.url;
  let domain = '';
  let protocol = '';

  if (url) {
    try {
      const parsed = new URL(url);
      domain = parsed.hostname;
      protocol = parsed.protocol;
    } catch {
      // ignore parse issues; fallback below
    }
  }

  let isSupported = true;
  let unsupportedReason: string | undefined;

  if (!url) {
    isSupported = false;
    unsupportedReason = 'No URL available for this tab.';
  } else if (!protocol) {
    isSupported = false;
    unsupportedReason = 'Unsupported URL format.';
  } else if (BLOCKED_PROTOCOLS.has(protocol)) {
    isSupported = false;
    unsupportedReason = 'Chrome internal pages are not supported.';
  } else if (protocol === 'file:') {
    // Content scripts can run on file URLs only if the user enables it for the extension.
    isSupported = false;
    unsupportedReason = 'File URLs require enabling “Allow access to file URLs”.';
  } else if (protocol !== 'http:' && protocol !== 'https:') {
    isSupported = false;
    unsupportedReason = `Unsupported protocol: ${protocol}`;
  }

  return {
    id: tab.id,
    url,
    title: tab.title,
    domain,
    protocol,
    isSupported,
    unsupportedReason,
  };
}

function formatLogPreview(entry: BackgroundLogEntry): string {
  if (entry.message) return entry.message;
  const args = entry.args || [];
  if (args.length === 0) return 'Log entry';

  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

// ============================================================================
// MAIN POPUP APP
// ============================================================================

export function PopupApp() {
  const [viewMode, setViewMode] = useState<PopupViewMode>('main');
  const [activeTab, setActiveTab] = useState<ActiveTabInfo | null>(null);
  const [bgState, setBgState] = useState<BackgroundStateResponse | null>(null);
  const [isStateLoading, setIsStateLoading] = useState(true);
  const [autofillStats, setAutofillStats] = useState<AutofillStats | null>(null);
  const [queuedDevToolsTab, setQueuedDevToolsTab] = useState<DevConsoleTabId | null>(null);

  const actions = useCodeActionsStore((state) => state.actions);
  const notes = useNotesStore((state) => state.notes);
  const isNotesLoading = useNotesStore((state) => state.isLoading);
  const { isEnabled: isAutofillEnabled, loadSettings: loadAutofillSettings } =
    useAutofillSettingsStore();

  const isDarkMode = bgState?.settings?.darkMode ?? true;

  const refreshBackgroundState = useCallback(async (tabId: number) => {
    setIsStateLoading(true);
    try {
      const response = await sendRuntimeMessageWithResponse<BackgroundStateResponse>({
        type: 'GET_STATE',
        tabId,
      });
      setBgState({
        logs: Array.isArray(response?.logs) ? response.logs : [],
        networkRequests: Array.isArray(response?.networkRequests) ? response.networkRequests : [],
        isRecording: Boolean(response?.isRecording),
        settings: response?.settings || {},
      });
    } catch (error) {
      console.warn('[Popup] Failed to load background state:', error);
      setBgState((prev) =>
        prev || {
          logs: [],
          networkRequests: [],
          isRecording: true,
          settings: {},
        }
      );
    } finally {
      setIsStateLoading(false);
    }
  }, []);

  const loadAutofillUsage = useCallback(async () => {
    try {
      const stats = await sendRuntimeMessageWithResponse<AutofillStats>({
        type: 'AUTOFILL_GET_STATS',
      });
      if (stats && typeof stats.fillCount === 'number') {
        setAutofillStats({ fillCount: stats.fillCount });
      }
    } catch {
      // optional
    }
  }, []);

  const queueDevToolsTab = useCallback(async (tab: DevConsoleTabId) => {
    setQueuedDevToolsTab(tab);
    try {
      await chrome.storage.local.set({
        [DEVTOOLS_REQUESTED_TAB_KEY]: tab,
        [DEVTOOLS_REQUESTED_TAB_AT_KEY]: Date.now(),
      });
    } catch (error) {
      console.warn('[Popup] Failed to queue DevTools tab:', error);
    }
  }, []);

  const openVideoCallWindow = useCallback(async () => {
    const width = 1000;
    const height = 700;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    const url = chrome.runtime.getURL('src/videocall/index.html');

    try {
      await chrome.windows.create({
        url,
        type: 'popup',
        width,
        height,
        left,
        top,
      });
    } catch {
      window.open(
        url,
        'DevConsoleVideoCall',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    }
  }, []);

  // Load state on mount
  useEffect(() => {
    loadAutofillSettings();
    NotesService.loadNotes();
    loadAutofillUsage();

    (async () => {
      const tab = await getActiveTabInfo();
      setActiveTab(tab);
      if (tab?.id) {
        await refreshBackgroundState(tab.id);
      }
    })();
  }, [loadAutofillSettings, loadAutofillUsage, refreshBackgroundState]);

  // Listen for background updates while popup is open
  useEffect(() => {
    const tabId = activeTab?.id;
    if (!tabId) return;

    const handler = (message: any) => {
      if (!message || message.type !== 'DEVTOOLS_UPDATE') return;

      const updateType = message.updateType as string | undefined;
      const payload = message.payload;

      setBgState((prev) => {
        if (!prev) return prev;

        switch (updateType) {
          case 'LOG_ADDED': {
            if (!payload || payload.tabId !== tabId) return prev;
            const next = [payload as BackgroundLogEntry, ...prev.logs];
            return { ...prev, logs: next.slice(0, 200) };
          }
          case 'NETWORK_ADDED': {
            if (!payload || payload.tabId !== tabId) return prev;
            const next = [payload as BackgroundNetworkRequest, ...prev.networkRequests];
            return { ...prev, networkRequests: next.slice(0, 200) };
          }
          case 'LOGS_CLEARED': {
            if (payload && payload.tabId !== tabId) return prev;
            return { ...prev, logs: [] };
          }
          case 'NETWORK_CLEARED': {
            if (payload && payload.tabId !== tabId) return prev;
            return { ...prev, networkRequests: [] };
          }
          case 'SETTINGS_UPDATED': {
            return { ...prev, settings: payload || prev.settings };
          }
          case 'RECORDING_TOGGLED': {
            return { ...prev, isRecording: Boolean(payload) };
          }
          default:
            return prev;
        }
      });
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [activeTab?.id]);

  const isRecording = bgState?.isRecording ?? true;
  const networkMonitoring = bgState?.settings?.networkMonitoring ?? true;
  const logs = bgState?.logs ?? [];
  const networkRequests = bgState?.networkRequests ?? [];

  return (
    <div
      className={cn(
        'w-[400px] h-[600px] max-w-[400px] max-h-[600px] overflow-hidden shadow-2xl border border-gray-200/60 dark:border-gray-800/80',
        isDarkMode ? 'dark' : undefined
      )}
      style={{
        fontFamily:
          '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="h-full min-h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <AnimatePresence mode="wait">
          {viewMode === 'main' ? (
            <MainView
              key="main"
              activeTab={activeTab}
              isStateLoading={isStateLoading}
              isRecording={isRecording}
              networkMonitoring={networkMonitoring}
              logs={logs}
              networkRequests={networkRequests}
              actions={actions}
              notes={notes}
              isNotesLoading={isNotesLoading}
              autofillFillCount={autofillStats?.fillCount}
              isAutofillEnabled={isAutofillEnabled}
              queuedDevToolsTab={queuedDevToolsTab}
              onRefresh={() => activeTab?.id && refreshBackgroundState(activeTab.id)}
              onToggleRecording={() => sendRuntimeMessageNoResponse({ type: 'TOGGLE_RECORDING' })}
              onToggleNetworkMonitoring={() =>
                sendRuntimeMessageNoResponse({
                  type: 'UPDATE_SETTINGS',
                  payload: { networkMonitoring: !networkMonitoring },
                })
              }
              onClearLogs={() =>
                activeTab?.id &&
                sendRuntimeMessageNoResponse({ type: 'CLEAR_LOGS', tabId: activeTab.id })
              }
              onClearNetwork={() =>
                activeTab?.id &&
                sendRuntimeMessageNoResponse({ type: 'CLEAR_NETWORK', tabId: activeTab.id })
              }
              onQueueDevToolsTab={queueDevToolsTab}
              onOpenVideoCall={openVideoCallWindow}
              onCreateNote={async () =>
                NotesService.createNote({
                  title: 'Quick Note',
                  content: '',
                  tags: [],
                  pinned: false,
                })
              }
              onOpenSettings={() => setViewMode('settings')}
              onOpenNotes={() => setViewMode('notes')}
            />
          ) : viewMode === 'settings' ? (
            <SettingsView key="settings" onBack={() => setViewMode('main')} />
          ) : (
            <NotesView key="notes" onBack={() => setViewMode('main')} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN VIEW
// ============================================================================

interface MainViewProps {
  activeTab: ActiveTabInfo | null;
  isStateLoading: boolean;
  isRecording: boolean;
  networkMonitoring: boolean;
  logs: BackgroundLogEntry[];
  networkRequests: BackgroundNetworkRequest[];
  actions: CodeAction[];
  notes: Note[];
  isNotesLoading: boolean;
  autofillFillCount?: number;
  isAutofillEnabled: boolean;
  queuedDevToolsTab: DevConsoleTabId | null;
  onRefresh: () => void;
  onToggleRecording: () => void;
  onToggleNetworkMonitoring: () => void;
  onClearLogs: () => void;
  onClearNetwork: () => void;
  onQueueDevToolsTab: (tab: DevConsoleTabId) => void;
  onOpenVideoCall: () => void;
  onCreateNote: () => Promise<any>;
  onOpenSettings: () => void;
  onOpenNotes: () => void;
}

function MainView({
  activeTab,
  isStateLoading,
  isRecording,
  networkMonitoring,
  logs,
  networkRequests,
  actions,
  notes,
  isNotesLoading,
  autofillFillCount,
  queuedDevToolsTab,
  onRefresh,
  onToggleRecording,
  onToggleNetworkMonitoring,
  onClearLogs,
  onClearNetwork,
  onQueueDevToolsTab,
  onOpenVideoCall,
  onCreateNote,
  isAutofillEnabled,
  onOpenSettings,
  onOpenNotes,
}: MainViewProps) {
  const [activePeek, setActivePeek] = useState<'logs' | 'network' | 'actions'>('logs');

  const latestLogs = useMemo(
    () =>
      [...(logs || [])]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 3),
    [logs]
  );
  const latestNetwork = useMemo(
    () =>
      [...(networkRequests || [])]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 3),
    [networkRequests]
  );
  const latestActions = useMemo(
    () =>
      [...(actions || [])]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 3),
    [actions]
  );
  const latestNote = useMemo(
    () =>
      [...(notes || [])].sort(
        (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
      )[0],
    [notes]
  );

  const tabLabel = activeTab?.domain || (activeTab?.url ? getDomain(activeTab.url) : '') || 'Current tab';

  const peekTabs = [
    { id: 'logs', icon: <Terminal className="w-4 h-4" />, label: 'Logs' },
    { id: 'network', icon: <Network className="w-4 h-4" />, label: 'Network' },
    { id: 'actions', icon: <VSCodeIcon size={14} />, label: 'Actions' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <LogoIcon size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight">DevConsole</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {tabLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <AutofillToggle
                size="sm"
                className={cn(
                  'h-9 w-9 border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80',
                  isAutofillEnabled && 'ring-2 ring-emerald-400/50'
                )}
              />
              {typeof autofillFillCount === 'number' && autofillFillCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center shadow">
                  {autofillFillCount > 99 ? '99+' : autofillFillCount}
                </span>
              )}
            </div>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-4 scrollbar-hide">
        {/* Controls */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Capture Controls
              </h3>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mt-1">
                {activeTab?.title || tabLabel}
              </p>
              {!activeTab?.isSupported && activeTab?.unsupportedReason && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="leading-snug">{activeTab.unsupportedReason}</p>
                </div>
              )}
            </div>
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCcw
                className={cn('w-4 h-4 text-gray-500', isStateLoading && 'animate-spin')}
              />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
                isRecording
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                  : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isRecording ? 'bg-emerald-500' : 'bg-gray-400'
                )}
              />
              {isRecording ? 'Recording' : 'Paused'}
            </span>

            <span
              className={cn(
                'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
                networkMonitoring
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
                  : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  networkMonitoring ? 'bg-blue-500' : 'bg-gray-400'
                )}
              />
              {networkMonitoring ? 'Network On' : 'Network Off'}
            </span>

            <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400">
              Logs: <span className="font-semibold text-gray-700 dark:text-gray-200">{logs.length}</span> ·
              Net:{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {networkRequests.length}
              </span>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onToggleRecording}
              className={cn(
                'h-10 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                isRecording
                  ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-800/60 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-100'
                  : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white'
              )}
            >
              <Terminal className="w-4 h-4" />
              {isRecording ? 'Pause Capture' : 'Resume Capture'}
            </button>
            <button
              onClick={onToggleNetworkMonitoring}
              className={cn(
                'h-10 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                networkMonitoring
                  ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-800/60 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-100'
                  : 'bg-blue-600 hover:bg-blue-500 border-blue-600 text-white'
              )}
            >
              <Network className="w-4 h-4" />
              {networkMonitoring ? 'Disable Network' : 'Enable Network'}
            </button>
            <button
              onClick={onClearLogs}
              className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              Clear Logs
            </button>
            <button
              onClick={onClearNetwork}
              className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              Clear Network
            </button>
          </div>
        </div>

        {/* Activity Peek */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Recent Signals
            </h3>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/70 rounded-full px-2 py-1 border border-gray-200 dark:border-gray-700">
              {peekTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePeek(tab.id)}
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                    activePeek === tab.id
                      ? 'bg-primary text-white shadow-apple-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                  title={tab.label}
                >
                  {tab.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {activePeek === 'logs' && (
              <PeekList
                emptyLabel="No logs yet"
                items={latestLogs.map((log) => ({
                  id: log.id,
                  title: formatLogPreview(log),
                  meta: humanizeTime(log.timestamp),
                  pill: (log.level || 'log').toUpperCase(),
                }))}
                onViewInDevTools={() => onQueueDevToolsTab('logs')}
              />
            )}
            {activePeek === 'network' && (
              <PeekList
                emptyLabel="No requests yet"
                items={latestNetwork.map((req) => ({
                  id: req.id,
                  title: formatEndpoint(req.url || 'Request'),
                  meta: humanizeTime(req.timestamp),
                  pill: req.method || 'REQ',
                  status: req.status,
                }))}
                onViewInDevTools={() => onQueueDevToolsTab('network')}
              />
            )}
            {activePeek === 'actions' && (
              <PeekList
                emptyLabel="No actions yet"
                items={latestActions.map((action) => ({
                  id: action.id,
                  title: action.promptPreview || 'Code action',
                  meta: humanizeTime(action.createdAt),
                  pill: action.status,
                }))}
                onViewInDevTools={() => onQueueDevToolsTab('actions')}
              />
            )}

            {queuedDevToolsTab && (
              <div className="mt-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-gray-400" />
                <span>
                  Open DevTools (<span className="font-mono text-[11px]">F12</span>) →
                  DevConsole will jump to <span className="font-semibold">{queuedDevToolsTab}</span>.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Video Call */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-500" />
                Video Call
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Opens in a separate window for camera/mic permissions.
              </p>
            </div>
            <button
              onClick={() => {
                onQueueDevToolsTab('video');
                onOpenVideoCall();
              }}
              className="h-10 px-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </button>
          </div>
        </div>

        {/* Quick Notes */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quick Note
              </h3>
            </div>
            <button
              onClick={onOpenNotes}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Notes
            </button>
          </div>
          <QuickNoteCard
            note={latestNote}
            isLoading={isNotesLoading}
            onOpenNotes={onOpenNotes}
            onCreateNote={onCreateNote}
          />
        </div>

        {/* Status + Help */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Extension Active
            </span>
            <span className="ml-auto text-[10px] text-emerald-600/70 dark:text-emerald-300/70">
              v1.0
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Keyboard className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="leading-snug">
              DevConsole lives in Chrome DevTools. Press{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">
                F12
              </kbd>{' '}
              and select the <span className="font-semibold">DevConsole</span> tab.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PEEK LIST
// ============================================================================

interface PeekItem {
  id: string;
  title: string;
  meta?: string;
  pill?: string;
  status?: number;
}

function PeekList({
  items,
  emptyLabel,
  onViewInDevTools,
}: {
  items: PeekItem[];
  emptyLabel: string;
  onViewInDevTools?: () => void;
}) {
  const hasItems = items.length > 0;
  return (
    <div className="space-y-2">
      {!hasItems && (
        <div className="px-3 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/70 text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 text-center">
          {emptyLabel}
        </div>
      )}
      {hasItems &&
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700"
          >
            {item.pill && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                {item.pill}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.title}
              </p>
              {item.meta && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.meta}</p>
              )}
            </div>
            {item.status !== undefined && (
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {item.status}
              </span>
            )}
          </div>
        ))}
      {onViewInDevTools && (
        <button
          onClick={onViewInDevTools}
          className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          View in DevTools
        </button>
      )}
    </div>
  );
}

// ============================================================================
// QUICK NOTE CARD
// ============================================================================

function QuickNoteCard({
  note,
  isLoading,
  onOpenNotes,
  onCreateNote,
}: {
  note?: Note;
  isLoading: boolean;
  onOpenNotes: () => void;
  onCreateNote: () => Promise<any>;
}) {
  const [draftTitle, setDraftTitle] = useState(note?.title || '');
  const [draftContent, setDraftContent] = useState(note?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSavedRef = useRef<{ noteId: string; title: string; content: string } | null>(null);

  // Reset drafts when switching notes
  useEffect(() => {
    if (!note) {
      lastSavedRef.current = null;
      setDraftTitle('');
      setDraftContent('');
      setIsSaving(false);
      setSaveError(null);
      return;
    }

    const title = note.title || '';
    const content = note.content || '';
    setDraftTitle(title);
    setDraftContent(content);
    lastSavedRef.current = { noteId: note.id, title, content };
    setIsSaving(false);
    setSaveError(null);
  }, [note?.id]);

  // Autosave with debounce
  useEffect(() => {
    if (!note) return;
    const lastSaved = lastSavedRef.current;
    if (!lastSaved || lastSaved.noteId !== note.id) return;

    const hasChanges = draftTitle !== lastSaved.title || draftContent !== lastSaved.content;
    if (!hasChanges) return;

    setIsSaving(true);
    const timer = window.setTimeout(async () => {
      try {
        await NotesService.updateNote(note.id, {
          title: draftTitle,
          content: draftContent,
        });
        lastSavedRef.current = { noteId: note.id, title: draftTitle, content: draftContent };
        setSaveError(null);
      } catch (error) {
        console.warn('[Popup] Failed to save note:', error);
        setSaveError('Save failed');
      } finally {
        setIsSaving(false);
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [draftTitle, draftContent, note?.id]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-amber-400 animate-spin" />
        <div className="space-y-1 flex-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-500/10 px-3 py-4 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-3">
        <span className="leading-snug">No notes yet. Start with a quick note.</span>
        <button
          onClick={onCreateNote}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-all"
        >
          Create
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 p-4 space-y-2 shadow-sm border border-transparent">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-semibold">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-transparent focus:border-amber-400 focus:outline-none"
            placeholder="Untitled"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {humanizeTime(note.updatedAt || note.createdAt)}
          </p>
        </div>
        <button
          onClick={onOpenNotes}
          className="p-2 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
          title="Open Notes"
        >
          <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-300" />
        </button>
      </div>
      <textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        rows={4}
        className="w-full bg-white/70 dark:bg-gray-800/60 border border-transparent rounded-xl p-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
        placeholder="Jot something quickly..."
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {saveError ? saveError : isSaving ? 'Saving…' : 'Saved'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS VIEW
// ============================================================================

interface SettingsViewProps {
  onBack: () => void;
}

function SettingsView({ onBack }: SettingsViewProps) {
  const settingsTabs = useMemo(
    () => [
      {
        id: 'ai',
        label: 'AI Providers',
        icon: <Zap className="w-4 h-4" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <AISettingsSection />
          </div>
        ),
      },
      {
        id: 'github',
        label: 'GitHub',
        icon: <Github className="w-4 h-4" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <GitHubSettingsSection />
          </div>
        ),
      },
      {
        id: 'graphql',
        label: 'GraphQL',
        icon: <GraphQLIcon className="w-4 h-4 text-pink-500" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <GraphQLSettingsSection />
          </div>
        ),
      },
      {
        id: 'unsplash',
        label: 'Unsplash',
        icon: <UnsplashIcon size={14} />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <UnsplashSettingsSection />
          </div>
        ),
      },
      {
        id: 'webhook',
        label: 'Webhook',
        icon: <VSCodeIcon size={14} className="text-[#007ACC]" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <WebhookSettingsSection />
          </div>
        ),
      },
      {
        id: 'notes',
        label: 'Notes',
        icon: <BookOpen className="w-4 h-4" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide p-4">
            <NotesListPanel />
          </div>
        ),
      },
      {
        id: 'raindrop',
        label: 'Raindrop',
        icon: <RaindropIcon size={14} className="text-sky-500" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <RaindropSettingsSection />
          </div>
        ),
      },
      {
        id: 'general',
        label: 'General',
        icon: <Settings className="w-4 h-4" />,
        content: (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <GeneralSettingsSection />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Same controls as the DevConsole panel
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 min-h-0 p-5 pt-3">
        <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col">
          <BetterTabs
            tabs={settingsTabs}
            defaultTab="ai"
            variant="pills"
            className="flex-1 min-h-0 overflow-hidden"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// NOTES LIST PANEL (Settings View)
// ============================================================================

function NotesListPanel() {
  const notes = useNotesStore((s) => s.notes);
  const isLoading = useNotesStore((s) => s.isLoading);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
        <button
          onClick={() =>
            NotesService.createNote({
              title: 'New Note',
              content: '',
              tags: [],
              pinned: false,
            })
          }
          className="text-xs font-semibold text-primary hover:text-primary/80"
        >
          + New
        </button>
      </div>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-sm text-gray-500">No notes yet.</div>
      ) : (
        <div className="space-y-2">
          {notes
            .slice(0, 10)
            .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
            .map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {note.title || 'Untitled'}
                  </p>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {humanizeTime(note.updatedAt || note.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                  {note.content || 'Empty note'}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STANDALONE NOTES VIEW (Popup)
// ============================================================================

function NotesView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="flex flex-col h-full"
    >
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Notes</h2>
      </div>
      <div className="flex-1 overflow-hidden p-5">
        <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-auto scrollbar-hide p-4">
          <NotesListPanel />
        </div>
      </div>
    </motion.div>
  );
}

export default PopupApp;
