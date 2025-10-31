/**
 * AI Download Progress Component
 * Visual progress indicator for AI model download
 */

import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import type { AIDownloadProgressProps } from './types';

export function AIDownloadProgress({
  progress,
  modelName = 'Gemini Nano'
}: AIDownloadProgressProps) {
  return (
    <div className="bg-info/10 border border-info/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader className="w-4 h-4 text-info animate-spin" />
          <span className="text-sm font-medium text-info">Downloading AI Model</span>
        </div>
        <span className="text-xs text-info font-mono">{progress}%</span>
      </div>

      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-gradient-to-r from-info to-primary"
        />
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        {modelName} • First-time setup • This may take a few minutes
      </p>
    </div>
  );
}
