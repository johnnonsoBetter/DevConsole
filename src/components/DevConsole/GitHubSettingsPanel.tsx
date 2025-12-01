/**
 * GitHub Settings Panel Component
 * Manages GitHub integration configuration for issue creation
 * Validates credentials and tests connection to repository
 */

import { CheckCircle, Eye, EyeOff, Github, Loader, Save, Settings, TestTube, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { testGitHubConnection } from "../../lib/devConsole/githubApi";
import { cn } from "../../utils";
import { useGitHubSettingsStore, type GitHubSettings } from "../../utils/stores/githubSettings";

// ============================================================================
// TYPES
// ============================================================================

type StatusType = 'success' | 'error' | null;

interface StatusMessage {
  type: StatusType;
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GitHubSettingsPanel() {
  const {
    username: storedUsername,
    repo: storedRepo,
    token: storedToken,
    saveSettings,
    clearSettings,
    validateSettings,
    normalizeRepoFormat,
    isLoading,
  } = useGitHubSettingsStore();

  // Form state
  const [username, setUsername] = useState(storedUsername || "");
  const [repo, setRepo] = useState(storedRepo || "");
  const [token, setToken] = useState(storedToken || "");
  const [showToken, setShowToken] = useState(false);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusMessage>({ type: null, message: "" });
  const [testStatus, setTestStatus] = useState<StatusMessage>({ type: null, message: "" });

  // Update form when settings load
  useEffect(() => {
    setUsername(storedUsername || "");
    setRepo(storedRepo || "");
    setToken(storedToken || "");
  }, [storedUsername, storedRepo, storedToken]);

  /**
   * Save GitHub settings with validation
   * Normalizes repository format and updates storage
   */
  const handleSave = async () => {
    setSaveStatus({ type: null, message: "" });
    setTestStatus({ type: null, message: "" });

    // Normalize repo format before validation
    const normalizedRepo = normalizeRepoFormat(repo);

    const validation = validateSettings({ username, repo: normalizedRepo, token });

    if (!validation.valid) {
      setSaveStatus({
        type: "error",
        message: validation.errors.join(", "),
      });
      return;
    }

    setIsSaving(true);

    try {
      const newSettings: GitHubSettings = {
        username: username.trim(),
        repo: normalizedRepo,
        token: token.trim(),
      };

      await saveSettings(newSettings);

      // Update the displayed repo to the normalized format
      setRepo(normalizedRepo);

      setSaveStatus({
        type: "success",
        message: "Settings saved successfully!",
      });

      // Auto-clear success message after 3s
      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 3000);
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Test GitHub connection with current settings
   * Validates credentials and repository access
   */
  const handleTest = async () => {
    setTestStatus({ type: null, message: "" });

    // Normalize repo format before validation
    const normalizedRepo = normalizeRepoFormat(repo);

    const validation = validateSettings({ username, repo: normalizedRepo, token });

    if (!validation.valid) {
      setTestStatus({
        type: "error",
        message: validation.errors.join(", "),
      });
      return;
    }

    setIsTesting(true);

    try {
      const testSettings: GitHubSettings = {
        username: username.trim(),
        repo: normalizedRepo,
        token: token.trim(),
      };

      const result = await testGitHubConnection(testSettings);

      if (result.valid) {
        setTestStatus({
          type: "success",
          message: "Connection successful! Repository is accessible.",
        });
      } else {
        setTestStatus({
          type: "error",
          message: result.error || "Connection failed",
        });
      }
    } catch (error) {
      setTestStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Clear all GitHub settings with user confirmation
   */
  const handleClear = async () => {
    if (confirm("Are you sure you want to clear all GitHub settings?")) {
      await clearSettings();
      setUsername("");
      setRepo("");
      setToken("");
      setSaveStatus({ type: null, message: "" });
      setTestStatus({ type: null, message: "" });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Github className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                GitHub Integration Settings
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your GitHub credentials to create issues directly from the DevConsole.
            </p>
          </div>



          {/* Loading State */}
          {isLoading && (
            <div className="mb-4 p-4 bg-info/10 border border-info/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader className="w-5 h-5 text-info animate-spin" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Loading GitHub settings...
                </p>
              </div>
            </div>
          )}

          {/* Settings Form */}
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="github-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub Username <span className="text-destructive">*</span>
              </label>
              <input
                id="github-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="octocat"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                aria-required="true"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your GitHub username
              </p>
            </div>

            {/* Repository */}
            <div>
              <label htmlFor="github-repo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository <span className="text-destructive">*</span>
              </label>
              <input
                id="github-repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                onBlur={(e) => {
                  // Auto-normalize on blur
                  const normalized = normalizeRepoFormat(e.target.value);
                  if (normalized !== e.target.value) {
                    setRepo(normalized);
                  }
                }}
                placeholder="owner/repo-name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono"
                aria-required="true"
                aria-describedby="repo-format-hint"
              />
              <p id="repo-format-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">owner/repo-name</code>
                <br />
                <span className="text-info">💡 URLs will be auto-normalized (e.g., https://github.com/owner/repo → owner/repo)</span>
              </p>
            </div>

            {/* Personal Access Token */}
            <div>
              <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Access Token <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="github-token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm"
                  aria-required="true"
                  aria-describedby="token-help"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <div id="token-help" className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create a token at:{" "}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Devconsole%20DevConsole"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    github.com/settings/tokens/new
                  </a>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Required scope: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">repo</code>
                </p>
                <p className="text-xs text-warning">
                  ⚠️ Token is stored locally in your browser. Never share it.
                </p>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-6 space-y-2">
            {saveStatus.type && (
              <div
                className={cn(
                  "p-3 rounded-lg flex items-start gap-2 text-sm",
                  saveStatus.type === "success"
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                {saveStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <p>{saveStatus.message}</p>
              </div>
            )}

            {testStatus.type && (
              <div
                className={cn(
                  "p-3 rounded-lg flex items-start gap-2 text-sm",
                  testStatus.type === "success"
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                {testStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <p>{testStatus.message}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>

            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 px-6 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>

            <button
              onClick={handleClear}
              className="px-6 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-colors border border-destructive/20"
            >
              Clear
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-info/10 border border-info/20 rounded-lg">
            <h4 className="text-sm font-semibold text-info mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Setup Instructions
            </h4>
            <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
              <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
              <li>Click "Generate new token" (classic)</li>
              <li>Give it a descriptive name (e.g., "Devconsole DevConsole")</li>
              <li>Select the <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">repo</code> scope</li>
              <li>Click "Generate token" and copy it immediately</li>
              <li>Paste the token here and save your settings</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
