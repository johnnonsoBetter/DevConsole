/**
 * AI Power Badge Component
 * Displays AI availability status with visual indicators
 */

import { CheckCircle, Loader, AlertCircle, Zap } from 'lucide-react';
import { cn } from 'src/utils';
import type { AIPowerBadgeProps } from './types';

export function AIPowerBadge({ status, progress }: AIPowerBadgeProps) {
  const statusConfig = {
    available: {
      color: 'bg-success/10 text-success border-success/20',
      icon: CheckCircle,
      label: 'AI Ready'
    },
    downloading: {
      color: 'bg-info/10 text-info border-info/20',
      icon: Loader,
      label: `AI Downloading ${progress || 0}%`
    },
    downloadable: {
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: Zap,
      label: 'AI Available (Click to activate)'
    },
    unavailable: {
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200',
      icon: AlertCircle,
      label: 'AI Unavailable'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border',
        config.color
      )}
      title={config.label}
    >
      <Icon className={cn('w-3.5 h-3.5', status === 'downloading' && 'animate-spin')} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
