/**
 * Main content script entry point
 * Runs in the content-script isolated world; injects page-level code and relays messages to the extension.
 */

import { initializeAutofill } from '../lib/autofill';
import { injectPageScript } from './pageScriptInjector';

// ---------------------------
// Configuration
// ---------------------------
const BATCH_INTERVAL_MS = 120; // Collect messages briefly before sending to service worker
const MAX_BATCH_SIZE = 1000; // Guard against unbounded batch sizes

// ---------------------------
// Site filtering
// ---------------------------
function shouldSkipInjection(): boolean {
  try {
    const protocol = window.location.protocol;
    if (!protocol) return true;

    const blockedProtocols = [
      'chrome-extension:',
      'chrome:',
      'about:',
      'moz-extension:',
      'edge:',
      'devtools:',
    ];

    if (blockedProtocols.includes(protocol)) return true;

    // You can add host-based skips if needed:
    // if (window.location.hostname.endsWith('example.com')) return true;

    return false;
  } catch (e) {
    return true;
  }
}

// ---------------------------
// Message batching & relay
// ---------------------------
interface DevConsoleMessage {
  __devConsole: true;
  type: 'DEVCONSOLE_LOG' | 'DEVCONSOLE_NETWORK';
  payload: any;
}

function setupMessageRelay() {
  let messageBuffer: DevConsoleMessage[] = [];
  let batchTimer: number | null = null;

  window.addEventListener('message', (event) => {
    // Only accept messages from the page itself carrying our marker
    if (event.source !== window) return;

    const data = event.data as DevConsoleMessage;
    if (!data || data.__devConsole !== true) return;

    // Transform message types for background script compatibility
    let transformedData: any;
    
    if (data.type === 'DEVCONSOLE_LOG') {
      // Transform to CONSOLE_LOG format expected by background
      transformedData = {
        type: 'CONSOLE_LOG',
        payload: data.payload
      };
    } else if (data.type === 'DEVCONSOLE_NETWORK') {
      // Transform to NETWORK_REQUEST format expected by background
      transformedData = {
        type: 'NETWORK_REQUEST',
        payload: data.payload
      };
    } else {
      transformedData = data;
    }

    // Redact sensitive data from network requests
    if (data.type === 'DEVCONSOLE_NETWORK') {
      if (transformedData.payload.requestBody && typeof transformedData.payload.requestBody === 'object') {
        redactSensitiveData(transformedData.payload.requestBody);
      }
      if (transformedData.payload.responseBody && typeof transformedData.payload.responseBody === 'object') {
        redactSensitiveData(transformedData.payload.responseBody);
      }
    }

    messageBuffer.push(transformedData);

    // Start batch timer if not already running
    if (!batchTimer) {
      batchTimer = window.setTimeout(() => {
        flushMessageBuffer();
      }, BATCH_INTERVAL_MS);
    }
  });

  function flushMessageBuffer() {
    if (messageBuffer.length === 0) {
      batchTimer = null;
      return;
    }

    const payload = messageBuffer.slice(0, MAX_BATCH_SIZE);
    messageBuffer = [];
    batchTimer = null;

    try {
      if (chrome?.runtime?.id) {
        chrome.runtime.sendMessage(
          { type: 'DEVCONSOLE_BATCH', payload },
          () => {
            // Ignore response, just prevent unchecked lastError
            if (chrome.runtime.lastError) {
              // Extension context may be invalidated, silently ignore
            }
          }
        );
      }
    } catch (e) {
      // Extension might be disabled or context invalidated; swallow error
      console.debug('[DevConsole] sendMessage failed:', (e as Error)?.message);
    }
  }

  // Redact sensitive field values
  function redactSensitiveData(obj: any) {
    try {
      const suspiciousPattern = /pass|pwd|token|secret|auth|cookie|authorization|ssn|credit|api[_-]?key/i;

      function walkObject(o: any) {
        if (!o || typeof o !== 'object') return;

        for (const key of Object.keys(o)) {
          try {
            if (suspiciousPattern.test(key)) {
              o[key] = '[REDACTED]';
            } else if (typeof o[key] === 'object' && o[key] !== null) {
              walkObject(o[key]);
            }
          } catch (e) {
            // Ignore property access errors
          }
        }
      }

      walkObject(obj);
    } catch (e) {
      // Ignore redaction errors
    }
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    try {
      if (chrome?.runtime?.id) {
        chrome.runtime.sendMessage({ type: 'DEVCONSOLE_UNLOAD' });
      }
    } catch (e) {
      // Ignore errors during unload
    }
  });
}

// ---------------------------
// Initialize
// ---------------------------
if (!shouldSkipInjection()) {
  console.log('[DevConsole] 🚀 Initializing DevConsole content script...');
  injectPageScript();
  setupMessageRelay();
  
  // Initialize autofill feature
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeAutofill();
    });
  } else {
    initializeAutofill();
  }
  
  console.log('[DevConsole] ✅ Content script initialized - relay active + autofill enabled');
} else {
  console.log('[DevConsole] ⏭️  Injection skipped for this origin');
}

export { };
