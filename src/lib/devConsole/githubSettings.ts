/**
 * GitHub Settings Storage Utility
 * Manages GitHub credentials for issue creation for Chrome Extension
 */

const STORAGE_KEY = 'devconsole_github_settings';

export interface GitHubSettings {
  username: string;
  repo: string;
  token: string;
}

/**
 * Save GitHub settings to chrome.storage.local
 */
export async function saveGitHubSettings(settings: GitHubSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error('Failed to save GitHub settings:', error);
    throw new Error('Failed to save GitHub settings');
  }
}

/**
 * Load GitHub settings from chrome.storage.local
 */
export async function loadGitHubSettings(): Promise<GitHubSettings | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  } catch (error) {
    console.error('Failed to load GitHub settings:', error);
    return null;
  }
}

/**
 * Clear GitHub settings from chrome.storage.local
 */
export async function clearGitHubSettings(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear GitHub settings:', error);
  }
}

/**
 * Normalize repository format
 * Converts various formats to owner/repo
 * - https://github.com/owner/repo -> owner/repo
 * - github.com/owner/repo -> owner/repo
 * - owner/repo -> owner/repo
 */
export function normalizeRepoFormat(repo: string): string {
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
export function validateGitHubSettings(settings: Partial<GitHubSettings>): {
  valid: boolean;
  errors: string[];
} {
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
