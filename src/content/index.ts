/**
 * Main content script entry point
 * Runs in the content-script isolated world; injects page-level code and relays messages to the extension.
 */

import { initializeAutofill } from "../lib/autofill";
import { injectPageScript } from "./pageScriptInjector";

// ---------------------------
// Configuration
// ---------------------------
const BATCH_INTERVAL_MS = 120; // Collect messages briefly before sending to service worker
const MAX_BATCH_SIZE = 1000; // Guard against unbounded batch sizes
const MAX_BATCH_BYTES = 512000; // 500KB max per batch to prevent oversized messages
const MAX_RETRY_ATTEMPTS = 3; // Number of retry attempts for failed sends
const RETRY_BASE_DELAY = 100; // Base delay for exponential backoff (ms)
const PRIORITY_BATCH_THRESHOLD = 5; // Send priority messages faster

// ---------------------------
// Site filtering
// ---------------------------
function shouldSkipInjection(): boolean {
  try {
    const protocol = window.location.protocol;
    if (!protocol) return true;

    const blockedProtocols = [
      "chrome-extension:",
      "chrome:",
      "about:",
      "moz-extension:",
      "edge:",
      "devtools:",
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
  type: "DEVCONSOLE_LOG" | "DEVCONSOLE_NETWORK";
  payload: any;
}

interface PriorityMessage {
  message: any;
  priority: "high" | "normal";
  retries: number;
}

function setupMessageRelay() {
  let messageBuffer: PriorityMessage[] = [];
  let batchTimer: number | null = null;
  let currentBatchSize = 0; // Track approximate batch size in bytes

  window.addEventListener("message", (event) => {
    // Only accept messages from the page itself carrying our marker
    if (event.source !== window) return;

    const data = event.data as DevConsoleMessage;
    if (!data || data.__devConsole !== true) return;

    // Transform message types for background script compatibility
    let transformedData: any;

    if (data.type === "DEVCONSOLE_LOG") {
      // Transform to CONSOLE_LOG format expected by background
      transformedData = {
        type: "CONSOLE_LOG",
        payload: data.payload,
      };
    } else if (data.type === "DEVCONSOLE_NETWORK") {
      // Transform to NETWORK_REQUEST format expected by background
      transformedData = {
        type: "NETWORK_REQUEST",
        payload: data.payload,
      };
    } else {
      transformedData = data;
    }

    // Enhanced redaction for sensitive data
    if (data.type === "DEVCONSOLE_NETWORK") {
      if (
        transformedData.payload.requestBody &&
        typeof transformedData.payload.requestBody === "object"
      ) {
        redactSensitiveData(transformedData.payload.requestBody);
      }
      if (
        transformedData.payload.responseBody &&
        typeof transformedData.payload.responseBody === "object"
      ) {
        redactSensitiveData(transformedData.payload.responseBody);
      }
      // Redact sensitive headers
      if (transformedData.payload.requestHeaders) {
        redactSensitiveHeaders(transformedData.payload.requestHeaders);
      }
      if (transformedData.payload.responseHeaders) {
        redactSensitiveHeaders(transformedData.payload.responseHeaders);
      }
    }

    // Estimate message size
    const messageSize = estimateMessageSize(transformedData);

    // Determine priority (errors and warnings get high priority)
    const isPriority =
      data.type === "DEVCONSOLE_LOG" &&
      (data.payload.level === "error" || data.payload.level === "warn");

    // Add to buffer with priority info
    messageBuffer.push({
      message: transformedData,
      priority: isPriority ? "high" : "normal",
      retries: 0,
    });

    currentBatchSize += messageSize;

    // Flush immediately if we have priority messages or batch is too large
    const priorityCount = messageBuffer.filter(
      (m) => m.priority === "high"
    ).length;
    const shouldFlushEarly =
      priorityCount >= PRIORITY_BATCH_THRESHOLD ||
      currentBatchSize >= MAX_BATCH_BYTES;

    if (shouldFlushEarly) {
      if (batchTimer) {
        window.clearTimeout(batchTimer);
        batchTimer = null;
      }
      flushMessageBuffer();
    } else if (!batchTimer) {
      // Start batch timer if not already running
      batchTimer = window.setTimeout(() => {
        flushMessageBuffer();
      }, BATCH_INTERVAL_MS);
    }
  });

  /**
   * Estimate the size of a message in bytes
   */
  function estimateMessageSize(message: any): number {
    try {
      return JSON.stringify(message).length * 2; // UTF-16 approximation
    } catch (e) {
      return 1000; // Fallback estimate
    }
  }

  /**
   * Send message with retry logic and exponential backoff
   */
  async function sendMessageWithRetry(
    payload: any[],
    attempt = 0
  ): Promise<boolean> {
    try {
      if (!chrome?.runtime?.id) return false;

      return await new Promise<boolean>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "DEVCONSOLE_BATCH", payload },
          () => {
            if (chrome.runtime.lastError) {
              // Extension context may be invalidated
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (e) {
      console.debug(
        `[DevConsole] sendMessage failed (attempt ${attempt + 1}):`,
        (e as Error)?.message
      );

      // Retry with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return sendMessageWithRetry(payload, attempt + 1);
      }

      return false;
    }
  }

  function flushMessageBuffer() {
    if (messageBuffer.length === 0) {
      batchTimer = null;
      currentBatchSize = 0;
      return;
    }

    // Sort by priority (high priority first)
    messageBuffer.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      return 0;
    });

    // Take batch up to size/count limits
    let batchBytes = 0;
    let batchCount = 0;
    const batch: any[] = [];

    for (const item of messageBuffer) {
      const msgSize = estimateMessageSize(item.message);
      if (
        batchCount < MAX_BATCH_SIZE &&
        batchBytes + msgSize < MAX_BATCH_BYTES
      ) {
        batch.push(item.message);
        batchBytes += msgSize;
        batchCount++;
      } else {
        break;
      }
    }

    // Remove sent messages from buffer
    messageBuffer = messageBuffer.slice(batchCount);
    currentBatchSize = messageBuffer.reduce(
      (sum, item) => sum + estimateMessageSize(item.message),
      0
    );
    batchTimer = null;

    // Send with retry logic (don't await to avoid blocking)
    sendMessageWithRetry(batch).catch(() => {
      // If all retries fail, try to re-queue high priority messages
      const failedHighPriority = batch
        .filter((msg) => {
          const isPriority =
            msg.type === "CONSOLE_LOG" &&
            (msg.payload?.level === "error" || msg.payload?.level === "warn");
          return isPriority;
        })
        .map((msg) => ({
          message: msg,
          priority: "high" as const,
          retries: 0,
        }));

      if (failedHighPriority.length > 0) {
        // Re-queue failed high priority messages (up to a limit)
        messageBuffer.unshift(...failedHighPriority.slice(0, 10));
        currentBatchSize = messageBuffer.reduce(
          (sum, item) => sum + estimateMessageSize(item.message),
          0
        );
      }
    });

    // Schedule next flush if buffer not empty
    if (messageBuffer.length > 0 && !batchTimer) {
      batchTimer = window.setTimeout(() => {
        flushMessageBuffer();
      }, BATCH_INTERVAL_MS);
    }
  }

  /**
   * Enhanced redaction for sensitive field values
   */
  function redactSensitiveData(obj: any) {
    try {
      // Expanded pattern to catch more sensitive data
      const suspiciousPattern =
        /pass(word)?|pwd|token|secret|auth|cookie|authorization|bearer|api[_-]?key|private[_-]?key|access[_-]?key|client[_-]?secret|session|ssn|social[_-]?security|credit[_-]?card|card[_-]?number|cvv|pin|account[_-]?number|routing[_-]?number/i;

      // Patterns for values that look sensitive (regardless of key name)
      const sensitiveValuePatterns = [
        /^[A-Za-z0-9_-]{20,}$/, // Long alphanumeric strings (likely tokens)
        /^sk_[a-z]+_[A-Za-z0-9]{20,}$/, // Stripe-like secret keys
        /^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT tokens
        /^ghp_[A-Za-z0-9]{36}$/, // GitHub personal access tokens
        /^xox[bp]-[A-Za-z0-9-]+$/, // Slack tokens
      ];

      function walkObject(o: any, depth = 0) {
        // Prevent infinite recursion
        if (depth > 10 || !o || typeof o !== "object") return;

        for (const key of Object.keys(o)) {
          try {
            const value = o[key];

            // Check key name
            if (suspiciousPattern.test(key)) {
              o[key] = "[REDACTED]";
              continue;
            }

            // Check value patterns for strings
            if (typeof value === "string" && value.length > 15) {
              for (const pattern of sensitiveValuePatterns) {
                if (pattern.test(value)) {
                  o[key] = "[REDACTED]";
                  break;
                }
              }
            }

            // Recurse for nested objects
            if (typeof value === "object" && value !== null) {
              walkObject(value, depth + 1);
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

  /**
   * Redact sensitive headers (Authorization, Cookie, etc.)
   */
  function redactSensitiveHeaders(headers: Record<string, any>) {
    try {
      const sensitiveHeaders = [
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "x-auth-token",
        "x-csrf-token",
        "x-access-token",
        "api-key",
        "apikey",
        "auth-token",
      ];

      for (const key of Object.keys(headers)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveHeaders.includes(lowerKey)) {
          headers[key] = "[REDACTED]";
        }
      }
    } catch (e) {
      // Ignore redaction errors
    }
  }

  // Immediate flush on beforeunload to prevent message loss
  window.addEventListener("beforeunload", () => {
    // Flush any pending messages immediately
    if (batchTimer) {
      window.clearTimeout(batchTimer);
      batchTimer = null;
    }

    if (messageBuffer.length > 0) {
      // Prioritize high-priority messages
      messageBuffer.sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (a.priority !== "high" && b.priority === "high") return 1;
        return 0;
      });

      // Take only what fits in size limits
      let batchBytes = 0;
      const payload: any[] = [];

      for (const item of messageBuffer) {
        if (payload.length >= MAX_BATCH_SIZE) break;

        const msgSize = estimateMessageSize(item.message);
        if (batchBytes + msgSize > MAX_BATCH_BYTES) break;

        payload.push(item.message);
        batchBytes += msgSize;
      }

      messageBuffer = [];
      currentBatchSize = 0;

      try {
        // Use sendMessage with synchronous approach
        if (chrome?.runtime?.id) {
          chrome.runtime.sendMessage(
            { type: "DEVCONSOLE_BATCH", payload },
            () => {
              if (chrome.runtime.lastError) {
                // Try sendBeacon as fallback for critical data
                try {
                  const blob = new Blob([JSON.stringify(payload)], {
                    type: "application/json",
                  });
                  navigator.sendBeacon?.("/devtools-log", blob);
                } catch (e) {
                  /* ignore */
                }
              }
            }
          );
        }
      } catch (e) {
        /* ignore */
      }
    }

    try {
      if (chrome?.runtime?.id) {
        chrome.runtime.sendMessage({ type: "DEVCONSOLE_UNLOAD" });
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
  console.log("[DevConsole] 🚀 Initializing DevConsole content script...");
  injectPageScript();
  setupMessageRelay();

  // Initialize autofill feature
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializeAutofill();
    });
  } else {
    initializeAutofill();
  }

  console.log(
    "[DevConsole] ✅ Content script initialized - relay active + autofill enabled"
  );
} else {
  console.log("[DevConsole] ⏭️  Injection skipped for this origin");
}

export {};
