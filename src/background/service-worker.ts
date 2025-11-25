/**
 * Optimized Background Service Worker
 * Uses new messaging and storage services for better performance
 */

import { MessageReceiver, MessageSender } from "../core/messaging";
import type {
  BatchMessage,
  ClearLogsMessage,
  ClearNetworkMessage,
  ConsoleLogMessage,
  ExtensionSettings,
  GetStateMessage,
  NetworkRequestMessage,
  UpdateSettingsMessage,
} from "../core/messaging/types";
import { StorageService } from "../core/storage";

// ============================================================================
// TYPES
// ============================================================================

interface LogEntry {
  id: string;
  timestamp: number;
  level: "log" | "info" | "warn" | "error" | "debug" | "ui" | "db" | "api";
  message: string;
  args: any[];
  stack?: string;
  source?: {
    file?: string;
    line?: number;
    column?: number;
  };
  tabId: number;
  context?: "page" | "extension"; // Track if log is from page or extension context
}

interface NetworkRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  type: "fetch" | "xhr" | "graphql";
  tabId: number;
}

interface DevConsoleState {
  logs: LogEntry[];
  networkRequests: NetworkRequest[];
  isRecording: boolean;
  settings: ExtensionSettings;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class StateManager {
  private static state: DevConsoleState = {
    logs: [],
    networkRequests: [],
    isRecording: true,
    settings: {
      autoScroll: true,
      maxLogs: 1000,
      networkMonitoring: true,
      darkMode: true,
      captureConsole: true,
      captureNetwork: true,
    },
  };

  private static saveTimer: number | null = null;
  private static readonly SAVE_DELAY = 1000; // Batch save every 1 second

  static async initialize(): Promise<void> {
    try {
      const stored =
        await StorageService.get<DevConsoleState>("devConsole_state");
      if (stored) {
        this.state = { ...this.state, ...stored };
      }
    } catch (error) {
      console.error("[Background] Failed to load state:", error);
    }
  }

  static getState(): DevConsoleState {
    return this.state;
  }

  static getStateForTab(tabId: number): DevConsoleState {
    return {
      ...this.state,
      logs: this.state.logs.filter((log) => log.tabId === tabId),
      networkRequests: this.state.networkRequests.filter(
        (req) => req.tabId === tabId
      ),
    };
  }

  static addLog(payload: any, tabId: number): void {
    if (!this.state.settings.captureConsole) return;

    const log: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: payload.timestamp || Date.now(),
      level: payload.level || "log",
      message:
        Array.isArray(payload.args) && payload.args.length > 0
          ? String(payload.args[0])
          : "",
      args: payload.args || [],
      stack: payload.stack,
      source: payload.source,
      tabId,
      context: payload.context || "page", // 'page' or 'extension'
    } as any;

    this.state.logs.push(log);

    // Limit logs
    if (this.state.logs.length > this.state.settings.maxLogs) {
      this.state.logs = this.state.logs.slice(-this.state.settings.maxLogs);
    }

    this.scheduleSave();
    this.notifyDevTools("LOG_ADDED", log);
  }

  static addNetworkRequest(request: NetworkRequest): void {
    this.state.networkRequests.push(request);

    // Limit network requests
    if (this.state.networkRequests.length > this.state.settings.maxLogs) {
      this.state.networkRequests = this.state.networkRequests.slice(
        -this.state.settings.maxLogs
      );
    }

    this.scheduleSave();
    this.notifyDevTools("NETWORK_ADDED", request);
  }

  static clearLogs(tabId?: number): void {
    if (typeof tabId === "number") {
      this.state.logs = this.state.logs.filter((log) => log.tabId !== tabId);
    } else {
      this.state.logs = [];
    }

    this.scheduleSave();
    this.notifyDevTools("LOGS_CLEARED", { tabId });
  }

  static clearNetworkRequests(tabId?: number): void {
    if (typeof tabId === "number") {
      this.state.networkRequests = this.state.networkRequests.filter(
        (req) => req.tabId !== tabId
      );
    } else {
      this.state.networkRequests = [];
    }

    this.scheduleSave();
    this.notifyDevTools("NETWORK_CLEARED", { tabId });
  }

  static toggleRecording(): void {
    this.state.isRecording = !this.state.isRecording;
    this.scheduleSave();
    this.notifyDevTools("RECORDING_TOGGLED", this.state.isRecording);
  }

  static updateSettings(settings: Partial<ExtensionSettings>): void {
    this.state.settings = { ...this.state.settings, ...settings };

    // Also save to capture settings for interceptors
    StorageService.set(
      "devConsole_captureSettings",
      {
        captureConsole: this.state.settings.captureConsole,
        captureNetwork: this.state.settings.captureNetwork,
      },
      true
    );

    this.scheduleSave();
    this.notifyDevTools("SETTINGS_UPDATED", this.state.settings);
  }

  private static scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(() => {
      this.save();
    }, this.SAVE_DELAY);
  }

  private static async save(): Promise<void> {
    try {
      await StorageService.set("devConsole_state", this.state);
      this.saveTimer = null;
    } catch (error) {
      console.error("[Background] Failed to save state:", error);
    }
  }

  static async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.save();
  }

  private static notifyDevTools(updateType: string, payload: any): void {
    MessageSender.sendAsync({
      type: "DEVTOOLS_UPDATE",
      updateType,
      payload,
    } as any);
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

class MessageHandlers {
  static async handleBatch(
    message: BatchMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<void> {
    const tabId = sender.tab?.id ?? 0;

    // Process batch messages efficiently
    message.payload.forEach((msg) => {
      if (msg.type === "CONSOLE_LOG") {
        this.handleConsoleLog(msg, tabId);
      } else if (msg.type === "NETWORK_REQUEST") {
        this.handleNetworkRequest(msg, tabId);
      }
    });
  }

  static handleConsoleLog(message: ConsoleLogMessage, tabId: number): void {
    if (!StateManager.getState().isRecording) return;

    StateManager.addLog(message.payload, tabId);
  }

  static handleNetworkRequest(
    message: NetworkRequestMessage,
    tabId: number
  ): void {
    const state = StateManager.getState();
    if (!state.isRecording || !state.settings.networkMonitoring) return;

    const networkRequest: NetworkRequest = {
      id: generateId(),
      timestamp: message.payload.timestamp || Date.now(),
      url: message.payload.url,
      method: message.payload.method,
      status: message.payload.status,
      statusText: message.payload.statusText,
      duration: message.payload.duration,
      requestHeaders: message.payload.requestHeaders,
      responseHeaders: message.payload.responseHeaders,
      requestBody: message.payload.requestBody,
      responseBody: message.payload.responseBody,
      error: message.payload.error,
      type: message.payload.type,
      tabId,
    };

    StateManager.addNetworkRequest(networkRequest);
  }

  static handleGetState(message: GetStateMessage): any {
    if (typeof message.tabId === "number") {
      return StateManager.getStateForTab(message.tabId);
    }
    return StateManager.getState();
  }

  static handleClearLogs(message: ClearLogsMessage): void {
    StateManager.clearLogs(message.tabId);
  }

  static handleClearNetwork(message: ClearNetworkMessage): void {
    StateManager.clearNetworkRequests(message.tabId);
  }

  static handleToggleRecording(): void {
    StateManager.toggleRecording();
  }

  static handleUpdateSettings(message: UpdateSettingsMessage): void {
    StateManager.updateSettings(message.payload);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initialize(): Promise<void> {
  console.log("[Background] Initializing DevConsole service worker...");

  // Initialize state
  await StateManager.initialize();

  // Register message handlers
  MessageReceiver.on<BatchMessage>("DEVCONSOLE_BATCH", (message, sender) => {
    MessageHandlers.handleBatch(message, sender);
  });

  MessageReceiver.on<ConsoleLogMessage>("CONSOLE_LOG", (message, sender) => {
    const tabId = sender.tab?.id ?? 0;
    MessageHandlers.handleConsoleLog(message, tabId);
  });

  MessageReceiver.on<NetworkRequestMessage>(
    "NETWORK_REQUEST",
    (message, sender) => {
      const tabId = sender.tab?.id ?? 0;
      MessageHandlers.handleNetworkRequest(message, tabId);
    }
  );

  MessageReceiver.on<GetStateMessage>("GET_STATE", (message) => {
    return MessageHandlers.handleGetState(message);
  });

  MessageReceiver.on<ClearLogsMessage>("CLEAR_LOGS", (message) => {
    MessageHandlers.handleClearLogs(message);
  });

  MessageReceiver.on<ClearNetworkMessage>("CLEAR_NETWORK", (message) => {
    MessageHandlers.handleClearNetwork(message);
  });

  MessageReceiver.on("TOGGLE_RECORDING", () => {
    MessageHandlers.handleToggleRecording();
  });

  MessageReceiver.on<UpdateSettingsMessage>("UPDATE_SETTINGS", (message) => {
    MessageHandlers.handleUpdateSettings(message);
  });

  // Handle tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
      StateManager.clearLogs(tabId);
      StateManager.clearNetworkRequests(tabId);
    }
  });

  // Handle tab removal
  chrome.tabs.onRemoved.addListener((tabId) => {
    StateManager.clearLogs(tabId);
    StateManager.clearNetworkRequests(tabId);
  });

  // Flush state before extension unloads
  self.addEventListener("beforeunload", async () => {
    await StateManager.flush();
    await StorageService.flushAll();
  });

  console.log("[Background] ✅ DevConsole service worker initialized");
}

// ============================================================================
// START
// ============================================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Background] DevConsole Extension installed");
  initialize();
});

// Initialize on startup
await initialize();

export {};
