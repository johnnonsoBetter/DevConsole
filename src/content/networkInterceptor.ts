// Network interceptor for capturing fetch/XHR requests
// Runs in the page context to intercept network calls

(function() {
  'use strict';

  // Store original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Intercept fetch calls
  window.fetch = function(...args: Parameters<typeof fetch>) {
    const startTime = Date.now();
    const [url, options = {}] = args;
    
    return originalFetch.apply(this, args)
      .then((response) => {
        const endTime = Date.now();
        
        // Forward to content script
        window.postMessage({
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            timestamp: startTime,
            url: typeof url === 'string' ? url : url.url,
            method: options.method || 'GET',
            status: response.status,
            requestHeaders: options.headers || {},
            responseHeaders: Object.fromEntries(response.headers.entries()),
            duration: endTime - startTime
          }
        }, '*');
        
        return response;
      })
      .catch((error) => {
        const endTime = Date.now();
        
        // Forward error to content script
        window.postMessage({
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            timestamp: startTime,
            url: typeof url === 'string' ? url : url.url,
            method: options.method || 'GET',
            status: 0,
            error: error.message,
            duration: endTime - startTime
          }
        }, '*');
        
        throw error;
      });
  };

  // Intercept XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
    (this as any)._devConsole = {
      method,
      url,
      startTime: Date.now()
    };
    
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body?: any) {
    const devConsoleData = (this as any)._devConsole;
    
    if (devConsoleData) {
      this.addEventListener('loadend', () => {
        const endTime = Date.now();
        
        window.postMessage({
          type: 'DEVCONSOLE_NETWORK',
          payload: {
            timestamp: devConsoleData.startTime,
            url: devConsoleData.url,
            method: devConsoleData.method,
            status: this.status,
            requestBody: body,
            responseBody: this.responseText,
            duration: endTime - devConsoleData.startTime
          }
        }, '*');
      });
    }
    
    return originalXHRSend.apply(this, [body]);
  };

  console.log('DevConsole: Network interceptor loaded');
})();