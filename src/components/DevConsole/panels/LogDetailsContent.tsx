/**
 * LogDetailsContent Component
 * Displays detailed information about a selected log entry
 * Includes AI analysis, message, arguments, stack trace, and metadata
 * Used in both mobile bottom sheet and desktop side panel
 */

import { useState, useCallback, memo } from 'react';
import ReactJson from '@microlink/react-json-view';
import { LogLevelChip } from '../Chips';
import { useUnifiedTheme } from '../../../hooks/useTheme';
import { useSummarizerModel } from '@/hooks/ai';
import { AIModel, useChromeAI } from '@/hooks/useChromeAI';
import {
  AIInsightPanel,
  AIUnsupportedNotice,
  AIFirstUsePrompt,
  AIDownloadProgress,
} from '../AI';
import { ClickableStackTrace } from './ClickableStackTrace';

/**
 * Lazy ReactJson wrapper - only renders when expanded
 */
const LazyReactJson = memo(({ data, isDarkMode, name }: { data: any; isDarkMode: boolean; name: string }) => (
  <ReactJson
    src={data}
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
));

LazyReactJson.displayName = 'LazyReactJson';

// ============================================================================
// LOG DETAILS CONTENT COMPONENT
// ============================================================================

interface LogDetailsContentProps {
  selectedLog: any;
}

export function LogDetailsContent({ selectedLog }: LogDetailsContentProps) {
  const { isDarkMode } = useUnifiedTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    args: false,
    metadata: false,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const { availability, downloadProgress } = useChromeAI(AIModel.SUMMARIZER);
  
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
