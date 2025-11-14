/**
 * AI Settings Store
 * Zustand store for managing AI provider settings and configuration
 * Uses chrome.storage.local for persistent storage across extension contexts
 */

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
    set({ isLoading: true });
    const settings = await loadFromStorage();
    set({ ...settings, isLoading: false });
  },

  // Actions - all now async and persist to chrome.storage
  updateSettings: async (updates) => {
    const currentState = get();
    const newSettings: AISettings = {
      enabled: updates.enabled ?? currentState.enabled,
      provider: updates.provider ?? currentState.provider,
      model: updates.model ?? currentState.model,
      apiKey: updates.apiKey ?? currentState.apiKey,
      temperature: updates.temperature ?? currentState.temperature,
      maxTokens: updates.maxTokens ?? currentState.maxTokens,
      useGateway: updates.useGateway ?? currentState.useGateway,
      gatewayApiKey: updates.gatewayApiKey ?? currentState.gatewayApiKey,
    };
    await saveToStorage(newSettings);
    set(newSettings);
  },

  setProvider: async (provider) => {
    const currentState = get();
    const newSettings: AISettings = { ...currentState, provider };
    await saveToStorage(newSettings);
    set({ provider });
  },

  setModel: async (model) => {
    const currentState = get();
    const newSettings: AISettings = { ...currentState, model };
    await saveToStorage(newSettings);
    set({ model });
  },

  setApiKey: async (apiKey) => {
    const currentState = get();
    const newSettings: AISettings = { ...currentState, apiKey };
    await saveToStorage(newSettings);
    set({ apiKey });
  },

  setEnabled: async (enabled) => {
    const currentState = get();
    const newSettings: AISettings = { ...currentState, enabled };
    await saveToStorage(newSettings);
    set({ enabled });
  },

  setUseGateway: async (useGateway) => {
    const currentState = get();
    const newSettings: AISettings = { ...currentState, useGateway };
    await saveToStorage(newSettings);
    set({ useGateway });
  },

  setGatewayApiKey: async (gatewayApiKey) => {
    const currentState = get();
    const newSettings: AISettings = { ...currentState, gatewayApiKey };
    await saveToStorage(newSettings);
    set({ gatewayApiKey });
  },

  resetSettings: async () => {
    await saveToStorage(DEFAULT_AI_SETTINGS);
    set(DEFAULT_AI_SETTINGS);
  },
}));
