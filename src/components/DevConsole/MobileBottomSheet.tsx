import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, ReactNode } from "react";
import { cn } from "../../utils";

export interface MobileBottomSheetProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback when the sheet should be closed */
  onClose: () => void;
  /** Title displayed in the header */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Sheet content */
  children: ReactNode;
  /** Optional header actions (buttons, etc.) */
  headerActions?: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Maximum height of the sheet (percentage of viewport height) */
  maxHeight?: number;
  /** Whether to show the drag handle */
  showDragHandle?: boolean;
}

/**
 * MobileBottomSheet - A flexible bottom sheet component that slides up from the bottom
 * on mobile devices with smooth animations and touch handling.
 * 
 * Features:
 * - Smooth slide-up animation
 * - Swipe to dismiss
 * - Backdrop click to close
 * - Customizable header with actions
 * - Responsive height control
 * - Touch-optimized interactions
 */
export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  headerActions,
  className,
  maxHeight = 90,
  showDragHandle = true,
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle drag to dismiss
  const handleDragEnd = (_: any, info: PanInfo) => {
    const shouldClose = info.velocity.y > 500 || info.offset.y > 150;
    if (shouldClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[101]",
              "bg-white dark:bg-gray-900",
              "rounded-t-3xl shadow-2xl",
              "flex flex-col",
              "touch-pan-y",
              className
            )}
            style={{
              maxHeight: `${maxHeight}vh`,
            }}
          >
            {/* Drag Handle */}
            {showDragHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Header Actions */}
                {headerActions && (
                  <div className="flex items-center gap-2 shrink-0">
                    {headerActions}
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95 shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * MobileBottomSheetContent - Wrapper component for bottom sheet content
 * Provides consistent padding and styling
 */
export function MobileBottomSheetContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-4 space-y-4", className)}>
      {children}
    </div>
  );
}

/**
 * MobileBottomSheetSection - Section component for organizing content
 */
export function MobileBottomSheetSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
        {title}
      </h4>
      {children}
    </div>
  );
}
