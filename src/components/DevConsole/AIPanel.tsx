/**
 * AI Panel Component
 * Displays all available Chrome AI APIs in a grid layout
 * Each card manages its own state using dedicated hooks
 * Provides on-device AI processing powered by Gemini Nano
 */

import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { AICard } from './AI/AICard';
import { AIModel } from '@/hooks/useChromeAI';

// ============================================================================
// CONSTANTS
// ============================================================================

/** AI Models configuration with icons and metadata */
const AI_MODELS = [
  {
    model: AIModel.SUMMARIZER,
    icon: '📝',
  },
  {
    model: AIModel.PROMPT,
    icon: '💬',
  },
  {
    model: AIModel.TRANSLATOR,
    icon: '🌐',
  },
  {
    model: AIModel.LANGUAGE_DETECTOR,
    icon: '🔍',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIPanel() {
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Trigger re-render of all cards by incrementing key
   * Forces all AI cards to re-check their availability status
   */
  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };


  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Chrome AI APIs
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Built-in AI powered by Gemini Nano • 100% on-device
              </p>
            </div>
          </div>

          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        {/* Stats - Simplified without global state */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-success">4</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total APIs</div>
          </div>
          <div className="bg-info/10 border border-info/20 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-info">-</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Stable</div>
          </div>
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-warning">-</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-gray-500">-</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">On-Device</div>
          </div>
        </div>
      </div>

      {/* API Grid */}
      <div className="flex-1 overflow-auto p-6">
        <motion.div
          key={refreshKey}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {AI_MODELS.map(({ model, icon }) => (
            <AICard key={model} model={model} icon={icon} />
          ))}
        </motion.div>

        {/* Privacy & Performance Info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Privacy & Performance
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1" role="list">
                <li>• All AI processing happens entirely on your device</li>
                <li>• No data is sent to external servers or cloud services</li>
                <li>• Models are downloaded once and cached locally</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
