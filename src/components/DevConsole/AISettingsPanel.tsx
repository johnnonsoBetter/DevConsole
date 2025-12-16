/**
 * AI Settings Panel - Clean & Minimal
 * Configure AI provider and model in a simple, focused UI
 */

import { Check, ExternalLink, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAI } from '../../hooks/useAI';
import { AI_PROVIDERS, getProviderModels } from '../../lib/ai/constants';
import type { AIProvider } from '../../lib/ai/types';
import { cn } from '../../utils';
import { useAISettingsStore } from '../../utils/stores/aiSettings';

export function AISettingsPanel() {
  const {
    enabled,
    provider,
    model,
    apiKey,
    setEnabled,
    setProvider,
    setModel,
    setApiKey,
  } = useAISettingsStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const { generate, isLoading: testing, isConfigured } = useAI({
    onComplete: () => setTestResult({ ok: true, msg: 'Connected!' }),
    onError: (e) => setTestResult({ ok: false, msg: e.message.slice(0, 50) }),
  });

  const selectedProvider = AI_PROVIDERS.find(p => p.id === provider);
  const models = getProviderModels(provider);

  const handleProviderChange = (id: AIProvider) => {
    setProvider(id);
    setTestResult(null);
    const providerModels = getProviderModels(id);
    if (providerModels.length > 0) {
      setModel(providerModels[0].id);
    }
  };

  const testConnection = useCallback(async () => {
    if (!isConfigured) return;
    setTestResult(null);
    try {
      await generate('Say "ok"');
    } catch {
      // handled by onError
    }
  }, [isConfigured, generate]);

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {enabled && isConfigured ? '✓ Ready' : 'Configure your AI provider'}
              </p>
            </div>
          </div>
          
          {/* Enable Toggle */}
          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              enabled ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
            )}
          >
            <span className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              enabled && "translate-x-5"
            )} />
          </button>
        </div>

        {enabled && (
          <>
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderChange(p.id)}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all text-left",
                      provider === p.id
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {provider === p.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className="text-xl mb-1">{p.icon}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
              <div className="space-y-2">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={cn(
                      "w-full p-3 rounded-lg border-2 transition-all text-left",
                      model === m.id
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</div>
                      {model === m.id && (
                        <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                <a
                  href={selectedProvider?.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                  className="w-full px-3 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Connection */}
            {apiKey && (
              <div className="flex items-center gap-3">
                <button
                  onClick={testConnection}
                  disabled={testing || !isConfigured}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    "bg-violet-500 hover:bg-violet-600 text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {testing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Testing...
                    </span>
                  ) : 'Test Connection'}
                </button>
                
                {testResult && (
                  <span className={cn(
                    "text-sm",
                    testResult.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {testResult.ok ? '✓' : '✗'} {testResult.msg}
                  </span>
                )}
              </div>
            )}

            {/* Status */}
            <div className={cn(
              "p-3 rounded-lg text-sm",
              isConfigured
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            )}>
              {isConfigured
                ? `✓ Ready to use ${selectedProvider?.name} - ${models.find(m => m.id === model)?.name}`
                : '⚠ Enter your API key to enable AI features'}
            </div>
          </>
        )}

        {!enabled && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enable AI to unlock smart features</p>
            <p className="text-xs mt-1">Log explanations, code analysis, and more</p>
          </div>
        )}
      </div>
    </div>
  );
}
