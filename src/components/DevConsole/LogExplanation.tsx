/**
 * Log Explanation Component
 * Displays AI-powered explanations of console logs
 */

import { AlertCircle, Brain, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Sparkles, XCircle } from 'lucide-react';
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
// SEVERITY BADGE
// ============================================================================

function SeverityBadge({ severity }: { severity: LogExplanationData['severity'] }) {
  if (!severity) return null;

  const config = {
    low: {
      icon: CheckCircle2,
      label: 'Low Severity',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    },
    medium: {
      icon: AlertCircle,
      label: 'Medium Severity',
      className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    },
    high: {
      icon: AlertCircle,
      label: 'High Severity',
      className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    },
    critical: {
      icon: XCircle,
      label: 'Critical',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
    },
  };

  const { icon: Icon, label, className } = config[severity];

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold', className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    causes: true,
    fixes: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Show loading state
  if (isLoading && !streamingText) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-purple-900/10 dark:via-blue-900/10 dark:to-purple-900/10 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse shadow-md">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              AI is analyzing your log...
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Generating explanation
            </p>
          </div>
        </div>
        
        {/* Loading animation */}
        <div className="space-y-3">
          <div className="h-4 bg-gradient-to-r from-purple-200 via-blue-200 to-purple-200 dark:from-purple-800 dark:via-blue-800 dark:to-purple-800 rounded animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 dark:from-blue-800 dark:via-purple-800 dark:to-blue-800 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gradient-to-r from-purple-200 via-blue-200 to-purple-200 dark:from-purple-800 dark:via-blue-800 dark:to-purple-800 rounded animate-pulse w-5/6"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-red-200 dark:border-red-800 p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <XCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
              Failed to Generate Explanation
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
              {error}
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-3 text-xs text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show streaming content
  if (streamingText && !explanation) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-purple-900/10 dark:via-blue-900/10 dark:to-purple-900/10 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
            <Brain className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              AI Analysis
              <span className="inline-flex items-center gap-1 text-xs font-normal text-purple-600 dark:text-purple-400">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Streaming...
              </span>
            </h4>
          </div>
        </div>
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {streamingText}
            <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse"></span>
          </div>
        </div>
      </div>
    );
  }

  // Show explanation
  if (!explanation) return null;

  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-purple-900/10 dark:via-blue-900/10 dark:to-purple-900/10 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-6 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              AI Analysis
            </h4>
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          {explanation.severity && <SeverityBadge severity={explanation.severity} />}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close explanation"
          >
            ×
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white/50 dark:bg-gray-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
        <h5 className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Summary
        </h5>
        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium">
          {explanation.summary}
        </p>
      </div>

      {/* Explanation */}
      <div>
        <h5 className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase mb-2">
          Detailed Explanation
        </h5>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {explanation.explanation}
          </div>
        </div>
      </div>

      {/* Possible Causes */}
      {explanation.possibleCauses && explanation.possibleCauses.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('causes')}
            className="flex items-center justify-between w-full text-left mb-2 group"
          >
            <h5 className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              Possible Causes ({explanation.possibleCauses.length})
            </h5>
            {expandedSections.causes ? (
              <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
            )}
          </button>
          {expandedSections.causes && (
            <ul className="space-y-2">
              {explanation.possibleCauses.map((cause, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Suggested Fixes */}
      {explanation.suggestedFixes && explanation.suggestedFixes.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('fixes')}
            className="flex items-center justify-between w-full text-left mb-2 group"
          >
            <h5 className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3" />
              Suggested Fixes ({explanation.suggestedFixes.length})
            </h5>
            {expandedSections.fixes ? (
              <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
            )}
          </button>
          {expandedSections.fixes && (
            <ul className="space-y-2">
              {explanation.suggestedFixes.map((fix, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer Note */}
      <div className="pt-3 border-t border-purple-200 dark:border-purple-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          AI-generated explanation • Review and verify suggestions before implementing
        </p>
      </div>
    </div>
  );
}
