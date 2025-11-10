/**
 * Extension Settings Management
 * Handles storing and retrieving extension settings in chrome.storage
 */

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

export interface ExtensionSettings {
  githubConfig?: GitHubConfig;
  darkMode?: boolean;
  maxLogs?: number;
  maxNetworkRequests?: number;
}

const SETTINGS_KEY = 'devConsoleExtensionSettings';

/**
 * Load settings from chrome.storage
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return result[SETTINGS_KEY] || {};
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {};
  }
}

/**
 * Save settings to chrome.storage
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Update specific setting fields
 */
export async function updateSettings(updates: Partial<ExtensionSettings>): Promise<void> {
  const currentSettings = await loadSettings();
  const newSettings = { ...currentSettings, ...updates };
  await saveSettings(newSettings);
}

/**
 * Save GitHub configuration
 */
export async function saveGitHubConfig(config: GitHubConfig): Promise<void> {
  await updateSettings({ githubConfig: config });
}

/**
 * Load GitHub configuration
 */
export async function loadGitHubConfig(): Promise<GitHubConfig | undefined> {
  const settings = await loadSettings();
  return settings.githubConfig;
}

/**
 * Clear GitHub configuration
 */
export async function clearGitHubConfig(): Promise<void> {
  await updateSettings({ githubConfig: undefined });
}
