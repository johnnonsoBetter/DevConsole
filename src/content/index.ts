// Main content script entry point
// Initializes console and network interceptors for Chrome extension

// Import the content-mode interceptors (they forward events to the background)
import './consoleInterceptor';
import './networkInterceptor';

// Check if extension context is valid
if (chrome?.runtime?.id) {
  console.log('[DevConsole] Content script loaded');
} else {
  console.warn('[DevConsole] Extension context invalid at load time');
}

export {};