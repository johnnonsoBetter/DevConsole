/**
 * Enhanced Tabs Component with animations using Headless UI
 * Headless UI handles: keyboard navigation, focus management, ARIA attributes
 * We handle: custom styling, scroll indicators, Framer Motion animations
 */

import { cn } from "@/utils"
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react"
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
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Calculate indices for Headless UI
  const defaultIndex = defaultTab ? tabs.findIndex(t => t.id === defaultTab) : 0
  const selectedIndex = controlledTab ? tabs.findIndex(t => t.id === controlledTab) : undefined

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

  const handleTabChange = (index: number) => {
    const tabId = tabs[index]?.id
    if (tabId) {
      onTabChange?.(tabId)
    }
  }

  // Auto-scroll active tab into view
  React.useEffect(() => {
    const activeIndex = selectedIndex ?? defaultIndex
    const container = containerRef.current
    if (!container || activeIndex < 0) return

    const activeTabElement = container.children[activeIndex] as HTMLElement
    if (activeTabElement) {
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
  }, [selectedIndex, defaultIndex])

  const getTabClasses = (selected: boolean) => {
    const baseClasses = "relative flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium transition-all shrink-0 min-h-[40px] touch-manipulation snap-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
    
    switch (variant) {
      case "pills":
        return cn(
          baseClasses,
          "rounded-lg",
          selected
            ? "bg-primary text-white shadow-sm scale-[0.98] sm:scale-100"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/60"
        )
      case "underline":
        return cn(
          baseClasses,
          "rounded-t-lg",
          selected
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        )
      default:
        return cn(
          baseClasses,
          "rounded-lg",
          selected
            ? "text-primary shadow-apple-sm scale-[0.98] sm:scale-100"
            : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95"
        )
    }
  }

  // Build TabGroup props based on controlled vs uncontrolled
  const tabGroupProps = selectedIndex !== undefined
    ? { selectedIndex, onChange: handleTabChange }
    : { defaultIndex: Math.max(0, defaultIndex), onChange: handleTabChange }

  return (
    <TabGroup as="div" className={cn("w-full flex flex-col overflow-hidden", className)} {...tabGroupProps}>
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
              type="button"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <TabList
          ref={containerRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex-1 min-w-0"
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} className={({ selected }) => getTabClasses(selected)}>
              {({ selected }) => (
                <>
                  {tab.icon && (
                    <span className={cn(
                      "w-4 h-4 shrink-0 flex items-center justify-center",
                      selected ? "text-current" : "text-current opacity-70"
                    )}>
                      {tab.icon}
                    </span>
                  )}
                  <span className="truncate">{tab.label}</span>
                  
                  {tab.badge !== undefined && tab.badge !== 0 && (
                    <span className={cn(
                      "ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold shrink-0 min-w-[20px] text-center",
                      selected
                        ? "bg-primary text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}>
                      {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}

                  {selected && variant === "default" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white dark:bg-gray-900 rounded-lg -z-10"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}

                  {selected && variant === "underline" && (
                    <motion.div
                      layoutId="underline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </Tab>
          ))}
        </TabList>

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
              type="button"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tab Content */}
      <TabPanels className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            className="h-full focus:outline-none"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {tab.content}
              </motion.div>
            </AnimatePresence>
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}
