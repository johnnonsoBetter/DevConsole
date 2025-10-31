// Console interceptor for Chrome Extension
// Adapted from the original in-app version to send messages to background script

import type { LogLevel } from "../utils/stores/devConsole";

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
let isCapturing = false;

/**
 * Parse error stack to extract source location
 */
function parseErrorStack(stack?: string) {
  if (!stack) return undefined;

  const lines = stack.split("\n");
  
  // Find first non-interceptor line
  for (const line of lines) {
    // Skip chrome-extension:// URLs and internal files
    if (
      line.includes("chrome-extension://") ||
      line.includes("consoleInterceptor") ||
      line.includes("node_modules")
    ) {
      continue;
    }

    // Extract file:line:column
    const match = line.match(/\((.*):(\d+):(\d+)\)/) || line.match(/at (.*):(\d+):(\d+)/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
      };
    }
  }
}

/**
 * Capture a console log and send to background script
 */
function captureLog(level: LogLevel, args: any[]) {
  if (isCapturing) return;
  isCapturing = true;

  try {
    const stack = new Error().stack;
    const source = parseErrorStack(stack);

    // Serialize arguments (handle circular references)
    const serializedArgs = args.map((arg) => {
      try {
        if (arg instanceof Error) {
          return {
            __type: "Error",
            message: arg.message,
            stack: arg.stack,
            name: arg.name,
          };
        }
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return String(arg);
      }
    });

    // Send message to background script via Chrome runtime
    chrome.runtime.sendMessage({
      type: "CONSOLE_LOG",
      payload: {
        level,
        args: serializedArgs,
        timestamp: Date.now(),
        source,
      },
    }).catch(() => {
      // Extension context might not be available yet
    });
  } finally {
    isCapturing = false;
  }
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
    "Console interceptor installed (Chrome Extension)"
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

// Auto-install when loaded
installConsoleInterceptor();
