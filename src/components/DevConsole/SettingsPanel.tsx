/**
 * Settings Panel Component
 * Allows users to configure GitHub integration and other extension settings
 */

import { AlertCircle, Check, Eye, EyeOff, Github, Image, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { testGitHubConnection } from '../../lib/devConsole/githubApi';
import { loadGitHubConfig, loadUnsplashConfig, saveGitHubConfig, saveUnsplashConfig, type GitHubConfig, type UnsplashConfig } from '../../utils/extensionSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GitHubConfig) => void;
}

export function SettingsPanel({ isOpen, onClose, onSave }: SettingsPanelProps) {
  const [username, setUsername] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [unsplashKey, setUnsplashKey] = useState('');
  const [showUnsplashKey, setShowUnsplashKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<{ valid?: boolean; error?: string } | null>(null);

  // Load existing config on mount
  useEffect(() => {
    if (isOpen) {
      loadGitHubConfig().then((config) => {
        if (config) {
          setUsername(config.username || '');
          setRepo(config.repo || '');
          setToken(config.token || '');
        }
      });
      
      loadUnsplashConfig().then((config) => {
        if (config) {
          setUnsplashKey(config.accessKey || '');
        }
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Validate at least one config is provided
    const hasGitHubConfig = username && repo && token;
    const hasUnsplashConfig = unsplashKey;
    
    if (!hasGitHubConfig && !hasUnsplashConfig) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Save GitHub config if provided
      if (hasGitHubConfig) {
        const config: GitHubConfig = { username, repo, token };
        await saveGitHubConfig(config);
        onSave(config);
      }
      
      // Save Unsplash config if provided
      if (hasUnsplashConfig) {
        const unsplashConfig: UnsplashConfig = { accessKey: unsplashKey };
        await saveUnsplashConfig(unsplashConfig);
      }
      
      setSaveStatus('success');
      
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!username || !repo || !token) {
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      const config: GitHubConfig = { username, repo, token };
      const result = await testGitHubConnection(config);
      setTestStatus(result);
    } catch (error) {
      setTestStatus({ valid: false, error: 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Github className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Extension Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              GitHub Integration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure GitHub to create issues directly from error logs.
            </p>

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GitHub Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Repository */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repository
                  <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
                    (format: owner/repo)
                  </span>
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/repository"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Personal Access Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Create a token at{' '}
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    github.com/settings/tokens
                  </a>{' '}
                  with <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">repo</code> scope.
                </p>
              </div>

              {/* Test Connection Button */}
              <button
                onClick={handleTest}
                disabled={isTesting || !username || !repo || !token}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              {/* Test Status */}
              {testStatus && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2 ${
                    testStatus.valid
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {testStatus.valid ? (
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="text-sm">
                    {testStatus.valid ? (
                      <p>Connection successful! GitHub configuration is valid.</p>
                    ) : (
                      <p>Connection failed: {testStatus.error || 'Unknown error'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Unsplash Integration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Unsplash Integration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure Unsplash API for autofill image inputs. Leave blank to use default key.
            </p>

            <div className="space-y-4">
              {/* Unsplash Access Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unsplash Access Key
                  <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showUnsplashKey ? 'text' : 'password'}
                    value={unsplashKey}
                    onChange={(e) => setUnsplashKey(e.target.value)}
                    placeholder="Your Unsplash access key (optional)"
                    className="w-full px-4 py-2 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnsplashKey(!showUnsplashKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showUnsplashKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Get a free access key at{' '}
                  <a
                    href="https://unsplash.com/developers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    unsplash.com/developers
                  </a>
                  . Free tier: 50 requests/hour.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-success text-sm">
              <Check className="w-4 h-4" />
              Settings saved successfully!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              Failed to save settings
            </div>
          )}
          {saveStatus === 'idle' && <div />}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || ((!username || !repo || !token) && !unsplashKey)}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Save className="w-4 h-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
