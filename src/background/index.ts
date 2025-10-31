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
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args?: any[];
  stack?: string;
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
    darkMode: true
  }
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('DevConsole Extension installed');
  loadState();
});

// Load state from Chrome storage
async function loadState() {
  try {
    const result = await chrome.storage.local.get(['devConsoleState']);
    if (result.devConsoleState) {
      devConsoleState = { ...devConsoleState, ...result.devConsoleState };
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

// Save state to Chrome storage
async function saveState() {
  try {
    await chrome.storage.local.set({ devConsoleState });
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id || 0;

  switch (message.type) {
    case 'CONSOLE_LOG':
      handleConsoleLog(message.payload, tabId);
      break;
    
    case 'NETWORK_REQUEST':
      handleNetworkRequest(message.payload, tabId);
      break;
    
    case 'GET_STATE':
      sendResponse(devConsoleState);
      break;
    
    case 'UPDATE_SETTINGS':
      updateSettings(message.payload);
      break;
    
    case 'CLEAR_LOGS':
      clearLogs();
      break;
    
    case 'CLEAR_NETWORK':
      clearNetworkRequests();
      break;
    
    case 'TOGGLE_RECORDING':
      toggleRecording();
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
  }

  return true; // Keep message channel open
});

// Handle console log from content script
function handleConsoleLog(logData: Omit<LogEntry, 'id' | 'tabId'>, tabId: number) {
  if (!devConsoleState.isRecording) return;

  const logEntry: LogEntry = {
    ...logData,
    id: generateId(),
    tabId
  };

  devConsoleState.logs.push(logEntry);

  // Limit log entries
  if (devConsoleState.logs.length > devConsoleState.settings.maxLogs) {
    devConsoleState.logs = devConsoleState.logs.slice(-devConsoleState.settings.maxLogs);
  }

  saveState();
  notifyDevTools('LOG_ADDED', logEntry);
}

// Handle network request from content script
function handleNetworkRequest(requestData: Omit<NetworkRequest, 'id' | 'tabId'>, tabId: number) {
  if (!devConsoleState.isRecording || !devConsoleState.settings.networkMonitoring) return;

  const networkRequest: NetworkRequest = {
    ...requestData,
    id: generateId(),
    tabId
  };

  devConsoleState.networkRequests.push(networkRequest);

  // Limit network entries
  if (devConsoleState.networkRequests.length > devConsoleState.settings.maxLogs) {
    devConsoleState.networkRequests = devConsoleState.networkRequests.slice(-devConsoleState.settings.maxLogs);
  }

  saveState();
  notifyDevTools('NETWORK_ADDED', networkRequest);
}

// Update settings
function updateSettings(newSettings: Partial<ExtensionSettings>) {
  devConsoleState.settings = { ...devConsoleState.settings, ...newSettings };
  saveState();
  notifyDevTools('SETTINGS_UPDATED', devConsoleState.settings);
}

// Clear logs
function clearLogs() {
  devConsoleState.logs = [];
  saveState();
  notifyDevTools('LOGS_CLEARED', null);
}

// Clear network requests
function clearNetworkRequests() {
  devConsoleState.networkRequests = [];
  saveState();
  notifyDevTools('NETWORK_CLEARED', null);
}

// Toggle recording
function toggleRecording() {
  devConsoleState.isRecording = !devConsoleState.isRecording;
  saveState();
  notifyDevTools('RECORDING_TOGGLED', devConsoleState.isRecording);
}

// Notify DevTools of changes
function notifyDevTools(type: string, payload: any) {
  // Send message to all devtools panels
  chrome.runtime.sendMessage({
    type: 'DEVTOOLS_UPDATE',
    updateType: type,
    payload
  }).catch(() => {
    // DevTools might not be open, ignore error
  });
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Clear logs for this tab when navigating
    devConsoleState.logs = devConsoleState.logs.filter(log => log.tabId !== tabId);
    devConsoleState.networkRequests = devConsoleState.networkRequests.filter(req => req.tabId !== tabId);
    saveState();
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  // Clean up data for closed tabs
  devConsoleState.logs = devConsoleState.logs.filter(log => log.tabId !== tabId);
  devConsoleState.networkRequests = devConsoleState.networkRequests.filter(req => req.tabId !== tabId);
  saveState();
});

export {};