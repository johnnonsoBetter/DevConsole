/**
 * ControlButton Component
 * Reusable animated button for video call controls
 */

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ControlButtonProps {
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  isActive?: boolean;
  isDestructive?: boolean;
  onClick?: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  disabled?: boolean;
}

export function ControlButton({
  icon: Icon,
  activeIcon: ActiveIcon,
  isActive = false,
  isDestructive = false,
  onClick,
  label,
  size = 'md',
  showLabel = false,
  disabled = false,
}: ControlButtonProps) {
  const CurrentIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center rounded-full
        transition-colors duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isDestructive
            ? 'bg-destructive text-white hover:bg-destructive/90'
            : isActive
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-transparent text-white hover:bg-white/10'
        }
      `}
      title={label}
      aria-label={label}
    >
      <CurrentIcon className={iconSizes[size]} />
      {showLabel && (
        <span className="ml-2 text-caption2 font-medium">{label}</span>
      )}
    </motion.button>
  );
}
