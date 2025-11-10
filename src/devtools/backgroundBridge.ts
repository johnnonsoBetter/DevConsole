/**
 * Background Bridge for DevTools Panel
 * Connects the background script to the DevTools UI via Zustand store
 */

import { useDevConsoleStore } from '../utils/stores/devConsole';

/**
 * The DevTools panel is tied to a specific inspected tab.
 * Cache the inspected tab ID so we can scope all communication.
 */
const inspectedTabId = chrome.devtools.inspectedWindow.tabId;
const DEBUG_BRIDGE = false;
const debugBridgeLog = (...args: any[]) => {
  if (!DEBUG_BRIDGE) return;
  console.debug('[DevToolsBridge]', ...args);
};

let applyLocalClearLogs: () => void = () => {
  useDevConsoleStore.setState((state) => state);
};
let applyLocalClearNetwork: () => void = () => {
  useDevConsoleStore.setState((state) => state);
};

/**
 * Send a command to the background script
 */
export function sendBackgroundCommand(type: string, payload?: any) {
  chrome.runtime.sendMessage({ type, payload, tabId: inspectedTabId }, () => {
    const err = chrome.runtime.lastError;
    if (!err) return;

    // Ignore the noisy async warning Chrome emits when no response is expected
    if (/message channel closed/i.test(err.message ?? "")) {
      return;
    }

    console.error('[DevConsole] Failed to send command:', err);
  });
}

/**
 * Wrap store actions to also send commands to background
 */
function wrapStoreActions() {
  const store = useDevConsoleStore.getState();
  
  // Store original actions
  const originalClearLogs = store.clearLogs;
  const originalClearNetwork = store.clearNetwork;

  applyLocalClearLogs = originalClearLogs;
  applyLocalClearNetwork = originalClearNetwork;
  
  // Override clearLogs to also send to background
  useDevConsoleStore.setState({
    clearLogs: () => {
      originalClearLogs();
      sendBackgroundCommand('CLEAR_LOGS');
    },
    clearNetwork: () => {
      originalClearNetwork();
      sendBackgroundCommand('CLEAR_NETWORK');
    },
  });
}

/**
 * Initialize the bridge between background script and DevTools UI
 * Listens for messages from background and updates the Zustand store
 */
export function initializeBackgroundBridge() {
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    debugBridgeLog('message', message.type);

    switch (message.type) {
      case 'DEVTOOLS_UPDATE':
        handleDevToolsUpdate(message.updateType, message.payload);
        break;
      
      default:
        // Ignore other message types
        break;
    }

    return false;
  });

  // Request initial state from background
  chrome.runtime.sendMessage({ type: 'GET_STATE', tabId: inspectedTabId }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to get initial state:', chrome.runtime.lastError);
      return;
    }

    if (response) {
      debugBridgeLog('initial state received');
      loadInitialState(response);
    }
  });

  // Wrap store actions to also send commands to background
  wrapStoreActions();

  debugBridgeLog('bridge initialized');
}

/**
 * Handle updates from background script
 */
function handleDevToolsUpdate(updateType: string, payload: any) {
  const store = useDevConsoleStore.getState();

  debugBridgeLog('update', updateType);

  switch (updateType) {
    case 'LOG_ADDED':
      if (!payload || payload.tabId !== inspectedTabId) return;
      // Convert background LogEntry format to store format
      const logEntry = {
        level: payload.level,
        message: formatLogMessage(payload.args),
        args: payload.args || [],
        stack: payload.stack,
        source: payload.source,
      };
      store.addLog(logEntry);
      break;

    case 'NETWORK_ADDED':
      if (!payload || payload.tabId !== inspectedTabId) return;
      // Convert background NetworkRequest format to store format
      const networkRequest = {
        method: payload.method,
        url: payload.url,
        status: payload.status,
        statusText: payload.statusText,
        duration: payload.duration,
        requestHeaders: payload.requestHeaders,
        requestBody: payload.requestBody,
        responseHeaders: payload.responseHeaders,
        responseBody: payload.responseBody,
        error: payload.error,
        type: payload.type || 'fetch',
      };
      store.addNetworkRequest(networkRequest as any);
      break;

    case 'LOGS_CLEARED':
      if (payload && payload.tabId !== inspectedTabId) return;
      applyLocalClearLogs();
      break;

    case 'NETWORK_CLEARED':
      if (payload && payload.tabId !== inspectedTabId) return;
      applyLocalClearNetwork();
      break;

    case 'SETTINGS_UPDATED':
      // Update settings if needed
      if (payload.maxLogs) {
        store.updateSettings({ maxLogs: payload.maxLogs });
      }
      if (payload.maxNetworkRequests !== undefined) {
        store.updateSettings({ maxNetworkRequests: payload.maxLogs });
      }
      break;

    default:
      debugBridgeLog('unknown update type', updateType);
  }
}

/**
 * Load initial state from background script
 */
function loadInitialState(state: any) {
  const store = useDevConsoleStore.getState();

  // Clear existing data
  store.clearAll();

  const relevantLogs = (state.logs || []).filter((log: any) => log.tabId === inspectedTabId);
  const relevantNetworkRequests = (state.networkRequests || []).filter(
    (req: any) => req.tabId === inspectedTabId
  );

  // Load logs
  if (relevantLogs.length > 0) {
    relevantLogs.forEach((log: any) => {
      store.addLog({
        level: log.level,
        message: formatLogMessage(log.args),
        args: log.args || [],
        stack: log.stack,
        source: log.source,
      });
    });
  }

  // Load network requests
  if (relevantNetworkRequests.length > 0) {
    relevantNetworkRequests.forEach((req: any) => {
      store.addNetworkRequest({
        method: req.method,
        url: req.url,
        status: req.status,
        statusText: req.statusText,
        duration: req.duration,
        requestHeaders: req.requestHeaders,
        requestBody: req.requestBody,
        responseHeaders: req.responseHeaders,
        responseBody: req.responseBody,
        error: req.error,
        type: req.type || 'fetch',
      } as any);
    });
  }

  debugBridgeLog(
    'initial load',
    `logs=${relevantLogs.length}, network=${relevantNetworkRequests.length}, tab=${inspectedTabId}`
  );
}

/**
 * Format log arguments into a readable message
 */
function formatLogMessage(args: any[]): string {
  if (!args || args.length === 0) return '';

  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        if (arg.__type === 'Error') {
          return `Error: ${arg.message}`;
        }
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

// Export convenience methods
export const backgroundBridge = {
  clearLogs: () => sendBackgroundCommand('CLEAR_LOGS'),
  clearNetwork: () => sendBackgroundCommand('CLEAR_NETWORK'),
  toggleRecording: () => sendBackgroundCommand('TOGGLE_RECORDING'),
  updateSettings: (settings: any) => sendBackgroundCommand('UPDATE_SETTINGS', settings),
};
