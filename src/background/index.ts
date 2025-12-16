// Background service worker for Chrome extension
// Manages state and message passing between content scripts and devtools

interface DevConsoleState {
  logs: LogEntry[];
  networkRequests: NetworkRequest[];
  isRecording: boolean;
  settings: ExtensionSettings;
  stats: DevConsoleStats;
  archives: {
    logs: ArchivedLogEntry[];
    networkRequests: ArchivedNetworkRequest[];
  };
}

type LogLevel =
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

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  args?: any[];
  context?: "page" | "extension";
  source?: {
    file?: string;
    line?: number;
    column?: number;
    raw?: string;
  };
  url?: string;
  tabId: number;
}

interface ArchivedLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: "page" | "extension";
  source?: LogEntry["source"];
  tabId: number;
}

interface NetworkRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  duration?: number;
  tabId: number;
}

interface ArchivedNetworkRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  tabId: number;
}

interface DevConsoleStats {
  logsReceived: number;
  logsStored: number;
  logsDroppedByLimit: number;
  logsDroppedByFilter: number;
  networkReceived: number;
  networkStored: number;
  networkDroppedByLimit: number;
  networkDroppedByFilter: number;
}

interface ExtensionSettings {
  autoScroll: boolean;
  maxLogs: number;
  networkMonitoring: boolean;
  darkMode: boolean;
  captureConsole?: boolean;
  captureNetwork?: boolean;
  persistState?: boolean;
  allowedLogLevels?: LogLevel[];
  contentFilter?: string;
  sourceFilter?: string;
  maxMessageChars?: number;
  maxArgChars?: number;
  maxArgs?: number;
  archiveEnabled?: boolean;
  maxArchivedLogs?: number;
  maxArchivedNetworkRequests?: number;
}

// Global state
let devConsoleState: DevConsoleState = {
  logs: [],
  networkRequests: [],
  isRecording: true,
  stats: {
    logsReceived: 0,
    logsStored: 0,
    logsDroppedByLimit: 0,
    logsDroppedByFilter: 0,
    networkReceived: 0,
    networkStored: 0,
    networkDroppedByLimit: 0,
    networkDroppedByFilter: 0,
  },
  archives: {
    logs: [],
    networkRequests: [],
  },
  settings: {
    autoScroll: true,
    maxLogs: 1000,
    networkMonitoring: true,
    darkMode: true,
    captureConsole: true,
    captureNetwork: true,
    persistState: true,
    maxMessageChars: 10_000,
    maxArgChars: 50_000,
    maxArgs: 25,
    archiveEnabled: true,
    maxArchivedLogs: 500,
    maxArchivedNetworkRequests: 200,
  },
};

const SAVE_STATE_DEBOUNCE_MS = 1500;
let saveStateTimer: number | null = null;
let saveStateInFlight: Promise<void> | null = null;

const DEVTOOLS_NOTIFY_ERROR_SUPPRESS_MS = 60_000;
let lastDevToolsNotifyError: {
  message: string;
  at: number;
  suppressed: number;
} | null = null;

const LOG_LEVEL_SET: ReadonlySet<LogLevel> = new Set<LogLevel>([
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
]);

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log("DevConsole Extension installed");

  // Initialize autofill counters
  chrome.storage.local.get(["autofillFillCount"], (result) => {
    if (result.autofillFillCount === undefined) {
      chrome.storage.local.set({ autofillFillCount: 0 });
    }
  });
});

// Load persisted state on service worker start (MV3 service workers can restart frequently).
void loadState();

// Load state from Chrome storage
async function loadState() {
  try {
    const existingLogs = devConsoleState.logs;
    const existingNetworkRequests = devConsoleState.networkRequests;

    const result = await chrome.storage.local.get(["devConsoleState"]);
    if (result.devConsoleState) {
      const stored = result.devConsoleState as Partial<DevConsoleState>;
      devConsoleState = {
        ...devConsoleState,
        ...stored,
        settings: { ...devConsoleState.settings, ...(stored.settings || {}) },
        stats: { ...devConsoleState.stats, ...(stored.stats || {}) },
        archives: {
          logs: Array.isArray(stored.archives?.logs)
            ? stored.archives?.logs
            : devConsoleState.archives.logs,
          networkRequests: Array.isArray(stored.archives?.networkRequests)
            ? stored.archives?.networkRequests
            : devConsoleState.archives.networkRequests,
        },
      };

      if (Array.isArray(existingLogs) && existingLogs.length > 0) {
        devConsoleState.logs = devConsoleState.logs.concat(existingLogs);
      }
      if (
        Array.isArray(existingNetworkRequests) &&
        existingNetworkRequests.length > 0
      ) {
        devConsoleState.networkRequests =
          devConsoleState.networkRequests.concat(existingNetworkRequests);
      }

      applyRetentionLimits();
    }
  } catch (error) {
    console.error("Failed to load state:", error);
  }
}

// Save state to Chrome storage
async function persistState() {
  try {
    const shouldPersist = devConsoleState.settings.persistState !== false;
    const payload: DevConsoleState = shouldPersist
      ? devConsoleState
      : {
          ...devConsoleState,
          logs: [],
          networkRequests: [],
          archives: { logs: [], networkRequests: [] },
          stats: {
            logsReceived: 0,
            logsStored: 0,
            logsDroppedByLimit: 0,
            logsDroppedByFilter: 0,
            networkReceived: 0,
            networkStored: 0,
            networkDroppedByLimit: 0,
            networkDroppedByFilter: 0,
          },
        };

    await chrome.storage.local.set({ devConsoleState: payload });
  } catch (error) {
    console.error("Failed to save state:", error);
  } finally {
    saveStateInFlight = null;
  }
}

function scheduleSaveState(immediate = false) {
  if (immediate) {
    if (saveStateTimer) {
      clearTimeout(saveStateTimer);
      saveStateTimer = null;
    }
    if (!saveStateInFlight) {
      saveStateInFlight = persistState();
    }
    return;
  }

  if (saveStateTimer) return;

  saveStateTimer = setTimeout(() => {
    saveStateTimer = null;
    if (!saveStateInFlight) {
      saveStateInFlight = persistState();
    }
  }, SAVE_STATE_DEBOUNCE_MS) as unknown as number;
}

if (chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    scheduleSaveState(true);
  });
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id || 0;

  const DEBUG_MESSAGES = false;
  if (DEBUG_MESSAGES) {
    console.log(
      "Background received message:",
      message.type,
      "from tab:",
      tabId
    );
  }

  let keepChannelOpen = false;

  switch (message.type) {
    case "DEVCONSOLE_BATCH":
      // Handle batched messages from content script
      if (Array.isArray(message.payload)) {
        message.payload.forEach((msg: any) => {
          if (msg.type === "CONSOLE_LOG") {
            handleConsoleLog(msg.payload, tabId);
          } else if (msg.type === "NETWORK_REQUEST") {
            handleNetworkRequest(msg.payload, tabId);
          }
        });
      }
      sendResponse({ success: true });
      break;

    case "CONSOLE_LOG":
      handleConsoleLog(message.payload, tabId);
      sendResponse({ success: true });
      break;

    case "NETWORK_REQUEST":
      console.log("Network request payload:", message.payload);
      handleNetworkRequest(message.payload, tabId);
      sendResponse({ success: true });
      break;

    case "DEVCONSOLE_UNLOAD":
      // Handle page unload - could be used for cleanup if needed
      sendResponse({ success: true });
      break;

    case "GET_STATE":
      if (typeof message.tabId === "number") {
        sendResponse({
          ...devConsoleState,
          logs: devConsoleState.logs.filter(
            (log) => log.tabId === message.tabId
          ),
          networkRequests: devConsoleState.networkRequests.filter(
            (req) => req.tabId === message.tabId
          ),
          archives: {
            logs: devConsoleState.archives.logs.filter(
              (log) => log.tabId === message.tabId
            ),
            networkRequests: devConsoleState.archives.networkRequests.filter(
              (req) => req.tabId === message.tabId
            ),
          },
        });
      } else {
        sendResponse(devConsoleState);
      }
      break;

    case "UPDATE_SETTINGS":
      updateSettings(message.payload);
      sendResponse({ success: true });
      break;

    case "CLEAR_LOGS":
      clearLogs(message.tabId);
      sendResponse({ success: true });
      break;

    case "CLEAR_NETWORK":
      clearNetworkRequests(message.tabId);
      sendResponse({ success: true });
      break;

    case "TOGGLE_RECORDING":
      toggleRecording();
      sendResponse({ success: true });
      break;

    // Autofill feature messages
    case "AUTOFILL_INCREMENT_COUNT":
      incrementAutofillCount();
      sendResponse({ success: true });
      keepChannelOpen = false;
      break;

    case "AUTOFILL_GET_STATS":
      getAutofillStats().then((stats) => sendResponse(stats));
      keepChannelOpen = true;
      break;

    case "TEST_AUTOFILL_AI":
      // Forward test request to active tab's content script and return its response
      (async () => {
        try {
          const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) =>
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, resolve)
          );
          const targetTab = tabs && tabs.length > 0 ? tabs[0] : null;
          if (!targetTab || !targetTab.id) {
            sendResponse({ success: false, error: 'No active tab found' });
            return;
          }

          chrome.tabs.sendMessage(targetTab.id, { type: 'TEST_AUTOFILL_AI' }, (resp) => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse(resp);
            }
          });
        } catch (err: any) {
          sendResponse({ success: false, error: err?.message || String(err) });
        }
      })();
      keepChannelOpen = true;
      break;

    case "GENERATE_PAGE_STORE_DATASETS":
      // Store the generation request so DevTools panel can pick it up
      // AI generation requires React hooks so we can't do it in background
      (async () => {
        try {
          const { storeId, count } = message.payload || {};
          if (!storeId) {
            sendResponse({ success: false, error: "No store ID provided" });
            return;
          }

          // Store the pending generation request
          await chrome.storage.local.set({
            pendingDatasetGeneration: {
              storeId,
              count: count || 100,
              requestedAt: Date.now(),
            },
          });

          // Send response indicating user should check DevTools
          sendResponse({ 
            success: false, 
            error: "OPEN_DEVTOOLS",
            message: "Open DevTools PageStore panel to generate datasets"
          });
        } catch (err: any) {
          sendResponse({ success: false, error: err?.message || String(err) });
        }
      })();
      keepChannelOpen = true;
      break;

    default:
      console.warn("Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }

  return keepChannelOpen;
});

// Handle console log from content script
function handleConsoleLog(logData: any, tabId: number) {
  if (!devConsoleState.isRecording) return;
  if (devConsoleState.settings.captureConsole === false) return;

  devConsoleState.stats.logsReceived += 1;

  // Transform payload to LogEntry format
  // The payload comes from page-hook-logic with: { level, args, timestamp, source }
  const sanitizedArgs = sanitizeArgsForStorage(logData.args, {
    maxArgs: devConsoleState.settings.maxArgs,
    maxArgChars: devConsoleState.settings.maxArgChars,
  });

  const rawMessage =
    typeof logData.message === "string" && logData.message.length > 0
      ? logData.message
      : formatLogMessageFromArgs(sanitizedArgs);
  const message = truncateString(
    rawMessage,
    devConsoleState.settings.maxMessageChars
  );

  if (
    !shouldStoreLogEntry({
      level: logData.level,
      message,
      args: sanitizedArgs,
      source: logData.source,
    })
  )
    {
      devConsoleState.stats.logsDroppedByFilter += 1;
      return;
    }

  const logEntry: LogEntry = {
    id: generateId(),
    timestamp: logData.timestamp || Date.now(),
    level: logData.level || "log",
    message,
    args: sanitizedArgs,
    source: logData.source,
    context: logData.context === "extension" ? "extension" : "page",
    tabId,
  };

  devConsoleState.logs.push(logEntry);
  devConsoleState.stats.logsStored += 1;

  // Limit log entries
  const dropped = rotateByCount(devConsoleState.logs, devConsoleState.settings.maxLogs);
  if (dropped.length > 0) {
    devConsoleState.stats.logsDroppedByLimit += dropped.length;
    archiveLogEntries(dropped);
  }

  scheduleSaveState();
  notifyDevTools("LOG_ADDED", logEntry);
}

function shouldStoreLogEntry(logEntry: {
  level?: unknown;
  message: string;
  args: any[];
  source?: LogEntry["source"];
}): boolean {
  const settings = devConsoleState.settings;

  const level = normalizeLogLevel(logEntry.level);
  const allowed = settings.allowedLogLevels;
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(level)) {
    return false;
  }

  const sourceFilter =
    typeof settings.sourceFilter === "string" ? settings.sourceFilter.trim() : "";
  if (sourceFilter) {
    const sourceText = [logEntry.source?.file, logEntry.source?.raw]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!sourceText.includes(sourceFilter.toLowerCase())) {
      return false;
    }
  }

  const filter = typeof settings.contentFilter === "string" ? settings.contentFilter.trim() : "";
  if (!filter) return true;

  const filterLower = filter.toLowerCase();
  const searchableParts = [
    logEntry.message,
    ...logEntry.args.map((arg) => formatLogArgForMessage(arg, 2_000)),
  ];
  const searchable = searchableParts.join(" ").toLowerCase();

  return searchable.includes(filterLower);
}

function normalizeLogLevel(level: unknown): LogLevel {
  if (typeof level === "string" && LOG_LEVEL_SET.has(level as LogLevel)) {
    return level as LogLevel;
  }
  return "log";
}

function sanitizeArgsForStorage(
  args: unknown,
  options: { maxArgs?: number; maxArgChars?: number } = {}
): any[] {
  const maxArgs =
    typeof options.maxArgs === "number" && options.maxArgs > 0
      ? options.maxArgs
      : 25;
  const maxArgChars =
    typeof options.maxArgChars === "number" && options.maxArgChars > 0
      ? options.maxArgChars
      : 50_000;

  const inputArray = Array.isArray(args) ? args : args === undefined ? [] : [args];
  const trimmed = inputArray.slice(0, maxArgs);
  const overflow = inputArray.length - trimmed.length;

  const sanitized = trimmed.map((arg) => sanitizeArgForStorage(arg, maxArgChars));
  if (overflow > 0) {
    sanitized.push(`... ${overflow} more args`);
  }

  return sanitized;
}

function sanitizeArgForStorage(arg: any, maxArgChars: number): any {
  if (arg === null) return null;
  if (arg === undefined) return "undefined";

  const type = typeof arg;

  if (type === "string") return truncateString(arg, maxArgChars);
  if (type === "number") {
    if (!Number.isFinite(arg)) return String(arg);
    return arg;
  }
  if (type === "bigint") return `${arg}n`;
  if (type === "boolean") return arg;
  if (type === "function") {
    return `[Function: ${arg.name || "anonymous"}]`;
  }
  if (type === "symbol") return arg.toString();

  if (arg instanceof Error) {
    return {
      __type: "Error",
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }

  return arg;
}

function formatLogMessageFromArgs(args: any[]): string {
  if (!Array.isArray(args) || args.length === 0) return "";
  return args.map((arg) => formatLogArgForMessage(arg)).join(" ");
}

function formatLogArgForMessage(arg: any, maxObjectChars = 25_000): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";

  const type = typeof arg;
  if (type === "string") return arg;
  if (type === "number") return String(arg);
  if (type === "bigint") return `${arg}n`;
  if (type === "boolean") return String(arg);
  if (type === "symbol") return arg.toString();
  if (type === "function") return `[Function: ${arg.name || "anonymous"}]`;

  if (type === "object") {
    if (arg.__type === "Error") {
      const name = typeof arg.name === "string" ? arg.name : "Error";
      const message = typeof arg.message === "string" ? arg.message : "";
      return message ? `${name}: ${message}` : name;
    }
    if (arg.__type === "Date" && typeof arg.value === "string") return arg.value;
    if (arg.__type === "RegExp" && typeof arg.value === "string") return arg.value;

    return safeStringify(arg, maxObjectChars);
  }

  return String(arg);
}

function safeStringify(value: any, maxChars = 25_000): string {
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(value, (_key, val) => {
      if (val === undefined) return "undefined";
      if (typeof val === "bigint") return `${val}n`;
      if (typeof val === "function") {
        return `[Function: ${(val as Function).name || "anonymous"}]`;
      }
      if (typeof val === "symbol") return val.toString();
      if (typeof val === "number" && !Number.isFinite(val)) return String(val);
      if (val instanceof Error) {
        return {
          __type: "Error",
          name: val.name,
          message: val.message,
          stack: val.stack,
        };
      }
      if (val && typeof val === "object") {
        if (seen.has(val as object)) return "[Circular]";
        seen.add(val as object);
      }
      return val;
    });
    return truncateString(json ?? String(value), maxChars);
  } catch {
    return truncateString(String(value), maxChars);
  }
}

function truncateString(value: string, maxChars?: number): string {
  if (typeof maxChars !== "number" || maxChars <= 0) return value;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars) + `…(${value.length - maxChars} more chars)`;
}

function rotateByCount<T>(items: T[], maxItems: number): T[] {
  const limit =
    typeof maxItems === "number" && Number.isFinite(maxItems) && maxItems > 0
      ? Math.floor(maxItems)
      : 0;

  if (!Array.isArray(items) || items.length === 0) return [];
  if (items.length <= limit) return [];

  const overflow = items.length - limit;
  return items.splice(0, overflow);
}

function archiveLogEntries(dropped: LogEntry[]): void {
  const settings = devConsoleState.settings;
  if (settings.archiveEnabled === false) return;

  const maxArchived =
    typeof settings.maxArchivedLogs === "number" && settings.maxArchivedLogs > 0
      ? Math.floor(settings.maxArchivedLogs)
      : 0;
  if (maxArchived === 0 || dropped.length === 0) return;

  const archived: ArchivedLogEntry[] = dropped.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    context: entry.context,
    source: entry.source,
    tabId: entry.tabId,
  }));

  devConsoleState.archives.logs.push(...archived);
  rotateByCount(devConsoleState.archives.logs, maxArchived);
}

function archiveNetworkRequests(dropped: NetworkRequest[]): void {
  const settings = devConsoleState.settings;
  if (settings.archiveEnabled === false) return;

  const maxArchived =
    typeof settings.maxArchivedNetworkRequests === "number" &&
    settings.maxArchivedNetworkRequests > 0
      ? Math.floor(settings.maxArchivedNetworkRequests)
      : 0;
  if (maxArchived === 0 || dropped.length === 0) return;

  const archived: ArchivedNetworkRequest[] = dropped.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    url: entry.url,
    method: entry.method,
    status: entry.status,
    duration: entry.duration,
    tabId: entry.tabId,
  }));

  devConsoleState.archives.networkRequests.push(...archived);
  rotateByCount(devConsoleState.archives.networkRequests, maxArchived);
}

function applyRetentionLimits(): void {
  if (!Array.isArray(devConsoleState.logs)) devConsoleState.logs = [];
  if (!Array.isArray(devConsoleState.networkRequests))
    devConsoleState.networkRequests = [];

  if (!devConsoleState.archives || typeof devConsoleState.archives !== "object") {
    devConsoleState.archives = { logs: [], networkRequests: [] };
  }
  if (!Array.isArray(devConsoleState.archives.logs)) devConsoleState.archives.logs = [];
  if (!Array.isArray(devConsoleState.archives.networkRequests))
    devConsoleState.archives.networkRequests = [];

  const droppedLogs = rotateByCount(devConsoleState.logs, devConsoleState.settings.maxLogs);
  if (droppedLogs.length > 0) {
    devConsoleState.stats.logsDroppedByLimit += droppedLogs.length;
    archiveLogEntries(droppedLogs);
  }

  const droppedNetwork = rotateByCount(
    devConsoleState.networkRequests,
    devConsoleState.settings.maxLogs
  );
  if (droppedNetwork.length > 0) {
    devConsoleState.stats.networkDroppedByLimit += droppedNetwork.length;
    archiveNetworkRequests(droppedNetwork);
  }

  rotateByCount(
    devConsoleState.archives.logs,
    devConsoleState.settings.maxArchivedLogs ?? 0
  );
  rotateByCount(
    devConsoleState.archives.networkRequests,
    devConsoleState.settings.maxArchivedNetworkRequests ?? 0
  );
}

// Handle network request from content script
function handleNetworkRequest(requestData: any, tabId: number) {
  if (!devConsoleState.isRecording) return;
  if (devConsoleState.settings.captureNetwork === false) return;
  if (!devConsoleState.settings.networkMonitoring) return;

  devConsoleState.stats.networkReceived += 1;

  const networkRequest: NetworkRequest = {
    id: generateId(),
    timestamp: requestData.timestamp || Date.now(),
    url: requestData.url || "",
    method: requestData.method || "GET",
    status: requestData.status,
    requestHeaders: requestData.requestHeaders,
    responseHeaders: requestData.responseHeaders,
    requestBody: requestData.requestBody,
    responseBody: requestData.responseBody,
    duration: requestData.duration,
    tabId,
  };

  devConsoleState.networkRequests.push(networkRequest);
  devConsoleState.stats.networkStored += 1;

  // Limit network entries
  const dropped = rotateByCount(
    devConsoleState.networkRequests,
    devConsoleState.settings.maxLogs
  );
  if (dropped.length > 0) {
    devConsoleState.stats.networkDroppedByLimit += dropped.length;
    archiveNetworkRequests(dropped);
  }

  scheduleSaveState();
  notifyDevTools("NETWORK_ADDED", networkRequest);
}

// Update settings
function updateSettings(newSettings: Partial<ExtensionSettings>) {
  devConsoleState.settings = { ...devConsoleState.settings, ...newSettings };
  applyRetentionLimits();
  scheduleSaveState();
  notifyDevTools("SETTINGS_UPDATED", devConsoleState.settings);
}

// Clear logs
function clearLogs(tabId?: number) {
  if (typeof tabId === "number") {
    devConsoleState.logs = devConsoleState.logs.filter(
      (log) => log.tabId !== tabId
    );
    devConsoleState.archives.logs = devConsoleState.archives.logs.filter(
      (log) => log.tabId !== tabId
    );
  } else {
    devConsoleState.logs = [];
    devConsoleState.archives.logs = [];
  }
  scheduleSaveState();
  notifyDevTools("LOGS_CLEARED", typeof tabId === "number" ? { tabId } : null);
}

// Clear network requests
function clearNetworkRequests(tabId?: number) {
  if (typeof tabId === "number") {
    devConsoleState.networkRequests = devConsoleState.networkRequests.filter(
      (req) => req.tabId !== tabId
    );
    devConsoleState.archives.networkRequests =
      devConsoleState.archives.networkRequests.filter((req) => req.tabId !== tabId);
  } else {
    devConsoleState.networkRequests = [];
    devConsoleState.archives.networkRequests = [];
  }
  scheduleSaveState();
  notifyDevTools(
    "NETWORK_CLEARED",
    typeof tabId === "number" ? { tabId } : null
  );
}

// Toggle recording
function toggleRecording() {
  devConsoleState.isRecording = !devConsoleState.isRecording;
  scheduleSaveState();
  notifyDevTools("RECORDING_TOGGLED", devConsoleState.isRecording);
}

// Notify DevTools of changes
function notifyDevTools(type: string, payload: any) {
  try {
    chrome.runtime.sendMessage(
      {
        type: "DEVTOOLS_UPDATE",
        updateType: type,
        payload,
      },
      () => {
        const err = chrome.runtime.lastError;
        if (!err) return;
        const message = err.message ?? String(err);
        if (isIgnorableDevToolsNotifyError(message)) return;
        reportDevToolsNotifyError(message);
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isIgnorableDevToolsNotifyError(message)) return;
    reportDevToolsNotifyError(message);
  }
}

function isIgnorableDevToolsNotifyError(message: string): boolean {
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("receiving end does not exist") ||
    msg.includes("message port closed") ||
    msg.includes("message channel closed") ||
    msg.includes("extension context invalidated")
  );
}

function reportDevToolsNotifyError(message: string): void {
  const now = Date.now();

  if (
    lastDevToolsNotifyError &&
    lastDevToolsNotifyError.message === message &&
    now - lastDevToolsNotifyError.at < DEVTOOLS_NOTIFY_ERROR_SUPPRESS_MS
  ) {
    lastDevToolsNotifyError.suppressed += 1;
    return;
  }

  if (lastDevToolsNotifyError?.suppressed) {
    console.warn(
      `[DevConsole] DevTools notify error repeated ${lastDevToolsNotifyError.suppressed}x:`,
      lastDevToolsNotifyError.message
    );
  }

  lastDevToolsNotifyError = { message, at: now, suppressed: 0 };
  console.warn("[DevConsole] DevTools notify error:", message);
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    // Clear logs for this tab when navigating
    clearLogs(tabId);
    clearNetworkRequests(tabId);
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  // Clean up data for closed tabs
  clearLogs(tabId);
  clearNetworkRequests(tabId);
});

// ============================================
// Autofill Feature Functions
// ============================================

/**
 * Increment autofill usage count
 */
function incrementAutofillCount(): void {
  chrome.storage.local.get(["autofillFillCount"], (result) => {
    const newCount = (result.autofillFillCount || 0) + 1;
    chrome.storage.local.set({ autofillFillCount: newCount });
  });
}

/**
 * Get autofill statistics
 */
async function getAutofillStats(): Promise<{
  fillCount: number;
  datasets: any[];
  usageMap: any;
  pageStores: {
    totalStores: number;
    totalDatasets: number;
    totalUsageCount: number;
  };
}> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["autofillFillCount", "datasets", "usageMap", "devConsolePageStores"],
      (result) => {
        // Calculate page store stats
        const pageStoresData = result.devConsolePageStores;
        let pageStoreStats = {
          totalStores: 0,
          totalDatasets: 0,
          totalUsageCount: 0,
        };

        if (pageStoresData?.stores && Array.isArray(pageStoresData.stores)) {
          pageStoreStats.totalStores = pageStoresData.stores.length;
          pageStoresData.stores.forEach((store: any) => {
            pageStoreStats.totalDatasets += store.datasets?.length || 0;
            pageStoreStats.totalUsageCount += store.usageCount || 0;
          });
        }

        resolve({
          fillCount: result.autofillFillCount || 0,
          datasets: result.datasets || [],
          usageMap: result.usageMap || {},
          pageStores: pageStoreStats,
        });
      }
    );
  });
}

export {};
