// Content-script network interceptor for Chrome Extension
// Sends captured network activity to the background script via chrome.runtime.sendMessage

// We only import types from the devConsole store utils for typing convenience
import type { NetworkRequest } from "../background/index";

let isIntercepting = false;
const originalFetch = window.fetch;
const OriginalXHR = window.XMLHttpRequest;

function parseGraphQLOperation(body: any): { isGraphQL: boolean; operationName?: string; operationType?: string } {
  try {
    if (typeof body === "string") body = JSON.parse(body);

    if (body && body.query) {
      const queryMatch = body.query.match(/(query|mutation|subscription)\s+(\w+)/);
      return {
        isGraphQL: true,
        operationType: queryMatch?.[1],
        operationName: queryMatch?.[2] || body.operationName,
      };
    }
  } catch (e) {
    // ignore
  }

  return { isGraphQL: false };
}

function safeParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

function sendNetworkMessage(payload: any) {
  try {
    // Check if extension context is still valid
    if (chrome && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ type: "NETWORK_REQUEST", payload }).catch((error) => {
        if (error.message && error.message.includes('Extension context invalidated')) {
          // Extension was reloaded, uninstall interceptor
          uninstallNetworkInterceptor();
        }
      });
    }
  } catch (e) {
    // chrome may not be available in some environments
  }
}

function installFetchInterceptor() {
  // @ts-ignore
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const [resource, config] = args;
    const url = typeof resource === "string" ? resource : resource instanceof Request ? resource.url : String(resource);
    const method = (config && (config as any).method) || "GET";
    const startTime = performance.now();

    // Try to parse request body
    let requestBody: any = undefined;
    try {
      if (config && (config as any).body) {
        requestBody = typeof (config as any).body === "string" ? JSON.parse((config as any).body) : (config as any).body;
      }
    } catch (e) {
      requestBody = (config as any).body;
    }

    const graphqlInfo = parseGraphQLOperation(requestBody);

    try {
      const response = await originalFetch(...args);
      const duration = performance.now() - startTime;

      const responseClone = response.clone();
      let responseBody: any;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          responseBody = await responseClone.json();
        } else {
          responseBody = await responseClone.text();
        }
      } catch (e) {
        responseBody = "[Unable to parse response]";
      }

      const requestHeaders: Record<string, string> = {};
      if (config && (config as any).headers) {
        const headers = (config as any).headers;
        if (headers instanceof Headers) {
          headers.forEach((v: string, k: string) => (requestHeaders[k] = v));
        } else if (typeof headers === "object") {
          Object.assign(requestHeaders, headers);
        }
      }

      const responseHeaders: Record<string, string> = {};
      try {
        response.headers.forEach((v, k) => (responseHeaders[k] = v));
      } catch (e) {
        // ignore
      }

      const payload = {
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        duration,
        requestHeaders,
        requestBody,
        responseHeaders,
        responseBody,
        type: graphqlInfo.isGraphQL ? "graphql" : "fetch",
        timestamp: Date.now(),
      };

      sendNetworkMessage(payload);
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      const payload = {
        method,
        url,
        duration,
        requestBody,
        error: error instanceof Error ? error.message : String(error),
        type: graphqlInfo.isGraphQL ? "graphql" : "fetch",
        timestamp: Date.now(),
      };
      sendNetworkMessage(payload);
      throw error;
    }
  };
}

function installXHRInterceptor() {
  // @ts-ignore
  // Keep OriginalXHR reference
  // @ts-ignore
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();

    let method = "GET";
    let url = "";
    let requestBody: any = undefined;
    let startTime = 0;

    const originalOpen = xhr.open;
    xhr.open = function (m: string, u: string, ...rest: any[]) {
      method = m;
      url = u;
      return originalOpen.apply(this, [m, u, ...rest]);
    } as any;

    const originalSend = xhr.send;
    xhr.send = function (body?: any) {
      requestBody = body;
      startTime = performance.now();
      return originalSend.apply(this, [body]);
    } as any;

    xhr.addEventListener("load", function () {
      const duration = performance.now() - startTime;

      let responseBody: any;
      try {
        responseBody = safeParseJSON(xhr.responseText);
      } catch (e) {
        responseBody = xhr.responseText;
      }

      const responseHeaders: Record<string, string> = {};
      try {
        const headersString = xhr.getAllResponseHeaders();
        headersString.split("\r\n").forEach((line) => {
          const [k, ...rest] = line.split(": ");
          if (k) responseHeaders[k] = rest.join(": ");
        });
      } catch (e) {
        // ignore
      }

      const payload = {
        method,
        url,
        status: xhr.status,
        statusText: xhr.statusText,
        duration,
        requestHeaders: {},
        requestBody,
        responseHeaders,
        responseBody,
        type: "xhr",
        timestamp: Date.now(),
      };

      sendNetworkMessage(payload);
    });

    xhr.addEventListener("error", function () {
      const duration = performance.now() - startTime;
      const payload = {
        method,
        url,
        duration,
        requestBody,
        error: "Network request failed",
        type: "xhr",
        timestamp: Date.now(),
      };
      sendNetworkMessage(payload);
    });

    return xhr;
  } as any;

  // Preserve prototype
  // @ts-ignore
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;
}

export function installNetworkInterceptor() {
  if (isIntercepting) return;
  isIntercepting = true;
  installFetchInterceptor();
  installXHRInterceptor();
  console.info("%c🌐 DevConsole", "color: #3B82F6; font-weight: bold; font-size: 14px;", "Network interceptor installed (content script)");
}

export function uninstallNetworkInterceptor() {
  if (!isIntercepting) return;
  // @ts-ignore
  window.fetch = originalFetch;
  // @ts-ignore
  window.XMLHttpRequest = OriginalXHR;
  isIntercepting = false;
}

// Auto-install when loaded
installNetworkInterceptor();

export {};
