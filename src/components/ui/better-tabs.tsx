/**
 * Enhanced Tabs Component with animations and keyboard navigation
 */

import { cn } from "@/utils"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

export type BetterTab = {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
  content: React.ReactNode
}

interface BetterTabsProps {
  tabs: BetterTab[]
  defaultTab?: string
  activeTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
  variant?: "default" | "pills" | "underline"
}

export function BetterTabs({ 
  tabs, 
  defaultTab, 
  activeTab: controlledTab,
  onTabChange,
  className,
  variant = "default"
}: BetterTabsProps) {
  const [internalTab, setInternalTab] = React.useState(defaultTab || tabs[0]?.id)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)
  
  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledTab ?? internalTab
  const activeIndex = tabs.findIndex((t) => t.id === activeTab)
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Check scroll state
  const updateScrollState = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    
    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  // Scroll handlers
  const scrollLeft = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    container.scrollBy({ left: -150, behavior: 'smooth' })
  }, [])

  const scrollRight = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    container.scrollBy({ left: 150, behavior: 'smooth' })
  }, [])

  // Update scroll state on mount and resize
  React.useEffect(() => {
    updateScrollState()
    
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', updateScrollState)
    window.addEventListener('resize', updateScrollState)
    
    return () => {
      container.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState])

  // Update scroll state when tabs change
  React.useEffect(() => {
    updateScrollState()
  }, [tabs.length, updateScrollState])

  const handleTabChange = (newTab: string) => {
    // Update internal state only if uncontrolled
    if (controlledTab === undefined) {
      setInternalTab(newTab)
    }
    // Always notify parent of the change
    onTabChange?.(newTab)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const newIndex =
        e.key === "ArrowRight"
          ? (activeIndex + 1) % tabs.length
          : (activeIndex - 1 + tabs.length) % tabs.length
      handleTabChange(tabs[newIndex].id)
      tabRefs.current[newIndex]?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      handleTabChange(tabs[0].id)
      tabRefs.current[0]?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      const lastIndex = tabs.length - 1
      handleTabChange(tabs[lastIndex].id)
      tabRefs.current[lastIndex]?.focus()
    }
  }

  // Auto-scroll active tab into view
  React.useEffect(() => {
    const activeTabElement = tabRefs.current[activeIndex]
    if (activeTabElement && containerRef.current) {
      const container = containerRef.current
      const tabRect = activeTabElement.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      if (tabRect.left < containerRect.left + 16 || tabRect.right > containerRect.right - 16) {
        activeTabElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        })
      }
    }
  }, [activeIndex])

  const getTabClasses = (isActive: boolean) => {
    const baseClasses = "relative flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium transition-all shrink-0 min-h-[40px] touch-manipulation snap-start"
    
    switch (variant) {
      case "pills":
        return cn(
          baseClasses,
          "rounded-lg",
          isActive
            ? "bg-primary text-white shadow-sm scale-[0.98] sm:scale-100"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/60"
        )
      case "underline":
        return cn(
          baseClasses,
          "rounded-t-lg",
          isActive
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        )
      default:
        return cn(
          baseClasses,
          "rounded-lg",
          isActive
            ? "text-primary shadow-apple-sm scale-[0.98] sm:scale-100"
            : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95"
        )
    }
  }

  return (
    <div className={cn("w-full flex flex-col overflow-hidden", className)}>
      {/* Tab List */}
      <div className="flex items-center px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-secondary/5">
        {/* Left scroll indicator - inline with tabs */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 32 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              onClick={scrollLeft}
              className="shrink-0 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={containerRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex-1 min-w-0"
          onKeyDown={handleKeyDown}
          role="tablist"
          aria-label="Console tabs"
        >
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[i] = el)}
                onClick={() => handleTabChange(tab.id)}
                className={getTabClasses(isActive)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
              >
                {tab.icon && (
                  <span className={cn(
                    "w-4 h-4 shrink-0 flex items-center justify-center",
                    isActive ? "text-current" : "text-current opacity-70"
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span className="truncate">{tab.label}</span>
                
                {tab.badge !== undefined && tab.badge !== 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold shrink-0 min-w-[20px] text-center",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  )}>
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}

                {isActive && variant === "default" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white dark:bg-gray-900 rounded-lg -z-10"
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}

                {isActive && variant === "underline" && (
                  <motion.div
                    layoutId="underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Right scroll indicator - inline with tabs */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 32 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              onClick={scrollRight}
              className="shrink-0 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tabs.map((tab) =>
            activeTab === tab.id ? (
              <motion.div
                key={tab.id}
                id={`panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={tab.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full focus:outline-none"
              >
                {tab.content}
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
