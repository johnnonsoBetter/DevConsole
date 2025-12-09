/**
 * PopupMenu Component
 * A reusable dropdown menu with smart viewport-aware positioning
 * Automatically adjusts placement based on available space
 * Uses React Portal to render outside component tree for proper z-index stacking
 */

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cloneElement, isValidElement, ReactElement, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// TYPES
// ============================================================================

export interface PopupMenuItem {
  /** Unique identifier for the item */
  id: string;
  /** Label to display */
  label: string;
  /** Optional icon component */
  icon?: ReactNode;
  /** Optional badge (e.g., notification count) */
  badge?: number | string;
  /** Whether this is a destructive/danger action */
  danger?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom content to render instead of default item */
  customContent?: ReactNode;
}

export interface PopupMenuDivider {
  divider: true;
}

export type PopupMenuItemOrDivider = PopupMenuItem | PopupMenuDivider;

export type PopupMenuPlacement = 
  | 'top' 
  | 'bottom' 
  | 'top-start' 
  | 'top-end' 
  | 'bottom-start' 
  | 'bottom-end'
  | 'auto';

export interface PopupMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback when menu should close */
  onClose: () => void;
  /** The trigger element (button/icon that opens the menu) */
  trigger: ReactElement;
  /** Menu items to display */
  items?: PopupMenuItemOrDivider[];
  /** Custom content to render in the menu (alternative to items) */
  children?: ReactNode;
  /** Preferred placement (will auto-adjust if not enough space) */
  placement?: PopupMenuPlacement;
  /** Optional title/header for the menu */
  title?: string;
  /** Optional icon for the header */
  titleIcon?: ReactNode;
  /** Whether to show close button in header */
  showCloseButton?: boolean;
  /** Minimum width of the menu */
  minWidth?: number;
  /** Additional class names for the menu container */
  className?: string;
  /** Whether to show the arrow pointer */
  showArrow?: boolean;
  /** Spacing between trigger and menu */
  offset?: number;
  /** Close menu when clicking an item */
  closeOnItemClick?: boolean;
  /** External anchor ref for positioning (use when trigger is outside PopupMenu) */
  anchorRef?: RefObject<HTMLElement>;
}

// ============================================================================
// HELPERS
// ============================================================================

function isDivider(item: PopupMenuItemOrDivider): item is PopupMenuDivider {
  return 'divider' in item && item.divider === true;
}

// ============================================================================
// POPUP MENU COMPONENT
// ============================================================================

export function PopupMenu({
  isOpen,
  onClose,
  trigger,
  items,
  children,
  placement = 'auto',
  title,
  titleIcon,
  showCloseButton = false,
  minWidth = 200,
  className = '',
  showArrow = true,
  offset = 8,
  closeOnItemClick = true,
  anchorRef,
}: PopupMenuProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState<'top' | 'bottom'>('bottom');
  const internalTriggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Use external anchor ref if provided, otherwise use internal trigger ref
  const triggerRef = anchorRef || internalTriggerRef;

  // Calculate optimal position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top = 0;
    let left = 0;
    let finalPlacement: 'top' | 'bottom' = 'bottom';
    let finalHAlign: 'start' | 'center' | 'end' = 'center';

    // Calculate space available
    const spaceBelow = viewport.height - trigger.bottom - offset;
    const spaceAbove = trigger.top - offset;
    const spaceLeft = trigger.left;
    const spaceRight = viewport.width - trigger.right;

    // Determine vertical placement
    if (placement === 'top' || placement === 'top-start' || placement === 'top-end') {
      finalPlacement = 'top';
    } else if (placement === 'bottom' || placement === 'bottom-start' || placement === 'bottom-end') {
      finalPlacement = 'bottom';
    } else {
      // Auto placement - prefer bottom, use top if not enough space
      finalPlacement = spaceBelow >= menu.height ? 'bottom' : 
                       spaceAbove >= menu.height ? 'top' : 
                       spaceBelow >= spaceAbove ? 'bottom' : 'top';
    }

    // Calculate vertical position
    if (finalPlacement === 'bottom') {
      top = trigger.bottom + offset;
    } else {
      top = trigger.top - menu.height - offset;
    }

    // Determine horizontal alignment
    if (placement === 'top-start' || placement === 'bottom-start') {
      finalHAlign = 'start';
    } else if (placement === 'top-end' || placement === 'bottom-end') {
      finalHAlign = 'end';
    } else {
      // Auto horizontal - try to center, adjust if needed
      const centerLeft = trigger.left + (trigger.width / 2) - (menu.width / 2);
      if (centerLeft >= 8 && centerLeft + menu.width <= viewport.width - 8) {
        finalHAlign = 'center';
      } else if (spaceRight >= spaceLeft) {
        finalHAlign = 'start';
      } else {
        finalHAlign = 'end';
      }
    }

    // Calculate horizontal position
    switch (finalHAlign) {
      case 'start':
        left = Math.max(8, trigger.left);
        break;
      case 'end':
        left = Math.min(viewport.width - menu.width - 8, trigger.right - menu.width);
        break;
      case 'center':
      default:
        left = trigger.left + (trigger.width / 2) - (menu.width / 2);
        // Clamp to viewport
        left = Math.max(8, Math.min(viewport.width - menu.width - 8, left));
        break;
    }

    // Ensure top is within bounds
    top = Math.max(8, Math.min(viewport.height - menu.height - 8, top));

    setPosition({ top, left });
    setActualPlacement(finalPlacement);
  }, [placement, offset]);

  // Recalculate position when opened or on resize/scroll
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure menu is rendered before calculating
      requestAnimationFrame(() => {
        calculatePosition();
      });
      
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
      
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition, true);
      };
    }
  }, [isOpen, calculatePosition]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close on open
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Calculate arrow position
  const getArrowStyle = () => {
    if (!triggerRef.current || !menuRef.current) return {};
    
    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    
    // Calculate arrow position relative to menu
    const triggerCenter = trigger.left + trigger.width / 2;
    const arrowLeft = triggerCenter - position.left;
    
    // Clamp arrow position to stay within menu bounds
    const clampedLeft = Math.max(16, Math.min(menu.width - 16, arrowLeft));
    
    return { left: `${clampedLeft}px` };
  };

  // Handle item click
  const handleItemClick = (item: PopupMenuItem) => {
    if (item.disabled) return;
    item.onClick?.();
    if (closeOnItemClick) {
      onClose();
    }
  };

  // Clone trigger to add ref (only used if no external anchorRef)
  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ ref?: React.Ref<HTMLElement> }>, {
        ref: anchorRef ? undefined : internalTriggerRef,
      })
    : trigger;

  // Menu content rendered via portal
  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: actualPlacement === 'bottom' ? -8 : 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: actualPlacement === 'bottom' ? -8 : 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, duration: 0.15 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 99999,
            minWidth,
          }}
          className={`${className}`}
          role="menu"
          aria-label={title || 'Menu'}
        >
          {/* Menu container */}
          <div className="bg-gray-800 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  {titleIcon}
                  {title && (
                    <span className="text-sm font-medium text-white">{title}</span>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            {children ? (
              <div className="p-2">{children}</div>
            ) : items ? (
              <div className="py-1">
                {items.map((item, idx) => {
                  if (isDivider(item)) {
                    return (
                      <div
                        key={`divider-${idx}`}
                        className="my-1 border-t border-white/10"
                      />
                    );
                  }

                  if (item.customContent) {
                    return (
                      <div key={item.id} className="px-2">
                        {item.customContent}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      disabled={item.disabled}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                        ${item.disabled 
                          ? 'text-gray-500 cursor-not-allowed' 
                          : item.danger
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-gray-200 hover:bg-white/5'
                        }
                      `}
                      role="menuitem"
                    >
                      {item.icon && (
                        <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
                      )}
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Arrow pointer */}
          {showArrow && (
            <div
              className={`
                absolute w-3 h-3 bg-gray-800 border-white/10 rotate-45
                ${actualPlacement === 'bottom' 
                  ? '-top-[6px] border-t border-l' 
                  : '-bottom-[6px] border-b border-r'
                }
              `}
              style={{
                ...getArrowStyle(),
                transform: 'translateX(-50%) rotate(45deg)',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger wrapper - only render if no external anchorRef */}
      {!anchorRef && (
        <div ref={internalTriggerRef} className="inline-flex">
          {triggerElement}
        </div>
      )}

      {/* Menu rendered via portal to escape stacking contexts */}
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export { PopupMenu as default };
