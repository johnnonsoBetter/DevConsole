import { useCallback, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const DARK_MODE_KEY = "devconsole_darkMode";
const FOLLOW_SYSTEM_KEY = "devconsole_followSystemTheme";

const detectSystemTheme = (): ThemeMode => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export interface UnifiedThemeState {
  isDarkMode: boolean;
  systemTheme: ThemeMode;
  followSystem: boolean;
  toggleDarkMode: () => void;
  followSystemTheme: () => void;
  setTheme: (mode: ThemeMode | "system") => void;
  config: {
    darkMode: boolean;
  };
  updateTheme: (updates: Partial<{ darkMode: boolean }>) => void;
  theme: ThemeMode;
}

export const useUnifiedTheme = (): UnifiedThemeState => {
  const systemTheme = detectSystemTheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemTheme === "dark");
  const [currentSystemTheme, setCurrentSystemTheme] = useState<ThemeMode>(systemTheme);
  const [followSystem, setFollowSystem] = useState<boolean>(true);

  // Load initial state from chrome.storage
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const result = await chrome.storage.local.get([DARK_MODE_KEY, FOLLOW_SYSTEM_KEY]);
        
        const storedFollowSystem = result[FOLLOW_SYSTEM_KEY];
        const storedDarkMode = result[DARK_MODE_KEY];
        
        const shouldFollowSystem = storedFollowSystem !== undefined ? storedFollowSystem : true;
        const shouldUseDarkMode = storedDarkMode !== undefined 
          ? storedDarkMode 
          : (shouldFollowSystem ? systemTheme === "dark" : systemTheme === "dark");

        setFollowSystem(shouldFollowSystem);
        setIsDarkMode(shouldUseDarkMode);
      } catch (error) {
        console.warn("[DevConsole] Failed to load theme preference:", error);
      }
    };

    loadInitialState();
  }, [systemTheme]);

  // Keep DOM in sync with theme changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    root.style.colorScheme = isDarkMode ? "dark" : "light";

    if (body) {
      body.style.backgroundColor = "";
      body.style.colorScheme = isDarkMode ? "dark" : "light";
    }
  }, [isDarkMode]);

  // Persist preferences
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      chrome.storage.local.set({
        [DARK_MODE_KEY]: isDarkMode,
        [FOLLOW_SYSTEM_KEY]: followSystem,
      });
    } catch (error) {
      console.warn("[DevConsole] Failed to store theme preference:", error);
    }
  }, [isDarkMode, followSystem]);

  // Watch system theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = (matches: boolean) => {
      const theme = matches ? "dark" : "light";
      setCurrentSystemTheme(theme);
      if (followSystem) {
        setIsDarkMode(matches);
      }
    };

    applySystemTheme(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      applySystemTheme(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    // Backwards compatibility
    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [followSystem]);

  const toggleDarkMode = useCallback(() => {
    setFollowSystem(false);
    setIsDarkMode((prev) => !prev);
  }, []);

  const followSystemTheme = useCallback(() => {
    setFollowSystem(true);
    const currentSystem = detectSystemTheme();
    setCurrentSystemTheme(currentSystem);
    setIsDarkMode(currentSystem === "dark");
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode | "system") => {
      if (mode === "system") {
        followSystemTheme();
        return;
      }
      setFollowSystem(false);
      setIsDarkMode(mode === "dark");
    },
    [followSystemTheme]
  );

  const updateTheme = useCallback(
    (updates: Partial<{ darkMode: boolean }>) => {
      if (typeof updates.darkMode === "boolean") {
        setFollowSystem(false);
        setIsDarkMode(updates.darkMode);
      }
    },
    []
  );

  return {
    isDarkMode,
    systemTheme: currentSystemTheme,
    followSystem,
    toggleDarkMode,
    followSystemTheme,
    setTheme,
    config: { darkMode: isDarkMode },
    updateTheme,
    theme: isDarkMode ? "dark" : "light",
  };
};

