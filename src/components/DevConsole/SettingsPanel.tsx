/**
 * Settings Panel Component
 * Allows users to configure GitHub integration and other extension settings
 */

import { AlertCircle, Check, CheckCircle, Eye, EyeOff, Github, HelpCircle, Image, Loader2, Save, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { testGitHubConnection } from '../../lib/devConsole/githubApi';
import { cn } from '../../utils';
import { loadGitHubConfig, loadUnsplashConfig, saveGitHubConfig, saveUnsplashConfig, type GitHubConfig, type UnsplashConfig } from '../../utils/extensionSettings';

type SettingsSection = 'github' | 'unsplash';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GitHubConfig) => void;
}

// Helper to extract owner/repo from GitHub URL or owner/repo format
function extractRepoFromInput(input: string): string {
  const trimmed = input.trim();
  
  // Match GitHub URLs like:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // git@github.com:owner/repo.git
  // github.com/owner/repo
  const httpsPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+\/[^\/\s]+?)(?:\.git)?(?:\/.*)?$/i;
  const sshPattern = /git@github\.com:([^\/]+\/[^\/\s]+?)(?:\.git)?$/i;
  
  const httpsMatch = trimmed.match(httpsPattern);
  if (httpsMatch) {
    return httpsMatch[1].replace(/\.git$/, '');
  }
  
  const sshMatch = trimmed.match(sshPattern);
  if (sshMatch) {
    return sshMatch[1].replace(/\.git$/, '');
  }
  
  // Already in owner/repo format
  return trimmed;
}

// Validate repo format (owner/repo)
function validateRepoFormat(repo: string): { valid: boolean; error?: string } {
  if (!repo) {
    return { valid: true }; // Empty is valid (not required yet)
  }
  
  const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!pattern.test(repo)) {
    return { valid: false, error: 'Format should be owner/repo (e.g., facebook/react)' };
  }
  
  return { valid: true };
}

export function SettingsPanel({ isOpen, onClose, onSave }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('github');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [username, setUsername] = useState('');
  const [repo, setRepo] = useState('');
  const [repoValidation, setRepoValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
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
      
      // Reset states when opening
      setSaveStatus('idle');
      setTestStatus(null);
      setShowToken(false);
    }
  }, [isOpen]);

  // Real-time repo validation
  const handleRepoChange = useCallback((value: string) => {
    // Auto-extract owner/repo from GitHub URL
    const extracted = extractRepoFromInput(value);
    setRepo(extracted);
    
    // Validate format in real-time
    const validation = validateRepoFormat(extracted);
    setRepoValidation(validation);
  }, []);

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

  const isGitHubComplete = username && repo && token && repoValidation.valid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content with Mini Drawer Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mini Drawer Navigation */}
          <div 
            className={cn(
              'border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col py-2 transition-all duration-200 ease-out',
              sidebarExpanded ? 'w-36' : 'w-12'
            )}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
          >
            {/* GitHub Nav Item */}
            <button
              onClick={() => setActiveSection('github')}
              className={cn(
                'relative mx-1.5 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all overflow-hidden whitespace-nowrap',
                activeSection === 'github'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
              )}
              title={!sidebarExpanded ? 'GitHub' : undefined}
            >
              <Github className="w-4 h-4 flex-shrink-0" />
              <span className={cn('text-sm transition-opacity duration-150', sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0')}>
                GitHub
              </span>
              {isGitHubComplete && (
                <div className={cn(
                  'w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0',
                  sidebarExpanded ? 'ml-auto' : 'absolute top-1.5 right-1.5'
                )} />
              )}
            </button>

            {/* Unsplash Nav Item */}
            <button
              onClick={() => setActiveSection('unsplash')}
              className={cn(
                'relative mx-1.5 mt-0.5 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all overflow-hidden whitespace-nowrap',
                activeSection === 'unsplash'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
              )}
              title={!sidebarExpanded ? 'Unsplash' : undefined}
            >
              <Image className="w-4 h-4 flex-shrink-0" />
              <span className={cn('text-sm transition-opacity duration-150', sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0')}>
                Unsplash
              </span>
              {unsplashKey && (
                <div className={cn(
                  'w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0',
                  sidebarExpanded ? 'ml-auto' : 'absolute top-1.5 right-1.5'
                )} />
              )}
            </button>
          </div>

          {/* Right Content */}
          <div className="flex-1 overflow-y-auto">
            {/* GitHub Section */}
            {activeSection === 'github' && (
              <div className="p-5 space-y-5">
                {/* Section Header with Toggle-like feel */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-gray-900 dark:bg-white rounded-md">
                      <Github className="w-4 h-4 text-white dark:text-gray-900" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        GitHub
                      </h3>
                      <p className="text-xs text-gray-500">Create issues from logs</p>
                    </div>
                  </div>
                  {/* Status indicator */}
                  <div className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    isGitHubComplete
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  )}>
                    {isGitHubComplete ? 'Connected' : 'Not configured'}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Username - Simple inline */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your-username"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Repository with inline validation */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Repository
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={repo}
                        onChange={(e) => handleRepoChange(e.target.value)}
                        placeholder="owner/repo or paste URL"
                        className={cn(
                          'w-full px-3 py-2 pr-8 text-sm bg-white dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors',
                          !repoValidation.valid && repo
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-200 focus:border-red-400'
                            : 'border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary'
                        )}
                      />
                      {/* Inline validation indicator */}
                      {repo && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {repoValidation.valid && repo.includes('/') ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : !repoValidation.valid ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {!repoValidation.valid && repo && (
                      <p className="text-xs text-red-500 mt-1">{repoValidation.error}</p>
                    )}
                  </div>

                  {/* Token with inline test */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Personal Access Token
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          onPaste={() => setShowToken(false)}
                          placeholder="ghp_xxxx..."
                          className="w-full px-3 py-2 pr-9 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleTest}
                        disabled={isTesting || !username || !repo || !token || !repoValidation.valid}
                        className="px-3 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                      >
                        {isTesting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=DevConsole"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Create token
                      </a>
                      {' '}with <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">repo</code> scope
                    </p>
                  </div>
                </div>

                {/* Test Result - Compact */}
                {testStatus && (
                  <div
                    className={cn(
                      'p-3 rounded-lg text-sm flex items-center gap-2',
                      testStatus.valid
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    )}
                  >
                    {testStatus.valid ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">
                      {testStatus.valid ? 'Connection successful' : testStatus.error}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Unsplash Section */}
            {activeSection === 'unsplash' && (
              <div className="p-5 space-y-5">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-gradient-to-br from-pink-500 to-orange-400 rounded-md">
                      <Image className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Unsplash
                      </h3>
                      <p className="text-xs text-gray-500">Autofill images</p>
                    </div>
                  </div>
                  {/* Status indicator */}
                  <div className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    unsplashKey
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  )}>
                    {unsplashKey ? 'Custom key' : 'Using default'}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Access Key
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showUnsplashKey ? 'text' : 'password'}
                        value={unsplashKey}
                        onChange={(e) => setUnsplashKey(e.target.value)}
                        placeholder="Leave blank to use default"
                        className="w-full px-3 py-2 pr-9 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnsplashKey(!showUnsplashKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showUnsplashKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      <a
                        href="https://unsplash.com/developers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Get API key
                      </a>
                      {' '}• Free tier: 50 req/hour
                    </p>
                  </div>
                </div>

                {/* Info note */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Unsplash provides random images for autofill. A default key is included but has shared rate limits.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="min-h-[20px]">
            {saveStatus === 'success' && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                <Check className="w-3.5 h-3.5" />
                Saved
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Save failed
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || ((!username || !repo || !token || !repoValidation.valid) && !unsplashKey)}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
