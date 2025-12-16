/**
 * Centralized message types for type-safe communication
 * between content scripts, background, and devtools
 */

// ============================================================================
// LOG MESSAGES
// ============================================================================

export type LogLevel =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'debug'
  | 'ui'
  | 'db'
  | 'api'
  | 'group'
  | 'groupEnd'
  | 'groupCollapsed'
  | 'table'
  | 'time'
  | 'timeEnd'
  | 'timeLog'
  | 'count'
  | 'countReset'
  | 'trace'
  | 'assert'
  | 'clear';

export interface ConsoleLogMessage {
  type: 'CONSOLE_LOG';
  payload: {
    level: LogLevel;
    message: string;
    args: any[];
    timestamp: number;
    stack?: string;
    source?: {
      file?: string;
      line?: number;
      column?: number;
    };
  };
}

// ============================================================================
// NETWORK MESSAGES
// ============================================================================

export interface NetworkRequestMessage {
  type: 'NETWORK_REQUEST';
  payload: {
    method: string;
    url: string;
    status?: number;
    statusText?: string;
    duration?: number;
    timestamp: number;
    requestHeaders?: Record<string, string>;
    requestBody?: any;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
    error?: string;
    type: 'fetch' | 'xhr' | 'graphql';
  };
}

// ============================================================================
// BATCH MESSAGES
// ============================================================================

export interface BatchMessage {
  type: 'DEVCONSOLE_BATCH';
  payload: Array<ConsoleLogMessage | NetworkRequestMessage>;
}

// ============================================================================
// STATE MESSAGES
// ============================================================================

export interface GetStateMessage {
  type: 'GET_STATE';
  tabId?: number;
}

export interface StateResponse {
  logs: any[];
  networkRequests: any[];
  isRecording: boolean;
  settings: any;
}

// ============================================================================
// CONTROL MESSAGES
// ============================================================================

export interface ClearLogsMessage {
  type: 'CLEAR_LOGS';
  tabId?: number;
}

export interface ClearNetworkMessage {
  type: 'CLEAR_NETWORK';
  tabId?: number;
}

export interface ToggleRecordingMessage {
  type: 'TOGGLE_RECORDING';
}

export interface UpdateSettingsMessage {
  type: 'UPDATE_SETTINGS';
  payload: Partial<ExtensionSettings>;
}

// ============================================================================
// DEVTOOLS MESSAGES
// ============================================================================

export interface DevToolsUpdateMessage {
  type: 'DEVTOOLS_UPDATE';
  updateType: 'LOG_ADDED' | 'NETWORK_ADDED' | 'LOGS_CLEARED' | 'NETWORK_CLEARED' | 'SETTINGS_UPDATED' | 'RECORDING_TOGGLED';
  payload: any;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type ExtensionMessage =
  | ConsoleLogMessage
  | NetworkRequestMessage
  | BatchMessage
  | GetStateMessage
  | ClearLogsMessage
  | ClearNetworkMessage
  | ToggleRecordingMessage
  | UpdateSettingsMessage
  | DevToolsUpdateMessage;

// ============================================================================
// SETTINGS
// ============================================================================

export interface ExtensionSettings {
  autoScroll: boolean;
  maxLogs: number;
  networkMonitoring: boolean;
  darkMode: boolean;
  captureConsole: boolean;
  captureNetwork: boolean;
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

// ============================================================================
// MESSAGE HANDLER TYPE
// ============================================================================

export type MessageHandler<T extends ExtensionMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | void;
