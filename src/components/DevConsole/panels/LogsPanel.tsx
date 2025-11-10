/**
 * LogsPanel Component
 * Displays and filters console logs with AI analysis capabilities
 * Lazy-loaded for better performance
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, Trash2, X, Info, AlertTriangle, XCircle, Bug, Layers, Database, Globe } from 'lucide-react';
import { List, AutoSizer } from 'react-virtualized';
import 'react-virtualized/styles.css';
import { useDevConsoleStore } from '../../../utils/stores/devConsole';
import type { LogLevel } from '../../../utils/stores/devConsole';
import { cn } from '../../../utils';
import { EmptyStateHelper } from '../EmptyStateHelper';
import { LogLevelChip } from '../Chips';
import { humanizeTime } from '../../../utils/timeUtils';
import { LogDetailsContent } from './LogDetailsContent';
import { MobileBottomSheet, MobileBottomSheetContent } from '../MobileBottomSheet';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { GitHubIssueSlideout } from '../GitHubIssueSlideout';
import { Github } from 'lucide-react';
import { CopyAIPromptButton } from '../AI';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Icons and colors for different log levels */
const LOG_LEVEL_CONFIG: Record<LogLevel, { icon: any; color: string }> = {
  log: { icon: Info, color: 'text-gray-500' },
  info: { icon: Info, color: 'text-info' },
  warn: { icon: AlertTriangle, color: 'text-warning' },
  error: { icon: XCircle, color: 'text-destructive' },
  debug: { icon: Bug, color: 'text-purple-500' },
  ui: { icon: Layers, color: 'text-primary' },
  db: { icon: Database, color: 'text-success' },
  api: { icon: Globe, color: 'text-secondary' },
};

// ============================================================================
// LOG ROW COMPONENT
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

// ============================================================================
// LOGS PANEL COMPONENT
// ============================================================================

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

interface LogsPanelProps {
  githubConfig?: GitHubConfig;
  onOpenSettings?: () => void;
}

export function LogsPanel({ githubConfig, onOpenSettings }: LogsPanelProps) {
  const { filter, setFilter, logs, clearLogs } = useDevConsoleStore();
  const [search, setSearch] = useState(filter.search);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [showGitHubIssue, setShowGitHubIssue] = useState(false);
  const [listHeight, setListHeight] = useState(600);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isMobile = useIsMobile();

  // Dynamic height calculation for virtualized list
  useEffect(() => {
    if (!listContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setListHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(listContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

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
        onOpenSettings={onOpenSettings}
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
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1 hidden sm:block">
              Filter:
            </span>
            {(['log', 'info', 'warn', 'error'] as LogLevel[]).map((level) => {
              const isActive = filter.levels.includes(level);
              const { icon: Icon, color } = LOG_LEVEL_CONFIG[level];
              return (
                <button
                  key={level}
                  onClick={() => {
                    const newLevels = isActive
                      ? filter.levels.filter((l) => l !== level)
                      : [...filter.levels, level];
                    setFilter({ levels: newLevels });
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-all hover:shadow-apple-sm active:scale-95',
                    'min-h-[36px] min-w-[36px]',
                    isActive
                      ? 'bg-white dark:bg-gray-800 shadow-apple-sm'
                      : 'bg-gray-100/50 dark:bg-gray-800/50 opacity-60 hover:opacity-100 hover:bg-white dark:hover:bg-gray-800'
                  )}
                  title={`${level.charAt(0).toUpperCase() + level.slice(1)} logs`}
                  aria-label={`Filter ${level} logs`}
                  aria-pressed={isActive}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? color : 'text-gray-400 dark:text-gray-500'
                    )}
                  />
                </button>
              );
            })}
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

        {/* Table with Virtualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {logs.length === 0 ? (
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

              {/* Virtualized List */}
              <div ref={listContainerRef} className="flex-1">
                <AutoSizer>
                  {({ width }) => (
                    <List
                      height={listHeight}
                      rowCount={logs.length}
                      rowHeight={65}
                      width={width}
                      className="scrollbar-thin"
                      rowRenderer={({ index, key, style }) => (
                        <LogRow
                          key={key}
                          log={logs[index]}
                          isSelected={selectedLog?.id === logs[index].id}
                          onSelect={setSelectedLog}
                          style={style}
                        />
                      )}
                    />
                  )}
                </AutoSizer>
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
                  <CopyAIPromptButton log={selectedLog} size="sm" />
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
                    {selectedLog && <CopyAIPromptButton log={selectedLog} size="sm" />}
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
