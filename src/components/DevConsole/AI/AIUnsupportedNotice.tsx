/**
 * AI Unsupported Notice Component
 * Shows when AI features are not available with requirements
 */

import { AlertCircle } from 'lucide-react';
import type { AIUnsupportedNoticeProps } from './types';

export function AIUnsupportedNotice({ reason, browserName }: AIUnsupportedNoticeProps) {
  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-warning mb-1">
            AI Features Not Available
          </h4>
          <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
            {reason}
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Requirements:</strong>
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Chrome 138 or later (stable APIs)</li>
              <li>Desktop only (Windows, macOS, Linux, ChromeOS)</li>
              <li>At least 22GB free disk space</li>
              <li>4GB+ VRAM or 16GB+ RAM</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Current: {browserName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
