/**
 * Environment Badge Component
 * Displays whether the inspected page is in Dev Mode or Remote
 */

import { Code, Globe } from 'lucide-react';
import { cn } from '../../utils';
import {
    getEnvironmentDisplayName,
    useInspectedPageEnvironment,
    type Environment
} from '../../utils/environmentDetection';

interface EnvironmentBadgeProps {
  /** Optional className for styling */
  className?: string;
  /** Show hostname in tooltip */
  showDetails?: boolean;
  /** Compact mode - icon only */
  compact?: boolean;
}

/**
 * Get the appropriate icon for each environment
 */
function getEnvironmentIcon(env: Environment) {
  return env === 'development' ? Code : Globe;
}

/**
 * Get badge styling for each environment
 */
function getBadgeStyles(env: Environment): string {
  return env === 'development'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
}

/**
 * Get dot color for compact mode
 */
function getDotColor(env: Environment): string {
  return env === 'development' ? 'bg-green-500' : 'bg-blue-500';
}

export function EnvironmentBadge({ 
  className, 
  showDetails = false,
  compact = false 
}: EnvironmentBadgeProps) {
  const { envInfo, isLoading } = useInspectedPageEnvironment();

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
        'animate-pulse',
        className
      )}>
        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        {!compact && <span>...</span>}
      </div>
    );
  }

  if (!envInfo) {
    return null;
  }

  const Icon = getEnvironmentIcon(envInfo.environment);
  const displayName = getEnvironmentDisplayName(envInfo.environment);

  // Compact mode - just a colored dot with tooltip
  if (compact) {
    return (
      <div 
        className={cn('relative group', className)}
        title={`${displayName}${envInfo.hostname ? ` (${envInfo.hostname})` : ''}`}
      >
        <div className={cn(
          'w-2.5 h-2.5 rounded-full',
          getDotColor(envInfo.environment),
          envInfo.isDevelopment && 'animate-pulse'
        )} />
        
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {displayName}
          {envInfo.hostname && (
            <span className="text-gray-400 ml-1">({envInfo.hostname})</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
          getBadgeStyles(envInfo.environment),
          'transition-all hover:shadow-sm cursor-default',
          className
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{displayName}</span>
      </div>

      {/* Detailed tooltip on hover */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[180px]">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Host:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {envInfo.hostname || 'N/A'}
              </span>
            </div>
            {envInfo.port && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Port:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {envInfo.port}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              {envInfo.reason}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple inline environment indicator (just hostname with colored dot)
 */
export function EnvironmentIndicator({ className }: { className?: string }) {
  const { envInfo, isLoading } = useInspectedPageEnvironment();

  if (isLoading || !envInfo) {
    return null;
  }

  return (
    <span className={cn(
      'flex items-center gap-1 text-xs',
      envInfo.isDevelopment ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400',
      className
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        getDotColor(envInfo.environment)
      )} />
      {envInfo.hostname}
      {envInfo.port && `:${envInfo.port}`}
    </span>
  );
}
