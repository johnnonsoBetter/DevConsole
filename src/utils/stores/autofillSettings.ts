/**
 * Autofill Settings Store
 * Manages autofill feature toggle state
 */

import { create } from "zustand";

// Storage key for autofill settings
const AUTOFILL_SETTINGS_KEY = "devConsoleAutofillSettings";

interface AutofillSettingsState {
  isEnabled: boolean;
  isLoaded: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  loadSettings: () => Promise<void>;
}

export const useAutofillSettingsStore = create<AutofillSettingsState>(
  (set, get) => ({
    isEnabled: true, // Default to enabled
    isLoaded: false,

    setEnabled: (enabled: boolean) => {
      set({ isEnabled: enabled });
      // Persist to storage - content scripts will detect via chrome.storage.onChanged
      try {
        chrome.storage.local.set({
          [AUTOFILL_SETTINGS_KEY]: { isEnabled: enabled },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/extension context invalidated/i.test(message)) return;
        console.error("Failed to save autofill settings:", error);
      }
    },

    toggle: () => {
      const { isEnabled, setEnabled } = get();
      setEnabled(!isEnabled);
    },

    loadSettings: async () => {
      try {
        const result = await chrome.storage.local.get(AUTOFILL_SETTINGS_KEY);
        const settings = result[AUTOFILL_SETTINGS_KEY];
        if (settings && typeof settings.isEnabled === "boolean") {
          set({ isEnabled: settings.isEnabled, isLoaded: true });
        } else {
          set({ isLoaded: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/extension context invalidated/i.test(message)) {
          console.error("Failed to load autofill settings:", error);
        }
        set({ isLoaded: true });
      }
    },
  })
);
