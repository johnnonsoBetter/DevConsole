/**
 * DevConsolePanel Component
 * Main developer console with tabs for logs, network, GraphQL, AI APIs, and tools
 * Provides comprehensive debugging and development utilities
 */

import ReactJson from '@microlink/react-json-view';
import {
  Activity,
  Camera,
  Download,
  Github,
  Info,
  Network,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  copyContextPackToClipboard,
  createContextPack,
  exportContextPack,
} from '../../lib/devConsole/contextPacker';
import { cn } from '../../utils';
import { ensureJsonObject } from '../../utils/jsonSanitizer';
import {
  useDevConsoleStore
} from '../../utils/stores/devConsole';
import { DurationChip, GraphQLChip, LogLevelChip, MethodChip, StatusChip } from './Chips';
import { EmptyStateHelper } from './EmptyStateHelper';
import { DurationSparkline } from './Sparkline';
const GraphQLExplorer = lazy(() => import('../DevConsole/GraphQLExplorer').then(module => ({default: module.GraphQLExplorer})));

import { useSummarizerModel } from '@/hooks/ai';
import { AIModel, useChromeAI } from '@/hooks/useChromeAI';
import { useGitHubSettings } from '../../hooks/useGitHubSettings';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUnifiedTheme } from '../../hooks/useTheme';
import { humanizeTime } from '../../utils/timeUtils';
import { BetterTabs } from '../ui/better-tabs';
import {
  AIDownloadProgress,
  AIFirstUsePrompt,
  AIInsightPanel,
  AIUnsupportedNotice,
  CopyAIPromptButton,
} from './AI';
import { AIPanel } from './AIPanel';
import { GitHubIssueSlideout } from './GitHubIssueSlideout';
import { MobileBottomSheet, MobileBottomSheetContent } from './MobileBottomSheet';
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
  { id: 'graphql', label: 'GraphQL', icon: Zap },
  { id: 'ai', label: 'AI APIs', icon: Sparkles },
  { id: 'tools', label: 'Tools', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;


// ============================================================================
// MAIN DEVELOPER CONSOLE COMPONENT
// ============================================================================

export interface DevConsolePanelProps {
  githubConfig?: GitHubConfig;
}

export function DevConsolePanel({ githubConfig }: DevConsolePanelProps = {}) {
  const { unreadErrorCount, logsToBeExported } = useDevConsoleStore();

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

  // Transform CONSOLE_TABS into BetterTabs format
  const betterTabs = useMemo(
    () =>
      CONSOLE_TABS.map((tab) => {
        const IconComponent = tab.icon;
        return {
          id: tab.id,
          label: tab.label,
          icon: <IconComponent className="w-4 h-4" />,
          badge: tab.id === 'logs' && unreadErrorCount > 0 ? unreadErrorCount : undefined,
          content: (
            <>
              {tab.id === 'logs' && (
                <LogsPanel
                  githubConfig={effectiveGithubConfig || undefined}
                />
              )}
              {tab.id === 'network' && <NetworkPanel />}
              {tab.id === 'graphql' && <GraphQLExplorer />}
              {tab.id === 'ai' && <AIPanel />}
              {tab.id === 'tools' && <ToolsPanel />}
              {tab.id === 'settings' && <UnifiedSettingsPanel />}
            </>
          ),
        };
      }),
    [effectiveGithubConfig, unreadErrorCount]
  );

  return (
    <>
      {/* GitHub Issue Slideout - Available from any tab */}
      <GitHubIssueSlideout
        isOpen={showGitHubIssueSlideout}
        onClose={() => setShowGitHubIssueSlideout(false)}
        selectedLog={null}
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

            {/* AI Power Badge */}
            {/* <AIPowerBadge status={aiAvailability} progress={aiDownloadProgress} /> */}

            {unreadErrorCount > 0 && (
              <div className="px-2 py-0.5 bg-destructive text-white text-xs font-semibold rounded-full">
                {unreadErrorCount} errors
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex  items-center gap-2">
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

            <button
              onClick={() => {
                const data = logsToBeExported || "";
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `devconsole-${Date.now()}.json`;
                a.click();
                // Clean up blob URL to prevent memory leak
                setTimeout(() => URL.revokeObjectURL(url), 100);
              }}
              className="relative p-2 flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
              title="Export All Data"
              aria-label="Export all console data as JSON"
            >
              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors" />
            </button>

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

        {/* Enhanced Tabs with animations */}
        <BetterTabs
          tabs={betterTabs}
          defaultTab="logs"
          variant="default"
          className="flex-1"
        />
      </div>
    </>
  );
}

/**
 * Lazy ReactJson wrapper - only renders when expanded
 * Safely handles any data type and prevents errors from invalid JSON
 */
const LazyReactJson = memo(({ data, isDarkMode, name }: { data: any; isDarkMode: boolean; name: string }) => {
  const safeData = useMemo(() => ensureJsonObject(data), [data]);

  return (
    <ReactJson
      src={safeData}
      theme={isDarkMode ? 'monokai' : 'rjv-default'}
      style={{
        fontSize: '12px',
        fontFamily: 'monospace',
        backgroundColor: 'transparent',
      }}
      collapsed={1}
      displayDataTypes={false}
      displayObjectSize={true}
      enableClipboard={true}
      name={name}
    />
  );
});

LazyReactJson.displayName = 'LazyReactJson';

/**
 * LogDetailsContent Component
 * Displays detailed information about a selected log entry
 * Includes AI analysis, message, arguments, stack trace, and metadata
 * Used in both mobile bottom sheet and desktop side panel
 */
interface LogDetailsContentProps {
  selectedLog: any;
}

function LogDetailsContent({
  selectedLog,
}: LogDetailsContentProps) {
  const { isDarkMode } = useUnifiedTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    args: false,
    metadata: false,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const {
    availability,
    downloadProgress,
  } = useChromeAI(AIModel.SUMMARIZER);
  
  // Prepare log details for the hook
  const additionalContext = selectedLog?.args?.length > 0 
    ? `Arguments: ${JSON.stringify(selectedLog.args)}` 
    : undefined;
  
  const {
    summarizeData,
    summarizeError: aiError,
    summarizing,
  } = useSummarizerModel({
    logMessage: selectedLog?.message,
    logLevel: selectedLog?.level,
    stackTrace: selectedLog?.stack,
    additionalContext,
  });

  const handleActivateAI = useCallback(async () => {
    // This will trigger the Chrome AI download
    // The hook will automatically analyze once available
  }, []);

  /**
   * Render AI status section based on availability state
   */
  const renderAISection = useCallback(() => {
    if (availability === 'unavailable') {
      return (
        <AIUnsupportedNotice
          reason="AI features are not available in this browser"
          browserName="Current Browser"
        />
      );
    }

    if (availability === 'downloading' && downloadProgress > 0 && downloadProgress < 100) {
      return <AIDownloadProgress progress={downloadProgress} modelName="Gemini Nano" />;
    }

    if (availability === 'downloadable') {
      return <AIFirstUsePrompt onActivate={handleActivateAI} loading={summarizing} />;
    }

    if (summarizeData || summarizing || aiError) {
      return (
        <AIInsightPanel
          summary={summarizeData || ''}
          loading={summarizing}
          error={aiError?.message || null}
          title="🤖 AI Log Analysis"
        />
      );
    }

    return null;
  }, [
    availability,
    downloadProgress,
    summarizeData,
    summarizing,
    aiError,
    handleActivateAI,
  ]);
  
  return (
    <div className="space-y-4">
      {/* AI Insights Section */}
      {renderAISection()}

      {/* Message */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          Message
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {selectedLog.message}
          </p>
        </div>
      </div>

      {/* Arguments */}
      {selectedLog.args.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('args')}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span>Arguments ({selectedLog.args.length})</span>
            <span className="text-xs">{expandedSections.args ? '▼' : '▶'}</span>
          </button>
          {expandedSections.args && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <LazyReactJson data={selectedLog.args} isDarkMode={isDarkMode} name="args" />
            </div>
          )}
        </div>
      )}

      {/* Stack Trace */}
      {selectedLog.stack && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            Stack Trace
          </h4>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <ClickableStackTrace stack={selectedLog.stack} />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div>
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <span>Metadata</span>
          <span className="text-xs">{expandedSections.metadata ? '▼' : '▶'}</span>
        </button>
        {expandedSections.metadata && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Timestamp:</span>
              <span className="text-gray-900 dark:text-gray-100 font-mono">
                {new Date(selectedLog.timestamp).toISOString()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Level:</span>
              <LogLevelChip level={selectedLog.level} />
            </div>
            {selectedLog.source && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">File:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono">
                    {selectedLog.source.file}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Line:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono">
                    {selectedLog.source.line}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LOGS PANEL - Priority Columns First
// ============================================================================

interface LogRowProps {
  log: any;
  isSelected: boolean;
  onSelect: (log: any) => void;
  style: React.CSSProperties;
}

/**
 * Memoized LogRow component for virtualization
 * Only re-renders when log or selection state changes
 */
const LogRow = memo(({ log, isSelected, onSelect, style }: LogRowProps) => {
  return (
    <div
      style={style}
      onClick={() => onSelect(log)}
      className={cn(
        'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 grid grid-cols-[80px_1fr_128px_128px] sm:grid-cols-[80px_1fr_128px_128px] md:grid-cols-[80px_1fr_128px_128px] items-center',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Level - Critical state first */}
      <div className="px-3 sm:px-4 py-3">
        <LogLevelChip level={log.level} />
      </div>

      {/* Message - Primary decision-making info */}
      <div className="px-3 sm:px-4 py-3 min-w-0">
        <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs">
          {log.message}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {log.args.length > 0 && (
            <span className="text-xs text-gray-400">
              +{log.args.length} arg{log.args.length > 1 ? 's' : ''}
            </span>
          )}
          {/* Show time on mobile (when Time column is hidden) */}
          <span
            className="text-xs text-gray-400 font-mono sm:hidden"
            title={new Date(log.timestamp).toLocaleString()}
          >
            {humanizeTime(log.timestamp)}
          </span>
        </div>
      </div>

      {/* Time - Context (hidden on mobile) */}
      <div className="px-3 sm:px-4 py-3 hidden sm:block">
        <span
          className="text-xs text-gray-500 dark:text-gray-400 font-mono"
          title={new Date(log.timestamp).toLocaleString()}
        >
          {humanizeTime(log.timestamp)}
        </span>
      </div>

      {/* Source - Secondary info (hidden on small screens) */}
      <div className="px-3 sm:px-4 py-3 hidden md:block">
        {log.source && (
          <span className="text-xs text-gray-400 font-mono">
            {log.source.file}:{log.source.line}
          </span>
        )}
      </div>
    </div>
  );
});

LogRow.displayName = 'LogRow';

interface LogsPanelProps {
  githubConfig?: GitHubConfig;
}

function LogsPanel({ githubConfig }: LogsPanelProps) {
  const { filter, setFilter, logs, clearLogs } = useDevConsoleStore();
  const [search, setSearch] = useState(filter.search);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [showGitHubIssue, setShowGitHubIssue] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isMobile = useIsMobile();

  // Show only the most recent 10 logs for better performance and UX
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ search });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setFilter]);

  /**
   * Handle horizontal resize of detail panel
   */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = detailPanelWidth;
    },
    [detailPanelWidth]
  );

  // Handle resize mouse move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const deltaX = resizeStartX.current - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;

      // Constrain between 30% and 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setDetailPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-full flex">
      {/* GitHub Issue Slideout */}
      <GitHubIssueSlideout
        isOpen={showGitHubIssue}
        onClose={() => setShowGitHubIssue(false)}
        selectedLog={selectedLog}
        githubConfig={githubConfig}
      />

      {/* Logs Table */}
      <div
        className={cn(
          'flex flex-col',
          !isMobile && selectedLog && 'border-r border-gray-200 dark:border-gray-800'
        )}
        style={{ width: !isMobile && selectedLog ? `${100 - detailPanelWidth}%` : '100%' }}
      >
        {/* Filters */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-apple-xs"
              aria-label="Search logs by message content"
            />
          </div>

          {/* Log Level Filter Buttons */}
       
       

          {/* Clear Action */}
          <button
            onClick={clearLogs}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95 min-h-[36px] min-w-[36px]"
            title="Clear All Logs"
            aria-label="Clear all console logs"
          >
            <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-destructive dark:hover:text-destructive transition-colors" />
          </button>
        </div>

        {/* Table - Simple List (First 10 Logs) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {recentLogs.length === 0 ? (
            <EmptyStateHelper type="logs" />
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-[80px_1fr_128px_128px] sm:grid-cols-[80px_1fr_128px_128px] md:grid-cols-[80px_1fr_128px_128px] text-left text-sm">
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Level
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Message
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    Time
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hidden md:block">
                    Source
                  </div>
                </div>
              </div>

              {/* Simple List - First 10 Logs */}
              <div className="flex-1 overflow-auto">
                {recentLogs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    isSelected={selectedLog?.id === log.id}
                    onSelect={setSelectedLog}
                    style={{}}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Log Details - Responsive: Bottom Sheet on Mobile, Side Panel on Desktop */}
      {selectedLog && (
        <>
          {isMobile ? (
            /* Mobile: Bottom Sheet */
            <MobileBottomSheet
              isOpen={!!selectedLog}
              onClose={() => setSelectedLog(null)}
              title="Log Details"
              subtitle={`${selectedLog.level} • ${humanizeTime(selectedLog.timestamp)}`}
              headerActions={
                <div className="flex items-center gap-2">
                  {/* Copy AI Prompt Button */}
                  <CopyAIPromptButton log={selectedLog} size="sm" />

                  {/* GitHub Issue Button */}
                  <button
                    onClick={() => setShowGitHubIssue(true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-apple-sm active:scale-95',
                      selectedLog?.level === 'error' || selectedLog?.level === 'warn'
                        ? 'bg-success/10 hover:bg-success/15 text-success border-success/20'
                        : 'bg-primary/10 hover:bg-primary/15 text-primary border-primary/20'
                    )}
                    title="Create GitHub Issue from this log"
                  >
                    <Github className="w-3.5 h-3.5" />
                  </button>
                </div>
              }
            >
              <MobileBottomSheetContent>
                <LogDetailsContent selectedLog={selectedLog} />
              </MobileBottomSheetContent>
            </MobileBottomSheet>
          ) : (
            /* Desktop: Resizable Side Panel */
            <>
              {/* Resize Handle */}
              <div
                className={cn(
                  'w-1 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors relative group',
                  isResizing && 'bg-primary/50'
                )}
                onMouseDown={handleResizeStart}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-primary transition-colors" />
              </div>

              <div className="flex flex-col" style={{ width: `${detailPanelWidth}%` }}>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Log Details
                    </h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
                      title="Close Details"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Copy AI Prompt Button */}
                    {selectedLog && <CopyAIPromptButton log={selectedLog} size="sm" />}

                    {/* GitHub Issue Button - Always show for any selected log */}
                    <button
                      onClick={() => setShowGitHubIssue(true)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-apple-sm active:scale-95',
                        selectedLog?.level === 'error' || selectedLog?.level === 'warn'
                          ? 'bg-success/10 hover:bg-success/15 text-success border-success/20'
                          : 'bg-primary/10 hover:bg-primary/15 text-primary border-primary/20'
                      )}
                      title="Create GitHub Issue from this log"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Create Issue</span>
                      <span className="sm:hidden">Issue</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <LogDetailsContent selectedLog={selectedLog} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

interface NetworkRowProps {
  request: any;
  isSelected: boolean;
  onSelect: (request: any) => void;
  style: React.CSSProperties;
  endpointStats: Record<string, number[]>;
}

/**
 * Memoized NetworkRow component for virtualization
 */
const NetworkRow = ({ request: req, isSelected, onSelect, style, endpointStats }: NetworkRowProps) => {
  const endpoint = useMemo(() => new URL(req.url, window.location.origin).pathname, [req.url]);
  const trendData = useMemo(() => endpointStats[endpoint]?.slice(-20) || [], [endpointStats, endpoint]);

  return (
    <div
      style={style}
      onClick={() => onSelect(req)}
      className={cn(
        'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 grid grid-cols-[80px_120px_1fr_112px_80px] sm:grid-cols-[96px_128px_1fr_112px_80px] md:grid-cols-[96px_128px_1fr_112px_80px] items-center',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Method */}
      <div className="px-3 sm:px-4 py-3">
        <MethodChip method={req.method} />
      </div>

      {/* Status */}
      <div className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <StatusChip status={req.status ?? null} />
          {req.type === 'graphql' && (
            <GraphQLChip operation={(req as any).graphql?.operation || 'query'} />
          )}
        </div>
      </div>

      {/* URL */}
      <div className="px-3 sm:px-4 py-3 min-w-0">
        <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs">
          {endpoint}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
          <span title={new Date(req.timestamp).toLocaleString()}>
            {humanizeTime(req.timestamp)}
          </span>
          <span className="sm:hidden">
            <DurationChip duration={req.duration || 0} threshold={500} />
          </span>
        </div>
      </div>

      {/* Duration */}
      <div className="px-3 sm:px-4 py-3 hidden sm:block">
        <DurationChip duration={req.duration || 0} threshold={500} />
      </div>

      {/* Trend */}
      <div className="px-3 sm:px-4 py-3 hidden md:block">
        {trendData.length > 1 ? (
          <DurationSparkline
            data={trendData}
            width={60}
            height={20}
            threshold={500}
          />
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </div>
    </div>
  );
}

NetworkRow.displayName = 'NetworkRow';

/**
 * NetworkPanel Component
 * Displays captured network requests with filtering and details panel
 */
function NetworkPanel() {
  const {networkRequests, clearNetwork} = useDevConsoleStore();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isMobile = useIsMobile();

  // Show only the most recent 10 requests for better performance and UX
  const recentRequests = useMemo(() => networkRequests.slice(0, 10), [networkRequests]);

  /**
   * Group requests by endpoint for sparkline visualization
   * Memoized to avoid recalculation on every render
   */
  const endpointStats = useMemo(() => {
    return recentRequests.reduce(
      (acc, req) => {
        const endpoint = new URL(req.url, window.location.origin).pathname;
        if (!acc[endpoint]) {
          acc[endpoint] = [];
        }
        acc[endpoint].push(req.duration || 0);
        return acc;
      },
      {} as Record<string, number[]>
    );
  }, [recentRequests]);

  /**
   * Handle horizontal resize of detail panel
   */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = detailPanelWidth;
    },
    [detailPanelWidth]
  );

  // Handle resize mouse move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const deltaX = resizeStartX.current - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;

      // Constrain between 30% and 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setDetailPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-full flex">
      {/* Request Table */}
      <div
        className={cn(
          'flex flex-col',
          !isMobile && selectedRequest && 'border-r border-gray-200 dark:border-gray-800'
        )}
        style={{ width: !isMobile && selectedRequest ? `${100 - detailPanelWidth}%` : '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Network Requests
            </h3>
            <p className="text-xs text-muted-foreground">
              {networkRequests.length} request{networkRequests.length !== 1 ? 's' : ''} captured
            </p>
          </div>
          <button
            onClick={clearNetwork}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95 min-h-[36px] min-w-[36px]"
            title="Clear Network History"
          >
            <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-destructive dark:hover:text-destructive transition-colors" />
          </button>
        </div>

        {/* Table - Simple list (no virtualization for 10 items) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {networkRequests.length === 0 ? (
            <EmptyStateHelper type="network" />
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-[80px_120px_1fr_112px_80px] sm:grid-cols-[96px_128px_1fr_112px_80px] md:grid-cols-[96px_128px_1fr_112px_80px] text-left text-sm">
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Method
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    URL
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    Duration
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hidden md:block">
                    Trend
                  </div>
                </div>
              </div>

              {/* Simple List - Most Recent 10 Requests */}
              <div className="flex-1 overflow-auto">
                {recentRequests.map((request) => (
                  <NetworkRow
                    key={request.id}
                    request={request}
                    isSelected={selectedRequest?.id === request.id}
                    onSelect={setSelectedRequest}
                    style={{}}
                    endpointStats={endpointStats}
                  />
                ))}
                
                {/* Show indicator if there are more requests */}
                {networkRequests.length > 10 && (
                  <div className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800">
                    Showing most recent 10 of {networkRequests.length} requests
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Request Details - Responsive: Bottom Sheet on Mobile, Side Panel on Desktop */}
      {selectedRequest && (
        <>
          {isMobile ? (
            /* Mobile: Bottom Sheet */
            <MobileBottomSheet
              isOpen={!!selectedRequest}
              onClose={() => setSelectedRequest(null)}
              title="Request Details"
              subtitle={`${selectedRequest.method} • ${selectedRequest.status || 'Pending'}`}
            >
              <NetworkRequestDetails request={selectedRequest} />
            </MobileBottomSheet>
          ) : (
            /* Desktop: Resizable Side Panel */
            <>
              {/* Resize Handle */}
              <div
                className={cn(
                  'w-1 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors relative group',
                  isResizing && 'bg-primary/50'
                )}
                onMouseDown={handleResizeStart}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-primary transition-colors" />
              </div>

              <div className="flex flex-col" style={{ width: `${detailPanelWidth}%` }}>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Request Details
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequest.method} • {selectedRequest.status || 'Pending'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
                    title="Close Details"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <NetworkRequestDetails request={selectedRequest} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * NetworkRequestDetails Component
 * Shows detailed information about a selected network request
 * Includes headers, request body, and response data
 * Uses lazy ReactJson rendering for better performance
 */
function NetworkRequestDetails({ request }: { request: any }) {
  const [activeSection, setActiveSection] = useState<'headers' | 'body' | 'response'>('response');
  const { isDarkMode } = useUnifiedTheme();

  /**
   * Get data for currently active section - memoized
   */
  const sectionData = useMemo(() => {
    switch (activeSection) {
      case 'headers':
        return request.responseHeaders || {};
      case 'body':
        return request.requestBody || {};
      case 'response':
        return request.responseBody || {};
      default:
        return {};
    }
  }, [activeSection, request]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        {(['headers', 'body', 'response'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all hover:shadow-apple-sm active:scale-95',
              activeSection === section
                ? 'bg-primary text-white shadow-apple-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            {section}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          {/* Only render ReactJson for active section */}
          <LazyReactJson data={sectionData} isDarkMode={isDarkMode} name={activeSection} />
        </div>
      </div>
    </div>
  );
}

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
                <Trash2 className="w-5 h-5 text-destructive" />
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

/**
 * ClickableStackTrace Component
 * Parses and displays stack traces with formatted output
 * Highlights user code vs library/framework code
 */
interface ClickableStackTraceProps {
  stack: string;
}

function ClickableStackTrace({ stack }: ClickableStackTraceProps) {
  const lines = stack.split('\n');

  /**
   * Parse a single stack trace line
   * Extracts function name, file path, line and column numbers
   * @returns Parsed stack info or null if line doesn't match pattern
   */
  const parseStackLine = useCallback((line: string) => {
    // Match: at functionName (http://localhost:8912/path/to/file.ts:line:col)
    const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
    if (!match) return null;

    const [, functionName, filePath, lineNum, colNum] = match;
    return {
      functionName: functionName?.trim() || 'anonymous',
      filePath,
      line: parseInt(lineNum, 10),
      column: parseInt(colNum, 10),
      isUserCode:
        !filePath.includes('node_modules') &&
        !filePath.includes('vite') &&
        !filePath.includes('@fs'),
    };
  }, []);

  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const parsed = parseStackLine(line);

        if (!parsed) {
          return (
            <div key={index} className="text-xs font-mono text-gray-700 dark:text-gray-300">
              {line}
            </div>
          );
        }

        const fileName = parsed.filePath.split('/').pop()?.split('?')[0] || parsed.filePath;
        const isClickable = parsed.isUserCode;

        return (
          <div
            key={index}
            className={cn(
              'text-xs font-mono flex items-start gap-2 py-0.5',
              isClickable && 'hover:bg-primary/5 rounded px-1 -mx-1'
            )}
          >
            <span className="text-gray-500 dark:text-gray-400">at</span>
            <span className="text-gray-700 dark:text-gray-300">{parsed.functionName}</span>

            <span className="text-gray-500 dark:text-gray-400">
              {fileName}:{parsed.line}:{parsed.column}
            </span>
          </div>
        );
      })}
    </div>
  );
}
