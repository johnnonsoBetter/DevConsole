/**
 * DevConsole Popup Application
 * Modern, clean popup interface with feature carousel,
 * quick toggles, and settings access
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Github,
  Keyboard,
  Network,
  Settings,
  Terminal,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { NotesService, useNotesStore } from '../features/notes';
import { GraphQLIcon, LogoIcon, RaindropIcon, UnsplashIcon, VSCodeIcon } from '../icons';
import { cn } from '../utils';
import { useAutofillSettingsStore } from '../utils/stores/autofillSettings';
import { useCodeActionsStore } from '../utils/stores/codeActions';
import { useDevConsoleStore } from '../utils/stores/devConsole';
import { humanizeTime } from '../utils/timeUtils';

// ============================================================================
// TYPES
// ============================================================================

type PopupView = 'main' | 'settings';

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// MAIN POPUP APP
// ============================================================================

export function PopupApp() {
  const [view, setView] = useState<PopupView>('main');
  const [storedLogs, setStoredLogs] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<PopupView | 'notes'>('main');
  const actions = useCodeActionsStore((state) => state.actions);
  const logs = useDevConsoleStore((state) => state.logs);
  const networkRequests = useDevConsoleStore((state) => state.networkRequests);
  const notes = useNotesStore((state) => state.notes);
  const isNotesLoading = useNotesStore((state) => state.isLoading);
  const {
    isEnabled: isAutofillEnabled,
    loadSettings: loadAutofillSettings,
  } = useAutofillSettingsStore();

  // Load settings on mount
  useEffect(() => {
    loadPopupState();
    loadAutofillSettings();
    NotesService.loadNotes();
  }, [loadAutofillSettings]);

  const loadPopupState = async () => {
    try {
      const result = await chrome.storage.local.get(['devConsoleRecentLogs']);
      setStoredLogs(result.devConsoleRecentLogs || []);
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  };

  return (
    <div
      className={cn(
        'w-[400px] h-[600px] max-w-[400px]  max-h-[600px] overflow-hidden dark dark:border-gray-800 shadow-2xl',
    
      )}
      style={{
        fontFamily:
          '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className=" dark:bg-gray-900 text-gray-900  h-full min-h-full flex flex-col">
        <AnimatePresence mode="wait">
          {viewMode === 'main' ? (
            <MainView
              key="main"
              logs={logs && logs.length ? logs : storedLogs}
              networkRequests={networkRequests}
              actions={actions}
              notes={notes}
              isNotesLoading={isNotesLoading}
              onCreateNote={async () =>
                NotesService.createNote({
                  title: 'Quick Note',
                  content: '',
                  tags: [],
                  pinned: false,
                })
              }
              isAutofillEnabled={isAutofillEnabled}
              onOpenSettings={() => setViewMode('settings')}
              onOpenNotes={() => setViewMode('notes')}
            />
          ) : viewMode === 'settings' ? (
            <SettingsView
              key="settings"
              onBack={() => setViewMode('main')}
            />
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
  logs: any[];
  networkRequests: any[];
  actions: any[];
  notes: any[];
  isNotesLoading: boolean;
  onCreateNote: () => Promise<any>;
  isAutofillEnabled: boolean;
  onOpenSettings: () => void;
  onOpenNotes: () => void;
}

function MainView({
  logs,
  networkRequests,
  actions,
  notes,
  isNotesLoading,
  onCreateNote,
  isAutofillEnabled,
  onOpenSettings,
  onOpenNotes,
}: MainViewProps) {
  const [activePeek, setActivePeek] = useState<'logs' | 'network' | 'actions'>('logs');

  const latestLogs = useMemo(
    () => [...(logs || [])].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 3),
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
      [...(notes || [])]
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0],
    [notes]
  );

  const peekTabs = [
    { id: 'logs', icon: <Terminal className="w-4 h-4" />, label: 'Logs' },
    { id: 'network', icon: <Network className="w-4 h-4" />, label: 'Network' },
    { id: 'actions', icon: <VSCodeIcon size={14} />, label: 'VS Code' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <LogoIcon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">DevConsole</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Advanced Developer Tools
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AutofillToggle
              size="sm"
              className={cn(
                'h-9 w-9 border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80',
                isAutofillEnabled && 'ring-2 ring-emerald-400/50'
              )}
            />
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Peek */}
      <div className="px-5 pb-4">
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

        <div className="rounded-2xl dark dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-3 space-y-2">
          {activePeek === 'logs' && (
            <PeekList
              emptyLabel="No logs yet"
              items={latestLogs.map((log) => ({
                id: log.id,
                title: log.message || 'Log entry',
                meta: humanizeTime(log.timestamp),
                pill: (log.level || 'log').toUpperCase(),
              }))}
              onOpen={() => chrome.runtime.sendMessage({ type: 'OPEN_DEVTOOLS', tab: 'logs' })}
            />
          )}
          {activePeek === 'network' && (
            <PeekList
              emptyLabel="No requests yet"
              items={latestNetwork.map((req) => ({
                id: req.id,
                title: req.url || req.type || 'Request',
                meta: humanizeTime(req.timestamp),
                pill: req.method || 'REQ',
                status: req.status,
              }))}
              onOpen={() => chrome.runtime.sendMessage({ type: 'OPEN_DEVTOOLS', tab: 'network' })}
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
              onOpen={() => chrome.runtime.sendMessage({ type: 'OPEN_DEVTOOLS', tab: 'actions' })}
            />
          )}
        </div>
      </div>

      {/* Quick Notes */}
      <div className="px-5 pb-4">
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
          onOpenNotes={() => chrome.runtime.sendMessage({ type: 'OPEN_DEVTOOLS', tab: 'notes' })}
          onCreateNote={onCreateNote}
        />
      </div>

      {/* Status Indicator */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Extension Active</span>
          <span className="ml-auto text-[10px] text-emerald-600/70 dark:text-emerald-400/70">v1.0</span>
        </div>
      </div>

      {/* Open DevTools CTA */}
      <div className="mt-auto px-5 pb-5">
        <button
          onClick={() => {
            chrome.runtime.sendMessage({ type: 'OPEN_DEVTOOLS' });
            window.close();
          }}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <Terminal className="w-4 h-4" />
          <span>Open DevConsole</span>
          <ExternalLink className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Keyboard className="w-3 h-3 text-gray-400" />
          <p className="text-xs text-gray-400">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">F12</kbd> → DevConsole tab
          </p>
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
}: {
  items: PeekItem[];
  emptyLabel: string;
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
    </div>
  );
}

// ============================================================================
// QUICK NOTE CARD
// ============================================================================

function QuickNoteCard({
  note,
  isLoading,
  onCreateNote,
}: {
  note?: any;
  isLoading: boolean;
  onOpenNotes: () => void;
  onCreateNote: () => Promise<any>;
}) {
  const [draftTitle, setDraftTitle] = useState(note?.title || '');
  const [draftContent, setDraftContent] = useState(note?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftTitle(note?.title || '');
    setDraftContent(note?.content || '');
  }, [note?.title, note?.content]);


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
      <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-500/10 px-3 py-4 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
        <span>No notes yet. Start with a quick note.</span>
        <button
          onClick={onCreateNote}
          className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-all"
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
      </div>
      <textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        rows={4}
        className="w-full bg-white/60 dark:bg-gray-800/60 border border-transparent rounded-xl p-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
        placeholder="Jot something quickly..."
      />
      <div className="flex items-center justify-end gap-2">
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {isSaving ? 'Saving…' : 'Autosaved'}
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Same controls as the DevConsole panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 min-h-0 p-5 pt-3">
        <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col">
          <BetterTabs tabs={settingsTabs} defaultTab="ai" variant="pills" className="flex-1 min-h-0 overflow-hidden" />
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full"
    >
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
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
