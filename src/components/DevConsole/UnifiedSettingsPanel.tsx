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
  Eye,
  EyeOff,
  Github,
  Loader,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Settings,
  TestTube,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useGitHubSettings, type GitHubSettings } from "../../hooks/useGitHubSettings";
import { GraphQLIcon, RaindropIcon, UnsplashIcon, VSCodeIcon } from "../../icons";
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
import { Tooltip } from "../ui";
import { AISettingsPanel } from "./AISettingsPanel";
import { RaindropSettingsPanel } from "./RaindropSettingsPanel";

// ============================================================================
// TYPES
// ============================================================================

type StatusType = 'success' | 'error' | null;

interface StatusMessage {
  type: StatusType;
  message: string;
}

type SettingsSection = 'github' | 'graphql' | 'general' | 'unsplash' | 'ai' | 'webhook' | 'raindrop';

// ============================================================================
// MAIN UNIFIED SETTINGS PANEL
// ============================================================================

export function UnifiedSettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('github');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="h-full flex flex-row overflow-hidden">
      {/* Mini Drawer Sidebar - Works for all screen sizes */}
      <div 
        className={cn(
          "flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 transition-all duration-200 ease-in-out flex-shrink-0",
          sidebarExpanded ? "w-52" : "w-14"
        )}
      >
        <div className="p-2 sm:p-3 flex-1">
          {/* Toggle Button & Header */}
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "text-xs font-semibold text-gray-400 uppercase tracking-wider overflow-hidden whitespace-nowrap transition-all duration-200",
              sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>
              Settings
            </div>
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarExpanded ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>
          <nav className="space-y-1">
            <SettingsNavItem
              icon={Bot}
              label="AI Providers"
              expanded={sidebarExpanded}
              active={activeSection === 'ai'}
              onClick={() => setActiveSection('ai')}
            />
            <SettingsNavItem
              icon={RaindropIcon}
              label="Raindrop"
              expanded={sidebarExpanded}
              active={activeSection === 'raindrop'}
              onClick={() => setActiveSection('raindrop')}
            />
            <SettingsNavItem
              icon={Github}
              label="GitHub"
              expanded={sidebarExpanded}
              active={activeSection === 'github'}
              onClick={() => setActiveSection('github')}
            />
            <SettingsNavItem
              icon={GraphQLIcon}
              label="GraphQL"
              expanded={sidebarExpanded}
              active={activeSection === 'graphql'}
              onClick={() => setActiveSection('graphql')}
            />
            <SettingsNavItem
              icon={UnsplashIcon}
              label="Unsplash"
              expanded={sidebarExpanded}
              active={activeSection === 'unsplash'}
              onClick={() => setActiveSection('unsplash')}
            />
            <SettingsNavItem
              icon={VSCodeIcon}
              label="Webhook"
              expanded={sidebarExpanded}
              active={activeSection === 'webhook'}
              onClick={() => setActiveSection('webhook')}
            />
            <SettingsNavItem
              icon={Settings}
              label="General"
              expanded={sidebarExpanded}
              active={activeSection === 'general'}
              onClick={() => setActiveSection('general')}
            />
          </nav>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        {activeSection === 'ai' && <AISettingsSection />}
        {activeSection === 'raindrop' && <RaindropSettingsSection />}
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
// SIDEBAR NAVIGATION ITEM (Mini Drawer Style)
// ============================================================================

interface SettingsNavItemProps {
  icon: React.ElementType;
  label: string;
  expanded: boolean;
  active: boolean;
  onClick: () => void;
}

function SettingsNavItem({ icon: Icon, label, expanded, active, onClick }: SettingsNavItemProps) {
  const buttonContent = (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200",
        active
          ? "bg-primary/10 text-primary"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary")} />
      <span 
        className={cn(
          "text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200",
          expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
        )}
      >
        {label}
      </span>
    </button>
  );

  // Show tooltip only when sidebar is collapsed
  if (!expanded) {
    return (
      <Tooltip content={label} side="right">
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
}

// ============================================================================
// GITHUB SETTINGS SECTION
// ============================================================================

export function GitHubSettingsSection() {
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            GitHub Integration
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create issues directly from error logs
        </p>
      </div>

      {/* Status Messages */}
      {(saveStatus.type || testStatus.type) && (
        <div className="mb-5 space-y-2">
          {saveStatus.type && <StatusBanner type={saveStatus.type} message={saveStatus.message} />}
          {testStatus.type && <StatusBanner type={testStatus.type} message={testStatus.message} />}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="github-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            GitHub Username <span className="text-destructive">*</span>
          </label>
          <input
            id="github-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="octocat"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Repository */}
        <div>
          <label htmlFor="github-repo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
            placeholder="owner/repo-name or full GitHub URL"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm transition-all"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            URLs auto-normalized to <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">owner/repo</code>
          </p>
        </div>

        {/* Personal Access Token */}
        <div>
          <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Personal Access Token <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="github-token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Requires <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">repo</code> scope •{" "}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=DevConsole"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Create token ↗
            </a>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={handleTest}
          disabled={isTesting}
          className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTesting ? <Loader className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {isTesting ? "Testing..." : "Test"}
        </button>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-all border border-destructive/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// GRAPHQL SETTINGS SECTION
// ============================================================================

export function GraphQLSettingsSection() {
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
          <div className="p-2 bg-[#E10098] rounded-lg">
            <GraphQLIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            GraphQL Explorer
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure your GraphQL endpoint for the interactive explorer
        </p>
      </div>

      {/* Status Messages */}
      {(saveStatus.type || testStatus.type) && (
        <div className="mb-5 space-y-2">
          {saveStatus.type && <StatusBanner type={saveStatus.type} message={saveStatus.message} />}
          {testStatus.type && <StatusBanner type={testStatus.type} message={testStatus.message} />}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Endpoint URL */}
        <div>
          <label htmlFor="graphql-endpoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            GraphQL Endpoint URL <span className="text-destructive">*</span>
          </label>
          <input
            id="graphql-endpoint"
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.example.com/graphql or /graphql"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono text-sm transition-all"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Absolute URL or relative path (e.g., <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">/graphql</code> uses current domain)
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={handleTest}
          disabled={isTesting}
          className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTesting ? <Loader className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {isTesting ? "Testing..." : "Test"}
        </button>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-all border border-destructive/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// UNSPLASH SETTINGS SECTION
// ============================================================================

export function UnsplashSettingsSection() {
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
          <div className="p-2 bg-black rounded-lg">
            <UnsplashIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Unsplash Integration
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure Unsplash API for autofill image inputs
        </p>
      </div>

      {/* Status Messages */}
      {saveStatus.type && (
        <div className="mb-5">
          <StatusBanner type={saveStatus.type} message={saveStatus.message} />
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Access Key */}
        <div>
          <label htmlFor="unsplash-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Unsplash Access Key{" "}
            <span className="text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              id="unsplash-key"
              type={showAccessKey ? "text" : "password"}
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Your Unsplash access key"
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 font-mono text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowAccessKey(!showAccessKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label={showAccessKey ? "Hide access key" : "Show access key"}
            >
              {showAccessKey ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave blank to use default key •{" "}
            <a
              href="https://unsplash.com/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Get free key ↗
            </a>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-all border border-destructive/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// GENERAL SETTINGS SECTION
// ============================================================================

export function GeneralSettingsSection() {
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

export function WebhookSettingsSection() {
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
          <div className="p-2 bg-[#007ACC] rounded-lg">
            <VSCodeIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Webhook Copilot
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Automate VS Code and trigger Copilot actions from notes
        </p>
      </div>

      {/* Status Banners */}
      {(testStatus.type || saveStatus.type) && (
        <div className="mb-5 space-y-2">
          {testStatus.type && <StatusBanner type={testStatus.type} message={testStatus.message} />}
          {saveStatus.type && <StatusBanner type={saveStatus.type} message={saveStatus.message} />}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Webhook URL
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="http://localhost:9090/webhook"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Default: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">localhost:9090/webhook</code>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !webhookUrl}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={handleTestConnection}
          disabled={isTestingConnection || !webhookUrl}
          className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTestingConnection ? <Loader className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {isTestingConnection ? "Testing..." : "Test"}
        </button>
      </div>

      {/* Quick Help */}
      <div className="mt-6 p-3 bg-info/5 border border-info/20 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong className="text-gray-800 dark:text-gray-200">Setup:</strong> Install Webhook Copilot extension in VS Code → Run "Start Server" command → Test connection
        </p>
      </div>

      {/* Available Actions */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Available Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {['Execute Task', 'Copilot Chat', 'Create File', 'Modify File', 'Run Command', 'Query Workspace'].map((action) => (
            <div
              key={action}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              {action}
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

export function AISettingsSection() {
  return <AISettingsPanel />;
}

// ============================================================================
// RAINDROP SETTINGS SECTION
// ============================================================================

export function RaindropSettingsSection() {
  return <RaindropSettingsPanel />;
}
