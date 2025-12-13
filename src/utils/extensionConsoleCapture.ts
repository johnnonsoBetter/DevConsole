/**
 * Extension Page Console Capture
 * 
 * This module captures console logs from extension pages (like video call popup)
 * which are not covered by content scripts with <all_urls>.
 * 
 * It intercepts console methods and:
 * 1. Adds logs directly to the local Zustand store (for embedded DevConsole panels)
 * 2. Sends logs to the background service worker (for DevTools panel)
 */

import { useDevConsoleStore } from './stores/devConsole';

// Save original console methods
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
  group: console.group.bind(console),
  groupEnd: console.groupEnd.bind(console),
  groupCollapsed: console.groupCollapsed.bind(console),
  table: console.table.bind(console),
  time: console.time.bind(console),
  timeEnd: console.timeEnd.bind(console),
  timeLog: console.timeLog.bind(console),
  count: console.count.bind(console),
  countReset: console.countReset.bind(console),
  trace: console.trace.bind(console),
  assert: console.assert.bind(console),
  clear: console.clear.bind(console),
};

// Configuration
const CONFIG = {
  MAX_SERIALIZATION_DEPTH: 10,
  MAX_OBJECT_PROPERTIES: 100,
  BATCH_INTERVAL_MS: 100,
  MAX_BATCH_SIZE: 50,
};

// Message buffer for batching (for background)
let messageBuffer: any[] = [];
let batchTimer: number | null = null;
let isInitialized = false;

/**
 * Serialize a value for transmission
 */
function serializeArg(val: any, seen = new WeakSet(), depth = 0): any {
  try {
    if (depth > CONFIG.MAX_SERIALIZATION_DEPTH) {
      return '[Max depth reached]';
    }

    if (val === null) return null;
    if (val === undefined) return undefined;

    const type = typeof val;

    if (type === 'string' || type === 'number' || type === 'boolean') {
      return val;
    }

    if (type === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`;
    }

    if (type === 'symbol') {
      return val.toString();
    }

    if (val instanceof Error) {
      return {
        __type: 'Error',
        name: val.name,
        message: val.message,
        stack: val.stack,
      };
    }

    if (val instanceof Date) {
      return { __type: 'Date', value: val.toISOString() };
    }

    if (val instanceof RegExp) {
      return { __type: 'RegExp', value: val.toString() };
    }

    if (val instanceof Node) {
      return `[Node: ${val.nodeName || 'unknown'}]`;
    }

    if (ArrayBuffer.isView(val) || val instanceof ArrayBuffer) {
      return `[ArrayBuffer ${(val as any).byteLength || 0} bytes]`;
    }

    if (val instanceof Blob) {
      return `[Blob ${val.type || 'unknown'} ${val.size || 0} bytes]`;
    }

    if (val instanceof Map) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      const obj: Record<string, any> = {};
      let count = 0;
      for (const [k, v] of val.entries()) {
        if (count++ >= CONFIG.MAX_OBJECT_PROPERTIES) {
          obj['__truncated'] = `... ${val.size - count + 1} more entries`;
          break;
        }
        obj[String(k)] = serializeArg(v, seen, depth + 1);
      }
      return { __type: 'Map', value: obj };
    }

    if (val instanceof Set) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      const arr = Array.from(val);
      if (arr.length > CONFIG.MAX_OBJECT_PROPERTIES) {
        return {
          __type: 'Set',
          value: arr.slice(0, CONFIG.MAX_OBJECT_PROPERTIES)
            .map(v => serializeArg(v, seen, depth + 1))
            .concat([`... ${arr.length - CONFIG.MAX_OBJECT_PROPERTIES} more items`]),
        };
      }
      return { __type: 'Set', value: arr.map(v => serializeArg(v, seen, depth + 1)) };
    }

    if (Array.isArray(val)) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      if (val.length > CONFIG.MAX_OBJECT_PROPERTIES) {
        return val.slice(0, CONFIG.MAX_OBJECT_PROPERTIES)
          .map(v => serializeArg(v, seen, depth + 1))
          .concat([`... ${val.length - CONFIG.MAX_OBJECT_PROPERTIES} more items`]);
      }
      return val.map(v => serializeArg(v, seen, depth + 1));
    }

    if (type === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);

      const out: Record<string, any> = {};
      const keys = Object.keys(val);
      let count = 0;

      for (const k of keys) {
        if (count++ >= CONFIG.MAX_OBJECT_PROPERTIES) {
          out['__truncated'] = `... ${keys.length - count + 1} more properties`;
          break;
        }
        try {
          out[k] = serializeArg(val[k], seen, depth + 1);
        } catch {
          out[k] = '[Unserializable]';
        }
      }
      return out;
    }

    return String(val);
  } catch (e) {
    return `[SerializeError: ${e instanceof Error ? e.message : String(e)}]`;
  }
}

/**
 * Get stack trace for source location
 */
function getStackTrace(): { file?: string; line?: number; column?: number; raw?: string } | undefined {
  try {
    const e = new Error();
    const raw = e.stack || '';
    if (!raw) return undefined;

    const lines = raw.split('\n').map(l => l.trim());

    const skipPatterns = [
      /extensionConsoleCapture/i,
      /postConsoleLog/i,
      /<anonymous>/,
      /\(native\)/,
      /^Error$/,
    ];

    for (const ln of lines) {
      if (!ln) continue;
      if (skipPatterns.some(p => p.test(ln))) continue;

      // Try to parse the stack frame
      const patterns = [
        /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
        /at\s+(.+?):(\d+):(\d+)/,
        /(.+?)@(.+?):(\d+):(\d+)/,
      ];

      for (const pattern of patterns) {
        const match = ln.match(pattern);
        if (match) {
          const file = match[2] || match[1];
          const line = parseInt(match[3] || match[2], 10);
          const column = parseInt(match[4] || match[3], 10);

          if (file && !isNaN(line)) {
            return { file: file.trim(), line, column, raw: ln };
          }
        }
      }
    }

    return { raw };
  } catch {
    return undefined;
  }
}

/**
 * Send buffered messages to background
 */
function flushMessageBuffer() {
  if (messageBuffer.length === 0) return;

  const messages = [...messageBuffer];
  messageBuffer = [];
  batchTimer = null;

  // Send as batch
  try {
    chrome.runtime.sendMessage({
      type: 'DEVCONSOLE_BATCH',
      payload: messages,
    }).catch(() => {
      // Silently fail if background is not available
    });
  } catch {
    // Extension context invalidated, ignore
  }
}

/**
 * Format a log message from args array
 */
function formatLogMessage(args: any[]): string {
  if (!args || args.length === 0) return '';
  
  return args.map(arg => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Queue a log message for sending
 */
function queueLogMessage(level: string, args: any[]) {
  const serializedArgs = args.map(a => serializeArg(a));
  const source = getStackTrace();
  const timestamp = Date.now();
  
  // Add directly to the local Zustand store for embedded DevConsole panels
  try {
    const store = useDevConsoleStore.getState();
    store.addLog({
      level: level as any,
      message: formatLogMessage(serializedArgs),
      args: serializedArgs,
      source,
      context: 'extension',
    });
  } catch (e) {
    // Store might not be available, continue to background sending
  }
  
  // Also queue for background service worker (for DevTools panels)
  const payload = {
    type: 'CONSOLE_LOG',
    payload: {
      level,
      args: serializedArgs,
      timestamp,
      source,
      context: 'extension', // Mark as coming from extension page
    },
  };

  messageBuffer.push(payload);

  // Flush immediately for errors/warnings or if batch is full
  if (level === 'error' || level === 'warn' || messageBuffer.length >= CONFIG.MAX_BATCH_SIZE) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    flushMessageBuffer();
  } else if (!batchTimer) {
    batchTimer = window.setTimeout(flushMessageBuffer, CONFIG.BATCH_INTERVAL_MS);
  }
}

/**
 * Initialize console capture for extension pages
 * Call this at the entry point of extension pages that need log capture
 */
export function initExtensionConsoleCapture(): void {
  if (isInitialized) {
    originalConsole.debug('[ExtensionConsoleCapture] Already initialized');
    return;
  }

  // Only run in extension context
  if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
    originalConsole.warn('[ExtensionConsoleCapture] Not in extension context');
    return;
  }

  isInitialized = true;

  // Override basic console methods
  (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((level) => {
    const orig = originalConsole[level];
    (console as any)[level] = function (...args: any[]) {
      queueLogMessage(level, args);
      orig.apply(console, args);
    };
  });

  // Override group methods
  (['group', 'groupEnd', 'groupCollapsed'] as const).forEach((level) => {
    const orig = originalConsole[level];
    (console as any)[level] = function (...args: any[]) {
      queueLogMessage(level, args);
      orig.apply(console, args);
    };
  });

  // Override other console methods
  console.table = function (data?: any, columns?: string[]) {
    queueLogMessage('table', [data, columns]);
    originalConsole.table(data, columns);
  };

  console.time = function (label?: string) {
    queueLogMessage('time', [label]);
    originalConsole.time(label);
  };

  console.timeEnd = function (label?: string) {
    queueLogMessage('timeEnd', [label]);
    originalConsole.timeEnd(label);
  };

  console.timeLog = function (label?: string, ...data: any[]) {
    queueLogMessage('timeLog', [label, ...data]);
    originalConsole.timeLog(label, ...data);
  };

  console.count = function (label?: string) {
    queueLogMessage('count', [label]);
    originalConsole.count(label);
  };

  console.countReset = function (label?: string) {
    queueLogMessage('countReset', [label]);
    originalConsole.countReset(label);
  };

  console.trace = function (...args: any[]) {
    queueLogMessage('trace', args);
    originalConsole.trace(...args);
  };

  console.assert = function (condition: any, ...args: any[]) {
    if (!condition) {
      queueLogMessage('assert', args);
    }
    originalConsole.assert(condition, ...args);
  };

  console.clear = function () {
    queueLogMessage('clear', []);
    originalConsole.clear();
  };

  originalConsole.info(
    '%c🔧 DevConsole Extension Page Capture Active',
    'color:#9E7AFF;font-weight:bold;',
    'Console logs will be captured.'
  );
}

/**
 * Restore original console methods
 */
export function restoreExtensionConsole(): void {
  if (!isInitialized) return;

  Object.assign(console, originalConsole);
  isInitialized = false;

  originalConsole.info(
    '%c🔧 DevConsole Extension Page Capture Restored',
    'color:#10b981;font-weight:bold;',
    'Original console methods restored.'
  );
}
