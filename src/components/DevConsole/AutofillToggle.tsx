import { CloseButton, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { UserRoundPen } from "lucide-react";
import { X } from "lucide-react";
import { forwardRef, useEffect, useMemo, useState, type ButtonHTMLAttributes } from "react";
import { cn } from "../../utils";
import { useInspectedPageEnvironment } from "../../utils/environmentDetection";
import { useAutofillSettingsStore } from "../../utils/stores/autofillSettings";

interface AutofillToggleProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Animated autofill toggle that enables/disables the smart autofill feature.
 * Uses the autofill settings store to keep preferences synced across sessions.
 * Shows environment context (most useful in dev mode for testing forms).
 */
export function AutofillToggle({ size = "md", className }: AutofillToggleProps) {
  const { isEnabled, toggle, loadSettings, isLoaded } = useAutofillSettingsStore();
  const { envInfo } = useInspectedPageEnvironment();
  const [isToggling, setIsToggling] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

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

  const TriggerButton = useMemoizedTriggerButton(size);

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton
            as={TriggerButton}
            isActive={open}
            isEnabled={isEnabled}
            isToggling={isToggling}
            className={className}
            aria-label={isEnabled ? "Smart Autofill (On)" : "Smart Autofill (Off)"}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isEnabled ? "enabled" : "disabled"}
                initial={{ scale: 0.85, rotate: -120, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.85, rotate: 120, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="flex items-center justify-center"
              >
                <UserRoundPen
                  size={iconSizes[size]}
                  className={isEnabled ? "text-emerald-500" : "text-gray-400"}
                />
              </motion.div>
            </AnimatePresence>
          </PopoverButton>

          <PopoverPanel
            anchor={{ to: "bottom end", gap: 10 }}
            transition
            className="z-[99999] w-72 origin-top-right transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/60 dark:border-gray-700/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isEnabled ? "bg-emerald-500" : "bg-gray-500"
                      )}
                    />
                    <p className="text-sm font-semibold text-white truncate">
                      Smart Autofill
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-300 leading-snug">
                    {isEnabled
                      ? "Suggestions and autofill helpers are enabled on supported pages."
                      : "Suggestions and autofill helpers are currently disabled."}
                  </p>
                </div>
                <CloseButton
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </CloseButton>
              </div>

              {envInfo?.isDevelopment && (
                <div className="mt-2 px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                  ✓ Dev mode detected (great for testing forms)
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <CloseButton
                  as="button"
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={cn(
                    "h-9 rounded-xl text-xs font-semibold transition-colors border",
                    isEnabled
                      ? "bg-white/5 hover:bg-white/10 border-gray-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white",
                    isToggling && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isEnabled ? "Disable" : "Enable"}
                </CloseButton>
                <CloseButton
                  as="button"
                  className="h-9 rounded-xl text-xs font-semibold transition-colors border border-gray-700 bg-white/5 hover:bg-white/10 text-white"
                >
                  Close
                </CloseButton>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                <span className="font-mono bg-white/5 border border-gray-700 rounded px-1.5 py-0.5 text-[10px]">
                  Tip
                </span>
                <span>Enable “Allow access to file URLs” for file:// forms.</span>
              </div>
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

export default AutofillToggle;

function useMemoizedTriggerButton(size: AutofillToggleProps["size"]) {
  // A stable component reference keeps Headless UI focus management happy.
  // We define it outside of render (using a factory) to still capture the size.
  return useMemo(() => {
    const Trigger = forwardRef<
      HTMLButtonElement,
      {
        isActive?: boolean;
        isEnabled?: boolean;
        isToggling?: boolean;
        className?: string;
      } & ButtonHTMLAttributes<HTMLButtonElement>
    >(function AutofillTriggerButton(
      { isActive, isEnabled, isToggling, className, children, ...props },
      ref
    ) {
      const sizeClasses: Record<NonNullable<AutofillToggleProps["size"]>, string> = {
        sm: "h-8 w-8",
        md: "h-9 w-9",
        lg: "h-11 w-11",
      };

      return (
        <motion.button
          ref={ref}
          type="button"
          whileHover={{ scale: isToggling ? 1 : 1.05 }}
          whileTap={{ scale: isToggling ? 1 : 0.95 }}
          disabled={isToggling}
          className={cn(
            "relative flex items-center justify-center rounded-lg transition-all duration-200",
            "bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/80",
            "shadow-apple-sm hover:shadow-apple-md focus:outline-none focus:ring-2 focus:ring-primary/40",
            "text-gray-600 dark:text-gray-300",
            size ? sizeClasses[size] : sizeClasses.md,
            isActive && "ring-2 ring-primary/30",
            isEnabled && "shadow-emerald-500/10",
            className,
            isToggling ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
          )}
          {...props}
        >
          {children}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/20 opacity-0"
            whileHover={{ opacity: isToggling ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          />
        </motion.button>
      );
    });

    return Trigger;
  }, [size]);
}
