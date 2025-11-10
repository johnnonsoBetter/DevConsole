import type { LogLevel } from "../../utils/stores/devConsole";

// ============================================================================
// CONSOLE INTERCEPTOR
// Monkey-patches native console methods to capture logs
// ============================================================================

// Storage key for capture settings
const CAPTURE_SETTINGS_KEY = 'devConsole_captureSettings';

// Interface for capture settings stored in chrome.storage
interface CaptureSettings {
  captureConsole: boolean;
}

// Cache for capture settings
let captureSettings: CaptureSettings = { captureConsole: true };

// Load capture settings from chrome.storage
async function loadCaptureSettings() {
  try {
    const result = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
    captureSettings = result[CAPTURE_SETTINGS_KEY] || { captureConsole: true };
  } catch (error) {
    console.warn('[DevConsole] Could not load capture settings:', error);
  }
}

// Listen for changes to capture settings
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
      captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || { captureConsole: true };
    }
  });
  // Initial load
  loadCaptureSettings();
}

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Custom console methods
const customConsole = {
  ui: (...args: any[]) => {
    originalConsole.log("%c[UI]", "color: #9E7AFF; font-weight: bold;", ...args);
    captureLog("ui", args);
  },
  db: (...args: any[]) => {
    originalConsole.log("%c[DB]", "color: #10B981; font-weight: bold;", ...args);
    captureLog("db", args);
  },
  api: (...args: any[]) => {
    originalConsole.log("%c[API]", "color: #3B82F6; font-weight: bold;", ...args);
    captureLog("api", args);
  },
};

// Extend global console interface
declare global {
  interface Console {
    ui: (...args: any[]) => void;
    db: (...args: any[]) => void;
    api: (...args: any[]) => void;
  }
}

let isIntercepting = false;
let isCapturing = false; // Prevent recursive logging

/**
 * Parse error stack to extract source location
 * Filters out interceptor and internal framework code
 */
function parseErrorStack(stack?: string) {
  if (!stack) return undefined;

  const lines = stack.split("\n");

  // Files to exclude from stack trace (interceptor and framework internals)
  const excludePatterns = [
    'consoleInterceptor',
    'networkInterceptor',
    'node_modules',
    'webpack',
    'react-dom',
    'react-refresh',
  ];

  // Find first line that's actual user code
  const relevantLine = lines.find((line) => {
    // Must be a source file
    const isSourceFile = line.includes(".tsx") ||
      line.includes(".ts") ||
      line.includes(".jsx") ||
      line.includes(".js");

    if (!isSourceFile) return false;

    // Must not match any exclude patterns
    const isExcluded = excludePatterns.some(pattern => line.includes(pattern));

    return !isExcluded;
  });

  if (!relevantLine) return undefined;

  // Parse file:line:column from stack trace
  const match = relevantLine.match(/\((.+):(\d+):(\d+)\)/) ||
    relevantLine.match(/at\s+(.+):(\d+):(\d+)/);

  if (match) {
    const fullPath = match[1];
    const fileName = fullPath.split("/").pop() || fullPath;

    return {
      file: fileName,
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
    };
  }

  return undefined;
}

/**
 * Clean stack trace to remove interceptor and framework noise
 */
function cleanStackTrace(stack?: string): string | undefined {
  if (!stack) return undefined;

  const lines = stack.split("\n");

  // Patterns to exclude
  const excludePatterns = [
    'consoleInterceptor',
    'networkInterceptor',
    'captureLog',
    'node_modules',
  ];

  // Keep only user code lines
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();

    // Remove the "Error" header line
    if (trimmed === 'Error') return false;

    // Keep non-stack-trace lines (like error messages)
    if (!trimmed.startsWith('at ')) return false;

    // Filter out excluded patterns
    return !excludePatterns.some(pattern => line.includes(pattern));
  });

  return cleanedLines.length > 0 ? cleanedLines.join("\n") : undefined;
}

/**
 * Capture and store console log
 */
function captureLog(level: LogLevel, args: any[]) {
  // Prevent recursive logging
  if (isCapturing) return;

  // Check if capturing is enabled (using cached settings)
  if (!captureSettings.captureConsole) return;

  // Set flag to prevent recursion
  isCapturing = true;

  try {
    // Generate stack trace for source location
    const error = new Error();
    const source = parseErrorStack(error.stack);
    const cleanedStack = cleanStackTrace(error.stack);

    // Format message
    let message = "";
    try {
      message = args
        .map((arg) => {
          if (typeof arg === "object") {
            // Safe JSON stringify with circular reference handling
            try {
              return JSON.stringify(arg, getCircularReplacer(), 2);
            } catch (jsonError) {
              // If JSON.stringify fails, try toString
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");
    } catch (e) {
      message = "[Unable to serialize arguments]";
    }

    // Send log to background script or devtools via chrome.runtime messaging
    try {
      chrome.runtime.sendMessage({
        type: 'CONSOLE_LOG',
        payload: {
          level,
          message,
          args,
          stack: cleanedStack,
          source,
        }
      });
    } catch (messagingError) {
      // If messaging fails, fall back to logging to console
      originalConsole.warn('[DevConsole] Failed to send log message:', messagingError);
    }
  } catch (error) {
    // Silently fail to prevent error loops
    // Use original console to log the issue without triggering interception
    originalConsole.error('[DevConsole] Failed to capture log:', error);
  } finally {
    // Always reset the flag
    isCapturing = false;
  }
}

/**
 * Helper to handle circular references in JSON.stringify
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular Reference]";
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Install console interceptors
 */
export function installConsoleInterceptor() {
  if (isIntercepting) return;



  isIntercepting = true;

  // Intercept standard console methods
  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    captureLog("log", args);
  };

  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    captureLog("info", args);
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    captureLog("warn", args);
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    captureLog("error", args);
  };

  console.debug = (...args: any[]) => {
    originalConsole.debug(...args);
    captureLog("debug", args);
  };

  // Add custom methods
  console.ui = customConsole.ui;
  console.db = customConsole.db;
  console.api = customConsole.api;

  console.info(
    "%c🔧 DevConsole",
    "color: #9E7AFF; font-weight: bold; font-size: 14px;",
    "Console interceptor installed. Press Ctrl+~ to open."
  );
}

/**
 * Uninstall console interceptors
 */
export function uninstallConsoleInterceptor() {
  if (!isIntercepting) return;

  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;

  // @ts-ignore
  delete console.ui;
  // @ts-ignore
  delete console.db;
  // @ts-ignore
  delete console.api;

  isIntercepting = false;
}

/**
 * Check if interceptor is active
 */
export function isConsoleInterceptorActive() {
  return isIntercepting;
}
