/**
 * ControlButton Component
 * Reusable animated button for video call controls
 * Features: keyboard navigation, ARIA support, visual feedback
 */

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useCallback, type KeyboardEvent } from 'react';

interface ControlButtonProps {
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  isActive?: boolean;
  isDestructive?: boolean;
  onClick?: () => void;
  label: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
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

  // Responsive sizes: mobile-first approach
  const sizeClasses = {
    xs: 'w-8 h-8 sm:w-9 sm:h-9',
    sm: 'w-9 h-9 sm:w-10 sm:h-10',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-11 h-11 sm:w-12 sm:h-12',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    sm: 'w-4 h-4 sm:w-[18px] sm:h-[18px]',
    md: 'w-[18px] h-[18px] sm:w-5 sm:h-5',
    lg: 'w-5 h-5',
  };

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
      e.preventDefault();
      onClick();
    }
  }, [onClick, disabled]);

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
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
      aria-pressed={isActive}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <CurrentIcon className={iconSizes[size]} aria-hidden="true" />
      {showLabel && (
        <span className="ml-2 text-caption2 font-medium">{label}</span>
      )}
    </motion.button>
  );
}
