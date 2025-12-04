/**
 * LogDetailsContent Component
 * Displays detailed information about a selected log entry
 * Includes AI analysis, message, arguments, stack trace, and metadata
 * Used in both mobile bottom sheet and desktop side panel
 */

import ReactJson from '@microlink/react-json-view';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock, FileCode, Info } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useUnifiedTheme } from '../../../hooks/useTheme';
import { cn } from '../../../utils';
import { ensureJsonObject } from '../../../utils/jsonSanitizer';
import { humanizeTime } from '../../../utils/timeUtils';
import { LogLevelChip } from '../Chips';
import type { LogExplanationData } from '../LogExplanation';
import { LogExplanation } from '../LogExplanation';

// ============================================================================
// TYPES
// ============================================================================

export interface LogDetailsContentProps {
  selectedLog: any;
  explanation?: LogExplanationData;
  isExplaining?: boolean;
  explainError?: string;
  streamingText?: string;
  onClearExplanation?: () => void;
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function SectionHeader({ title, icon, badge, isCollapsible, isExpanded, onToggle }: SectionHeaderProps) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </span>
        {badge}
      </div>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 mx-2" />
      {isCollapsible && (
        <span className="text-gray-400 dark:text-gray-500">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      )}
    </>
  );

  if (isCollapsible && onToggle) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center mb-2 hover:opacity-80 transition-opacity"
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center mb-2">{content}</div>;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LogDetailsContent({
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
    metadata: true, // Show metadata by default
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Get status indicator based on log level
  const getLevelInfo = () => {
    switch (selectedLog.level) {
      case 'error':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' };
      case 'warn':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' };
      case 'info':
        return { icon: <Info className="w-4 h-4" />, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' };
      default:
        return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' };
    }
  };

  const levelInfo = getLevelInfo();
  
  return (
    <div className="space-y-5">
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

      {/* Status Summary Card - Visual status with level color */}
      <div className={cn('rounded-lg border p-3', levelInfo.bg)}>
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5', levelInfo.color)}>
            {levelInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <LogLevelChip level={selectedLog.level} />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {humanizeTime(selectedLog.timestamp)}
              </span>
            </div>
            {selectedLog.source && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                <FileCode className="w-3 h-3 flex-shrink-0" />
                <span className="font-mono truncate">{selectedLog.source.file}</span>
                {selectedLog.source.line && <span>:{selectedLog.source.line}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Message Section */}
      <div>
        <SectionHeader title="Message" />
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <p className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {selectedLog.message}
          </p>
        </div>
      </div>

      {/* Arguments Section */}
      {selectedLog.args.length > 0 && (
        <div>
          <SectionHeader
            title="Arguments"
            badge={
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                {selectedLog.args.length}
              </span>
            }
            isCollapsible
            isExpanded={expandedSections.args}
            onToggle={() => toggleSection('args')}
          />
          {expandedSections.args && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <LazyReactJson data={selectedLog.args} isDarkMode={isDarkMode} name="args" />
            </div>
          )}
        </div>
      )}

      {/* Stack Trace Section */}
      {selectedLog.stack && (
        <div>
          <SectionHeader title="Stack Trace" />
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <ClickableStackTrace stack={selectedLog.stack} />
          </div>
        </div>
      )}

      {/* Metadata Section */}
      <div>
        <SectionHeader
          title="Metadata"
          isCollapsible
          isExpanded={expandedSections.metadata}
          onToggle={() => toggleSection('metadata')}
        />
        {expandedSections.metadata && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2.5 overflow-hidden">
            <div className="flex justify-between text-xs gap-2">
              <span className="text-gray-500 dark:text-gray-400 shrink-0 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Timestamp
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-mono truncate text-right">
                {new Date(selectedLog.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex justify-between text-xs gap-2 items-center">
              <span className="text-gray-500 dark:text-gray-400 shrink-0">Level</span>
              <LogLevelChip level={selectedLog.level} />
            </div>
            {selectedLog.source && (
              <>
                <div className="h-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0 flex items-center gap-1.5">
                    <FileCode className="w-3 h-3" />
                    Source
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono truncate text-right" title={selectedLog.source.file}>
                    {selectedLog.source.file?.split('/').pop() || selectedLog.source.file}
                    {selectedLog.source.line && `:${selectedLog.source.line}`}
                  </span>
                </div>
              </>
            )}
            {(selectedLog as any).context && (
              <>
                <div className="h-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">Context</span>
                  <span className={cn(
                    'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                    (selectedLog as any).context === 'extension' 
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}>
                    {(selectedLog as any).context}
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
