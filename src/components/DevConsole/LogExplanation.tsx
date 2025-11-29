/**
 * Log Explanation Component
 * Displays AI-powered explanations of console logs
 * Clean, minimal UI design
 */

import { AlertTriangle, Bot, CheckCircle2, ChevronRight, Lightbulb, Loader2, X, XCircle, Zap } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface LogExplanationData {
  summary: string;
  explanation: string;
  possibleCauses?: string[];
  suggestedFixes?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface LogExplanationProps {
  explanation?: LogExplanationData;
  isLoading?: boolean;
  error?: string;
  streamingText?: string;
  onClose?: () => void;
}

// ============================================================================
// SEVERITY INDICATOR
// ============================================================================

function SeverityIndicator({ severity }: { severity: LogExplanationData['severity'] }) {
  if (!severity) return null;

  const config = {
    low: { color: 'bg-emerald-500', label: 'Low' },
    medium: { color: 'bg-amber-500', label: 'Medium' },
    high: { color: 'bg-orange-500', label: 'High' },
    critical: { color: 'bg-red-500', label: 'Critical' },
  };

  const { color, label } = config[severity];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className={cn('w-2 h-2 rounded-full', color)} />
      {label}
    </span>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

function Section({ 
  title, 
  icon: Icon, 
  children, 
  defaultExpanded = true,
  count 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  defaultExpanded?: boolean;
  count?: number;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full py-3 text-left group"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          {title}
          {count !== undefined && (
            <span className="text-gray-400 dark:text-gray-500">({count})</span>
          )}
        </span>
        <ChevronRight 
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            expanded && 'rotate-90'
          )} 
        />
      </button>
      {expanded && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LogExplanation({
  explanation,
  isLoading,
  error,
  streamingText,
  onClose,
}: LogExplanationProps) {
  
  // Loading state - minimal skeleton
  if (isLoading && !streamingText) {
    return (
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Analyzing log...</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">AI is processing</div>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  // Error state - clean and minimal
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800/50 border border-red-200 dark:border-red-800/50 rounded-md overflow-hidden">
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-7 h-7 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Analysis failed</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{error}</p>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Streaming state - live output with cursor
  if (streamingText && !explanation) {
    return (
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Analysis</span>
            <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              Streaming
            </span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {streamingText}
            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-[blink_1s_infinite]" />
          </p>
        </div>
      </div>
    );
  }

  // No explanation to show
  if (!explanation) return null;

  // Full explanation - clean card layout
  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-violet-500" />
        </div>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Analysis</span>
          {explanation.severity && <SeverityIndicator severity={explanation.severity} />}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4">
        {/* Summary - highlighted */}
        <div className="py-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
              {explanation.summary}
            </p>
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="py-3 border-b border-gray-100 dark:border-gray-700/50">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
            {explanation.explanation}
          </p>
        </div>

        {/* Possible Causes */}
        {explanation.possibleCauses && explanation.possibleCauses.length > 0 && (
          <Section 
            title="Possible Causes" 
            icon={AlertTriangle} 
            count={explanation.possibleCauses.length}
          >
            <ul className="space-y-1.5 pl-5">
              {explanation.possibleCauses.map((cause, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  {cause}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Suggested Fixes */}
        {explanation.suggestedFixes && explanation.suggestedFixes.length > 0 && (
          <Section 
            title="Suggested Fixes" 
            icon={Lightbulb} 
            count={explanation.suggestedFixes.length}
          >
            <ol className="space-y-2 pl-5">
              {explanation.suggestedFixes.map((fix, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {fix}
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700/50">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          AI-generated • Verify before implementing
        </p>
      </div>
    </div>
  );
}
