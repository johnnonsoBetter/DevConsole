/**
 * useGitHubSettings Hook
 * Manages GitHub credentials for issue creation in Chrome Extension
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'devconsole_github_settings';

export interface GitHubSettings {
  username: string;
  repo: string;
  token: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface UseGitHubSettingsReturn {
  settings: GitHubSettings | null;
  isLoading: boolean;
  error: string | null;
  saveSettings: (settings: GitHubSettings) => Promise<void>;
  clearSettings: () => Promise<void>;
  validateSettings: (settings: Partial<GitHubSettings>) => ValidationResult;
  normalizeRepoFormat: (repo: string) => string;
  isConfigured: boolean;
}

/**
 * Normalize repository format
 * Converts various formats to owner/repo
 * - https://github.com/owner/repo -> owner/repo
 * - github.com/owner/repo -> owner/repo
 * - owner/repo -> owner/repo
 */
function normalizeRepoFormat(repo: string): string {
  if (!repo) return '';

  let normalized = repo.trim();

  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove github.com domain
  normalized = normalized.replace(/^github\.com\//, '');

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Remove .git suffix
  normalized = normalized.replace(/\.git$/, '');

  return normalized;
}

/**
 * Validate GitHub settings
 */
function validateSettings(settings: Partial<GitHubSettings>): ValidationResult {
  const errors: string[] = [];

  if (!settings.username?.trim()) {
    errors.push('Username is required');
  }

  if (!settings.repo?.trim()) {
    errors.push('Repository name is required');
  } else {
    const normalized = normalizeRepoFormat(settings.repo);
    if (!normalized.includes('/')) {
      errors.push('Repository should be in format: owner/repo');
    } else {
      const parts = normalized.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        errors.push('Repository should be in format: owner/repo');
      }
    }
  }

  if (!settings.token?.trim()) {
    errors.push('GitHub token is required');
  } else if (settings.token.length < 20) {
    errors.push('GitHub token appears to be invalid (too short)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * React hook for managing GitHub settings
 */
export function useGitHubSettings(): UseGitHubSettingsReturn {
  const [settings, setSettings] = useState<GitHubSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        setSettings(result[STORAGE_KEY] || null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load GitHub settings';
        setError(errorMessage);
        console.error('Failed to load GitHub settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEY]) {
        setSettings(changes[STORAGE_KEY].newValue || null);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings: GitHubSettings) => {
    setError(null);
    try {
      // Normalize the repo format before saving
      const normalizedSettings = {
        ...newSettings,
        repo: normalizeRepoFormat(newSettings.repo),
      };

      await chrome.storage.local.set({ [STORAGE_KEY]: normalizedSettings });
      setSettings(normalizedSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save GitHub settings';
      setError(errorMessage);
      console.error('Failed to save GitHub settings:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // Clear settings
  const clearSettings = useCallback(async () => {
    setError(null);
    try {
      await chrome.storage.local.remove(STORAGE_KEY);
      setSettings(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear GitHub settings';
      setError(errorMessage);
      console.error('Failed to clear GitHub settings:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // Check if settings are configured
  const isConfigured = Boolean(
    settings?.username &&
    settings?.repo &&
    settings?.token
  );

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    clearSettings,
    validateSettings,
    normalizeRepoFormat,
    isConfigured,
  };
}
