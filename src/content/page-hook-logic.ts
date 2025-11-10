/**
 * Page-context injector: hooks console.*, fetch, and XMLHttpRequest
 * Designed to be injected directly into page context (not content-script context)
 */

(() => {
  'use strict';

  // Configuration (adjust if needed)
  const TRUNCATE_BODY_LEN = 20000;

  // ---------------------------
  // Helpers
  // ---------------------------
  function safeTypeOf(v: any): string {
    if (v === null) return 'null';
    if (typeof v === 'object') {
      if (Array.isArray(v)) return 'array';
      if (v instanceof Error) return 'error';
      if (v instanceof FormData) return 'formdata';
      if (v instanceof URLSearchParams) return 'urlsearchparams';
      if (v instanceof Blob) return 'blob';
      if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return 'arraybuffer';
      if (v instanceof Map) return 'map';
      if (v instanceof Set) return 'set';
      if (v instanceof Node) return 'node';
      return 'object';
    }
    return typeof v;
  }

  function serializeArg(val: any, seen = new WeakSet()): any {
    try {
      const t = safeTypeOf(val);
      if (t === 'null' || t === 'number' || t === 'string' || t === 'boolean' || t === 'undefined') return val;
      if (t === 'error') {
        return { __type: 'Error', name: val.name, message: val.message, stack: val.stack };
      }
      if (t === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
      if (t === 'symbol') return val.toString();
      if (t === 'node') return '[Node: ' + (val.nodeName || 'unknown') + ']';
      if (t === 'formdata') {
        const out: Record<string, any> = {};
        for (const [k, v] of val.entries()) out[k] = (v && v.name) ? '[File:' + (v.name || 'blob') + ']' : String(v);
        return { __type: 'FormData', value: out };
      }
      if (t === 'urlsearchparams') {
        const out: Record<string, any> = {};
        for (const [k, v] of val.entries()) out[k] = v;
        return { __type: 'URLSearchParams', value: out };
      }
      if (t === 'blob') return '[Blob ' + (val.type || 'unknown') + ' ' + (val.size || 0) + ' bytes]';
      if (t === 'arraybuffer') return '[ArrayBuffer ' + (val.byteLength || 0) + ' bytes]';
      if (t === 'map') {
        const obj: Record<string, any> = {};
        for (const [k, v] of val.entries()) obj[String(k)] = serializeArg(v, seen);
        return { __type: 'Map', value: obj };
      }
      if (t === 'set') return { __type: 'Set', value: Array.from(val).map(v => serializeArg(v, seen)) };
      if (t === 'array') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
        return val.map((v: any) => serializeArg(v, seen));
      }
      if (t === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
        const out: Record<string, any> = {};
        for (const k in val) {
          try { out[k] = serializeArg(val[k], seen); } catch (e) { out[k] = '[Unserializable]'; }
        }
        return out;
      }
      // fallback
      return String(val);
    } catch (e) {
      return '[SerializeError: ' + (e && (e as Error).message) + ']';
    }
  }

  function serializeArgs(argsArr: any[]): any[] {
    return Array.from(argsArr).map(a => serializeArg(a));
  }

  function getStackTrace(): { file?: string; line?: number; column?: number; raw?: string } | undefined {
    try {
      const e = new Error();
      const raw = e.stack || '';
      if (!raw) return undefined;
      const lines = raw.split('\n').map(l => l.trim());
      for (let ln of lines) {
        if (!ln) continue;
        if (/\b(inject|DevConsole|getStackTrace|<anonymous>|\(native\))\b/i.test(ln)) continue;
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
    if (typeof t !== 'string') return t;
    const max = TRUNCATE_BODY_LEN;
    return t.length > max ? t.slice(0, max) + '...[truncated]' : t;
  }

  // ---------------------------
  // Console interception
  // ---------------------------
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  function postConsole(level: string, args: any[]) {
    try {
      window.postMessage({
        __devConsole: true,
        type: 'DEVCONSOLE_LOG',
        payload: {
          level,
          args: serializeArgs(args),
          timestamp: Date.now(),
          source: getStackTrace()
        }
      }, '*');
    } catch (e) {
      // swallow
    }
  }

  (['log', 'info', 'warn', 'error', 'debug'] as const).forEach(level => {
    const orig = originalConsole[level] || originalConsole.log;
    (console as any)[level] = function (...args: any[]) {
      postConsole(level, args);
      try { orig.apply(console, args); } catch (e) { /* ignore */ }
    };
  });

  // custom console methods
  (console as any).ui = function (...args: any[]) { postConsole('ui', args); originalConsole.log('%c[UI]', 'font-weight:bold;', ...args); };
  (console as any).db = function (...args: any[]) { postConsole('db', args); originalConsole.log('%c[DB]', 'font-weight:bold;', ...args); };
  (console as any).api = function (...args: any[]) { postConsole('api', args); originalConsole.log('%c[API]', 'font-weight:bold;', ...args); };

  originalConsole.info('%c🔧 DevConsole Extension Active', 'color:#9E7AFF;font-weight:bold;', 'Console hooks installed.');

  // ---------------------------
  // Fetch interception
  // ---------------------------
  const originalFetch = window.fetch.bind(window);

  function safeSerializeRequestBody(body: any): any {
    try {
      if (!body) return undefined;
      if (typeof body === 'string') {
        try { return JSON.parse(body); } catch { return body.length > 1024 ? body.slice(0, 1024) + '...[truncated]' : body; }
      }
      if (body instanceof FormData) {
        const out: Record<string, any> = {};
        for (const [k, v] of body.entries()) out[k] = (v && (v as any).name) ? '[File:' + ((v as any).name || 'blob') + ']' : String(v);
        return { __type: 'FormData', value: out };
      }
      if (body instanceof URLSearchParams) {
        const out: Record<string, any> = {};
        for (const [k, v] of body.entries()) out[k] = v;
        return { __type: 'URLSearchParams', value: out };
      }
      if (body instanceof Blob) return '[Blob ' + (body.type || 'unknown') + ' ' + (body.size || 0) + ' bytes]';
      if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer) return '[ArrayBuffer ' + ((body as any).byteLength || 0) + ' bytes]';
      try { return JSON.parse(JSON.stringify(body)); } catch { return String(body); }
    } catch (e) {
      return '[Unserializable request body]';
    }
  }

  (window as any).fetch = async function (resource: any, config?: any) {
    const start = performance.now();
    const url = (typeof resource === 'string') ? resource : (resource && resource.url) || String(resource);
    const method = (config && config.method) || 'GET';
    const requestBody = safeSerializeRequestBody(config && config.body);
    let requestHeaders: Record<string, string> = {};
    try {
      if (config && config.headers) {
        if (config.headers instanceof Headers) config.headers.forEach((v: string, k: string) => requestHeaders[k] = v);
        else requestHeaders = Object.assign({}, config.headers);
      }
    } catch (e) { }

    try {
      const resp = await originalFetch(resource, config);
      const duration = performance.now() - start;
      const clone = resp.clone();
      let responseBody: any;
      try {
        const ct = clone.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const txt = await clone.text();
          try { responseBody = JSON.parse(txt); } catch { responseBody = truncateText(txt); }
        } else if (ct.startsWith('text/') || ct.includes('application/javascript')) {
          const txt = await clone.text();
          responseBody = truncateText(txt);
        } else {
          responseBody = '[Binary content: ' + (ct || 'unknown') + ']';
        }
      } catch (e) { responseBody = '[Unable to read response: ' + (e && (e as Error).message) + ']'; }

      const responseHeaders: Record<string, string> = {};
      try { resp.headers.forEach((v, k) => responseHeaders[k] = v); } catch (e) { }

      window.postMessage({
        __devConsole: true,
        type: 'DEVCONSOLE_NETWORK',
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
          timestamp: Date.now()
        }
      }, '*');

      return resp;
    } catch (error) {
      const duration = performance.now() - start;
      window.postMessage({
        __devConsole: true,
        type: 'DEVCONSOLE_NETWORK',
        payload: {
          method,
          url,
          duration,
          requestBody,
          error: (error && (error as Error).message) || String(error),
          timestamp: Date.now()
        }
      }, '*');
      throw error;
    }
  };

  // ---------------------------
  // XHR interception (class-based)
  // ---------------------------
  const OriginalXHR = window.XMLHttpRequest;

  class XHROverride extends OriginalXHR {
    private __start = 0;
    private __method = 'GET';
    private __url = '';
    private __requestBody: any = undefined;

    constructor() {
      super();
      this.addEventListener('load', () => this.__onLoad());
      this.addEventListener('error', () => this.__onError());
    }

    open(method: string, url: string, ...rest: any[]): void {
      this.__method = method;
      this.__url = url;
      // @ts-ignore - rest parameter spread
      return super.open(method, url, ...rest);
    }

    send(body?: any) {
      this.__requestBody = (body === undefined) ? undefined : safeSerializeRequestBody(body);
      this.__start = performance.now();
      return super.send(body);
    }

    private __onLoad() {
      const duration = performance.now() - this.__start;
      let responseBody: any;
      try {
        responseBody = this.responseType === '' || this.responseType === 'text' ? truncateText(this.responseText) : '[Non-text responseType: ' + this.responseType + ']';
        try { responseBody = JSON.parse(this.responseText); } catch (e) { /* keep truncated text */ }
      } catch (e) { responseBody = '[Unable to read XHR response: ' + (e && (e as Error).message) + ']'; }

      const responseHeaders: Record<string, string> = {};
      try {
        const headersStr = this.getAllResponseHeaders() || '';
        headersStr.split('\r\n').forEach(line => {
          const idx = line.indexOf(': ');
          if (idx > -1) {
            const k = line.slice(0, idx);
            const v = line.slice(idx + 2);
            responseHeaders[k] = v;
          }
        });
      } catch (e) { }

      window.postMessage({
        __devConsole: true,
        type: 'DEVCONSOLE_NETWORK',
        payload: {
          method: this.__method,
          url: this.__url,
          status: this.status,
          statusText: this.statusText,
          duration,
          requestHeaders: {}, // not easily available here
          requestBody: this.__requestBody,
          responseHeaders,
          responseBody,
          timestamp: Date.now()
        }
      }, '*');
    }

    private __onError() {
      const duration = performance.now() - this.__start;
      window.postMessage({
        __devConsole: true,
        type: 'DEVCONSOLE_NETWORK',
        payload: {
          method: this.__method,
          url: this.__url,
          duration,
          requestBody: this.__requestBody,
          error: 'Network request failed',
          timestamp: Date.now()
        }
      }, '*');
    }
  }

  try {
    Object.keys(OriginalXHR).forEach(k => { try { (XHROverride as any)[k] = (OriginalXHR as any)[k]; } catch (e) { }; });
    (window as any).XMLHttpRequest = XHROverride;
  } catch (e) {
    originalConsole.warn('[DevConsole] XHR override failed:', e && (e as Error).message);
  }

  // Expose a restore hook on window (non-enumerable)
  try {
    Object.defineProperty(window, '__devConsole_restore', {
      value: function restore() {
        try {
          console.log = originalConsole.log;
          console.info = originalConsole.info;
          console.warn = originalConsole.warn;
          console.error = originalConsole.error;
          console.debug = originalConsole.debug;
        } catch (e) { }
        try { (window as any).fetch = originalFetch; } catch (e) { }
        try { (window as any).XMLHttpRequest = OriginalXHR; } catch (e) { }
      },
      configurable: true,
      enumerable: false,
      writable: false
    });
  } catch (e) { }

  originalConsole.info('%c🔧 DevConsole Active', 'color:#9E7AFF;font-weight:bold;', 'Console & network interception enabled.');

})();
