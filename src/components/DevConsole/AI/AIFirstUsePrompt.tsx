/**
 * AI First Use Prompt Component
 * Activation UI for first-time AI usage
 */

import { Sparkles, Loader, Zap } from 'lucide-react';
import type { AIFirstUsePromptProps } from './types';

export function AIFirstUsePrompt({ onActivate, loading = false }: AIFirstUsePromptProps) {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Enable AI-Powered Log Analysis
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Get instant insights and contextual explanations for all log entries powered by Chrome's built-in AI (Gemini Nano).
            All processing happens on your device - completely private.
          </p>
          <button
            onClick={onActivate}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Activating AI...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Activate AI Features
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            First-time setup may download model (~22GB)
          </p>
        </div>
      </div>
    </div>
  );
}
