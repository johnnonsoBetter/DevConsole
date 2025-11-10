/**
 * Page Script Injector
 * Injects the page-hook-logic script into the main page context
 */

/**
 * Inject the page-hook-logic script into the page context
 * This allows us to intercept console and network calls that happen in the main world
 */
export function injectPageScript() {
  try {
    // Create a script element to inject into the page
    const script = document.createElement('script');
    
    // Get the URL of the bundled page-hook-logic.js file
    const scriptUrl = chrome.runtime.getURL('page-hook-logic.js');
    
    console.log('[DevConsole] Injecting page script from:', scriptUrl);
    
    script.src = scriptUrl;
    script.type = 'text/javascript';
    
    // Inject at document_start by appending to the document element or head
    (document.head || document.documentElement).appendChild(script);
    
    // Remove the script tag after execution to keep the DOM clean
    script.onload = () => {
      script.remove();
      console.log('[DevConsole] ✅ Page hook script injected and executed successfully');
    };
    
    script.onerror = (error) => {
      console.error('[DevConsole] ❌ Failed to load page hook script:', error);
      console.error('[DevConsole] Script URL was:', scriptUrl);
      script.remove();
    };
  } catch (error) {
    console.error('[DevConsole] ❌ Failed to inject page hook script:', error);
  }
}
