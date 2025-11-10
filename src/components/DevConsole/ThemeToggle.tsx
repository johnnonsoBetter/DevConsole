import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { cn } from "../../utils";
import { useUnifiedTheme } from "../../hooks/useTheme";

interface ThemeToggleProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Animated theme toggle that switches between light and dark modes.
 * Uses the unified theme hook to keep preferences synced across sessions.
 */
export function ThemeToggle({ size = "md", className }: ThemeToggleProps) {
  const { isDarkMode, toggleDarkMode } = useUnifiedTheme();
  const [isToggling, setIsToggling] = useState(false);

  const sizeClasses: Record<ThemeToggleProps["size"], string> = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const iconSizes: Record<ThemeToggleProps["size"], number> = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const CurrentIcon = isDarkMode ? Sun : Moon;

  const handleToggle = () => {
    if (isToggling) return;
    setIsToggling(true);
    toggleDarkMode();
    setTimeout(() => setIsToggling(false), 250);
  };

  return (
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
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDarkMode ? "dark" : "light"}
          initial={{ scale: 0.8, rotate: -120, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.8, rotate: 120, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center"
        >
          <CurrentIcon
            size={iconSizes[size]}
            className={isDarkMode ? "text-amber-400" : "text-indigo-500"}
          />
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-secondary/20 opacity-0"
        whileHover={{ opacity: isToggling ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
}

export default ThemeToggle;
