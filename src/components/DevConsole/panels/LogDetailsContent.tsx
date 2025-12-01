/**
 * LogDetailsContent Component
 * Displays detailed information about a selected log entry
 * Includes AI analysis, message, arguments, stack trace, and metadata
 * Used in both mobile bottom sheet and desktop side panel
 */

import ReactJson from '@microlink/react-json-view';
import { memo, useCallback, useMemo, useState } from 'react';
import { useUnifiedTheme } from '../../../hooks/useTheme';
import { cn } from '../../../utils';
import { ensureJsonObject } from '../../../utils/jsonSanitizer';
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
// LOG ACTION BAR COMPONENT
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
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <p className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-wrap-anywhere">
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
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2 overflow-hidden">
            <div className="flex justify-between text-xs gap-2">
              <span className="text-gray-500 dark:text-gray-400 shrink-0">Timestamp:</span>
              <span className="text-gray-900 dark:text-gray-100 font-mono truncate">
                {new Date(selectedLog.timestamp).toISOString()}
              </span>
            </div>
            <div className="flex justify-between text-xs gap-2">
              <span className="text-gray-500 dark:text-gray-400 shrink-0">Level:</span>
              <LogLevelChip level={selectedLog.level} />
            </div>
            {selectedLog.source && (
              <>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">File:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono truncate" title={selectedLog.source.file}>
                    {selectedLog.source.file}
                  </span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">Line:</span>
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
