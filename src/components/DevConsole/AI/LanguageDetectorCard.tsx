/**
 * Language Detector API Card Component
 * Manages its own state using useLanguageDetectorModel hook
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader, AlertCircle, Download, Zap } from 'lucide-react';
import { cn } from '../../../utils';
import { useLanguageDetectorModel } from '../../../hooks/ai/useLanguageDetectorModel';

export function LanguageDetectorCard() {
  const { 
    availability, 
    checkAvailability, 
    createSession,
    downloadProgress: hookProgress 
  } = useLanguageDetectorModel();
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await createSession();
      
      // Re-check availability after activation
      await checkAvailability();
    } catch (error) {
      console.error('Failed to activate Language Detector:', error);
    } finally {
      setIsActivating(false);
    }
  };

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
          label: `Downloading ${hookProgress}%`,
          buttonText: `Downloading ${hookProgress}%`,
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
      case 'unknown':
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

  // Check if downloading
  const isDownloading = availability === 'downloading';

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
          <div className="text-4xl">🔍</div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Language Detector
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Detect language automatically
            </p>
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0">
          <StatusIcon className={cn(
            'w-5 h-5',
            isDownloading && 'animate-spin'
          )} />
        </div>
      </div>

      {/* Download Progress Bar */}
      {isDownloading && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-info">Downloading model...</span>
            <span className="text-xs font-semibold text-info">{hookProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${hookProgress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-info to-primary"
            />
          </div>
        </div>
      )}

      {/* Status */}
      {!isDownloading && (
        <div className="mb-4">
          <span className={cn(
            'text-xs font-semibold',
            availability === 'available' ? 'text-success' :
              availability === 'downloadable' ? 'text-warning' :
                'text-gray-400'
          )}>
            Status: {status.label}
          </span>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleActivate}
        disabled={status.buttonDisabled || isActivating || isDownloading}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2',
          status.buttonClass
        )}
      >
        {isActivating || isDownloading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            {isDownloading ? `Downloading ${hookProgress}%` : 'Activating...'}
          </>
        ) : availability === 'available' ? (
          <>
            <CheckCircle className="w-4 h-4" />
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
