/**
 * GitHub Settings Store
 * Zustand store for managing GitHub credentials and configuration
 * Uses chrome.storage.local for persistent storage across extension contexts
 * Combines Immer for clean updates with async persistence
 */

import { produce } from "immer";
import { create } from "zustand";

const STORAGE_KEY = "devconsole_github_settings";

export interface GitHubSettings {
  username: string;
  repo: string;
  token: string;
}

const DEFAULT_GITHUB_SETTINGS: GitHubSettings = {
  username: "",
  repo: "",
  token: "",
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface GitHubSettingsStore extends GitHubSettings {
  // Loading state
  isLoading: boolean;

  // Actions
  updateSettings: (settings: Partial<GitHubSettings>) => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  setRepo: (repo: string) => Promise<void>;
  setToken: (token: string) => Promise<void>;
  saveSettings: (settings: GitHubSettings) => Promise<void>;
  clearSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;

  // Utilities
  validateSettings: (settings: Partial<GitHubSettings>) => ValidationResult;
  normalizeRepoFormat: (repo: string) => string;
  isConfigured: () => boolean;
}

/**
 * Normalize repository format
 * Converts various formats to owner/repo
 */
function normalizeRepoFormat(repo: string): string {
  if (!repo) return "";

  let normalized = repo.trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^github\.com\//, "");
  normalized = normalized.replace(/\/+$/, "");
  normalized = normalized.replace(/\.git$/, "");

  return normalized;
}

/**
 * Validate GitHub settings
 */
function validateSettings(settings: Partial<GitHubSettings>): ValidationResult {
  const errors: string[] = [];

  if (!settings.username?.trim()) {
    errors.push("Username is required");
  }

  if (!settings.repo?.trim()) {
    errors.push("Repository name is required");
  } else {
    const normalized = normalizeRepoFormat(settings.repo);
    if (!normalized.includes("/")) {
      errors.push("Repository should be in format: owner/repo");
    } else {
      const parts = normalized.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        errors.push("Repository should be in format: owner/repo");
      }
    }
  }

  if (!settings.token?.trim()) {
    errors.push("GitHub token is required");
  } else if (settings.token.length < 20) {
    errors.push("GitHub token appears to be invalid (too short)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save settings to chrome.storage.local
 */
async function saveToStorage(settings: GitHubSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error("Failed to save GitHub settings:", error);
    throw error;
  }
}

/**
 * Load settings from chrome.storage.local
 */
async function loadFromStorage(): Promise<GitHubSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || DEFAULT_GITHUB_SETTINGS;
  } catch (error) {
    console.error("Failed to load GitHub settings:", error);
    return DEFAULT_GITHUB_SETTINGS;
  }
}

export const useGitHubSettingsStore = create<GitHubSettingsStore>(
  (set, get) => ({
    // Initial state
    ...DEFAULT_GITHUB_SETTINGS,
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
      // Normalize repo if provided
      if (updates.repo) {
        updates.repo = normalizeRepoFormat(updates.repo);
      }

      // Optimistic update with Immer
      set(
        produce((draft) => {
          Object.assign(draft, updates);
        })
      );

      // Persist to storage (extract only GitHubSettings fields)
      const currentState = get();
      const settingsToPersist: GitHubSettings = {
        username: currentState.username,
        repo: currentState.repo,
        token: currentState.token,
      };

      try {
        await saveToStorage(settingsToPersist);
      } catch (error) {
        console.error("Failed to persist GitHub settings:", error);
        // On error, reload from storage to ensure consistency
        const settings = await loadFromStorage();
        set(
          produce((draft) => {
            Object.assign(draft, settings);
          })
        );
      }
    },

    setUsername: async (username) => {
      await get().updateSettings({ username });
    },

    setRepo: async (repo) => {
      await get().updateSettings({ repo });
    },

    setToken: async (token) => {
      await get().updateSettings({ token });
    },

    saveSettings: async (newSettings) => {
      // Normalize repo format before saving
      const normalizedSettings = {
        ...newSettings,
        repo: normalizeRepoFormat(newSettings.repo),
      };

      set(
        produce((draft) => {
          Object.assign(draft, normalizedSettings);
        })
      );

      try {
        await saveToStorage(normalizedSettings);
      } catch (error) {
        console.error("Failed to save GitHub settings:", error);
        throw error;
      }
    },

    clearSettings: async () => {
      set(
        produce((draft) => {
          Object.assign(draft, DEFAULT_GITHUB_SETTINGS);
        })
      );

      try {
        await chrome.storage.local.remove(STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear GitHub settings:", error);
        throw error;
      }
    },

    resetSettings: async () => {
      set(
        produce((draft) => {
          Object.assign(draft, DEFAULT_GITHUB_SETTINGS);
        })
      );

      try {
        await saveToStorage(DEFAULT_GITHUB_SETTINGS);
      } catch (error) {
        console.error("Failed to reset GitHub settings:", error);
      }
    },

    // Utility functions
    validateSettings,
    normalizeRepoFormat,
    isConfigured: () => {
      const state = get();
      return Boolean(state.username && state.repo && state.token);
    },
  })
);
