import { produce } from "immer";
import { useMemo } from "react";
import { create } from "zustand";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LogLevel =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "ui"
  | "db"
  | "api"
  | "group"
  | "groupEnd"
  | "groupCollapsed"
  | "table"
  | "time"
  | "timeEnd"
  | "timeLog"
  | "count"
  | "countReset"
  | "trace"
  | "assert"
  | "clear";

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
  context?: "page" | "extension"; // Track if log is from page or extension context
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

interface IStore {
  // Visibility & Layout
  isOpen: boolean;
  position: "bottom" | "left" | "right" | "floating";
  size: { width: number; height: number };
  isDragging: boolean;

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
  logsToBeExported?: string;
  dataToBeExported?: {
    logs: LogEntry[];
    networkRequests: NetworkRequest[];
    stateSnapshots: StateSnapshot[];
    performanceMetrics: PerformanceMetric[];
  };
  databaseSnapshots?: boolean;

  // Settings Object
  settings?: Record<string, any>;

  // Actions - UI Control
  toggleConsole: () => void;
  setOpen: (open: boolean) => void;
  setPosition: (position: "bottom" | "left" | "right" | "floating") => void;
  setSize: (size: { width: number; height: number }) => void;
  toggleCommandPalette: () => void;

  // Actions - Data Management
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  addNetworkRequest: (
    request: Omit<NetworkRequest, "id" | "timestamp">
  ) => void;
  addStateSnapshot: (snapshot: Omit<StateSnapshot, "id" | "timestamp">) => void;
  addPerformanceMetric: (
    metric: Omit<PerformanceMetric, "id" | "timestamp">
  ) => void;

  clearLogs: () => void;
  clearNetwork: () => void;
  clearState: () => void;
  clearPerformance: () => void;
  clearAll: () => void;

  // Actions - Filtering
  setFilter: (filter: Partial<ConsoleFilter>) => void;
  resetFilter: () => void;

  // Actions - Settings
  updateSettings: (
    settings: Partial<
      Pick<
        IStore,
        | "maxLogs"
        | "maxNetworkRequests"
        | "persistLogs"
        | "captureConsole"
        | "captureNetwork"
        | "captureState"
      >
    >
  ) => void;

  // Actions - Notifications
  markErrorsRead: () => void;

  // Utility
  exportLogs: () => void;
  exportAll: () => void;
}

const DEFAULT_FILTER: ConsoleFilter = {
  levels: [
    "log",
    "info",
    "warn",
    "error",
    "debug",
    "ui",
    "db",
    "api",
    "group",
    "groupEnd",
    "groupCollapsed",
    "table",
    "time",
    "timeEnd",
    "timeLog",
    "count",
    "countReset",
    "trace",
    "assert",
    "clear",
  ],
  search: "",
};

export const useDevConsoleStore = create<IStore>((set) => ({
  isDragging: false,
  isOpen: false,
  position: "bottom",
  size: { width: 1200, height: 400 },
  logs: [],
  networkRequests: [],
  stateSnapshots: [],
  performanceMetrics: [],
  filter: { ...DEFAULT_FILTER },
  commandPaletteOpen: false,
  unreadErrorCount: 0,
  showNotifications: true,
  maxLogs: 1000,
  maxNetworkRequests: 500,
  persistLogs: true,
  captureConsole: true,
  captureNetwork: true,
  captureState: true,

  toggleConsole: () =>
    set(
      produce((draft) => {
        draft.isOpen = !draft.isOpen;
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

  toggleCommandPalette: () =>
    set(
      produce((draft) => {
        draft.commandPaletteOpen = !draft.commandPaletteOpen;
      })
    ),

  addLog: (log) =>
    set(
      produce((draft) => {
        const newLog: LogEntry = {
          ...log,
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
        };

        draft.logs = [newLog, ...draft.logs].slice(0, draft.maxLogs);

        if (newLog.level === "error" && !draft.isOpen) {
          draft.unreadErrorCount += 1;
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

        draft.networkRequests = [newRequest, ...draft.networkRequests].slice(
          0,
          draft.maxNetworkRequests
        );
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

        draft.stateSnapshots = [newSnapshot, ...draft.stateSnapshots];

        // Prevent unbounded growth
        if (draft.stateSnapshots.length > 200) {
          draft.stateSnapshots = draft.stateSnapshots.slice(0, 200);
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

        draft.performanceMetrics = [newMetric, ...draft.performanceMetrics];

        if (draft.performanceMetrics.length > 500) {
          draft.performanceMetrics = draft.performanceMetrics.slice(0, 500);
        }
      })
    ),

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
  setFilter: (filter) =>
    set(
      produce((draft) => {
        draft.filter = { ...draft.filter, ...filter };
      })
    ),

  resetFilter: () =>
    set(
      produce((draft) => {
        draft.filter = { ...DEFAULT_FILTER };
      })
    ),

  updateSettings: (settings) =>
    set(
      produce((draft) => {
        draft.settings = Object.assign(draft.settings || {}, settings);
      })
    ),

  markErrorsRead: () =>
    set(
      produce((draft) => {
        draft.unreadErrorCount = 0;
      })
    ),

  exportLogs: () => {
    set(
      produce((draft) => {
        draft.logsToBeExported = JSON.stringify(draft.logs, null, 2);
      })
    );
  },

  exportAll: () => {
    set(
      produce((draft) => {
        draft.dataToBeExported = {
          logs: draft.logs,
          networkRequests: draft.networkRequests,
          stateSnapshots: draft.stateSnapshots,
          performanceMetrics: draft.performanceMetrics,
        };
      })
    );
  },
}));

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Precompute searchable text for a log entry
 * This avoids recomputing String(arg) on every search keystroke
 */
const getLogSearchableText = (log: LogEntry): string => {
  if ((log as any)._searchCache) {
    return (log as any)._searchCache;
  }

  const searchableText = [
    log.message,
    ...log.args.map((arg: any) => String(arg)),
  ]
    .join(" ")
    .toLowerCase();

  // Cache on the log object (mutation for perf, won't affect React since we filter to new array)
  (log as any)._searchCache = searchableText;
  return searchableText;
};

export const useDevConsoleLogs = () => {
  const { logs, filter } = useDevConsoleStore((state) => ({
    logs: state.logs,
    filter: state.filter,
  }));

  // Memoize filtered results - recompute only when logs array or filter changes
  return useMemo(() => {
    const searchLower = filter.search?.toLowerCase() || "";

    return logs.filter((log) => {
      // Level filter (fastest check first)
      if (!filter.levels.includes(log.level)) return false;

      // Search filter (use precomputed cache)
      if (searchLower) {
        const searchableText = getLogSearchableText(log);
        if (!searchableText.includes(searchLower)) return false;
      }

      // Time range filter
      if (filter.timeRange) {
        if (
          log.timestamp < filter.timeRange.start ||
          log.timestamp > filter.timeRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filter.levels, filter.search, filter.timeRange]);
};

/**
 * Precompute searchable text for a network request
 */
const getNetworkSearchableText = (req: NetworkRequest): string => {
  if ((req as any)._searchCache) {
    return (req as any)._searchCache;
  }

  const searchableText = [req.url, req.method].join(" ").toLowerCase();
  (req as any)._searchCache = searchableText;
  return searchableText;
};

export const useDevConsoleNetwork = () => {
  const { networkRequests, filter } = useDevConsoleStore((state) => ({
    networkRequests: state.networkRequests,
    filter: state.filter,
  }));

  // Memoize filtered results
  return useMemo(() => {
    const searchLower = filter.search?.toLowerCase() || "";

    return networkRequests.filter((req) => {
      // Search filter (use precomputed cache)
      if (searchLower) {
        const searchableText = getNetworkSearchableText(req);
        if (!searchableText.includes(searchLower)) return false;
      }

      // Time range filter
      if (filter.timeRange) {
        if (
          req.timestamp < filter.timeRange.start ||
          req.timestamp > filter.timeRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }, [networkRequests, filter.search, filter.timeRange]);
};
