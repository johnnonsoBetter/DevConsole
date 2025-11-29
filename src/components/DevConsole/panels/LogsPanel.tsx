/**
 * LogsPanel Component
 * Displays captured console logs with filtering and details panel
 */

import { Brain, Check, ChevronDown, ClipboardCopy, Code2, Download, Github, Search, Sparkles, Trash2, Wrench, X, Zap } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { useRaindropSettings } from '../../../hooks/useRaindropSettings';
import { createLogExplainer } from '../../../lib/ai/services/logExplainer';
import { createMemoryEnhancedLogExplainer } from '../../../lib/ai/services/memoryEnhancedLogExplainer';
import {
  copyLogContext,
  downloadLogContext,
  generateLogContext,
  getFormatOptions,
  type ContextFormat,
  type LogData,
} from '../../../lib/devConsole/logContextGenerator';
import { cn } from '../../../utils';
import { useGitHubIssueSlideoutStore } from '../../../utils/stores';
import { useAISettingsStore } from '../../../utils/stores/aiSettings';
import { useDevConsoleStore } from '../../../utils/stores/devConsole';
import { humanizeTime } from '../../../utils/timeUtils';
import { LogLevelChip } from '../Chips';
import { CopilotChatInput, type CopilotContext } from '../CopilotChatInput';
import { EmptyStateHelper } from '../EmptyStateHelper';
import { GitHubIssueSlideout } from '../GitHubIssueSlideout';
import type { LogExplanationData } from '../LogExplanation';
import { MobileBottomSheet, MobileBottomSheetContent } from '../MobileBottomSheet';
import { LogDetailsContent } from './LogDetailsContent';

// ============================================================================
// NOTIFICATION TOAST COMPONENT
// ============================================================================

interface NotificationToastProps {
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  if (!notification) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300',
        'backdrop-blur-sm border max-w-sm',
        notification.type === 'success' && 'bg-green-50/95 dark:bg-green-900/95 border-green-300 dark:border-green-700',
        notification.type === 'error' && 'bg-red-50/95 dark:bg-red-900/95 border-red-300 dark:border-red-700',
        notification.type === 'info' && 'bg-blue-50/95 dark:bg-blue-900/95 border-blue-300 dark:border-blue-700'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className={cn(
            'text-sm font-medium',
            notification.type === 'success' && 'text-green-800 dark:text-green-100',
            notification.type === 'error' && 'text-red-800 dark:text-red-100',
            notification.type === 'info' && 'text-blue-800 dark:text-blue-100'
          )}>
            {notification.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={cn(
            'p-0.5 rounded hover:bg-black/10 transition-colors',
            notification.type === 'success' && 'text-green-600 dark:text-green-300',
            notification.type === 'error' && 'text-red-600 dark:text-red-300',
            notification.type === 'info' && 'text-blue-600 dark:text-blue-300'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

// ============================================================================
// LOG ACTION BUTTON COMPONENT
// ============================================================================

interface LogActionButtonProps {
  log: any;
  action: 'work' | 'context';
}

/**
 * Reusable action button for log operations
 * - work: Copies AI-optimized prompt for Copilot
 * - context: Shows dropdown to export in various formats
 */
function LogActionButton({ log, action }: LogActionButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  const formatOptions = getFormatOptions();

  const logData: LogData = useMemo(() => ({
    level: log.level,
    message: log.message,
    args: log.args || [],
    stack: log.stack,
    source: log.source,
    timestamp: log.timestamp,
    context: log.context,
  }), [log]);

  const handleWorkOnLog = useCallback(async () => {
    const success = await copyLogContext(logData, 'copilot');
    if (success) {
      setCopySuccess('copilot');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }, [logData]);

  const handleCopy = useCallback(async (format: ContextFormat) => {
    const success = await copyLogContext(logData, format);
    if (success) {
      setCopySuccess(format);
      setTimeout(() => setCopySuccess(null), 2000);
    }
    setMenuOpen(false);
  }, [logData]);

  const handleDownload = useCallback((format: ContextFormat) => {
    downloadLogContext(logData, format);
    setMenuOpen(false);
  }, [logData]);

  if (action === 'work') {
    return (
      <button
        onClick={handleWorkOnLog}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
        title="Copy AI prompt for Copilot"
      >
        {copySuccess === 'copilot' ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Wrench className="w-3.5 h-3.5" />
            <span>Work</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Export context"
      >
        <Code2 className="w-3.5 h-3.5" />
        <span>Context</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', menuOpen && 'rotate-180')} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 z-20 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow-lg py-1">
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Copy</div>
            {formatOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCopy(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ClipboardCopy className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                {copySuccess === opt.value && <Check className="w-3 h-3 text-green-500 ml-auto" />}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Download</div>
            {formatOptions.slice(0, 4).map((opt) => (
              <button
                key={`dl-${opt.value}`}
                onClick={() => handleDownload(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Download className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
  const { settings: raindropSettings, isConfigured: isRaindropConfigured } = useRaindropSettings();
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

  // Webhook Copilot state
  const [copilotNotification, setCopilotNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isCopilotChatOpen, setIsCopilotChatOpen] = useState(false);

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (copilotNotification) {
      const timer = setTimeout(() => setCopilotNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [copilotNotification]);

  // Clear Copilot chat and notification when switching logs
  useEffect(() => {
    setCopilotNotification(null);
    setIsCopilotChatOpen(false);
  }, [selectedLog?.id]);

  // Show only the most recent 10 logs for better performance and UX
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);

  // Check if AI is ready to use
  const isAIReady = useMemo(() => {
    return !!(
      aiSettings.enabled &&
      ((aiSettings.useGateway && aiSettings.gatewayApiKey) ||
        (!aiSettings.useGateway && aiSettings.apiKey))
    );
  }, [aiSettings]);

  // Handle explain log - uses memory-enhanced explainer when Raindrop is configured
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
      const logEntry = {
        level: selectedLog.level,
        message: selectedLog.message,
        args: selectedLog.args || [],
        stack: selectedLog.stack,
        source: selectedLog.source,
        timestamp: selectedLog.timestamp,
      };

      let fullText = '';

      // Use memory-enhanced explainer if Raindrop is configured
      if (isRaindropConfigured) {
        const memoryExplainer = createMemoryEnhancedLogExplainer(aiSettings, raindropSettings);
        
        // Stream with memory context
        for await (const chunk of memoryExplainer.streamExplanation(logEntry)) {
          fullText += chunk;
          setStreamingText(fullText);
        }
      } else {
        // Use standard explainer
        const explainer = createLogExplainer(aiSettings);
        
        for await (const chunk of explainer.streamExplanation(logEntry)) {
          fullText += chunk;
          setStreamingText(fullText);
        }
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
  }, [isAIReady, aiSettings, selectedLog, isRaindropConfigured, raindropSettings]);

  // Clear explanation when log changes
  useEffect(() => {
    setExplanation(undefined);
    setExplainError(undefined);
    setStreamingText('');
    setIsExplaining(false);
  }, [selectedLog?.id]);

  /**
   * Build the Copilot context object for the chat input
   */
  const buildCopilotContext = useCallback((): CopilotContext | null => {
    if (!selectedLog) return null;

    const logData: LogData = {
      level: selectedLog.level,
      message: selectedLog.message,
      args: selectedLog.args || [],
      stack: selectedLog.stack,
      source: selectedLog.source,
      timestamp: selectedLog.timestamp,
      context: selectedLog.context,
    };

    // Generate context for the chat
    const { content: fullContext } = generateLogContext(logData, 'copilot');

    // Build preview (first 200 chars of message + stack hint)
    let preview = selectedLog.message;
    if (selectedLog.stack) {
      preview += '\n' + selectedLog.stack.split('\n').slice(0, 2).join('\n');
    }
    if (preview.length > 200) {
      preview = preview.slice(0, 200) + '...';
    }

    // Build title
    const levelLabel = selectedLog.level.charAt(0).toUpperCase() + selectedLog.level.slice(1);
    const title = selectedLog.source?.file 
      ? `${levelLabel} in ${selectedLog.source.file.split('/').pop()}`
      : `${levelLabel} Log`;

    return {
      type: 'log',
      title,
      preview,
      fullContext: explanation?.summary 
        ? fullContext + '\n\n---\n\n**AI Analysis:**\n' + explanation.summary 
        : fullContext,
      metadata: {
        level: selectedLog.level,
        file: selectedLog.source?.file,
        line: selectedLog.source?.line,
        timestamp: selectedLog.timestamp,
        source: selectedLog.source?.url,
      },
    };
  }, [selectedLog, explanation]);


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
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-apple-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                        isRaindropConfigured 
                          ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700"
                          : "bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                      )}
                      title={isRaindropConfigured ? "Explain with AI + SmartMemory" : "Explain this log with AI"}
                    >
                      {isRaindropConfigured ? (
                        <Brain className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {/* Ask Copilot Button */}
                  <button
                    onClick={() => setIsCopilotChatOpen(true)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border hover:shadow-apple-sm active:scale-95",
                      "bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20",
                      "text-blue-600 dark:text-blue-400 border-blue-300/50 dark:border-blue-700/50"
                    )}
                    title="Ask Copilot about this log"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Log Details
                    </h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Close Details"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Action Buttons - Clean flat design */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* AI Explain Button */}
                    {!explanation && !isExplaining && (
                      <button
                        onClick={handleExplainLog}
                        disabled={isExplaining}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isRaindropConfigured ? "Explain with AI + SmartMemory" : "Explain this log with AI"}
                      >
                        <Brain className="w-3.5 h-3.5" />
                        <span>Explain</span>
                      </button>
                    )}
                    
                    {/* Ask Copilot Button */}
                    <button
                      onClick={() => setIsCopilotChatOpen(true)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all",
                        "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                        "text-white shadow-sm hover:shadow-md active:scale-95"
                      )}
                      title="Ask Copilot about this log"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Ask Copilot</span>
                    </button>
                    
                    {/* Work on Log Button */}
                    <LogActionButton 
                      log={selectedLog} 
                      action="work" 
                    />
                    
                    {/* Context Export Button */}
                    <LogActionButton 
                      log={selectedLog} 
                      action="context" 
                    />
                    
                    {/* Create Issue Button */}
                    <button
                      onClick={() => githubSlideoutStore.open(selectedLog)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      title="Create GitHub Issue from this log"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Issue</span>
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

      {/* Copilot Chat Input Modal */}
      {buildCopilotContext() && (
        <CopilotChatInput
          context={buildCopilotContext()!}
          isOpen={isCopilotChatOpen}
          onClose={() => setIsCopilotChatOpen(false)}
          onSuccess={(requestId) => {
            console.log('✅ Sent to Copilot:', requestId);
            setCopilotNotification({
              type: 'success',
              message: '✓ Sent to VS Code! Check Copilot for results.',
            });
          }}
          onFallback={(prompt) => {
            console.log('📋 Copied to clipboard:', prompt.slice(0, 50) + '...');
          }}
        />
      )}

      {/* Copilot Notification Toast */}
      <NotificationToast 
        notification={copilotNotification} 
        onClose={() => setCopilotNotification(null)} 
      />
    </div>
  );
}
