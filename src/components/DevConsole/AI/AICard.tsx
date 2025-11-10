/**
 * AI API Card Component
 * Displays individual AI API with status, download progress, and activation
 */

import { motion } from 'framer-motion';
import { CheckCircle, Loader, Zap } from 'lucide-react';
import { cn } from '../../../utils';
import { AIModel, useChromeAI } from '@/hooks/useChromeAI';
import { useState, useEffect } from 'react';

interface AICardProps {
  model: AIModel;
  icon: React.ReactNode;
}

export function AICard({ icon, model }: AICardProps) {
  // Safety check - if model is undefined, return null
  if (!model) {
    console.error('AICard received undefined model prop');
    return null;
  }

  const { availability, downloadProgress, checkAvailability, createSession } = useChromeAI(model);

  const [isActivating, setIsActivating] = useState(false);

  // Check availability on mount
  useEffect(() => {
    const isAvailable = async () => {
      const availability = await checkAvailability();

      return availability;
    };

    console.log(isAvailable);
  }, [checkAvailability]);

  // Handle activation
  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await createSession();
    } catch (err) {
      console.error('Failed to activate AI model:', err);
    } finally {
      setIsActivating(false);
    }
  };

  // Get status configuration based on availability
  const getStatusConfig = () => {
    switch (availability) {
      case 'available':
        return {
          buttonText: 'Ready',
          buttonClass: 'bg-success hover:bg-success/90 text-white',
        };
      case 'downloadable':
        return {
          buttonText: 'Download & Activate',
          buttonClass: 'bg-primary hover:bg-primary/90 text-white',
        };
      case 'downloading':
        return {
          buttonText: `Downloading ${downloadProgress}%`,
          buttonClass: 'bg-info hover:bg-info/90 text-white',
        };
      case 'unavailable':
      default:
        return {
          buttonText: 'Unavailable',
          buttonClass: 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
        };
    }
  };

  const statusConfig = getStatusConfig();

  const stabilityColors = [
    { status: 'downloadable', class: 'bg-warning/10 text-warning border-warning/20' },
    { status: 'downloading', class: 'bg-info/10 text-info border-info/20' },
    { status: 'available', class: 'bg-success/10 text-success border-success/20' },
    { status: 'unavailable', class: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative rounded-xl border-2 p-5 transition-all',
        stabilityColors.find((c) => c.status === availability)?.class ||
          'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{icon}</div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{model}</h3>
          </div>
        </div>
      </div>

      {/* Description */}

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

      {/* Action Button */}
      <button
        onClick={handleActivate}
        disabled={
          isActivating ||
          (downloadProgress > 0 && downloadProgress < 100) ||
          availability === 'unavailable'
        }
        className={cn(
          'w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2',
          statusConfig.buttonClass
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
            {statusConfig.buttonText}
          </>
        ) : availability === 'downloading' ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            {statusConfig.buttonText}
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {statusConfig.buttonText}
          </>
        )}
      </button>
    </motion.div>
  );
}
