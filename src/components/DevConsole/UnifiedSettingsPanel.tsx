/**
 * Unified Settings Panel Component
 * Centralized settings management for all DevConsole configurations
 * - GitHub Integration
 * - GraphQL Explorer
 * - General Preferences
 */

import {
    Bot,
    CheckCircle,
    ChevronRight,
    ExternalLink,
    Eye,
    EyeOff,
    Github,
    Image,
    Info,
    Loader,
    Save,
    Settings,
    Shield,
    TestTube,
    Webhook,
    XCircle,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { useGitHubSettings, type GitHubSettings } from "../../hooks/useGitHubSettings";
import { testGitHubConnection } from "../../lib/devConsole/githubApi";
import {
    clearGraphQLSettings,
    loadGraphQLSettings,
    saveGraphQLSettings,
    testGraphQLConnection,
    validateGraphQLEndpoint,
    type GraphQLSettings,
} from "../../lib/devConsole/graphqlSettings";
import { cn } from "../../utils";
import {
    clearUnsplashConfig,
    loadUnsplashConfig,
    saveUnsplashConfig,
    type UnsplashConfig,
} from "../../utils/extensionSettings";
import { AISettingsPanel } from "./AISettingsPanel";

// ============================================================================
// TYPES
// ============================================================================

type StatusType = 'success' | 'error' | null;

interface StatusMessage {
  type: StatusType;
  message: string;
}

type SettingsSection = 'github' | 'graphql' | 'general' | 'unsplash' | 'ai' | 'webhook';

// ============================================================================
// MAIN UNIFIED SETTINGS PANEL
// ============================================================================

export function UnifiedSettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('github');

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Settings
          </h3>
          <nav className="space-y-1">
            <SettingsNavItem
              icon={Bot}
              label="AI Providers"
              description="Configure AI models & keys"
              active={activeSection === 'ai'}
              onClick={() => setActiveSection('ai')}
            />
            <SettingsNavItem
              icon={Github}
              label="GitHub Integration"
              description="Issue tracking & reporting"
              active={activeSection === 'github'}
              onClick={() => setActiveSection('github')}
            />
            <SettingsNavItem
              icon={Zap}
              label="GraphQL Explorer"
              description="API endpoint configuration"
              active={activeSection === 'graphql'}
              onClick={() => setActiveSection('graphql')}
            />
            <SettingsNavItem
              icon={Image}
              label="Unsplash Integration"
              description="Image autofill configuration"
              active={activeSection === 'unsplash'}
              onClick={() => setActiveSection('unsplash')}
            />
            <SettingsNavItem
              icon={Webhook}
              label="Webhook Copilot"
              description="VS Code automation endpoint"
              active={activeSection === 'webhook'}
              onClick={() => setActiveSection('webhook')}
            />
            <SettingsNavItem
              icon={Settings}
              label="General"
              description="Extension preferences"
              active={activeSection === 'general'}
              onClick={() => setActiveSection('general')}
            />
          </nav>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        {activeSection === 'ai' && <AISettingsSection />}
        {activeSection === 'github' && <GitHubSettingsSection />}
        {activeSection === 'graphql' && <GraphQLSettingsSection />}
        {activeSection === 'unsplash' && <UnsplashSettingsSection />}
        {activeSection === 'webhook' && <WebhookSettingsSection />}
        {activeSection === 'general' && <GeneralSettingsSection />}
      </div>
    </div>
  );
}

// ============================================================================
// SIDEBAR NAVIGATION ITEM
// ============================================================================

interface SettingsNavItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function SettingsNavItem({ icon: Icon, label, description, active, onClick }: SettingsNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all group",
        active
          ? "bg-primary/10 border border-primary/20 shadow-sm"
          : "hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "w-5 h-5 mt-0.5 flex-shrink-0 transition-colors",
            active
              ? "text-primary"
              : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
          )}
        />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-sm font-medium transition-colors",
              active
                ? "text-primary"
                : "text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-200"
            )}
          >
            {label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </div>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 mt-1 flex-shrink-0 transition-all",
            active
              ? "text-primary opacity-100"
              : "text-gray-400 opacity-0 group-hover:opacity-100"
          )}
        />
      </div>
    </button>
  );
}

// ============================================================================
// GITHUB SETTINGS SECTION
// ============================================================================

function GitHubSettingsSection() {
  const {
    settings,
    saveSettings,
    clearSettings,
    validateSettings,
    normalizeRepoFormat,
  } = useGitHubSettings();

  // Form state
  const [username, setUsername] = useState(settings?.username || "");
  const [repo, setRepo] = useState(settings?.repo || "");
  const [token, setToken] = useState(settings?.token || "");
  const [showToken, setShowToken] = useState(false);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusMessage>({ type: null, message: "" });
  const [testStatus, setTestStatus] = useState<StatusMessage>({ type: null, message: "" });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setUsername(settings.username);
      setRepo(settings.repo);
      setToken(settings.token);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaveStatus({ type: null, message: "" });
    setTestStatus({ type: null, message: "" });

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
      setRepo(normalizedRepo);

      setSaveStatus({
        type: "success",
        message: "GitHub settings saved successfully!",
      });

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

  const handleTest = async () => {
    setTestStatus({ type: null, message: "" });

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
          message: "✓ Connection successful! Repository is accessible.",
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
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-900 dark:bg-gray-100 rounded-lg">
            <Github className="w-5 h-5 text-white dark:text-gray-900" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              GitHub Integration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create issues directly from error logs
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
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
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Your GitHub username (e.g., octocat)
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
              const normalized = normalizeRepoFormat(e.target.value);
              if (normalized !== e.target.value) {
                setRepo(normalized);
              }
            }}
            placeholder="owner/repo-name"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm transition-all"
          />
          <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Format: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">owner/repo-name</code></p>
            <p className="text-info">💡 URLs will be auto-normalized (e.g., https://github.com/owner/repo → owner/repo)</p>
          </div>
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
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Create a token at:{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=DevConsole"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                github.com/settings/tokens/new
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Required scope: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">repo</code>
            </p>
            <p className="text-xs text-warning flex items-center gap-1">
              <Info className="w-3 h-3" />
              Token is stored securely in your browser. Never share it.
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="mt-6 space-y-3">
        {saveStatus.type && (
          <StatusBanner type={saveStatus.type} message={saveStatus.message} />
        )}
        {testStatus.type && (
          <StatusBanner type={testStatus.type} message={testStatus.message} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 min-w-[140px] px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
          className="flex-1 min-w-[140px] px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
          className="px-6 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-all border border-destructive/20 shadow-sm hover:shadow"
        >
          Clear
        </button>
      </div>

      {/* Help Card */}
      <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Quick Setup Guide
        </h4>
        <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
          <li>Visit GitHub Settings → Developer settings → Personal access tokens</li>
          <li>Click "Generate new token (classic)"</li>
          <li>Give it a descriptive name (e.g., "DevConsole Extension")</li>
          <li>Select the <code className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-blue-600 dark:text-blue-400">repo</code> scope (full control of private repositories)</li>
          <li>Click "Generate token" and copy it immediately</li>
          <li>Paste the token above, add your username and repository, then save</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================================
// GRAPHQL SETTINGS SECTION
// ============================================================================

function GraphQLSettingsSection() {
  const [endpoint, setEndpoint] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusMessage>({ type: null, message: "" });
  const [testStatus, setTestStatus] = useState<StatusMessage>({ type: null, message: "" });

  useEffect(() => {
    loadGraphQLSettings().then((settings) => {
      if (settings) {
        setEndpoint(settings.endpoint);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaveStatus({ type: null, message: "" });
    setTestStatus({ type: null, message: "" });

    const validation = validateGraphQLEndpoint(endpoint);

    if (!validation.valid) {
      setSaveStatus({
        type: "error",
        message: validation.errors.join(", "),
      });
      return;
    }

    setIsSaving(true);

    try {
      const settings: GraphQLSettings = {
        endpoint: endpoint.trim(),
      };

      await saveGraphQLSettings(settings);

      setSaveStatus({
        type: "success",
        message: "GraphQL endpoint saved successfully!",
      });

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

  const handleTest = async () => {
    setTestStatus({ type: null, message: "" });

    const validation = validateGraphQLEndpoint(endpoint);

    if (!validation.valid) {
      setTestStatus({
        type: "error",
        message: validation.errors.join(", "),
      });
      return;
    }

    setIsTesting(true);

    try {
      const result = await testGraphQLConnection(endpoint.trim());

      if (result.valid) {
        setTestStatus({
          type: "success",
          message: "✓ Connection successful! GraphQL endpoint is accessible.",
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

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear the GraphQL endpoint?")) {
      await clearGraphQLSettings();
      setEndpoint("");
      setSaveStatus({ type: null, message: "" });
      setTestStatus({ type: null, message: "" });
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              GraphQL Explorer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your GraphQL endpoint for the interactive explorer
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Endpoint URL */}
        <div>
          <label htmlFor="graphql-endpoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            GraphQL Endpoint URL <span className="text-destructive">*</span>
          </label>
          <input
            id="graphql-endpoint"
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.example.com/graphql or /graphql"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono text-sm transition-all"
          />
          <div className="mt-2 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter an absolute URL or relative path:
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>
                  <strong className="text-gray-700 dark:text-gray-300">Absolute:</strong>{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                    https://api.example.com/graphql
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>
                  <strong className="text-gray-700 dark:text-gray-300">Relative:</strong>{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                    /graphql
                  </code>{" "}
                  <span className="text-gray-400">(uses current domain)</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="mt-6 space-y-3">
        {saveStatus.type && (
          <StatusBanner type={saveStatus.type} message={saveStatus.message} />
        )}
        {testStatus.type && (
          <StatusBanner type={testStatus.type} message={testStatus.message} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 min-w-[140px] px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
          className="flex-1 min-w-[140px] px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
          className="px-6 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-all border border-destructive/20 shadow-sm hover:shadow"
        >
          Clear
        </button>
      </div>

      {/* Examples Card */}
      <div className="mt-8 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl">
        <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">
          📝 Example Endpoints
        </h4>
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Public GitHub API:</span>
            <code className="block mt-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800/30 font-mono text-xs text-gray-800 dark:text-gray-200">
              https://api.github.com/graphql
            </code>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Local development:</span>
            <code className="block mt-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800/30 font-mono text-xs text-gray-800 dark:text-gray-200">
              http://localhost:4000/graphql
            </code>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Relative path (same domain):</span>
            <code className="block mt-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800/30 font-mono text-xs text-gray-800 dark:text-gray-200">
              /api/graphql
            </code>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          How to Use
        </h4>
        <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 list-decimal list-inside">
          <li>Enter your GraphQL endpoint URL (absolute or relative path)</li>
          <li>Click "Test Connection" to verify the endpoint is accessible</li>
          <li>Click "Save Settings" to store your configuration</li>
          <li>Navigate to the GraphQL tab to start exploring your API</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================================
// UNSPLASH SETTINGS SECTION
// ============================================================================

function UnsplashSettingsSection() {
  const [accessKey, setAccessKey] = useState("");
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusMessage>({ type: null, message: "" });

  useEffect(() => {
    loadUnsplashConfig().then((config) => {
      if (config) {
        setAccessKey(config.accessKey || "");
      }
    });
  }, []);

  const handleSave = async () => {
    setSaveStatus({ type: null, message: "" });

    // Access key is optional, but if provided it should not be empty after trimming
    const trimmedKey = accessKey.trim();
    
    setIsSaving(true);

    try {
      if (trimmedKey) {
        const config: UnsplashConfig = {
          accessKey: trimmedKey,
        };
        await saveUnsplashConfig(config);
        setSaveStatus({
          type: "success",
          message: "Unsplash settings saved successfully!",
        });
      } else {
        // If empty, clear the config (will use default key)
        await clearUnsplashConfig();
        setSaveStatus({
          type: "success",
          message: "Unsplash settings cleared. Using default key.",
        });
      }

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

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear the Unsplash access key? The extension will use the default key.")) {
      await clearUnsplashConfig();
      setAccessKey("");
      setSaveStatus({ type: null, message: "" });
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-500 rounded-lg">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Unsplash Integration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure Unsplash API for autofill image inputs
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Access Key */}
        <div>
          <label htmlFor="unsplash-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unsplash Access Key{" "}
            <span className="text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              id="unsplash-key"
              type={showAccessKey ? "text" : "password"}
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Your Unsplash access key (leave blank to use default)"
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 font-mono text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowAccessKey(!showAccessKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label={showAccessKey ? "Hide access key" : "Show access key"}
            >
              {showAccessKey ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Get a free access key at:{" "}
              <a
                href="https://unsplash.com/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                unsplash.com/developers
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Free tier: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">50 requests/hour</code>
            </p>
            <p className="text-xs text-info flex items-center gap-1">
              <Info className="w-3 h-3" />
              Leave blank to use the default key with shared rate limits.
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="mt-6 space-y-3">
        {saveStatus.type && (
          <StatusBanner type={saveStatus.type} message={saveStatus.message} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 min-w-[140px] px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
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
          onClick={handleClear}
          className="px-6 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-all border border-destructive/20 shadow-sm hover:shadow"
        >
          Clear
        </button>
      </div>

      {/* Info Card */}
      <div className="mt-8 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl">
        <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          About Unsplash Integration
        </h4>
        <div className="text-xs text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            The Unsplash integration powers the autofill feature for image input fields. When you encounter
            an image upload field on a form, the autofill assistant can suggest and fill images from Unsplash's
            vast collection.
          </p>
          <p className="font-medium text-orange-800 dark:text-orange-400">
            Why provide your own key?
          </p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Avoid shared rate limits with other users</li>
            <li>Get 50 requests per hour on the free tier</li>
            <li>Track your own API usage independently</li>
          </ul>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Quick Setup Guide
        </h4>
        <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
          <li>Visit <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">unsplash.com/developers</a></li>
          <li>Sign up or log in to your Unsplash account</li>
          <li>Click "New Application" to register your app</li>
          <li>Accept the API Use and Guidelines</li>
          <li>Fill in your application details (name, description, etc.)</li>
          <li>Copy the "Access Key" from your application dashboard</li>
          <li>Paste the access key above and save</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================================
// GENERAL SETTINGS SECTION
// ============================================================================

function GeneralSettingsSection() {
  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-600 dark:bg-gray-400 rounded-lg">
            <Settings className="w-5 h-5 text-white dark:text-gray-900" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              General Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Extension preferences and configurations
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="p-8 text-center bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Settings className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          More Settings Coming Soon
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Additional extension preferences, appearance options, and advanced configurations will be available here in future updates.
        </p>
      </div>

      {/* Feature Preview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeaturePreviewCard
          title="Theme Preferences"
          description="Customize colors and appearance"
          icon={Settings}
        />
        <FeaturePreviewCard
          title="Keyboard Shortcuts"
          description="Configure custom hotkeys"
          icon={Settings}
        />
        <FeaturePreviewCard
          title="Data Export"
          description="Export logs and network data"
          icon={Settings}
        />
        <FeaturePreviewCard
          title="Notifications"
          description="Configure alert preferences"
          icon={Settings}
        />
      </div>
    </div>
  );
}

// ============================================================================
// FEATURE PREVIEW CARD
// ============================================================================

interface FeaturePreviewCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

function FeaturePreviewCard({ title, description, icon: Icon }: FeaturePreviewCardProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg opacity-60">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {title}
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BANNER COMPONENT
// ============================================================================

interface StatusBannerProps {
  type: StatusType;
  message: string;
}

function StatusBanner({ type, message }: StatusBannerProps) {
  if (!type) return null;

  return (
    <div
      className={cn(
        "p-3 rounded-lg flex items-start gap-2 text-sm animate-in fade-in slide-in-from-top-2 duration-300",
        type === "success"
          ? "bg-success/10 text-success border border-success/20"
          : "bg-destructive/10 text-destructive border border-destructive/20"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <p className="flex-1">{message}</p>
    </div>
  );
}

// ============================================================================
// WEBHOOK COPILOT SETTINGS SECTION
// ============================================================================

function WebhookSettingsSection() {
  const [webhookUrl, setWebhookUrl] = useState('http://localhost:9090/webhook');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: StatusType; message: string }>({ type: null, message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: StatusType; message: string }>({ type: null, message: '' });

  // Load saved webhook URL on mount
  useEffect(() => {
    chrome.storage.local.get(['webhookCopilotUrl'], (result) => {
      if (result.webhookCopilotUrl) {
        setWebhookUrl(result.webhookCopilotUrl);
      }
    });
  }, []);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestStatus({ type: null, message: '' });

    try {
      // Import webhook service
      const { webhookCopilot } = await import('../../lib/webhookCopilot');
      
      // Update URL if changed
      webhookCopilot.setWebhookUrl(webhookUrl);

      // 1. Test health endpoint
      const health = await webhookCopilot.getServerHealth();
      
      if (health && health.status === 'ok') {
        // 2. Test full connection with test endpoint
        const testResult = await webhookCopilot.testConnection();
        
        if (testResult.success) {
          setTestStatus({
            type: 'success',
            message: `✅ Connected to Webhook Copilot!\n\nServer Version: ${health.version}\nTest ID: ${testResult.testId}\n\n${testResult.message}`,
          });
        } else {
          setTestStatus({
            type: 'error',
            message: `⚠️ Server reachable but test failed:\n${testResult.error || 'Unknown error'}`,
          });
        }
      } else {
        setTestStatus({
          type: 'error',
          message: '❌ Cannot connect to Webhook Copilot.\n\nMake sure:\n1. VS Code is running\n2. Webhook Copilot extension is installed and active\n3. Server is running on the correct port\n\nTry running "Webhook Copilot: Start Server" command in VS Code.',
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestStatus({
        type: 'error',
        message: `❌ Connection test failed: ${errorMessage}\n\nEnsure VS Code is running with the extension active.`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      await chrome.storage.local.set({ webhookCopilotUrl: webhookUrl });
      
      setSaveStatus({
        type: 'success',
        message: '✅ Webhook URL saved successfully!',
      });

      // Import and update the webhook service
      const { webhookCopilot } = await import('../../lib/webhookCopilot');
      webhookCopilot.setWebhookUrl(webhookUrl);
    } catch (error) {
      console.error('Failed to save webhook URL:', error);
      setSaveStatus({
        type: 'error',
        message: '❌ Failed to save webhook URL',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Webhook className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Webhook Copilot Integration
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect to Webhook Copilot extension to automate VS Code and trigger Copilot actions from your notes.
        </p>
      </div>

      {/* Status Banners */}
      {testStatus.type && (
        <div className="mb-4">
          <StatusBanner type={testStatus.type} message={testStatus.message} />
        </div>
      )}

      {saveStatus.type && (
        <div className="mb-4">
          <StatusBanner type={saveStatus.type} message={saveStatus.message} />
        </div>
      )}

      {/* Webhook URL Configuration */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Webhook Endpoint
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook URL
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="http://localhost:9090/webhook"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: http://localhost:9090/webhook
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection || !webhookUrl}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                isTestingConnection
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-info hover:bg-info/90 text-white shadow-sm hover:shadow-md"
              )}
            >
              {isTestingConnection ? (
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
              onClick={handleSave}
              disabled={isSaving || !webhookUrl}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                isSaving
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-success hover:bg-success/90 text-white shadow-sm hover:shadow-md"
              )}
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="card p-6 mb-6 bg-info/5 border-info/20">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How to Set Up Webhook Copilot
            </h3>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li>Install the Webhook Copilot extension in VS Code</li>
              <li>Ensure VS Code is running with the extension active</li>
              <li>The extension runs a server on <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">http://localhost:9090</code></li>
              <li>Click "Test Connection" to verify it's working</li>
              <li>Use the Code button on sticky notes to send tasks to Copilot</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                💡 Quick Test from Terminal
              </p>
              <code className="block text-xs text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 p-2 rounded mt-2 font-mono">
                curl http://localhost:9090/health
              </code>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Should return: <code className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded">{`{"status":"ok",...}`}</code>
              </p>
            </div>
            
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                🔍 Troubleshooting Connection Issues
              </p>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>Check extension is active in VS Code Extensions panel</li>
                <li>Verify server started in Output → "Webhook Copilot"</li>
                <li>Confirm port 9090 isn't blocked by firewall</li>
                <li>Try "Webhook Copilot: Start Server" command</li>
                <li>Check for port conflicts: <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800 rounded">lsof -ti:9090</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Available Actions */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Available Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'Execute Task', desc: 'Send coding tasks to Copilot' },
            { name: 'Copilot Chat', desc: 'Ask questions and get explanations' },
            { name: 'Create File', desc: 'Generate new files with content' },
            { name: 'Modify File', desc: 'Edit existing files' },
            { name: 'Run Command', desc: 'Execute VS Code commands' },
            { name: 'Query Workspace', desc: 'Search for files and code' },
          ].map((action) => (
            <div
              key={action.name}
              className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {action.name}
              </h4>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI SETTINGS SECTION
// ============================================================================

function AISettingsSection() {
  return <AISettingsPanel />;
}
