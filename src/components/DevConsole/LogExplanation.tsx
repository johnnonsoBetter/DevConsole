/**
 * Log Explanation Component
 * Displays AI-powered explanations of console logs
 * Clean, minimal UI design
 */

import { motion } from 'framer-motion';
import { AlertTriangle, Bot, CheckCircle2, ChevronDown, ChevronRight, Lightbulb, X, XCircle, Zap } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils';
import { SparklesLoader } from './SparklesLoader';

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
    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className={cn('w-2 h-2 rounded-full', color)} />
      {label}
    </span>
  );
}

// ============================================================================
// EXPANDABLE TEXT COMPONENT
// ============================================================================

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

function ExpandableText({ text, maxLength = 300, className }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation && !isExpanded 
    ? text.slice(0, maxLength).trim() + '...' 
    : text;

  return (
    <div className={className}>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
        {displayText}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          <ChevronDown 
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} 
          />
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
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
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="pb-3"
        >
          {children}
        </motion.div>
      )}
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
  
  // Loading state - enhanced sparkles loader
  if (isLoading && !streamingText) {
    return (
      <SparklesLoader
        title="Analyzing log"
        subtitle="AI is examining the issue"
        size="md"
      />
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
          <motion.div 
            className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Bot className="w-4 h-4 text-white" />
          </motion.div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Analysis</span>
            <span className="flex items-center gap-1.5 text-xs text-purple-500 dark:text-purple-400">
              <motion.span 
                className="w-1.5 h-1.5 bg-purple-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              Streaming
            </span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {streamingText}
            <motion.span 
              className="inline-block w-0.5 h-4 bg-purple-500 ml-0.5"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </p>
        </div>
      </div>
    );
  }

  // No explanation to show
  if (!explanation) return null;

  // Full explanation - clean card layout
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Bot className="w-4 h-4 text-white" />
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

        {/* Detailed Explanation - with See More */}
        <div className="py-3 border-b border-gray-100 dark:border-gray-700/50">
          <ExpandableText 
            text={explanation.explanation} 
            maxLength={250}
          />
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
    </motion.div>
  );
}
