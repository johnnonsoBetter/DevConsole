/**
 * MemoryStatusIndicator Component
 * Shows the status of call memory sync in the video call UI
 */

import { motion } from 'framer-motion';
import { Brain, Check, CloudOff, Loader2, Wifi, WifiOff } from 'lucide-react';
import type { MemorySessionState } from '../lib/callMemoryTypes';

// ============================================================================
// TYPES
// ============================================================================

interface MemoryStatusIndicatorProps {
  /** Current memory state */
  state: MemorySessionState | string;
  /** Whether memory is configured */
  isConfigured: boolean;
  /** Number of batches synced */
  batchesSynced?: number;
  /** Error message if any */
  error?: string | null;
  /** Show compact version */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// ============================================================================
// STATE CONFIG
// ============================================================================

interface StateConfig {
  icon: typeof Brain;
  color: string;
  bgColor: string;
  label: string;
  animate?: boolean;
}

const STATE_CONFIGS: Record<string, StateConfig> = {
  disconnected: {
    icon: WifiOff,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    label: 'Not connected',
  },
  connecting: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Connecting...',
    animate: true,
  },
  connected: {
    icon: Brain,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Memory active',
  },
  syncing: {
    icon: Wifi,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Syncing...',
    animate: true,
  },
  flushing: {
    icon: Loader2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    label: 'Saving...',
    animate: true,
  },
  error: {
    icon: CloudOff,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Sync error',
  },
  'not-configured': {
    icon: WifiOff,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    label: 'Not configured',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MemoryStatusIndicator({
  state,
  isConfigured,
  batchesSynced = 0,
  error,
  compact = false,
  className = '',
}: MemoryStatusIndicatorProps) {
  // Get config for current state
  const effectiveState = !isConfigured ? 'not-configured' : state;
  const config = STATE_CONFIGS[effectiveState] || STATE_CONFIGS.disconnected;
  const Icon = config.icon;

  // Compact version - just an icon with tooltip
  if (compact) {
    return (
      <div
        className={`relative group ${className}`}
        title={error || config.label}
      >
        <div
          className={`
            flex items-center justify-center
            w-8 h-8 rounded-full
            ${config.bgColor}
            transition-colors duration-200
          `}
        >
          <Icon
            className={`
              w-4 h-4 ${config.color}
              ${config.animate ? 'animate-spin' : ''}
            `}
          />
        </div>
        
        {/* Tooltip */}
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2 py-1 rounded bg-gray-900 text-xs text-white
          opacity-0 group-hover:opacity-100
          pointer-events-none transition-opacity
          whitespace-nowrap z-50
        ">
          {error || config.label}
          {batchesSynced > 0 && !error && (
            <span className="text-gray-400 ml-1">
              ({batchesSynced} synced)
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full version with label
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        ${config.bgColor}
        ${className}
      `}
    >
      <Icon
        className={`
          w-4 h-4 ${config.color}
          ${config.animate ? 'animate-spin' : ''}
        `}
      />
      
      <span className={`text-xs font-medium ${config.color}`}>
        {error ? 'Sync error' : config.label}
      </span>
      
      {batchesSynced > 0 && !error && state === 'connected' && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Check className="w-3 h-3" />
          {batchesSynced}
        </span>
      )}
    </motion.div>
  );
}

// ============================================================================
// MINIMAL BADGE VERSION
// ============================================================================

interface MemoryBadgeProps {
  isActive: boolean;
  isSyncing?: boolean;
  className?: string;
}

/**
 * Minimal badge showing just active/inactive state
 */
export function MemoryBadge({
  isActive,
  isSyncing = false,
  className = '',
}: MemoryBadgeProps) {
  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs
        ${isActive 
          ? 'bg-green-500/10 text-green-400' 
          : 'bg-gray-500/10 text-gray-500'
        }
        ${className}
      `}
      title={isActive ? 'Call memory active' : 'Call memory inactive'}
    >
      <Brain className={`w-3 h-3 ${isSyncing ? 'animate-pulse' : ''}`} />
      <span className="hidden sm:inline">
        {isActive ? 'Memory' : 'No Memory'}
      </span>
    </div>
  );
}
