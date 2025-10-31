import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { useDevConsoleStore } from "../../utils/stores/devConsole";
import { cn } from "src/utils";

// ============================================================================
// ERROR NOTIFICATION BADGE
// Floating badge that appears when there are unread errors
// ============================================================================

export function DevConsoleErrorBadge() {
  const { isOpen, unreadErrorCount, toggleConsole, markErrorsRead } =
    useDevConsoleStore();

  // Don't show if console is open or no errors
  if (isOpen || unreadErrorCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-[9998]"
      >
        <motion.button
          onClick={toggleConsole}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl",
            "bg-gradient-to-r from-destructive to-destructive/80",
            "text-white font-medium",
            "hover:shadow-3xl transition-shadow",
            "border-2 border-white/20"
          )}
        >
          {/* Pulsing Ring */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-2xl bg-destructive"
          />

          {/* Icon */}
          <div className="relative">
            <AlertCircle className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="relative text-left">
            <p className="text-sm font-semibold">
              {unreadErrorCount} New Error{unreadErrorCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs opacity-90">Click to view in DevConsole</p>
          </div>

          {/* Badge Count */}
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-white text-destructive text-xs font-bold flex items-center justify-center"
            >
              {unreadErrorCount > 9 ? "9+" : unreadErrorCount}
            </motion.div>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              markErrorsRead();
            }}
            className="relative p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// HOTKEY INDICATOR
// Shows keyboard shortcut hint
// ============================================================================

export function DevConsoleHotkeyIndicator() {
  const { isOpen } = useDevConsoleStore();

  // Only show in development and when console is closed
  if (process.env.NODE_ENV === "production" || isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 }}
      className="fixed bottom-6 left-6 z-[9998] pointer-events-none"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white rounded-lg shadow-lg border border-gray-700">
        <kbd className="px-2 py-1 bg-gray-800 rounded text-xs font-mono border border-gray-600">
          Ctrl
        </kbd>
        <span className="text-gray-400">+</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded text-xs font-mono border border-gray-600">
          ~
        </kbd>
        <span className="text-xs text-gray-300 ml-1">to open DevConsole</span>
      </div>
    </motion.div>
  );
}
