// Main content script entry point
// Initializes console and network interceptors

import './consoleInterceptor';
import './networkInterceptor';

// Inject interceptor scripts into the page context
function injectScript(file: string) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(file);
  script.type = 'module';
  (document.head || document.documentElement).appendChild(script);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DevConsole: Content script loaded');
  });
} else {
  console.log('DevConsole: Content script loaded');
}

// Listen for messages from injected scripts
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'DEVCONSOLE_LOG' || event.data.type === 'DEVCONSOLE_NETWORK') {
    // Forward to background script
    chrome.runtime.sendMessage({
      type: event.data.type === 'DEVCONSOLE_LOG' ? 'CONSOLE_LOG' : 'NETWORK_REQUEST',
      payload: event.data.payload
    });
  }
});

export {};