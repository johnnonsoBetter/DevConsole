// Main content script entry point
// Initializes console and network interceptors for Chrome extension

// Import the content-mode interceptors (they forward events to the background)
import './consoleInterceptor';
import './networkInterceptor';

console.log('[DevConsole] Content script loaded');

export {};