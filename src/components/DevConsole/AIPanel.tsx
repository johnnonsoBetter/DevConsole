/**
 * AI Panel Component
 * Main tab showing all available Chrome AI APIs in a grid layout
 */

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Chrome, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AICard } from './AI/AICard';
import { AI_APIS, multiAIService } from '../../lib/devConsole/multiAIService';
import { getBrowserSupport } from '../../lib/devConsole/aiService';
import type { AIAvailability } from '../../lib/devConsole/aiService';

export function AIPanel() {
  const [availability, setAvailability] = useState<Record<string, AIAvailability>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [activatingAPI, setActivatingAPI] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const browserSupport = getBrowserSupport();

  // Check availability for all APIs on mount
  useEffect(() => {
    checkAllAvailability();
  }, []);

  // Set up download progress callbacks
  useEffect(() => {
    AI_APIS.forEach(api => {
      multiAIService.setDownloadProgressCallback(api.id, async (progress) => {
        setDownloadProgress(prev => ({
          ...prev,
          [api.id]: progress
        }));

        // Update availability based on progress
        if (progress > 0 && progress < 100) {
          // Currently downloading
          setAvailability(prev => ({
            ...prev,
            [api.id]: 'downloading'
          }));
        } else if (progress === 100) {
          // Download complete, re-check availability
          const newAvailability = await multiAIService.checkAvailability(api.id);
          setAvailability(prev => ({
            ...prev,
            [api.id]: newAvailability
          }));
        }
      });
    });
  }, []);

  const checkAllAvailability = async () => {
    setIsRefreshing(true);
    try {
      const results = await multiAIService.checkAllAvailability();
      setAvailability(results);
    } catch (error) {
      console.error('Failed to check AI availability:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleActivateAPI = async (apiId: string) => {
    setActivatingAPI(apiId);
    try {
      await multiAIService.activateAPI(apiId);

      // Re-check availability after activation
      const newAvailability = await multiAIService.checkAvailability(apiId);
      setAvailability(prev => ({
        ...prev,
        [apiId]: newAvailability
      }));
    } catch (error) {
      console.error(`Failed to activate ${apiId}:`, error);
      // Optionally show error toast
    } finally {
      setActivatingAPI(null);
    }
  };

  // Browser not supported
  if (!browserSupport.isSupported) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            AI Features Not Available
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {browserSupport.reason}
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Requirements:</strong>
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside text-left">
              <li>Chrome 138 or later (stable APIs)</li>
              <li>Desktop only (Windows, macOS, Linux, ChromeOS)</li>
              <li>At least 22GB free disk space</li>
              <li>4GB+ VRAM or 16GB+ RAM</li>
            </ul>
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Chrome className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Current: {browserSupport.browserName}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={checkAllAvailability}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh Status
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-success">
              {Object.values(availability).filter(a => a === 'available').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Activated</div>
          </div>
          <div className="bg-info/10 border border-info/20 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-info">
              {Object.values(availability).filter(a => a === 'downloading').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Downloading</div>
          </div>
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-warning">
              {Object.values(availability).filter(a => a === 'downloadable').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-gray-500">
              {Object.values(availability).filter(a => a === 'unavailable').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Unavailable</div>
          </div>
        </div>
      </div>

      {/* API Grid */}
      <div className="flex-1 overflow-auto p-6">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {AI_APIS.map((api, index) => (
            <motion.div
              key={api.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AICard
                api={api}
                availability={availability[api.id] || 'unavailable'}
                downloadProgress={downloadProgress[api.id] || 0}
                onActivate={() => handleActivateAPI(api.id)}
                isActivating={activatingAPI === api.id}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Chrome className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Privacy & Performance
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• All AI processing happens entirely on your device</li>
                <li>• No data is sent to external servers or cloud services</li>
                <li>• Models are downloaded once and cached locally</li>
                <li>• Requires stable network for initial download only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function (should be imported from utils but inlined for clarity)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
