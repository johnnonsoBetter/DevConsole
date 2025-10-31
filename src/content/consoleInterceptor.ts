// Console interceptor for capturing console.* calls
// Runs in the page context to intercept native console methods

(function() {
  'use strict';

  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Function to capture and forward console calls
  function interceptConsole(level: keyof typeof originalConsole) {
    const originalMethod = originalConsole[level];
    
    console[level] = function(...args: any[]) {
      // Call original method
      originalMethod.apply(console, args);
      
      // Capture stack trace
      const stack = new Error().stack;
      
      // Forward to content script
      window.postMessage({
        type: 'DEVCONSOLE_LOG',
        payload: {
          timestamp: Date.now(),
          level,
          message: formatMessage(args),
          args: args.map(arg => serializeArgument(arg)),
          stack: stack?.split('\n').slice(2).join('\n'), // Remove first 2 lines
          url: window.location.href
        }
      }, '*');
    };
  }

  // Format console message
  function formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }).join(' ');
  }

  // Serialize arguments for transmission
  function serializeArgument(arg: any): any {
    if (arg === null || arg === undefined) return arg;
    
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      return arg;
    }
    
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack
      };
    }
    
    if (typeof arg === 'object') {
      try {
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return String(arg);
      }
    }
    
    return String(arg);
  }

  // Intercept all console methods
  interceptConsole('log');
  interceptConsole('info');
  interceptConsole('warn');
  interceptConsole('error');
  interceptConsole('debug');

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    window.postMessage({
      type: 'DEVCONSOLE_LOG',
      payload: {
        timestamp: Date.now(),
        level: 'error',
        message: `Uncaught Error: ${event.message}`,
        args: [event.error],
        stack: event.error?.stack,
        url: event.filename || window.location.href
      }
    }, '*');
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    window.postMessage({
      type: 'DEVCONSOLE_LOG',
      payload: {
        timestamp: Date.now(),
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        args: [event.reason],
        stack: event.reason?.stack,
        url: window.location.href
      }
    }, '*');
  });

  console.log('DevConsole: Console interceptor loaded');
})();