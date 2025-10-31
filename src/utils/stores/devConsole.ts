import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LogLevel = "log" | "info" | "warn" | "error" | "debug" | "ui" | "db" | "api";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  args: any[];
  stack?: string;
  source?: {
    file?: string;
    line?: number;
    column?: number;
  };
  metadata?: Record<string, any>;
}

export interface NetworkRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
  type: "fetch" | "xhr" | "graphql";
}

export interface StateSnapshot {
  id: string;
  timestamp: number;
  storeName: string;
  state: any;
  action?: string;
  diff?: any;
}

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  name: string;
  duration: number;
  metadata?: Record<string, any>;
}

export type ConsoleTab = "logs" | "network" | "graphql" | "ai" | "autofiller" | "tools";

export interface ConsoleFilter {
  levels: LogLevel[];
  search: string;
  timeRange?: {
    start: number;
    end: number;
  };
  sources?: string[];
}

// ============================================================================
// DEVELOPER CONSOLE STORE
// ============================================================================

interface DevConsoleState {
  // Visibility & Layout
  isOpen: boolean;
  position: "bottom" | "left" | "right" | "floating";
  size: { width: number; height: number };
  isDragging: boolean;

  // Active Tab
  activeTab: ConsoleTab;

  // Data Collections
  logs: LogEntry[];
  networkRequests: NetworkRequest[];
  stateSnapshots: StateSnapshot[];
  performanceMetrics: PerformanceMetric[];

  // Filters & Search
  filter: ConsoleFilter;

  // Command Palette
  commandPaletteOpen: boolean;

  // Notifications
  unreadErrorCount: number;
  showNotifications: boolean;

  // Settings
  maxLogs: number;
  maxNetworkRequests: number;
  persistLogs: boolean;
  captureConsole: boolean;
  captureNetwork: boolean;
  captureState: boolean;

  // Actions - UI Control
  toggleConsole: () => void;
  setOpen: (open: boolean) => void;
  setPosition: (position: "bottom" | "left" | "right" | "floating") => void;
  setSize: (size: { width: number; height: number }) => void;
  setActiveTab: (tab: ConsoleTab) => void;
  toggleCommandPalette: () => void;

  // Actions - Data Management
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  addNetworkRequest: (request: Omit<NetworkRequest, "id" | "timestamp">) => void;
  addStateSnapshot: (snapshot: Omit<StateSnapshot, "id" | "timestamp">) => void;
  addPerformanceMetric: (metric: Omit<PerformanceMetric, "id" | "timestamp">) => void;

  clearLogs: () => void;
  clearNetwork: () => void;
  clearState: () => void;
  clearPerformance: () => void;
  clearAll: () => void;

  // Actions - Filtering
  setFilter: (filter: Partial<ConsoleFilter>) => void;
  resetFilter: () => void;

  // Actions - Settings
  updateSettings: (settings: Partial<Pick<DevConsoleState,
    "maxLogs" | "maxNetworkRequests" | "persistLogs" |
    "captureConsole" | "captureNetwork" | "captureState"
  >>) => void;

  // Actions - Notifications
  markErrorsRead: () => void;

  // Utility
  exportLogs: () => string;
  exportAll: () => string;
}

const DEFAULT_FILTER: ConsoleFilter = {
  levels: ["log", "info", "warn", "error", "debug", "ui", "db", "api"],
  search: "",
};

export const useDevConsoleStore = create<DevConsoleState>()(
  persist(
    (set, get) => ({
      // Initial State
      isOpen: false,
      position: "bottom",
      size: { width: 1200, height: 400 },
      isDragging: false,
      activeTab: "logs",

      logs: [],
      networkRequests: [],
      stateSnapshots: [],
      performanceMetrics: [],

      filter: DEFAULT_FILTER,
      commandPaletteOpen: false,
      unreadErrorCount: 0,
      showNotifications: true,

      maxLogs: 1000,
      maxNetworkRequests: 500,
      persistLogs: true,
      captureConsole: true,
      captureNetwork: true,
      captureState: true,

      // UI Control Actions
      toggleConsole: () =>
        set(
          produce((draft) => {
            draft.isOpen = !draft.isOpen;
            if (draft.isOpen) {
              draft.unreadErrorCount = 0;
            }
          })
        ),

      setOpen: (open: boolean) =>
        set(
          produce((draft) => {
            draft.isOpen = open;
            if (open) {
              draft.unreadErrorCount = 0;
            }
          })
        ),

      setPosition: (position) =>
        set(
          produce((draft) => {
            draft.position = position;
          })
        ),

      setSize: (size) =>
        set(
          produce((draft) => {
            draft.size = size;
          })
        ),

      setActiveTab: (tab) =>
        set(
          produce((draft) => {
            draft.activeTab = tab;
          })
        ),

      toggleCommandPalette: () =>
        set(
          produce((draft) => {
            draft.commandPaletteOpen = !draft.commandPaletteOpen;
          })
        ),

      // Data Management Actions
      addLog: (log) =>
        set(
          produce((draft) => {
            const newLog: LogEntry = {
              ...log,
              id: `log-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
            };

            draft.logs.unshift(newLog);

            // Track unread errors
            if (log.level === "error" && !draft.isOpen) {
              draft.unreadErrorCount++;
            }

            // Limit log size
            if (draft.logs.length > draft.maxLogs) {
              draft.logs = draft.logs.slice(0, draft.maxLogs);
            }
          })
        ),

      addNetworkRequest: (request) =>
        set(
          produce((draft) => {
            const newRequest: NetworkRequest = {
              ...request,
              id: `net-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
            };

            draft.networkRequests.unshift(newRequest);

            // Limit network request size
            if (draft.networkRequests.length > draft.maxNetworkRequests) {
              draft.networkRequests = draft.networkRequests.slice(0, draft.maxNetworkRequests);
            }
          })
        ),

      addStateSnapshot: (snapshot) =>
        set(
          produce((draft) => {
            const newSnapshot: StateSnapshot = {
              ...snapshot,
              id: `state-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
            };

            draft.stateSnapshots.unshift(newSnapshot);

            // Limit snapshots
            if (draft.stateSnapshots.length > 100) {
              draft.stateSnapshots = draft.stateSnapshots.slice(0, 100);
            }
          })
        ),

      addPerformanceMetric: (metric) =>
        set(
          produce((draft) => {
            const newMetric: PerformanceMetric = {
              ...metric,
              id: `perf-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
            };

            draft.performanceMetrics.unshift(newMetric);

            // Limit metrics
            if (draft.performanceMetrics.length > 500) {
              draft.performanceMetrics = draft.performanceMetrics.slice(0, 500);
            }
          })
        ),

      // Clear Actions
      clearLogs: () =>
        set(
          produce((draft) => {
            draft.logs = [];
            draft.unreadErrorCount = 0;
          })
        ),

      clearNetwork: () =>
        set(
          produce((draft) => {
            draft.networkRequests = [];
          })
        ),

      clearState: () =>
        set(
          produce((draft) => {
            draft.stateSnapshots = [];
          })
        ),

      clearPerformance: () =>
        set(
          produce((draft) => {
            draft.performanceMetrics = [];
          })
        ),

      clearAll: () =>
        set(
          produce((draft) => {
            draft.logs = [];
            draft.networkRequests = [];
            draft.stateSnapshots = [];
            draft.performanceMetrics = [];
            draft.unreadErrorCount = 0;
          })
        ),

      // Filter Actions
      setFilter: (filter) =>
        set(
          produce((draft) => {
            draft.filter = { ...draft.filter, ...filter };
          })
        ),

      resetFilter: () =>
        set(
          produce((draft) => {
            draft.filter = DEFAULT_FILTER;
          })
        ),

      // Settings Actions
      updateSettings: (settings) =>
        set(
          produce((draft) => {
            Object.assign(draft, settings);
          })
        ),

      // Notification Actions
      markErrorsRead: () =>
        set(
          produce((draft) => {
            draft.unreadErrorCount = 0;
          })
        ),

      // Export Actions
      exportLogs: () => {
        const state = get();
        return JSON.stringify(state.logs, null, 2);
      },

      exportAll: () => {
        const state = get();
        return JSON.stringify(
          {
            logs: state.logs,
            networkRequests: state.networkRequests,
            stateSnapshots: state.stateSnapshots,
            performanceMetrics: state.performanceMetrics,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );
      },
    }),
    {
      name: "dev-console-store",
      partialize: (state) =>
        state.persistLogs
          ? {
            logs: state.logs.slice(0, 100), // Only persist last 100 logs
            filter: state.filter,
            position: state.position,
            size: state.size,
            activeTab: state.activeTab,
            maxLogs: state.maxLogs,
            maxNetworkRequests: state.maxNetworkRequests,
            persistLogs: state.persistLogs,
            captureConsole: state.captureConsole,
            captureNetwork: state.captureNetwork,
            captureState: state.captureState,
          }
          : {
            filter: state.filter,
            position: state.position,
            size: state.size,
            activeTab: state.activeTab,
          },
    }
  )
);

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export const useDevConsoleLogs = () => {
  const logs = useDevConsoleStore((state) => state.logs);
  const filter = useDevConsoleStore((state) => state.filter);

  // Apply filters
  return logs.filter((log) => {
    // Level filter
    if (!filter.levels.includes(log.level)) return false;

    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const messageMatch = log.message.toLowerCase().includes(searchLower);
      const argsMatch = log.args.some((arg) =>
        String(arg).toLowerCase().includes(searchLower)
      );
      if (!messageMatch && !argsMatch) return false;
    }

    // Time range filter
    if (filter.timeRange) {
      if (log.timestamp < filter.timeRange.start || log.timestamp > filter.timeRange.end) {
        return false;
      }
    }

    return true;
  });
};

export const useDevConsoleNetwork = () => {
  const requests = useDevConsoleStore((state) => state.networkRequests);
  const filter = useDevConsoleStore((state) => state.filter);

  // Apply search filter
  return requests.filter((req) => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const urlMatch = req.url.toLowerCase().includes(searchLower);
      const methodMatch = req.method.toLowerCase().includes(searchLower);
      if (!urlMatch && !methodMatch) return false;
    }

    if (filter.timeRange) {
      if (req.timestamp < filter.timeRange.start || req.timestamp > filter.timeRange.end) {
        return false;
      }
    }

    return true;
  });
};
