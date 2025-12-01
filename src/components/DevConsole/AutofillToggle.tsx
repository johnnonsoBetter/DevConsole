import { AnimatePresence, motion } from "framer-motion";
import { UserRoundPen } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../../utils";
import { useAutofillSettingsStore } from "../../utils/stores/autofillSettings";

interface AutofillToggleProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Animated autofill toggle that enables/disables the smart autofill feature.
 * Uses the autofill settings store to keep preferences synced across sessions.
 */
export function AutofillToggle({ size = "md", className }: AutofillToggleProps) {
  const { isEnabled, toggle, loadSettings, isLoaded } = useAutofillSettingsStore();
  const [isToggling, setIsToggling] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  const sizeClasses: Record<AutofillToggleProps["size"] & string, string> = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const iconSizes: Record<AutofillToggleProps["size"] & string, number> = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const handleToggle = () => {
    if (isToggling) return;
    setIsToggling(true);
    toggle();
    setTimeout(() => setIsToggling(false), 250);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.button
        type="button"
        whileHover={{ scale: isToggling ? 1 : 1.05 }}
        whileTap={{ scale: isToggling ? 1 : 0.95 }}
        onClick={handleToggle}
        disabled={isToggling}
        className={cn(
          "relative flex items-center justify-center rounded-lg transition-all duration-200",
          "bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/80",
          "shadow-apple-sm hover:shadow-apple-md focus:outline-none focus:ring-2 focus:ring-primary/40",
          "text-gray-600 dark:text-gray-300",
          sizeClasses[size],
          className,
          isToggling ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
        )}
        aria-label={isEnabled ? "Disable Smart Autofill" : "Enable Smart Autofill"}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isEnabled ? "enabled" : "disabled"}
            initial={{ scale: 0.8, rotate: -120, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: 120, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            <UserRoundPen
              size={iconSizes[size]}
              className={isEnabled ? "text-emerald-500" : "text-gray-400"}
            />
          </motion.div>
        </AnimatePresence>

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/20 opacity-0"
          whileHover={{ opacity: isToggling ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50",
              "px-3 py-2 rounded-lg shadow-lg",
              "bg-gray-900 dark:bg-gray-800 text-white",
              "text-xs whitespace-pre-line text-center",
              "border border-gray-700 dark:border-gray-600"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isEnabled ? "bg-emerald-500" : "bg-gray-500"
              )} />
              <span className="font-medium">
                {isEnabled ? "Smart Autofill: ON" : "Smart Autofill: OFF"}
              </span>
            </div>
            <p className="text-gray-300 text-[10px]">
              {isEnabled 
                ? "Click to disable form auto-fill suggestions" 
                : "Click to enable form auto-fill suggestions"}
            </p>
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700 dark:border-gray-600" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AutofillToggle;
