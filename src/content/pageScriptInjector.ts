/**
 * Page Script Injector
 * Injects the page-hook-logic script into the main page context
 */

const DEBUG_INJECTION = false;

/**
 * Inject the page-hook-logic script into the page context
 * This allows us to intercept console and network calls that happen in the main world
 */
export function injectPageScript() {
  try {
    // Create a script element to inject into the page
    const script = document.createElement("script");

    // Get the URL of the bundled page-hook-logic.js file
    const scriptUrl = chrome.runtime.getURL("page-hook-logic.js");

    if (DEBUG_INJECTION) {
      console.log("[DevConsole] 🔧 Injecting page script from:", scriptUrl);
      console.log(
        "[DevConsole] 📍 Injection point:",
        document.head ? "head" : "documentElement"
      );
      console.log("[DevConsole] 🕐 Document state:", document.readyState);
    }

    script.src = scriptUrl;
    script.type = "text/javascript";

    // Inject at document_start by appending to the document element or head
    const target = document.head || document.documentElement;
    target.appendChild(script);

    if (DEBUG_INJECTION) {
      console.log("[DevConsole] 📝 Script element created and appended");
    }

    // Remove the script tag after execution to keep the DOM clean
    script.onload = () => {
      if (DEBUG_INJECTION) {
        console.log("[DevConsole] ✅ Page hook script loaded successfully");
      }

      // Verify the hook is active
      setTimeout(() => {
        if (typeof (window as any).__devConsoleControl !== "undefined") {
          if (DEBUG_INJECTION) {
            console.log("[DevConsole] ✅ Control API detected on window");
          }
        } else {
          if (DEBUG_INJECTION) {
            console.warn(
              "[DevConsole] ⚠️ Control API not found after script load"
            );
          }
        }
      }, 100);

      script.remove();
    };

    script.onerror = (error) => {
      if (DEBUG_INJECTION) {
        console.error("[DevConsole] ❌ Failed to load page hook script:", error);
        console.error("[DevConsole] 📍 Script URL was:", scriptUrl);
        console.error("[DevConsole] 🔍 Check if file exists in extension bundle");
      }
      script.remove();
    };
  } catch (error) {
    if (DEBUG_INJECTION) {
      console.error("[DevConsole] ❌ Failed to inject page hook script:", error);
      console.error("[DevConsole] 📋 Error details:", error);
    }
  }
}
