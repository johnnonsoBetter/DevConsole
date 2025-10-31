/**
 * AI Insight Panel Component
 * Display AI-generated insights with markdown formatting
 */

import { motion } from 'framer-motion';
import { Sparkles, Loader, AlertCircle, Zap, Chrome } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIInsightPanelProps } from './types';

export function AIInsightPanel({
  summary,
  loading = false,
  error = null,
  title = '🤖 AI Log Analysis'
}: AIInsightPanelProps) {
  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Loader className="w-4 h-4 text-primary animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Analyzing with AI...
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Gemini Nano is processing your log entry
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-destructive mb-1">
              AI Analysis Failed
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!summary) {
    return null;
  }

  // Success state with AI insights
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h4>
        <div className="ml-auto">
          <Chrome className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-primary prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summary}
        </ReactMarkdown>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Powered by Chrome's built-in AI (Gemini Nano) • 100% on-device, private
        </p>
      </div>
    </motion.div>
  );
}
