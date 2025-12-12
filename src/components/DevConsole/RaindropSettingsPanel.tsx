/**
 * Raindrop Settings Panel
 * Configuration UI for LiquidMetal Raindrop SmartMemory integration
 */

import { CheckCircle, ExternalLink, HelpCircle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useRaindropSettings } from '../../hooks/useRaindropSettings';
import { RaindropIcon } from '../../icons';
import { createRaindropClient } from '../../lib/ai/services/raindropClient';
import { DEFAULT_RAINDROP_SETTINGS } from '../../lib/ai/types';
import { cn } from '../../utils';

// Demo API key for hackathon judges
const DEMO_RAINDROP_KEY = import.meta.env.VITE_DEMO_RAINDROP_KEY || '';

// ============================================================================
// COMPONENT
// ============================================================================

export function RaindropSettingsPanel() {
  const { settings, saveSettings, isLoading } = useRaindropSettings();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; needsSetup?: boolean } | null>(null);
  const [usingDemoKey, setUsingDemoKey] = useState(false);

  const hasDemoKey = Boolean(DEMO_RAINDROP_KEY);

  // Reset test result when settings change
  useEffect(() => {
    setTestResult(null);
  }, [settings.apiKey, settings.baseUrl]);

  // Check if currently using demo key
  useEffect(() => {
    if (DEMO_RAINDROP_KEY && settings.apiKey === DEMO_RAINDROP_KEY) {
      setUsingDemoKey(true);
    } else {
      setUsingDemoKey(false);
    }
  }, [settings.apiKey]);

  const handleUseDemoKey = useCallback(() => {
    if (DEMO_RAINDROP_KEY) {
      saveSettings({
        ...settings,
        enabled: true,
        apiKey: DEMO_RAINDROP_KEY,
        applicationName: 'video-call-memory',
        smartMemoryName: 'call-memory',
      });
      setUsingDemoKey(true);
    }
  }, [settings, saveSettings]);

  const handleClearDemoKey = useCallback(() => {
    saveSettings({
      ...settings,
      apiKey: '',
    });
    setUsingDemoKey(false);
  }, [settings, saveSettings]);

  const handleToggleEnabled = useCallback(() => {
    saveSettings({
      ...settings,
      enabled: !settings.enabled,
    });
  }, [settings, saveSettings]);

  const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    saveSettings({
      ...settings,
      apiKey: e.target.value,
    });
  }, [settings, saveSettings]);

  const handleSmartMemoryNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    saveSettings({
      ...settings,
      smartMemoryName: e.target.value || DEFAULT_RAINDROP_SETTINGS.smartMemoryName,
    });
  }, [settings, saveSettings]);

  const handleApplicationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    saveSettings({
      ...settings,
      applicationName: e.target.value || DEFAULT_RAINDROP_SETTINGS.applicationName,
    });
  }, [settings, saveSettings]);

  const handleTestConnection = useCallback(async () => {
    if (!settings.apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first', needsSetup: false });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const client = createRaindropClient(settings);
      const result = await client.testConnection();
      
      if (result.success) {
        setTestResult({ success: true, message: 'Connected successfully! SmartMemory is ready.', needsSetup: false });
      } else {
        setTestResult({ 
          success: false, 
          message: result.error || 'Connection failed',
          needsSetup: result.needsSetup || false,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        needsSetup: false,
      });
    } finally {
      setIsTesting(false);
    }
  }, [settings]);

  const isConfigured = settings.enabled && settings.apiKey;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
            <RaindropIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Raindrop SmartMemory
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI memory & context from LiquidMetal
            </p>
          </div>
        </div>
        
        {/* Enable Toggle */}
        <button
          onClick={handleToggleEnabled}
          className={cn(
            'relative flex h-6 w-11 items-center rounded-full transition-colors',
            settings.enabled ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
        <div className="flex gap-3">
          <HelpCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-cyan-800 dark:text-cyan-200">
            <p className="font-medium mb-1">What is Raindrop SmartMemory?</p>
            <p className="text-cyan-700 dark:text-cyan-300 mb-2">
              SmartMemory enables your AI Log Explainer to remember past debugging sessions,
              learn from your error patterns, and provide increasingly relevant suggestions over time.
            </p>
            <p className="text-cyan-600 dark:text-cyan-400 text-xs mb-2">
              <strong>Setup:</strong> You need a deployed Raindrop application with SmartMemory configured.
              The SmartMemory Name and Application Name must match your deployed configuration.
            </p>
            <a
              href="https://docs.liquidmetal.ai/tutorials/smartmemory-app-deployment/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Deployment Guide <ExternalLink className="w-3 h-3" />
            </a>
            <span className="mx-2 text-cyan-400">|</span>
            <a
              href="https://docs.liquidmetal.ai/reference/smartmemory/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              API Reference <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Settings */}
      <div className={cn('space-y-4', !settings.enabled && 'opacity-50 pointer-events-none')}>
        {/* Demo Key Quick Action */}
        {hasDemoKey && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {usingDemoKey ? 'Using Demo Key' : 'Demo Key Available'}
                </span>
              </div>
              {usingDemoKey ? (
                <button
                  onClick={handleClearDemoKey}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Use Own Key
                </button>
              ) : (
                <button
                  onClick={handleUseDemoKey}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Use Demo Key
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-purple-600 dark:text-purple-400">
              {usingDemoKey 
                ? 'Demo key is configured with video-call-memory app. Ready to use!'
                : 'Try Raindrop SmartMemory instantly with our demo key (for hackathon evaluation).'
              }
            </p>
          </div>
        )}

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Raindrop API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter your Raindrop API key"
              disabled={usingDemoKey}
              className={cn(
                'flex-1 px-3 py-2 text-sm rounded-lg border',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:ring-2 focus:ring-cyan-500 focus:border-transparent',
                usingDemoKey && 'opacity-60 cursor-not-allowed'
              )}
            />
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !settings.apiKey}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-cyan-500 hover:bg-cyan-600 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
              )}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Test'
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Get your API key from{' '}
            <a
              href="https://raindrop.run/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              raindrop.run
            </a>
          </p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={cn(
              'p-3 rounded-lg text-sm',
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : testResult.needsSetup
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            )}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {testResult.message}
            </div>
            {testResult.needsSetup && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                <p className="font-medium mb-1">Setup Required:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Deploy a Raindrop application with SmartMemory</li>
                  <li>In your <code className="px-1 bg-amber-100 dark:bg-amber-800 rounded">raindrop.manifest</code>:</li>
                </ol>
                <pre className="mt-2 p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs overflow-x-auto">
{`application "${settings.applicationName || 'your-app'}" {
  smartmemory "${settings.smartMemoryName || 'devconsole-memory'}" {}
}`}
                </pre>
                <p className="mt-2 text-xs">
                  <a href="https://docs.liquidmetal.ai/tutorials/smartmemory-app-deployment/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                    View SmartMemory Deployment Guide →
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* SmartMemory Configuration - Always visible */}
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              SmartMemory Configuration
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Must match your deployed Raindrop app
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              SmartMemory Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={settings.smartMemoryName || ''}
              onChange={handleSmartMemoryNameChange}
              placeholder={DEFAULT_RAINDROP_SETTINGS.smartMemoryName}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
              )}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The name defined in your <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">raindrop.manifest</code>: <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">smartmemory "name" {'{}'}</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Application Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={settings.applicationName || ''}
              onChange={handleApplicationNameChange}
              placeholder={DEFAULT_RAINDROP_SETTINGS.applicationName}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
              )}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your Raindrop application name: <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">application "name" {'{}'}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isConfigured ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConfigured
              ? 'SmartMemory is configured and ready'
              : settings.enabled
              ? 'Enter your API key to enable SmartMemory'
              : 'SmartMemory is disabled'}
          </span>
        </div>
      </div>

      {/* Features Preview */}
      {isConfigured && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            🧠 Memory Features Active
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Working Memory: Track current debugging session
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Episodic Memory: Remember past error patterns
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Semantic Search: Find similar past issues
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Context-Aware Explanations: Learn from history
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
