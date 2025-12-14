// Background service worker for Chrome extension
// Manages state and message passing between content scripts and devtools

interface DevConsoleState {
  logs: LogEntry[];
  networkRequests: NetworkRequest[];
  isRecording: boolean;
  settings: ExtensionSettings;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: "log" | "info" | "warn" | "error" | "debug" | "ui" | "db" | "api";
  message: string;
  args?: any[];
  source?: {
    file?: string;
    line?: number;
    column?: number;
    raw?: string;
  };
  url?: string;
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

interface ExtensionSettings {
  autoScroll: boolean;
  maxLogs: number;
  networkMonitoring: boolean;
  darkMode: boolean;
}

// Global state
let devConsoleState: DevConsoleState = {
  logs: [],
  networkRequests: [],
  isRecording: true,
  settings: {
    autoScroll: true,
    maxLogs: 1000,
    networkMonitoring: true,
    darkMode: true,
  },
};

const SAVE_STATE_DEBOUNCE_MS = 1500;
let saveStateTimer: number | null = null;
let saveStateInFlight: Promise<void> | null = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log("DevConsole Extension installed");
  await loadState();

  // Initialize autofill counters
  chrome.storage.local.get(["autofillFillCount"], (result) => {
    if (result.autofillFillCount === undefined) {
      chrome.storage.local.set({ autofillFillCount: 0 });
    }
  });
});

// Load state from Chrome storage
async function loadState() {
  try {
    const result = await chrome.storage.local.get(["devConsoleState"]);
    if (result.devConsoleState) {
      devConsoleState = { ...devConsoleState, ...result.devConsoleState };
    }
  } catch (error) {
    console.error("Failed to load state:", error);
  }
}

// Save state to Chrome storage
async function persistState() {
  try {
    await chrome.storage.local.set({ devConsoleState });
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

    default:
      console.warn("Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }

  return keepChannelOpen;
});

// Handle console log from content script
function handleConsoleLog(logData: any, tabId: number) {
  if (!devConsoleState.isRecording) return;

  // Transform payload to LogEntry format
  // The payload comes from page-hook-logic with: { level, args, timestamp, source }
  const message =
    logData.args && logData.args.length > 0
      ? JSON.stringify(logData.args[0])
      : "";

  const logEntry: LogEntry = {
    id: generateId(),
    timestamp: logData.timestamp || Date.now(),
    level: logData.level || "log",
    message,
    args: logData.args || [],
    source: logData.source,
    tabId,
  };

  devConsoleState.logs.push(logEntry);

  // Limit log entries
  if (devConsoleState.logs.length > devConsoleState.settings.maxLogs) {
    devConsoleState.logs = devConsoleState.logs.slice(
      -devConsoleState.settings.maxLogs
    );
  }

  scheduleSaveState();
  notifyDevTools("LOG_ADDED", logEntry);
}

// Handle network request from content script
function handleNetworkRequest(requestData: any, tabId: number) {
  if (
    !devConsoleState.isRecording ||
    !devConsoleState.settings.networkMonitoring
  )
    return;

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

  // Limit network entries
  if (
    devConsoleState.networkRequests.length > devConsoleState.settings.maxLogs
  ) {
    devConsoleState.networkRequests = devConsoleState.networkRequests.slice(
      -devConsoleState.settings.maxLogs
    );
  }

  scheduleSaveState();
  notifyDevTools("NETWORK_ADDED", networkRequest);
}

// Update settings
function updateSettings(newSettings: Partial<ExtensionSettings>) {
  devConsoleState.settings = { ...devConsoleState.settings, ...newSettings };
  scheduleSaveState();
  notifyDevTools("SETTINGS_UPDATED", devConsoleState.settings);
}

// Clear logs
function clearLogs(tabId?: number) {
  if (typeof tabId === "number") {
    devConsoleState.logs = devConsoleState.logs.filter(
      (log) => log.tabId !== tabId
    );
  } else {
    devConsoleState.logs = [];
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
  } else {
    devConsoleState.networkRequests = [];
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
  // Send message to all devtools panels
  chrome.runtime
    .sendMessage({
      type: "DEVTOOLS_UPDATE",
      updateType: type,
      payload,
    })
    .catch(() => {
      // DevTools might not be open, ignore error
    });
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
}> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["autofillFillCount", "datasets", "usageMap"],
      (result) => {
        resolve({
          fillCount: result.autofillFillCount || 0,
          datasets: result.datasets || [],
          usageMap: result.usageMap || {},
        });
      }
    );
  });
}

export {};
