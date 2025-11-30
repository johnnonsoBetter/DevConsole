/**
 * FloatingActionDock Component
 * A macOS-style floating dock for actions (Explain, Ask Copilot, Work, Context, Issue)
 * Inspired by Aceternity UI's FloatingDock component
 */

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Menu } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface DockItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface FloatingActionDockProps {
  items: DockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const variantStyles = {
  default: {
    bg: 'bg-gray-200 dark:bg-neutral-700',
    hover: 'hover:bg-gray-300 dark:hover:bg-neutral-600',
    icon: 'text-gray-600 dark:text-gray-300',
  },
  primary: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-800/60',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    bg: 'bg-green-100 dark:bg-green-900/50',
    hover: 'hover:bg-green-200 dark:hover:bg-green-800/60',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    hover: 'hover:bg-amber-200 dark:hover:bg-amber-800/60',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    hover: 'hover:bg-red-200 dark:hover:bg-red-800/60',
    icon: 'text-red-600 dark:text-red-400',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FloatingActionDock({
  items,
  desktopClassName,
  mobileClassName,
}: FloatingActionDockProps) {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
}

// ============================================================================
// MOBILE DOCK
// ============================================================================

function FloatingDockMobile({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative block md:hidden', className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="action-dock-mobile"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2 items-end"
          >
            {items.map((item, idx) => {
              const variant = variantStyles[item.variant || 'default'];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    scale: 0.8,
                    transition: {
                      delay: idx * 0.05,
                    },
                  }}
                  transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                >
                  <button
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick();
                        setOpen(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all',
                      variant.bg,
                      variant.hover,
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    title={item.title}
                  >
                    <div className={cn('h-4 w-4', variant.icon)}>{item.icon}</div>
                    <span className={cn('text-xs font-medium', variant.icon)}>
                      {item.title}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all',
          'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
          'active:scale-95'
        )}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Menu className="h-5 w-5 text-white" />
        </motion.div>
      </button>
    </div>
  );
}

// ============================================================================
// DESKTOP DOCK
// ============================================================================

function FloatingDockDesktop({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'mx-auto hidden h-14 items-end gap-3 rounded-2xl px-4 pb-2.5 md:flex',
        'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl',
        'border border-gray-200/50 dark:border-neutral-700/50',
        'shadow-xl shadow-black/5 dark:shadow-black/20',
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.id} {...item} />
      ))}
    </motion.div>
  );
}

// ============================================================================
// ICON CONTAINER (with magnification effect)
// ============================================================================

function IconContainer({
  mouseX,
  id: _id,
  title,
  icon,
  onClick,
  disabled,
  variant = 'default',
}: DockItem & { mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Magnification transforms
  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 64, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 64, 40]);
  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [18, 28, 18]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [18, 28, 18]);

  // Spring animations for smooth movement
  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);
  const styles = variantStyles[variant];

  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={cn(
        'relative',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex aspect-square items-center justify-center rounded-full transition-colors',
          styles.bg,
          !disabled && styles.hover
        )}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 2, x: '-50%' }}
              className={cn(
                'absolute -top-10 left-1/2 w-max rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap z-50',
                'bg-gray-900 dark:bg-white text-white dark:text-gray-900',
                'shadow-lg'
              )}
            >
              {title}
              {/* Arrow */}
              <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900 dark:bg-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className={cn('flex items-center justify-center', styles.icon)}
        >
          {icon}
        </motion.div>
      </motion.div>
    </button>
  );
}

export default FloatingActionDock;
