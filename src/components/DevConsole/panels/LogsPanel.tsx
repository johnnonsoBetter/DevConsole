/**
 * LogsPanel Component
 * Displays captured console logs with filtering and details panel
 */

import ReactJson from '@microlink/react-json-view';
import { Github, Search, Sparkles, Trash2, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { useUnifiedTheme } from '../../../hooks/useTheme';
import { createLogExplainer } from '../../../lib/ai/services/logExplainer';
import { cn } from '../../../utils';
import { ensureJsonObject } from '../../../utils/jsonSanitizer';
import { useGitHubIssueSlideoutStore } from '../../../utils/stores';
import { useAISettingsStore } from '../../../utils/stores/aiSettings';
import { useDevConsoleStore } from '../../../utils/stores/devConsole';
import { humanizeTime } from '../../../utils/timeUtils';
import { LogLevelChip } from '../Chips';
import { EmptyStateHelper } from '../EmptyStateHelper';
import { GitHubIssueSlideout } from '../GitHubIssueSlideout';
import type { LogExplanationData } from '../LogExplanation';
import { LogExplanation } from '../LogExplanation';
import { MobileBottomSheet, MobileBottomSheetContent } from '../MobileBottomSheet';

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
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

/**
 * LogDetailsContent Component
 * Displays detailed information about a selected log entry
 * Includes AI analysis, message, arguments, stack trace, and metadata
 * Used in both mobile bottom sheet and desktop side panel
 */
interface LogDetailsContentProps {
  selectedLog: any;
  explanation?: LogExplanationData;
  isExplaining?: boolean;
  explainError?: string;
  streamingText?: string;
  onClearExplanation?: () => void;
}

function LogDetailsContent({
  selectedLog,
  explanation,
  isExplaining,
  explainError,
  streamingText,
  onClearExplanation,
}: LogDetailsContentProps) {
  const { isDarkMode } = useUnifiedTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    args: false,
    metadata: false,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);
  
  return (
    <div className="space-y-4">
      {/* AI Explanation Display */}
      {(explanation || isExplaining || explainError || streamingText) && (
        <LogExplanation
          explanation={explanation}
          isLoading={isExplaining}
          error={explainError}
          streamingText={streamingText}
          onClose={onClearExplanation}
        />
      )}

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
  // Format source for better readability
  const formattedSource = useMemo(() => {
    if (!log.source?.file) return null;
    // Extract just the filename
    const filename = log.source.file.split('/').pop()?.split('?')[0] || log.source.file;
    return `${filename}:${log.source.line || ''}`;
  }, [log.source]);

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
        <div className="flex items-center gap-2 min-w-0">
          {(log as any).context === 'extension' && (
            <span 
              className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold uppercase"
              title="Extension context log (from content script)"
            >
              Ext
            </span>
          )}
          <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs">
            {log.message}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {log.args.length > 0 && (
            <button
              className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
              title="Click to view arguments"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(log);
              }}
            >
              ⊕ {log.args.length} arg{log.args.length > 1 ? 's' : ''}
            </button>
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
        {formattedSource && (
          <span 
            className="text-xs text-gray-400 font-mono hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={log.source?.file}
          >
            {formattedSource}
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

export function LogsPanel({ githubConfig }: LogsPanelProps) {
  const { filter, setFilter, logs, clearLogs } = useDevConsoleStore();
  const aiSettings = useAISettingsStore();
  const githubSlideoutStore = useGitHubIssueSlideoutStore();
  const [search, setSearch] = useState(filter.search);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isMobile = useIsMobile();

  // AI Explanation state
  const [explanation, setExplanation] = useState<LogExplanationData | undefined>();
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | undefined>();
  const [streamingText, setStreamingText] = useState<string>('');

  // Show only the most recent 10 logs for better performance and UX
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);

  // Check if AI is ready to use
  const isAIReady = useMemo(() => {
    return (
      aiSettings.enabled &&
      ((aiSettings.useGateway && aiSettings.gatewayApiKey) ||
        (!aiSettings.useGateway && aiSettings.apiKey))
    );
  }, [aiSettings]);

  // Handle explain log
  const handleExplainLog = useCallback(async () => {
    if (!selectedLog) return;

    // Check if AI is configured
    if (!isAIReady) {
      setExplainError(
        '⚙️ AI features require configuration. Please enable AI and add your API key in Settings → AI to use this feature.'
      );
      return;
    }

    setIsExplaining(true);
    setExplainError(undefined);
    setStreamingText('');
    setExplanation(undefined);

    try {
      const explainer = createLogExplainer(aiSettings);
      
      // Stream the explanation
      let fullText = '';
      for await (const chunk of explainer.streamExplanation({
        level: selectedLog.level,
        message: selectedLog.message,
        args: selectedLog.args || [],
        stack: selectedLog.stack,
        source: selectedLog.source,
        timestamp: selectedLog.timestamp,
      })) {
        fullText += chunk;
        setStreamingText(fullText);
      }

      // Parse the complete explanation
      setExplanation({
        summary: fullText.split('\n')[0] || 'AI analysis complete',
        explanation: fullText,
      });
      setStreamingText('');
    } catch (error) {
      console.error('Failed to explain log:', error);
      setExplainError(
        error instanceof Error ? error.message : 'Failed to generate explanation'
      );
    } finally {
      setIsExplaining(false);
    }
  }, [isAIReady, aiSettings, selectedLog]);

  // Clear explanation when log changes
  useEffect(() => {
    setExplanation(undefined);
    setExplainError(undefined);
    setStreamingText('');
    setIsExplaining(false);
  }, [selectedLog?.id]);


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
        isOpen={githubSlideoutStore.isOpen}
        onClose={() => githubSlideoutStore.close()}
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
        <div className="flex flex-col gap-2 px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          {/* Search and actions row */}
          <div className="flex items-center gap-2">
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

          {/* Log Level Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter:</span>
            {(['error', 'warn', 'info', 'log'] as const).map((level) => {
              const isActive = filter.levels.includes(level);
              return (
                <button
                  key={level}
                  onClick={() => {
                    setFilter({
                      levels: isActive
                        ? filter.levels.filter(l => l !== level)
                        : [...filter.levels, level]
                    });
                  }}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-all hover:shadow-apple-sm active:scale-95',
                    isActive
                      ? level === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                        : level === 'warn'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
                        : level === 'info'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                  )}
                  title={`${isActive ? 'Hide' : 'Show'} ${level} logs`}
                >
                  {level.toUpperCase()}
                </button>
              );
            })}
            {filter.levels.length < 4 && (
              <button
                onClick={() => setFilter({ levels: ['error', 'warn', 'info', 'log'] })}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                title="Show all levels"
              >
                Show All
              </button>
            )}
          </div>
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
                  {/* AI Explain Button - Always visible */}
                  {!explanation && !isExplaining && (
                    <button
                      onClick={handleExplainLog}
                      disabled={isExplaining}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:shadow-apple-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Explain this log with AI"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* GitHub Issue Button */}
                  <button
                    onClick={() => githubSlideoutStore.open(selectedLog)}
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
                <LogDetailsContent 
                  selectedLog={selectedLog}
                  explanation={explanation}
                  isExplaining={isExplaining}
                  explainError={explainError}
                  streamingText={streamingText}
                  onClearExplanation={() => {
                    setExplanation(undefined);
                    setExplainError(undefined);
                    setStreamingText('');
                  }}
                />
              </MobileBottomSheetContent>
            </MobileBottomSheet>
          ) : (
            /* Desktop: Resizable Side Panel */
            <>
              {/* Resize Handle */}
              <div
                className={cn(
                  'w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-all relative group bg-gray-200 dark:bg-gray-800',
                  isResizing && 'bg-primary/40'
                )}
                onMouseDown={handleResizeStart}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-16 rounded-full bg-gray-400 dark:bg-gray-600 group-hover:bg-primary dark:group-hover:bg-primary transition-colors shadow-sm" />
              </div>

              <div className="flex flex-col" style={{ width: `${detailPanelWidth}%` }}>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
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
                    {/* AI Explain Button - Always visible */}
                    {!explanation && !isExplaining && (
                      <button
                        onClick={handleExplainLog}
                        disabled={isExplaining}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:shadow-apple-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Explain this log with AI"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Explain with AI</span>
                        <span className="sm:hidden">AI</span>
                      </button>
                    )}
                    {/* GitHub Issue Button - Always show for any selected log */}
                    <button
                      onClick={() => githubSlideoutStore.open(selectedLog)}
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
                  <LogDetailsContent 
                    selectedLog={selectedLog}
                    explanation={explanation}
                    isExplaining={isExplaining}
                    explainError={explainError}
                    streamingText={streamingText}
                    onClearExplanation={() => {
                      setExplanation(undefined);
                      setExplainError(undefined);
                      setStreamingText('');
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
