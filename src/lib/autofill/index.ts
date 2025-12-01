/**
 * Main Autofill Controller
 * Orchestrates all autofill modules and initializes the feature
 */

import "./autofill.css";
import { DataStore } from "./datastore";
import { initializeDataStore } from "./fillLogic";
import {
  checkAndShowFillAllButton,
  cleanupAutofillUI,
  enhanceInputs,
  setupKeyboardShortcuts,
} from "./uiManager";

// Singleton DataStore instance
let dataStore: DataStore | null = null;
let observer: MutationObserver | null = null;
let isAutofillEnabled = true;
let isInitialized = false;
let keyboardListenerAttached = false;
let inputMonitorAttached = false;

// Storage key for autofill settings
const AUTOFILL_SETTINGS_KEY = "devConsoleAutofillSettings";

/**
 * Check if autofill is currently enabled (for use by other modules)
 */
export function getIsAutofillEnabled(): boolean {
  return isAutofillEnabled;
}

/**
 * Check if autofill is enabled from storage
 */
async function checkAutofillEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(AUTOFILL_SETTINGS_KEY);
    const settings = result[AUTOFILL_SETTINGS_KEY];
    if (settings && typeof settings.isEnabled === "boolean") {
      return settings.isEnabled;
    }
    return true; // Default to enabled
  } catch (error) {
    console.warn("Failed to check autofill settings:", error);
    return true;
  }
}

/**
 * Setup storage listener for settings changes
 * Uses chrome.storage.onChanged which works reliably in content scripts
 */
function setupSettingsListener(): void {
  // Listen for storage changes - this works reliably between DevTools and content scripts
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[AUTOFILL_SETTINGS_KEY]) {
      const newValue = changes[AUTOFILL_SETTINGS_KEY].newValue;
      const wasEnabled = isAutofillEnabled;
      isAutofillEnabled = newValue?.isEnabled ?? true;

      console.log("[Autofill] Settings changed:", {
        wasEnabled,
        isEnabled: isAutofillEnabled,
      });

      if (wasEnabled && !isAutofillEnabled) {
        // Disable autofill - cleanup UI
        cleanupAutofillUI();
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        console.log("🚫 Smart Autofill disabled");
      } else if (!wasEnabled && isAutofillEnabled) {
        // Enable autofill - reinitialize UI
        if (isInitialized && dataStore) {
          enhanceInputs();
          setupMutationObserver();
          console.log("✅ Smart Autofill re-enabled");
        } else {
          // Not initialized yet, do full init
          initializeAutofillCore();
        }
      }
    }
  });
}

/**
 * Core initialization logic (can be called when re-enabling)
 */
async function initializeAutofillCore(): Promise<void> {
  try {
    // Create and initialize DataStore if not already done
    if (!dataStore) {
      dataStore = new DataStore();
      await dataStore.initialize();
      initializeDataStore(dataStore);
    }

    isInitialized = true;

    console.log("✅ Smart Autofill initialized");

    // Enhance existing inputs
    enhanceInputs();

    // Setup keyboard shortcuts (only once)
    if (!keyboardListenerAttached) {
      setupKeyboardShortcuts();
      keyboardListenerAttached = true;
    }

    // Setup mutation observer for dynamic content
    setupMutationObserver();

    // Monitor input changes to update Fill All button (only once)
    if (!inputMonitorAttached) {
      setupInputMonitor();
      inputMonitorAttached = true;
    }
  } catch (error) {
    console.error("❌ Failed to initialize autofill core:", error);
  }
}

/**
 * Initialize the autofill feature
 */
export async function initializeAutofill(): Promise<void> {
  try {
    // Setup settings listener first - this listens for changes from DevTools
    setupSettingsListener();

    // Check if autofill is enabled
    isAutofillEnabled = await checkAutofillEnabled();

    if (!isAutofillEnabled) {
      console.log("🚫 Smart Autofill is disabled");
      return;
    }

    await initializeAutofillCore();
  } catch (error) {
    console.error("❌ Failed to initialize autofill:", error);
  }
}

/**
 * Setup mutation observer to detect dynamically added or removed inputs
 */
function setupMutationObserver(): void {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    let shouldEnhance = false;
    let shouldUpdateButton = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        // Check if any added node is an input or contains inputs
        if (mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              if (
                node.tagName === "INPUT" ||
                node.tagName === "TEXTAREA" ||
                node.tagName === "SELECT"
              ) {
                shouldEnhance = true;
                break;
              }
              if (node.querySelector("input, textarea, select")) {
                shouldEnhance = true;
                break;
              }
            }
          }
        }
        // Check if any removed node contained inputs (page change detection)
        if (mutation.removedNodes.length > 0) {
          for (const node of Array.from(mutation.removedNodes)) {
            if (node instanceof HTMLElement) {
              if (
                node.tagName === "INPUT" ||
                node.tagName === "TEXTAREA" ||
                node.tagName === "SELECT"
              ) {
                shouldUpdateButton = true;
                break;
              }
              if (node.querySelector("input, textarea, select")) {
                shouldUpdateButton = true;
                break;
              }
            }
          }
        }
      }
      if (shouldEnhance) break;
    }

    if (shouldEnhance || shouldUpdateButton) {
      // Debounce the enhancement and button update
      if ((window as any)._autofillEnhanceTimeout) {
        clearTimeout((window as any)._autofillEnhanceTimeout);
      }
      (window as any)._autofillEnhanceTimeout = setTimeout(() => {
        // Only enhance if autofill is still enabled
        if (!isAutofillEnabled) return;

        if (shouldEnhance) {
          enhanceInputs();
        } else {
          // Just update the button count if inputs were removed
          checkAndShowFillAllButton();
        }
      }, 200);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Monitor input changes to update Fill All button visibility
 */
function setupInputMonitor(): void {
  document.addEventListener(
    "input",
    () => {
      // Only update if autofill is enabled
      if (!isAutofillEnabled) return;
      setTimeout(checkAndShowFillAllButton, 100);
    },
    true
  );
}

/**
 * Cleanup autofill resources
 */
export function cleanupAutofill(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * Get the DataStore instance (for debugging)
 */
export function getDataStore(): DataStore | null {
  return dataStore;
}
