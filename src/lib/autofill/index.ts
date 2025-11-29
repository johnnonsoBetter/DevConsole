/**
 * Main Autofill Controller
 * Orchestrates all autofill modules and initializes the feature
 */

import "./autofill.css";
import { DataStore } from "./datastore";
import { initializeDataStore } from "./fillLogic";
import {
  checkAndShowFillAllButton,
  enhanceInputs,
  setupKeyboardShortcuts,
} from "./uiManager";

// Singleton DataStore instance
let dataStore: DataStore | null = null;
let observer: MutationObserver | null = null;

/**
 * Initialize the autofill feature
 */
export async function initializeAutofill(): Promise<void> {
  try {
    // Create and initialize DataStore
    dataStore = new DataStore();
    await dataStore.initialize();

    // Initialize fillLogic with dataStore reference
    initializeDataStore(dataStore);

    console.log("✅ Smart Autofill initialized");

    // Enhance existing inputs
    enhanceInputs();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Setup mutation observer for dynamic content
    setupMutationObserver();

    // Monitor input changes to update Fill All button
    setupInputMonitor();
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
