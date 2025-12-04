/**
 * MobileDetailsSlideout Component
 * A slide-out overlay for displaying details on mobile devices
 * Similar to GitHubIssueSlideout but contained within parent context
 * Supports tabbed views (Details, Chat, etc.)
 */

import { AnimatePresence, motion } from "framer-motion";
import { FileText, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { VSCodeIcon } from "../../icons";
import { cn } from "../../utils";

// ============================================================================
// TYPES
// ============================================================================

export type SlideoutView = 'details' | 'chat';

export interface MobileDetailsSlideoutProps {
  /** Whether the slideout is open */
  isOpen: boolean;
  /** Callback when the slideout should close */
  onClose: () => void;
  /** Title displayed in the header */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Optional actions to display in the header (right side) */
  headerActions?: ReactNode;
  /** Content to display in the slideout body (details view) */
  children: ReactNode;
  /** Optional chat view content */
  chatContent?: ReactNode;
  /** Whether to show the view tabs (only if chatContent is provided) */
  showViewTabs?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Optional bottom actions (shown only on details view) */
  bottomActions?: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MobileDetailsSlideout - A slide-out panel for mobile views
 * Slides in from the right edge, similar to GitHubIssueSlideout
 * but designed to be used within panel components
 * Supports tabbed views for Details and Chat
 */
export function MobileDetailsSlideout({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  children,
  chatContent,
  showViewTabs = true,
  className,
  bottomActions,
}: MobileDetailsSlideoutProps) {
  const [activeView, setActiveView] = useState<SlideoutView>('details');
  
  // Show tabs only if chat content is provided
  const hasTabs = showViewTabs && chatContent !== undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - positioned within parent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 dark:bg-black/40 z-[100]"
          />

          {/* Slideout Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "absolute top-0 right-0 bottom-0 w-full max-w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-[101] flex flex-col border-l border-gray-200 dark:border-gray-800",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {headerActions}
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* View Tabs - Improved visual hierarchy */}
            {hasTabs && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                <button
                  onClick={() => setActiveView('details')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    activeView === 'details'
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>
                <button
                  onClick={() => setActiveView('chat')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    activeView === 'chat'
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-700"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <VSCodeIcon size={14} className="flex-shrink-0" />
                  <span>Task VSCode</span>
                </button>
              </div>
            )}

            {/* Content - Chat view needs flex column for sticky input */}
            <div className={cn(
              "flex-1 min-h-0",
              activeView === 'chat' ? "flex flex-col" : "overflow-auto"
            )}>
              {hasTabs ? (
                activeView === 'details' ? children : chatContent
              ) : (
                children
              )}
            </div>

            {/* Bottom Actions - Only show on details view */}
            {bottomActions && activeView === 'details' && (
              <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                {bottomActions}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// CONTENT WRAPPER
// ============================================================================

export interface MobileDetailsSlideoutContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Content wrapper for MobileDetailsSlideout
 * Provides consistent padding and styling
 */
export function MobileDetailsSlideoutContent({ 
  children, 
  className 
}: MobileDetailsSlideoutContentProps) {
  return (
    <div className={cn("p-4", className)}>
      {children}
    </div>
  );
}
