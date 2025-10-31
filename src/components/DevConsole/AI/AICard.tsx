/**
 * AI API Card Component
 * Displays individual AI API with status, download progress, and activation
 */

import { motion } from 'framer-motion';
import { CheckCircle, Loader, AlertCircle, Download, Zap, Info } from 'lucide-react';
import { cn } from '../../../utils';
import type { AIAvailability } from 'src/lib/devConsole/aiService';
import type { AIAPIMetadata } from 'src/lib/devConsole/multiAIService';

interface AICardProps {
  api: AIAPIMetadata;
  availability: AIAvailability;
  downloadProgress?: number;
  onActivate: () => void;
  isActivating?: boolean;
}

export function AICard({
  api,
  availability,
  downloadProgress = 0,
  onActivate,
  isActivating = false
}: AICardProps) {
  const getStatusConfig = () => {
    switch (availability) {
      case 'available':
        return {
          icon: CheckCircle,
          color: 'text-success border-success/20 bg-success/5',
          label: 'Ready',
          buttonText: 'Activated',
          buttonDisabled: true,
          buttonClass: 'bg-success/10 text-success cursor-not-allowed'
        };
      case 'downloading':
        return {
          icon: Loader,
          color: 'text-info border-info/20 bg-info/5',
          label: `Downloading ${downloadProgress}%`,
          buttonText: `Downloading ${downloadProgress}%`,
          buttonDisabled: true,
          buttonClass: 'bg-info/10 text-info cursor-not-allowed'
        };
      case 'downloadable':
        return {
          icon: Download,
          color: 'text-warning border-warning/20 bg-warning/5',
          label: 'Available',
          buttonText: 'Activate',
          buttonDisabled: false,
          buttonClass: 'bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white'
        };
      case 'unavailable':
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
          label: 'Unavailable',
          buttonText: 'Not Available',
          buttonDisabled: true,
          buttonClass: 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  const stabilityColors = {
    'stable': 'bg-success/10 text-success border-success/20',
    'origin-trial': 'bg-warning/10 text-warning border-warning/20',
    'extension-only': 'bg-info/10 text-info border-info/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative rounded-xl border-2 p-5 transition-all',
        status.color
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{api.icon}</div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {api.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                stabilityColors[api.stability]
              )}>
                {api.stability === 'stable' ? 'Stable' : api.stability === 'origin-trial' ? 'Origin Trial' : 'Extension Only'}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Chrome {api.chromeVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0">
          <StatusIcon className={cn(
            'w-5 h-5',
            availability === 'downloading' && 'animate-spin'
          )} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {api.description}
      </p>

      {/* Download Progress Bar (if downloading) */}
      {availability === 'downloading' && downloadProgress > 0 && downloadProgress < 100 && (
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${downloadProgress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-info to-primary"
            />
          </div>
        </div>
      )}

      {/* Info Row */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Model: {api.modelSize}</span>
        </div>
        <span className={cn(
          'font-semibold',
          availability === 'available' ? 'text-success' :
            availability === 'downloading' ? 'text-info' :
              availability === 'downloadable' ? 'text-warning' :
                'text-gray-400'
        )}>
          {status.label}
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={onActivate}
        disabled={status.buttonDisabled || isActivating}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2',
          status.buttonClass
        )}
      >
        {isActivating ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Activating...
          </>
        ) : availability === 'available' ? (
          <>
            <CheckCircle className="w-4 h-4" />
            {status.buttonText}
          </>
        ) : availability === 'downloading' ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            {status.buttonText}
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {status.buttonText}
          </>
        )}
      </button>
    </motion.div>
  );
}
