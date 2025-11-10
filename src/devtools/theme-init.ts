/**
 * Theme initialization script
 * Runs before React to prevent flash of unstyled content (FOUC)
 */

(async function initTheme() {
  try {
    const DARK_MODE_KEY = "devconsole_darkMode";
    const FOLLOW_SYSTEM_KEY = "devconsole_followSystemTheme";

    // Get stored preferences from chrome.storage
    const result = await chrome.storage.local.get([DARK_MODE_KEY, FOLLOW_SYSTEM_KEY]);
    
    const followSystem = result[FOLLOW_SYSTEM_KEY] !== undefined ? result[FOLLOW_SYSTEM_KEY] : true;
    const storedDark = result[DARK_MODE_KEY];
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const shouldUseDark = followSystem
      ? prefersDark
      : storedDark !== undefined
        ? storedDark
        : prefersDark;

    if (shouldUseDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  } catch (error) {
    console.warn("[DevConsole] Unable to restore theme preference:", error);
    
    // Fallback to system preference
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
  }
})();
