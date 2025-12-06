/**
 * NoteCopilotSlideout Component
 * A slideout panel for sending note content to VS Code Copilot
 * Uses the same slideout pattern as LogsPanel and NetworkPanel
 */

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../../utils';
import { EmbeddedCopilotChat, type EmbeddedCopilotContext } from '../../../components/DevConsole/EmbeddedCopilotChat';

// ============================================================================
// TYPES
// ============================================================================

export interface NoteCopilotSlideoutProps {
  /** Whether the slideout is open */
  isOpen: boolean;
  /** Callback when the slideout should close */
  onClose: () => void;
  /** The context to send to Copilot */
  context: EmbeddedCopilotContext | null;
  /** Callback when successfully sent */
  onSuccess?: (requestId: string) => void;
  /** Callback when falling back to clipboard */
  onFallback?: (prompt: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const NoteCopilotSlideout = memo(({
  isOpen,
  onClose,
  context,
  onSuccess,
  onFallback,
}: NoteCopilotSlideoutProps) => {
  if (!context) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[200]"
          />

          {/* Slideout Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed top-0 right-0 bottom-0 w-full max-w-[400px]',
              'bg-white dark:bg-gray-900 shadow-2xl z-[201]',
              'flex flex-col border-l border-gray-200 dark:border-gray-800'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Send to VS Code Copilot
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {context.title}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors ml-2"
                title="Close"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Embedded Chat */}
            <div className="flex-1 min-h-0 flex flex-col">
              <EmbeddedCopilotChat
                context={context}
                onSuccess={onSuccess}
                onFallback={onFallback}
                className="flex-1"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

NoteCopilotSlideout.displayName = 'NoteCopilotSlideout';
