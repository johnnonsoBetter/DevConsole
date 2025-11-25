/**
 * useRaindropSettings Hook
 * Manages Raindrop SmartMemory settings with Chrome storage persistence
 */

import { useCallback, useEffect, useState } from "react";
import type { RaindropSettings } from "../lib/ai/types";
import { DEFAULT_RAINDROP_SETTINGS } from "../lib/ai/types";

const STORAGE_KEY = "raindrop_settings";

export function useRaindropSettings() {
  const [settings, setSettings] = useState<RaindropSettings>(
    DEFAULT_RAINDROP_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await chrome.storage.local.get(STORAGE_KEY);
          if (result[STORAGE_KEY]) {
            setSettings({
              ...DEFAULT_RAINDROP_SETTINGS,
              ...result[STORAGE_KEY],
            });
          }
        } else {
          // Fallback to localStorage for development
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setSettings({
              ...DEFAULT_RAINDROP_SETTINGS,
              ...JSON.parse(stored),
            });
          }
        }
      } catch (err) {
        console.error("Failed to load Raindrop settings:", err);
        setError("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: RaindropSettings) => {
    try {
      setSettings(newSettings);
      setError(null);

      if (typeof chrome !== "undefined" && chrome.storage) {
        await chrome.storage.local.set({ [STORAGE_KEY]: newSettings });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      }
    } catch (err) {
      console.error("Failed to save Raindrop settings:", err);
      setError("Failed to save settings");
    }
  }, []);

  // Update specific setting
  const updateSetting = useCallback(
    <K extends keyof RaindropSettings>(key: K, value: RaindropSettings[K]) => {
      saveSettings({
        ...settings,
        [key]: value,
      });
    },
    [settings, saveSettings]
  );

  // Reset to defaults
  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_RAINDROP_SETTINGS);
  }, [saveSettings]);

  // Check if properly configured
  const isConfigured = settings.enabled && Boolean(settings.apiKey);

  return {
    settings,
    isLoading,
    error,
    isConfigured,
    saveSettings,
    updateSetting,
    resetSettings,
  };
}

/**
 * Get Raindrop settings synchronously from cache
 * Useful for non-React contexts
 */
export async function getRaindropSettings(): Promise<RaindropSettings> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return {
        ...DEFAULT_RAINDROP_SETTINGS,
        ...result[STORAGE_KEY],
      };
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return {
          ...DEFAULT_RAINDROP_SETTINGS,
          ...JSON.parse(stored),
        };
      }
    }
  } catch (err) {
    console.error("Failed to get Raindrop settings:", err);
  }
  return DEFAULT_RAINDROP_SETTINGS;
}
