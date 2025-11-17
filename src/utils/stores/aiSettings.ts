/**
 * AI Settings Store
 * Zustand store for managing AI provider settings and configuration
 * Uses chrome.storage.local for persistent storage across extension contexts
 * Combines Immer for clean updates with async persistence
 */

import { produce } from "immer";
import { create } from "zustand";
import { DEFAULT_AI_SETTINGS } from "../../lib/ai/constants";
import type { AISettings } from "../../lib/ai/types";

const STORAGE_KEY = "devconsole_ai_settings";

interface AISettingsStore extends AISettings {
  // Loading state
  isLoading: boolean;

  // Actions
  updateSettings: (settings: Partial<AISettings>) => Promise<void>;
  setProvider: (provider: AISettings["provider"]) => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setApiKey: (apiKey: string) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setUseGateway: (useGateway: boolean) => Promise<void>;
  setGatewayApiKey: (gatewayApiKey: string) => Promise<void>;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

/**
 * Save settings to chrome.storage.local
 */
async function saveToStorage(settings: AISettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error("Failed to save AI settings:", error);
    throw error;
  }
}

/**
 * Load settings from chrome.storage.local
 */
async function loadFromStorage(): Promise<AISettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || DEFAULT_AI_SETTINGS;
  } catch (error) {
    console.error("Failed to load AI settings:", error);
    return DEFAULT_AI_SETTINGS;
  }
}

export const useAISettingsStore = create<AISettingsStore>((set, get) => ({
  // Initial state
  ...DEFAULT_AI_SETTINGS,
  isLoading: false,

  // Load settings from storage
  loadSettings: async () => {
    set(
      produce((draft) => {
        draft.isLoading = true;
      })
    );
    const settings = await loadFromStorage();
    set(
      produce((draft) => {
        Object.assign(draft, settings);
        draft.isLoading = false;
      })
    );
  },

  // Actions - all use Immer for clean updates + async persistence
  updateSettings: async (updates) => {
    // Optimistic update with Immer
    set(
      produce((draft) => {
        Object.assign(draft, updates);
      })
    );

    // Persist to storage (extract only AISettings fields)
    const currentState = get();
    const settingsToPersist: AISettings = {
      enabled: currentState.enabled,
      provider: currentState.provider,
      model: currentState.model,
      apiKey: currentState.apiKey,
      temperature: currentState.temperature,
      maxTokens: currentState.maxTokens,
      useGateway: currentState.useGateway,
      gatewayApiKey: currentState.gatewayApiKey,
    };

    try {
      await saveToStorage(settingsToPersist);
    } catch (error) {
      console.error("Failed to persist AI settings:", error);
      // On error, reload from storage to ensure consistency
      const settings = await loadFromStorage();
      set(
        produce((draft) => {
          Object.assign(draft, settings);
        })
      );
    }
  },

  setProvider: async (provider) => {
    set(
      produce((draft) => {
        draft.provider = provider;
      })
    );
    await get().updateSettings({ provider });
  },

  setModel: async (model) => {
    set(
      produce((draft) => {
        draft.model = model;
      })
    );
    await get().updateSettings({ model });
  },

  setApiKey: async (apiKey) => {
    set(
      produce((draft) => {
        draft.apiKey = apiKey;
      })
    );
    await get().updateSettings({ apiKey });
  },

  setEnabled: async (enabled) => {
    set(
      produce((draft) => {
        draft.enabled = enabled;
      })
    );
    await get().updateSettings({ enabled });
  },

  setUseGateway: async (useGateway) => {
    set(
      produce((draft) => {
        draft.useGateway = useGateway;
      })
    );
    await get().updateSettings({ useGateway });
  },

  setGatewayApiKey: async (gatewayApiKey) => {
    set(
      produce((draft) => {
        draft.gatewayApiKey = gatewayApiKey;
      })
    );
    await get().updateSettings({ gatewayApiKey });
  },

  resetSettings: async () => {
    set(
      produce((draft) => {
        Object.assign(draft, DEFAULT_AI_SETTINGS);
      })
    );

    try {
      await saveToStorage(DEFAULT_AI_SETTINGS);
    } catch (error) {
      console.error("Failed to reset AI settings:", error);
    }
  },
}));
