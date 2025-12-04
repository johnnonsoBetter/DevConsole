/**
 * Tooltip Component
 * A styled tooltip that appears on hover with viewport boundary detection
 */

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils';

type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
type TooltipTrigger = 'hover' | 'click' | 'focus';

export interface TooltipProps {
  children: ReactNode;
  content: string;
  side?: TooltipSide;
  disabled?: boolean;
  className?: string;
  /** Delay in ms before showing tooltip */
  delay?: number;
  /** Distance from target element in pixels */
  offset?: number;
  /** Maximum width of tooltip */
  maxWidth?: number | string;
  /** Allow interaction with tooltip content */
  interactive?: boolean;
  /** Trigger mode: hover, click, or focus */
  trigger?: TooltipTrigger;
  /** Auto-adjust position if tooltip would overflow viewport */
  autoAdjust?: boolean;
}

// Position classes for each side
const positionClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
};

// Arrow classes for each side
const arrowClasses: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100 border-x-transparent border-b-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100 border-y-transparent border-l-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100 border-y-transparent border-r-transparent',
};

/**
 * Extracted Arrow component for better readability
 */
const TooltipArrow = ({ side }: { side: TooltipSide }) => (
  <span 
    className={cn(
      "absolute w-0 h-0 border-4",
      arrowClasses[side]
    )}
  />
);

export function Tooltip({ 
  children, 
  content, 
  side = 'right', 
  disabled = false,
  className,
  delay = 0,
  offset,
  maxWidth,
  interactive = false,
  trigger = 'hover',
  autoAdjust = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedSide, setAdjustedSide] = useState<TooltipSide>(side);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Performance: useCallback for event handlers
  const showTooltip = useCallback(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (delay > 0) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    } else {
      setIsVisible(true);
    }
  }, [delay]);

  const hideTooltip = useCallback(() => {
    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Slight delay for interactive tooltips to allow mouse movement
    if (interactive) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    } else {
      setIsVisible(false);
    }
  }, [interactive]);

  const toggleTooltip = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Viewport boundary detection and auto-adjustment
  useEffect(() => {
    if (!isVisible || !autoAdjust || !tooltipRef.current || !containerRef.current) {
      setAdjustedSide(side);
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8; // Minimum distance from viewport edge

    let newSide = side;

    // Check if tooltip overflows based on current side
    switch (side) {
      case 'top':
        if (tooltipRect.top < padding) {
          newSide = 'bottom';
        }
        break;
      case 'bottom':
        if (tooltipRect.bottom > viewportHeight - padding) {
          newSide = 'top';
        }
        break;
      case 'left':
        if (tooltipRect.left < padding) {
          newSide = 'right';
        }
        break;
      case 'right':
        if (tooltipRect.right > viewportWidth - padding) {
          newSide = 'left';
        }
        break;
    }

    // Also check horizontal overflow for top/bottom positioned tooltips
    if (newSide === 'top' || newSide === 'bottom') {
      if (tooltipRect.left < padding) {
        // Could add left-aligned class here
      } else if (tooltipRect.right > viewportWidth - padding) {
        // Could add right-aligned class here
      }
    }

    setAdjustedSide(newSide);
  }, [isVisible, side, autoAdjust]);

  // Reset adjusted side when preferred side changes
  useEffect(() => {
    setAdjustedSide(side);
  }, [side]);

  if (disabled) {
    return <>{children}</>;
  }

  // Build event handlers based on trigger type
  const eventHandlers = (() => {
    switch (trigger) {
      case 'click':
        return {
          onClick: toggleTooltip,
        };
      case 'focus':
        return {
          onFocus: showTooltip,
          onBlur: hideTooltip,
        };
      case 'hover':
      default:
        return {
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
          onFocus: showTooltip,
          onBlur: hideTooltip,
        };
    }
  })();

  // Calculate dynamic styles
  const tooltipStyle: React.CSSProperties = {
    ...(maxWidth && { maxWidth, whiteSpace: 'normal' }),
    ...(offset && {
      // Apply custom offset based on side
      ...(adjustedSide === 'top' && { marginBottom: `${offset}px` }),
      ...(adjustedSide === 'bottom' && { marginTop: `${offset}px` }),
      ...(adjustedSide === 'left' && { marginRight: `${offset}px` }),
      ...(adjustedSide === 'right' && { marginLeft: `${offset}px` }),
    }),
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex"
      {...eventHandlers}
    >
      {children}
      <div
        ref={tooltipRef}
        role="tooltip"
        aria-hidden={!isVisible}
        style={tooltipStyle}
        className={cn(
          "absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded-md shadow-lg transition-all duration-150",
          !maxWidth && "whitespace-nowrap",
          interactive ? "pointer-events-auto" : "pointer-events-none",
          positionClasses[adjustedSide],
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
          className
        )}
        // Allow interaction with tooltip content if interactive
        {...(interactive && trigger === 'hover' && {
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
        })}
      >
        {content}
        <TooltipArrow side={adjustedSide} />
      </div>
    </div>
  );
}
