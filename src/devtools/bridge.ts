/**
 * Simple bridge between background script and DevTools panel
 * Syncs state and handles real-time updates
 */

import { MessageReceiver, MessageSender } from "../core/messaging";
import { useDevConsoleStore } from "../utils/stores/devConsole";

let isInitialized = false;

/**
 * Initialize the bridge - call this once when DevTools panel loads
 */
export function initializeDevToolsBridge(): void {
  if (isInitialized) return;

  console.log("[DevTools Bridge] Initializing...");

  // Get initial state from background
  loadInitialState();

  // Listen for real-time updates from background
  MessageReceiver.on("DEVTOOLS_UPDATE", (message) => {
    handleDevToolsUpdate(message);
  });

  isInitialized = true;
  console.log("[DevTools Bridge] ✅ Initialized");
}

/**
 * Load initial state from background script
 */
async function loadInitialState(): Promise<void> {
  try {
    const state = await MessageSender.send({
      type: "GET_STATE",
      tabId: chrome.devtools.inspectedWindow.tabId,
    });

    if (state) {
      const store = useDevConsoleStore.getState();

      // Update store with initial data
      state.logs?.forEach((log: any) => {
        store.addLog(log);
      });

      state.networkRequests?.forEach((request: any) => {
        store.addNetworkRequest(request);
      });

      if (state.settings) {
        store.updateSettings(state.settings);
      }
    }
  } catch (error) {
    console.error("[DevTools Bridge] Failed to load initial state:", error);
  }
}

/**
 * Handle real-time updates from background
 */
function handleDevToolsUpdate(message: any): void {
  const store = useDevConsoleStore.getState();

  switch (message.updateType) {
    case "LOG_ADDED":
      if (
        message.payload &&
        message.payload.tabId === chrome.devtools.inspectedWindow.tabId
      ) {
        store.addLog(message.payload);
      }
      break;

    case "NETWORK_ADDED":
      if (
        message.payload &&
        message.payload.tabId === chrome.devtools.inspectedWindow.tabId
      ) {
        store.addNetworkRequest(message.payload);
      }
      break;

    case "LOGS_CLEARED":
      if (
        !message.payload?.tabId ||
        message.payload.tabId === chrome.devtools.inspectedWindow.tabId
      ) {
        store.clearLogs();
      }
      break;

    case "NETWORK_CLEARED":
      if (
        !message.payload?.tabId ||
        message.payload.tabId === chrome.devtools.inspectedWindow.tabId
      ) {
        store.clearNetwork();
      }
      break;

    case "SETTINGS_UPDATED":
      if (message.payload) {
        store.updateSettings(message.payload);
      }
      break;

    case "RECORDING_TOGGLED":
      // Could update UI state if needed
      console.log("[DevTools Bridge] Recording toggled:", message.payload);
      break;
  }
}

/**
 * Send a message to background to clear logs
 */
export async function clearLogs(): Promise<void> {
  await MessageSender.send({
    type: "CLEAR_LOGS",
    tabId: chrome.devtools.inspectedWindow.tabId,
  });
}

/**
 * Send a message to background to clear network requests
 */
export async function clearNetworkRequests(): Promise<void> {
  await MessageSender.send({
    type: "CLEAR_NETWORK",
    tabId: chrome.devtools.inspectedWindow.tabId,
  });
}

/**
 * Send a message to background to update settings
 */
export async function updateSettings(settings: any): Promise<void> {
  await MessageSender.send({
    type: "UPDATE_SETTINGS",
    payload: settings,
  });
}
