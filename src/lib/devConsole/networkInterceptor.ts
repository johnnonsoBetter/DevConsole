// ============================================================================
// NETWORK INTERCEPTOR
// Intercepts fetch and XMLHttpRequest to capture network activity
// ============================================================================

// Storage key for capture settings
const CAPTURE_SETTINGS_KEY = 'devConsole_captureSettings';

// Interface for capture settings stored in chrome.storage
interface CaptureSettings {
  captureNetwork: boolean;
}

// Cache for capture settings
let captureSettings: CaptureSettings = { captureNetwork: true };

// Load capture settings from chrome.storage
async function loadCaptureSettings() {
  try {
    const result = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
    captureSettings = result[CAPTURE_SETTINGS_KEY] || { captureNetwork: true };
  } catch (error) {
    console.warn('[DevConsole] Could not load capture settings:', error);
  }
}

// Listen for changes to capture settings
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[CAPTURE_SETTINGS_KEY]) {
      captureSettings = changes[CAPTURE_SETTINGS_KEY].newValue || { captureNetwork: true };
    }
  });
  // Initial load
  loadCaptureSettings();
}

let isIntercepting = false;
const originalFetch = window.fetch;
const OriginalXHR = window.XMLHttpRequest;

/**
 * Parse GraphQL operation from request
 */
function parseGraphQLOperation(body: any): {
  isGraphQL: boolean;
  operationName?: string;
  operationType?: string;
} {
  try {
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    if (body.query) {
      // Extract operation name and type from GraphQL query
      const queryMatch = body.query.match(/(query|mutation|subscription)\s+(\w+)/);
      return {
        isGraphQL: true,
        operationType: queryMatch?.[1],
        operationName: queryMatch?.[2] || body.operationName,
      };
    }
  } catch (e) {
    // Not GraphQL or parsing failed
  }

  return { isGraphQL: false };
}

/**
 * Install fetch interceptor
 */
function installFetchInterceptor() {
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    // Check if we should capture this request (using cached settings)
    if (!captureSettings.captureNetwork) {
      return originalFetch(...args);
    }

    const [resource, config] = args;
    const url = typeof resource === "string"
      ? resource
      : resource instanceof Request
        ? resource.url
        : resource.toString();
    const method = config?.method || "GET";
    const startTime = performance.now();

    // Parse request body
    let requestBody: any;
    try {
      if (config?.body) {
        requestBody =
          typeof config.body === "string" ? JSON.parse(config.body) : config.body;
      }
    } catch (e) {
      requestBody = config?.body;
    }

    // Check if GraphQL
    const graphqlInfo = parseGraphQLOperation(requestBody);

    try {
      const response = await originalFetch(...args);
      const duration = performance.now() - startTime;

      // Clone response to read body without consuming it
      const responseClone = response.clone();
      let responseBody: any;

      try {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          responseBody = await responseClone.json();
        } else {
          responseBody = await responseClone.text();
        }
      } catch (e) {
        responseBody = "[Unable to parse response]";
      }

      // Extract headers
      const requestHeaders: Record<string, string> = {};
      if (config?.headers) {
        if (config.headers instanceof Headers) {
          config.headers.forEach((value, key) => {
            requestHeaders[key] = value;
          });
        } else {
          Object.assign(requestHeaders, config.headers);
        }
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Send network request via window message for content script relay
      try {
        window.postMessage({
          __devConsole: true,
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            method,
            url,
            status: response.status,
            statusText: response.statusText,
            duration,
            timestamp: Date.now(),
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody,
            type: graphqlInfo.isGraphQL ? "graphql" : "fetch",
          }
        }, '*');
      } catch (messagingError) {
        // If messaging fails, silently ignore
      }

      // Log GraphQL operations specially
      if (graphqlInfo.isGraphQL) {
        const success = response.ok && !responseBody.errors;
        console.api(
          `${success ? "✓" : "✗"} ${graphqlInfo.operationType?.toUpperCase()} ${graphqlInfo.operationName}`,
          {
            duration: `${duration.toFixed(2)}ms`,
            status: response.status,
            variables: requestBody.variables,
            errors: responseBody.errors,
          }
        );
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Send error via window message for content script relay
      try {
        window.postMessage({
          __devConsole: true,
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            method,
            url,
            duration,
            timestamp: Date.now(),
            requestBody,
            error: error instanceof Error ? error.message : String(error),
            type: graphqlInfo.isGraphQL ? "graphql" : "fetch",
          }
        }, '*');
      } catch (messagingError) {
        // If messaging fails, silently ignore
      }

      throw error;
    }
  };
}

/**
 * Install XMLHttpRequest interceptor
 */
function installXHRInterceptor() {
  // @ts-ignore
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    
    // Check if we should capture - if not, return original XHR (using cached settings)
    if (!captureSettings.captureNetwork) {
      return xhr;
    }    let method = "GET";
    let url = "";
    let requestBody: any;
    let startTime: number;

    // Intercept open
    const originalOpen = xhr.open;
    xhr.open = function (m: string, u: string, async: boolean = true, ...args: any[]) {
      method = m;
      url = u;
      return originalOpen.call(this, m, u, async, ...args);
    };

    // Intercept send
    const originalSend = xhr.send;
    xhr.send = function (body?: any) {
      requestBody = body;
      startTime = performance.now();
      return originalSend.apply(this, [body]);
    };

    // Intercept load
    xhr.addEventListener("load", function () {
      const duration = performance.now() - startTime;

      let responseBody: any;
      try {
        responseBody = JSON.parse(xhr.responseText);
      } catch (e) {
        responseBody = xhr.responseText;
      }

      // Parse request headers
      const requestHeaders: Record<string, string> = {};

      // Parse response headers
      const responseHeaders: Record<string, string> = {};
      const headersString = xhr.getAllResponseHeaders();
      headersString.split("\r\n").forEach((line) => {
        const [key, value] = line.split(": ");
        if (key) responseHeaders[key] = value;
      });

      // Send network request via window message for content script relay
      try {
        window.postMessage({
          __devConsole: true,
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            method,
            url,
            status: xhr.status,
            statusText: xhr.statusText,
            duration,
            timestamp: Date.now(),
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody,
            type: "xhr",
          }
        }, '*');
      } catch (messagingError) {
        // If messaging fails, silently ignore
      }
    });

    // Intercept error
    xhr.addEventListener("error", function () {
      const duration = performance.now() - startTime;

      // Send error via window message for content script relay
      try {
        window.postMessage({
          __devConsole: true,
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            method,
            url,
            duration,
            timestamp: Date.now(),
            requestBody,
            error: "Network request failed",
            type: "xhr",
          }
        }, '*');
      } catch (messagingError) {
        // If messaging fails, silently ignore
      }
    });

    return xhr;
  };

  // Preserve XMLHttpRequest prototype
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;
}

/**
 * Install network interceptors
 */
export function installNetworkInterceptor() {
  if (isIntercepting) return;

  isIntercepting = true;

  installFetchInterceptor();
  installXHRInterceptor();

  console.info(
    "%c🌐 DevConsole",
    "color: #3B82F6; font-weight: bold; font-size: 14px;",
    "Network interceptor installed."
  );
}

/**
 * Uninstall network interceptors
 */
export function uninstallNetworkInterceptor() {
  if (!isIntercepting) return;

  window.fetch = originalFetch;
  window.XMLHttpRequest = OriginalXHR;

  isIntercepting = false;
}

/**
 * Check if interceptor is active
 */
export function isNetworkInterceptorActive() {
  return isIntercepting;
}
