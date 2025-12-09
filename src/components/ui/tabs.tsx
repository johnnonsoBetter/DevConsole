/**
 * Tabs Component (shadcn/ui style API with Headless UI)
 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
 * Uses Headless UI for accessibility and state management
 */

import { cn } from "@/utils"
import { Tab, TabGroup, TabList, TabPanel } from "@headlessui/react"
import * as React from "react"

interface TabsContextValue {
  registerTab: (value: string) => number
  registerPanel: (value: string) => number
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value: controlledValue, defaultValue, onValueChange, children }, ref) => {
    // Track registered tabs/panels to map value strings to indices
    const tabsRef = React.useRef<string[]>([])
    const panelsRef = React.useRef<string[]>([])
    
    const registerTab = React.useCallback((value: string) => {
      if (!tabsRef.current.includes(value)) {
        tabsRef.current.push(value)
      }
      return tabsRef.current.indexOf(value)
    }, [])
    
    const registerPanel = React.useCallback((value: string) => {
      if (!panelsRef.current.includes(value)) {
        panelsRef.current.push(value)
      }
      return panelsRef.current.indexOf(value)
    }, [])

    // Calculate indices
    const defaultIndex = defaultValue ? tabsRef.current.indexOf(defaultValue) : 0
    const selectedIndex = controlledValue ? tabsRef.current.indexOf(controlledValue) : undefined

    const handleChange = React.useCallback((index: number) => {
      const value = tabsRef.current[index]
      if (value) {
        onValueChange?.(value)
      }
    }, [onValueChange])

    // Build TabGroup props
    const tabGroupProps = selectedIndex !== undefined && selectedIndex >= 0
      ? { selectedIndex, onChange: handleChange }
      : { defaultIndex: Math.max(0, defaultIndex), onChange: handleChange }

    return (
      <TabsContext.Provider value={{ registerTab, registerPanel }}>
        <TabGroup as="div" ref={ref} className={cn("w-full", className)} {...tabGroupProps}>
          {children}
        </TabGroup>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <TabList
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800/50 p-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </TabList>
))
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    
    // Register this tab on mount
    React.useEffect(() => {
      context?.registerTab(value)
    }, [context, value])

    return (
      <Tab
        ref={ref}
        className={({ selected }) => cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          selected
            ? "bg-white dark:bg-gray-900 text-foreground shadow-apple-sm"
            : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-900/60 hover:text-gray-900 dark:hover:text-gray-100",
          className
        )}
        {...props}
      >
        {children}
      </Tab>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    
    // Register this panel on mount
    React.useEffect(() => {
      context?.registerPanel(value)
    }, [context, value])

    return (
      <TabPanel
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </TabPanel>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsContent, TabsList, TabsTrigger }

