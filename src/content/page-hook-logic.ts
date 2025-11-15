/**
 * Page-context injector: hooks console.*, fetch, and XMLHttpRequest
 * Designed to be injected directly into page context (not content-script context)
 */

(() => {
  "use strict";

  // Configuration (adjust if needed)
  const TRUNCATE_BODY_LEN = 20000;
  const MAX_SERIALIZATION_DEPTH = 10;
  const MAX_MESSAGE_SIZE_BYTES = 1048576; // 1MB per message
  const MAX_OBJECT_PROPERTIES = 100;

  // Runtime state
  let captureEnabled = true;
  let liveObjectCache = new WeakMap<any, string>();
  let messageCount = 0;
  let totalMessageSize = 0;
  const MAX_TOTAL_SIZE = 52428800; // 50MB total

  // ---------------------------
  // Helpers
  // ---------------------------
  function safeTypeOf(v: any): string {
    if (v === null) return "null";
    if (typeof v === "object") {
      if (Array.isArray(v)) return "array";
      if (v instanceof Error) return "error";
      if (v instanceof FormData) return "formdata";
      if (v instanceof URLSearchParams) return "urlsearchparams";
      if (v instanceof Blob) return "blob";
      if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer)
        return "arraybuffer";
      if (v instanceof Map) return "map";
      if (v instanceof Set) return "set";
      if (v instanceof Node) return "node";
      return "object";
    }
    return typeof v;
  }

  function serializeArg(val: any, seen = new WeakSet(), depth = 0): any {
    try {
      // Recursion guard
      if (depth > MAX_SERIALIZATION_DEPTH) {
        return "[Max depth reached]";
      }

      const t = safeTypeOf(val);
      if (
        t === "null" ||
        t === "number" ||
        t === "string" ||
        t === "boolean" ||
        t === "undefined"
      )
        return val;
      if (t === "error") {
        return {
          __type: "Error",
          name: val.name,
          message: val.message,
          stack: val.stack,
        };
      }
      if (t === "function")
        return "[Function: " + (val.name || "anonymous") + "]";
      if (t === "symbol") return val.toString();
      if (t === "node") return "[Node: " + (val.nodeName || "unknown") + "]";
      if (t === "formdata") {
        const out: Record<string, any> = {};
        let propCount = 0;
        for (const [k, v] of val.entries()) {
          if (propCount++ >= MAX_OBJECT_PROPERTIES) {
            out["__truncated"] =
              `... ${val.entries.length - MAX_OBJECT_PROPERTIES} more entries`;
            break;
          }
          out[k] =
            v && v.name ? "[File:" + (v.name || "blob") + "]" : String(v);
        }
        return { __type: "FormData", value: out };
      }
      if (t === "urlsearchparams") {
        const out: Record<string, any> = {};
        let propCount = 0;
        for (const [k, v] of val.entries()) {
          if (propCount++ >= MAX_OBJECT_PROPERTIES) {
            out["__truncated"] = "... more entries";
            break;
          }
          out[k] = v;
        }
        return { __type: "URLSearchParams", value: out };
      }
      if (t === "blob")
        return (
          "[Blob " + (val.type || "unknown") + " " + (val.size || 0) + " bytes]"
        );
      if (t === "arraybuffer")
        return "[ArrayBuffer " + (val.byteLength || 0) + " bytes]";
      if (t === "map") {
        const obj: Record<string, any> = {};
        let propCount = 0;
        for (const [k, v] of val.entries()) {
          if (propCount++ >= MAX_OBJECT_PROPERTIES) {
            obj["__truncated"] =
              `... ${val.size - MAX_OBJECT_PROPERTIES} more entries`;
            break;
          }
          obj[String(k)] = serializeArg(v, seen, depth + 1);
        }
        return { __type: "Map", value: obj };
      }
      if (t === "set") {
        const arr = Array.from(val);
        if (arr.length > MAX_OBJECT_PROPERTIES) {
          return {
            __type: "Set",
            value: arr
              .slice(0, MAX_OBJECT_PROPERTIES)
              .map((v) => serializeArg(v, seen, depth + 1))
              .concat([`... ${arr.length - MAX_OBJECT_PROPERTIES} more items`]),
          };
        }
        return {
          __type: "Set",
          value: arr.map((v) => serializeArg(v, seen, depth + 1)),
        };
      }
      if (t === "array") {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
        if (val.length > MAX_OBJECT_PROPERTIES) {
          return val
            .slice(0, MAX_OBJECT_PROPERTIES)
            .map((v: any) => serializeArg(v, seen, depth + 1))
            .concat([`... ${val.length - MAX_OBJECT_PROPERTIES} more items`]);
        }
        return val.map((v: any) => serializeArg(v, seen, depth + 1));
      }
      if (t === "object") {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);

        // Store live reference for lazy expansion
        const objId = `obj_${Date.now()}_${Math.random()}`;
        try {
          liveObjectCache.set(val, objId);
        } catch (e) {
          /* WeakMap may fail on some objects */
        }

        const out: Record<string, any> = { __objectId: objId };
        const keys = Object.keys(val);
        let propCount = 0;

        for (const k of keys) {
          if (propCount++ >= MAX_OBJECT_PROPERTIES) {
            out["__truncated"] =
              `... ${keys.length - MAX_OBJECT_PROPERTIES} more properties`;
            break;
          }
          try {
            out[k] = serializeArg(val[k], seen, depth + 1);
          } catch (e) {
            out[k] = "[Unserializable]";
          }
        }
        return out;
      }
      // fallback
      return String(val);
    } catch (e) {
      return "[SerializeError: " + (e && (e as Error).message) + "]";
    }
  }

  function serializeArgs(argsArr: any[]): any[] {
    return Array.from(argsArr).map((a) => serializeArg(a));
  }

  function getStackTrace():
    | { file?: string; line?: number; column?: number; raw?: string }
    | undefined {
    try {
      const e = new Error();
      const raw = e.stack || "";
      if (!raw) return undefined;
      const lines = raw.split("\n").map((l) => l.trim());
      for (let ln of lines) {
        if (!ln) continue;
        if (
          /\b(inject|DevConsole|getStackTrace|<anonymous>|\(native\))\b/i.test(
            ln
          )
        )
          continue;
        const m1 = ln.match(/at (.+) \((.*):(\d+):(\d+)\)/);
        const m2 = ln.match(/at (.*):(\d+):(\d+)/);
        const m3 = ln.match(/\((.*):(\d+):(\d+)\)/);
        const match = m1 || m2 || m3;
        if (match) {
          const file = match[2] || match[1];
          const line = parseInt(match[3], 10);
          const column = parseInt(match[4], 10);
          return { file, line, column, raw: ln };
        }
      }
      return { raw };
    } catch (err) {
      return undefined;
    }
  }

  function truncateText(t: any): any {
    if (typeof t !== "string") return t;
    const max = TRUNCATE_BODY_LEN;
    return t.length > max ? t.slice(0, max) + "...[truncated]" : t;
  }

  // ---------------------------
  // Console interception
  // ---------------------------
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    group: console.group,
    groupEnd: console.groupEnd,
    groupCollapsed: console.groupCollapsed,
    table: console.table,
    time: console.time,
    timeEnd: console.timeEnd,
    timeLog: console.timeLog,
    count: console.count,
    countReset: console.countReset,
    trace: console.trace,
    assert: console.assert,
    clear: console.clear,
  };

  function estimateMessageSize(msg: any): number {
    try {
      return JSON.stringify(msg).length * 2; // rough UTF-16 byte estimate
    } catch (e) {
      return 1000; // fallback estimate
    }
  }

  function postConsole(level: string, args: any[]) {
    if (!captureEnabled) return;

    const payload = {
      level,
      args: serializeArgs(args),
      timestamp: Date.now(),
      source: getStackTrace(),
    };

    const message = {
      __devConsole: true,
      type: "DEVCONSOLE_LOG",
      payload,
    };

    const msgSize = estimateMessageSize(message);
    if (msgSize > MAX_MESSAGE_SIZE_BYTES) {
      originalConsole.warn(
        "[DevConsole] Message too large, truncating:",
        msgSize,
        "bytes"
      );
      payload.args = ["[Message too large to capture]"];
    }

    totalMessageSize += msgSize;
    messageCount++;

    // Enforce total size limit
    if (totalMessageSize > MAX_TOTAL_SIZE) {
      originalConsole.warn(
        "[DevConsole] Total message size limit reached, capture paused"
      );
      captureEnabled = false;
      return;
    }

    try {
      window.postMessage(message, window.location.origin);
    } catch (e) {
      // Fallback for file:// protocol or when origin is null
      try {
        if (window.location.protocol === "file:") {
          window.postMessage(message, "*");
        }
      } catch {
        // Silent fail - extension may be in invalid state
      }
    }
  }

  (["log", "info", "warn", "error", "debug"] as const).forEach((level) => {
    const orig = originalConsole[level] || originalConsole.log;
    (console as any)[level] = function (...args: any[]) {
      postConsole(level, args);
      try {
        orig.apply(console, args);
      } catch (e) {
        /* ignore */
      }
    };
  });

  // Intercept grouping methods
  (["group", "groupEnd", "groupCollapsed"] as const).forEach((level) => {
    const orig = originalConsole[level];
    (console as any)[level] = function (...args: any[]) {
      postConsole(level, args);
      try {
        orig.apply(console, args);
      } catch (e) {
        /* ignore */
      }
    };
  });

  // Intercept table
  (console as any).table = function (tabularData?: any, properties?: string[]) {
    const args = [tabularData, properties];
    postConsole("table", args);
    try {
      originalConsole.table(tabularData, properties);
    } catch (e) {
      /* ignore */
    }
  };

  // Intercept timing methods
  (console as any).time = function (label?: string) {
    postConsole("time", [label]);
    try {
      originalConsole.time(label);
    } catch (e) {
      /* ignore */
    }
  };
  (console as any).timeEnd = function (label?: string) {
    postConsole("timeEnd", [label]);
    try {
      originalConsole.timeEnd(label);
    } catch (e) {
      /* ignore */
    }
  };
  (console as any).timeLog = function (label?: string, ...data: any[]) {
    postConsole("timeLog", [label, ...data]);
    try {
      originalConsole.timeLog(label, ...data);
    } catch (e) {
      /* ignore */
    }
  };

  // Intercept counting methods
  (console as any).count = function (label?: string) {
    postConsole("count", [label]);
    try {
      originalConsole.count(label);
    } catch (e) {
      /* ignore */
    }
  };
  (console as any).countReset = function (label?: string) {
    postConsole("countReset", [label]);
    try {
      originalConsole.countReset(label);
    } catch (e) {
      /* ignore */
    }
  };

  // Intercept trace
  (console as any).trace = function (...args: any[]) {
    postConsole("trace", args);
    try {
      originalConsole.trace.apply(console, args);
    } catch (e) {
      /* ignore */
    }
  };

  // Intercept assert
  (console as any).assert = function (assertion: any, ...args: any[]) {
    if (!assertion) {
      postConsole("assert", args);
    }
    try {
      originalConsole.assert.apply(console, [assertion, ...args]);
    } catch (e) {
      /* ignore */
    }
  };

  // Intercept clear
  (console as any).clear = function () {
    postConsole("clear", []);
    try {
      originalConsole.clear();
    } catch (e) {
      /* ignore */
    }
  };

  // custom console methods
  (console as any).ui = function (...args: any[]) {
    postConsole("ui", args);
    originalConsole.log("%c[UI]", "font-weight:bold;", ...args);
  };
  (console as any).db = function (...args: any[]) {
    postConsole("db", args);
    originalConsole.log("%c[DB]", "font-weight:bold;", ...args);
  };
  (console as any).api = function (...args: any[]) {
    postConsole("api", args);
    originalConsole.log("%c[API]", "font-weight:bold;", ...args);
  };

  originalConsole.info(
    "%c🔧 DevConsole Extension Active",
    "color:#9E7AFF;font-weight:bold;",
    "Console hooks installed."
  );

  // ---------------------------
  // GraphQL Detection
  // ---------------------------
  function detectGraphQL(
    url: string,
    body: any
  ): { isGraphQL: boolean; operation?: string; operationName?: string } {
    try {
      // Check URL patterns
      if (url.includes("/graphql") || url.includes("/gql")) {
        // Try to extract operation from body
        if (body && typeof body === "object") {
          const operation = body.query
            ? body.query.match(/^\s*(query|mutation|subscription)/i)?.[1] ||
              "query"
            : undefined;
          const operationName =
            body.operationName ||
            body.query?.match(/(?:query|mutation|subscription)\s+(\w+)/i)?.[1];
          return { isGraphQL: true, operation, operationName };
        }
        return { isGraphQL: true };
      }
      return { isGraphQL: false };
    } catch (e) {
      return { isGraphQL: false };
    }
  }

  // ---------------------------
  // Fetch interception
  // ---------------------------
  const originalFetch = window.fetch.bind(window);

  function safeSerializeRequestBody(body: any): any {
    try {
      if (!body) return undefined;
      if (typeof body === "string") {
        try {
          return JSON.parse(body);
        } catch {
          return body.length > 1024
            ? body.slice(0, 1024) + "...[truncated]"
            : body;
        }
      }
      if (body instanceof FormData) {
        const out: Record<string, any> = {};
        for (const [k, v] of body.entries())
          out[k] =
            v && (v as any).name
              ? "[File:" + ((v as any).name || "blob") + "]"
              : String(v);
        return { __type: "FormData", value: out };
      }
      if (body instanceof URLSearchParams) {
        const out: Record<string, any> = {};
        for (const [k, v] of body.entries()) out[k] = v;
        return { __type: "URLSearchParams", value: out };
      }
      if (body instanceof Blob)
        return (
          "[Blob " +
          (body.type || "unknown") +
          " " +
          (body.size || 0) +
          " bytes]"
        );
      if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer)
        return "[ArrayBuffer " + ((body as any).byteLength || 0) + " bytes]";
      try {
        return JSON.parse(JSON.stringify(body));
      } catch {
        return String(body);
      }
    } catch (e) {
      return "[Unserializable request body]";
    }
  }

  (window as any).fetch = async function (resource: any, config?: any) {
    if (!captureEnabled) return originalFetch(resource, config);

    const start = performance.now();
    const url =
      typeof resource === "string"
        ? resource
        : (resource && resource.url) || String(resource);
    const method = (config && config.method) || "GET";
    const requestBody = safeSerializeRequestBody(config && config.body);
    let requestHeaders: Record<string, string> = {};
    try {
      if (config && config.headers) {
        if (config.headers instanceof Headers)
          config.headers.forEach(
            (v: string, k: string) => (requestHeaders[k] = v)
          );
        else requestHeaders = Object.assign({}, config.headers);
      }
    } catch (e) {}

    // Detect GraphQL
    const gqlInfo = detectGraphQL(url, requestBody);

    try {
      const resp = await originalFetch(resource, config);
      const duration = performance.now() - start;

      // Clone the response BEFORE any consumption
      let responseBody: any;
      try {
        const ct = resp.headers.get("content-type") || "";

        // Always try to clone first - this is the safest approach
        try {
          const clone = resp.clone();

          if (ct.includes("application/json")) {
            const txt = await clone.text();
            try {
              responseBody = JSON.parse(txt);
            } catch {
              responseBody = truncateText(txt);
            }
          } else if (
            ct.startsWith("text/") ||
            ct.includes("application/javascript") ||
            ct.includes("application/x-javascript")
          ) {
            const txt = await clone.text();
            responseBody = truncateText(txt);
          } else {
            // For binary content, don't try to read it
            const contentLength = resp.headers.get("content-length");
            responseBody =
              "[Binary content: " +
              ct +
              (contentLength ? ", " + contentLength + " bytes" : "") +
              "]";
          }
        } catch (cloneErr) {
          // Clone failed - response may have been consumed before we intercepted it
          responseBody = "[Unable to read response: body already consumed]";
        }
      } catch (e) {
        responseBody =
          "[Unable to read response: " + (e && (e as Error).message) + "]";
      }

      const responseHeaders: Record<string, string> = {};
      try {
        resp.headers.forEach((v, k) => (responseHeaders[k] = v));
      } catch (e) {}

      // Log GraphQL operations to console
      if (gqlInfo.isGraphQL && gqlInfo.operation && gqlInfo.operationName) {
        const status = resp.status >= 200 && resp.status < 300 ? "✓" : "✗";
        originalConsole.log(
          `%c${status} ${gqlInfo.operation.toUpperCase()} ${gqlInfo.operationName}%c ${duration.toFixed(0)}ms`,
          "color: " +
            (resp.status >= 200 && resp.status < 300 ? "#10b981" : "#ef4444") +
            "; font-weight: bold;",
          "color: #6b7280;"
        );
      }

      const message = {
        __devConsole: true,
        type: "DEVCONSOLE_NETWORK",
        payload: {
          method,
          url,
          status: resp.status,
          statusText: resp.statusText,
          duration,
          requestHeaders,
          requestBody,
          responseHeaders,
          responseBody,
          timestamp: Date.now(),
          graphql: gqlInfo.isGraphQL ? gqlInfo : undefined,
        },
      };

      const msgSize = estimateMessageSize(message);
      if (msgSize > MAX_MESSAGE_SIZE_BYTES) {
        message.payload.responseBody = "[Response too large to capture]";
        message.payload.requestBody = "[Request too large to capture]";
      }

      totalMessageSize += msgSize;
      messageCount++;

      if (totalMessageSize <= MAX_TOTAL_SIZE) {
        try {
          window.postMessage(message, window.location.origin);
        } catch (e) {
          // Fallback for file:// protocol
          if (window.location.protocol === "file:") {
            window.postMessage(message, "*");
          }
        }
      }

      return resp;
    } catch (error) {
      const duration = performance.now() - start;

      if (gqlInfo.isGraphQL && gqlInfo.operation && gqlInfo.operationName) {
        originalConsole.log(
          `%c✗ ${gqlInfo.operation.toUpperCase()} ${gqlInfo.operationName}%c ${duration.toFixed(0)}ms - FAILED`,
          "color: #ef4444; font-weight: bold;",
          "color: #6b7280;"
        );
      }

      const message = {
        __devConsole: true,
        type: "DEVCONSOLE_NETWORK",
        payload: {
          method,
          url,
          duration,
          requestBody,
          error: (error && (error as Error).message) || String(error),
          timestamp: Date.now(),
          graphql: gqlInfo.isGraphQL ? gqlInfo : undefined,
        },
      };

      const msgSize = estimateMessageSize(message);
      totalMessageSize += msgSize;
      messageCount++;

      if (totalMessageSize <= MAX_TOTAL_SIZE) {
        try {
          window.postMessage(message, window.location.origin);
        } catch (e) {
          // Fallback for file:// protocol
          if (window.location.protocol === "file:") {
            window.postMessage(message, "*");
          }
        }
      }

      throw error;
    }
  };

  // ---------------------------
  // XHR interception (class-based)
  // ---------------------------
  const OriginalXHR = window.XMLHttpRequest;

  class XHROverride extends OriginalXHR {
    private __start = 0;
    private __method = "GET";
    private __url = "";
    private __requestBody: any = undefined;
    private __shouldCapture = true;
    private __requestHeaders: Record<string, string> = {};

    constructor() {
      super();
      this.__shouldCapture = captureEnabled;
      if (this.__shouldCapture) {
        this.addEventListener("load", () => this.__onLoad());
        this.addEventListener("error", () => this.__onError());
      }
    }

    open(method: string, url: string, ...rest: any[]): void {
      this.__method = method;
      this.__url = url;
      this.__requestHeaders = {}; // Reset headers for new request
      return super.open.apply(this, [method, url, ...rest] as any);
    }

    setRequestHeader(name: string, value: string): void {
      if (this.__shouldCapture) {
        this.__requestHeaders[name] = value;
      }
      return super.setRequestHeader(name, value);
    }

    send(body?: any) {
      this.__requestBody =
        body === undefined ? undefined : safeSerializeRequestBody(body);
      this.__start = performance.now();
      return super.send(body);
    }

    private __onLoad() {
      if (!this.__shouldCapture) return;

      const duration = performance.now() - this.__start;
      let responseBody: any;
      try {
        responseBody =
          this.responseType === "" || this.responseType === "text"
            ? truncateText(this.responseText)
            : "[Non-text responseType: " + this.responseType + "]";
        try {
          responseBody = JSON.parse(this.responseText);
        } catch (e) {
          /* keep truncated text */
        }
      } catch (e) {
        responseBody =
          "[Unable to read XHR response: " + (e && (e as Error).message) + "]";
      }

      const responseHeaders: Record<string, string> = {};
      try {
        const headersStr = this.getAllResponseHeaders() || "";
        headersStr.split("\r\n").forEach((line) => {
          const idx = line.indexOf(": ");
          if (idx > -1) {
            const k = line.slice(0, idx);
            const v = line.slice(idx + 2);
            responseHeaders[k] = v;
          }
        });
      } catch (e) {}

      // Detect GraphQL
      const gqlInfo = detectGraphQL(this.__url, this.__requestBody);

      if (gqlInfo.isGraphQL && gqlInfo.operation && gqlInfo.operationName) {
        const status = this.status >= 200 && this.status < 300 ? "✓" : "✗";
        originalConsole.log(
          `%c${status} ${gqlInfo.operation.toUpperCase()} ${gqlInfo.operationName}%c ${duration.toFixed(0)}ms`,
          "color: " +
            (this.status >= 200 && this.status < 300 ? "#10b981" : "#ef4444") +
            "; font-weight: bold;",
          "color: #6b7280;"
        );
      }

      const message = {
        __devConsole: true,
        type: "DEVCONSOLE_NETWORK",
        payload: {
          method: this.__method,
          url: this.__url,
          status: this.status,
          statusText: this.statusText,
          duration,
          requestHeaders: this.__requestHeaders,
          requestBody: this.__requestBody,
          responseHeaders,
          responseBody,
          timestamp: Date.now(),
          graphql: gqlInfo.isGraphQL ? gqlInfo : undefined,
        },
      };

      const msgSize = estimateMessageSize(message);
      if (msgSize > MAX_MESSAGE_SIZE_BYTES) {
        message.payload.responseBody = "[Response too large to capture]";
        message.payload.requestBody = "[Request too large to capture]";
      }

      totalMessageSize += msgSize;
      messageCount++;

      if (totalMessageSize <= MAX_TOTAL_SIZE) {
        try {
          window.postMessage(message, window.location.origin);
        } catch (e) {
          if (window.location.protocol === "file:") {
            window.postMessage(message, "*");
          }
        }
      }
    }

    private __onError() {
      if (!this.__shouldCapture) return;

      const duration = performance.now() - this.__start;
      const gqlInfo = detectGraphQL(this.__url, this.__requestBody);

      if (gqlInfo.isGraphQL && gqlInfo.operation && gqlInfo.operationName) {
        originalConsole.log(
          `%c✗ ${gqlInfo.operation.toUpperCase()} ${gqlInfo.operationName}%c ${duration.toFixed(0)}ms - FAILED`,
          "color: #ef4444; font-weight: bold;",
          "color: #6b7280;"
        );
      }

      const message = {
        __devConsole: true,
        type: "DEVCONSOLE_NETWORK",
        payload: {
          method: this.__method,
          url: this.__url,
          duration,
          requestBody: this.__requestBody,
          error: "Network request failed",
          timestamp: Date.now(),
          graphql: gqlInfo.isGraphQL ? gqlInfo : undefined,
        },
      };

      const msgSize = estimateMessageSize(message);
      totalMessageSize += msgSize;
      messageCount++;

      if (totalMessageSize <= MAX_TOTAL_SIZE) {
        try {
          window.postMessage(message, window.location.origin);
        } catch (e) {
          if (window.location.protocol === "file:") {
            window.postMessage(message, "*");
          }
        }
      }
    }
  }

  try {
    Object.keys(OriginalXHR).forEach((k) => {
      try {
        (XHROverride as any)[k] = (OriginalXHR as any)[k];
      } catch (e) {}
    });
    (window as any).XMLHttpRequest = XHROverride;
  } catch (e) {
    originalConsole.warn(
      "[DevConsole] XHR override failed:",
      e && (e as Error).message
    );
  }

  // Runtime toggle listener
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;

    if (data && data.__devConsoleControl) {
      if (data.action === "toggle") {
        captureEnabled =
          data.enabled !== undefined ? data.enabled : !captureEnabled;
        originalConsole.log(
          `%c🔧 DevConsole Capture ${captureEnabled ? "ENABLED" : "DISABLED"}`,
          "color:#9E7AFF;font-weight:bold;"
        );
      } else if (data.action === "reset") {
        messageCount = 0;
        totalMessageSize = 0;
        captureEnabled = true;
        originalConsole.log(
          "%c🔧 DevConsole Stats Reset",
          "color:#9E7AFF;font-weight:bold;"
        );
      } else if (data.action === "status") {
        originalConsole.log(
          `%c🔧 DevConsole Status`,
          "color:#9E7AFF;font-weight:bold;",
          `\nCapture: ${captureEnabled ? "ENABLED" : "DISABLED"}`,
          `\nMessages: ${messageCount}`,
          `\nTotal Size: ${(totalMessageSize / 1024 / 1024).toFixed(2)}MB / ${(MAX_TOTAL_SIZE / 1024 / 1024).toFixed(0)}MB`
        );
      }
    }
  });

  // Expose control interface on window (non-enumerable)
  try {
    Object.defineProperty(window, "__devConsoleControl", {
      value: {
        toggle: (enabled?: boolean) => {
          try {
            window.postMessage(
              { __devConsoleControl: true, action: "toggle", enabled },
              window.location.origin
            );
          } catch {
            window.postMessage(
              { __devConsoleControl: true, action: "toggle", enabled },
              "*"
            );
          }
        },
        reset: () => {
          try {
            window.postMessage(
              { __devConsoleControl: true, action: "reset" },
              window.location.origin
            );
          } catch {
            window.postMessage(
              { __devConsoleControl: true, action: "reset" },
              "*"
            );
          }
        },
        status: () => {
          try {
            window.postMessage(
              { __devConsoleControl: true, action: "status" },
              window.location.origin
            );
          } catch {
            window.postMessage(
              { __devConsoleControl: true, action: "status" },
              "*"
            );
          }
        },
        enable: () => {
          try {
            window.postMessage(
              { __devConsoleControl: true, action: "toggle", enabled: true },
              window.location.origin
            );
          } catch {
            window.postMessage(
              { __devConsoleControl: true, action: "toggle", enabled: true },
              "*"
            );
          }
        },
        disable: () => {
          try {
            window.postMessage(
              { __devConsoleControl: true, action: "toggle", enabled: false },
              window.location.origin
            );
          } catch {
            window.postMessage(
              { __devConsoleControl: true, action: "toggle", enabled: false },
              "*"
            );
          }
        },
      },
      configurable: true,
      enumerable: false,
      writable: false,
    });
  } catch (e) {}

  // Expose a restore hook on window (non-enumerable)
  try {
    Object.defineProperty(window, "__devConsole_restore", {
      value: function restore() {
        try {
          console.log = originalConsole.log;
          console.info = originalConsole.info;
          console.warn = originalConsole.warn;
          console.error = originalConsole.error;
          console.debug = originalConsole.debug;
          console.group = originalConsole.group;
          console.groupEnd = originalConsole.groupEnd;
          console.groupCollapsed = originalConsole.groupCollapsed;
          console.table = originalConsole.table;
          console.time = originalConsole.time;
          console.timeEnd = originalConsole.timeEnd;
          console.timeLog = originalConsole.timeLog;
          console.count = originalConsole.count;
          console.countReset = originalConsole.countReset;
          console.trace = originalConsole.trace;
          console.assert = originalConsole.assert;
          console.clear = originalConsole.clear;
        } catch (e) {}
        try {
          (window as any).fetch = originalFetch;
        } catch (e) {}
        try {
          (window as any).XMLHttpRequest = OriginalXHR;
        } catch (e) {}
      },
      configurable: true,
      enumerable: false,
      writable: false,
    });
  } catch (e) {}

  originalConsole.info(
    "%c🔧 DevConsole Active",
    "color:#9E7AFF;font-weight:bold;",
    "Console & network interception enabled."
  );
})();
