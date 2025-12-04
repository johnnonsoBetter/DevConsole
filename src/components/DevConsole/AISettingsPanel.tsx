/**
 * AI Settings Panel Component
 * Configure AI providers, models, and API keys
 */

import { AlertCircle, Bot, Brain, Check, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Eye, EyeOff, Github, Info, Key, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';
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
    temperature,
    maxTokens,
    useGateway,
    gatewayApiKey,
    setEnabled,
    setProvider,
    setModel,
    setApiKey,
    updateSettings,
    setUseGateway,
    setGatewayApiKey,
  } = useAISettingsStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [showGatewayKey, setShowGatewayKey] = useState(false);
  const [showFeatureDetails, setShowFeatureDetails] = useState(false);

  // Note: Settings are loaded globally in DevConsolePanel on mount

  const selectedProvider = AI_PROVIDERS.find(p => p.id === provider);
  const availableModels = getProviderModels(provider);

  // Configuration status
  const isConfigured = useGateway 
    ? Boolean(gatewayApiKey) 
    : Boolean(apiKey);
  const isFullyConfigured = enabled && isConfigured && model;

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    // Auto-select first model of new provider
    const models = getProviderModels(newProvider);
    if (models.length > 0) {
      setModel(models[0].id);
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        {/* Header with Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  AI Provider Settings
                </h2>
                {isFullyConfigured && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Configured</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Configure AI providers and models for enhanced development features
              </p>
            </div>
          </div>

          {/* Enable/Disable Toggle with Feature Details */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  enabled ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-200 dark:bg-gray-700"
                )}>
                  <Sparkles className={cn(
                    "w-5 h-5 transition-colors",
                    enabled ? "text-green-600 dark:text-green-400" : "text-gray-400"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      AI Features
                    </span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      enabled 
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      {enabled ? 'On' : 'Off'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowFeatureDetails(!showFeatureDetails)}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mt-1"
                  >
                    {showFeatureDetails ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Hide features
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Show what AI enables
                      </>
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={cn(
                  "relative flex h-7 w-12 items-center rounded-full transition-all shadow-sm",
                  enabled ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                )}
                aria-label={enabled ? "Disable AI features" : "Enable AI features"}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
                    enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Feature Details Dropdown */}
            {showFeatureDetails && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3 animate-in slide-in-from-top-2">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                  When enabled, AI powers these features:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">Error Analysis</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Smart error explanations & solutions</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">Log Summarization</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Quick insights from console logs</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Github className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">Issue Generation</div>
                      <div className="text-xs text-gray-400">AI-powered GitHub issues</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gateway Option */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Vercel AI Gateway
                </h3>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Unified access to multiple providers with automatic fallbacks and usage tracking
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Gateway Toggle */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-lg border transition-colors",
              useGateway 
                ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" 
                : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            )}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Use AI Gateway
                  </span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    useGateway 
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  )}>
                    {useGateway ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {useGateway ? 'Using centralized gateway' : 'Direct provider connection'}
                </p>
              </div>
              <button
                onClick={() => setUseGateway(!useGateway)}
                disabled={!enabled}
                className={cn(
                  "relative flex h-6 w-11 items-center rounded-full transition-all shadow-sm",
                  useGateway ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 dark:bg-gray-600",
                  !enabled && "opacity-40 cursor-not-allowed"
                )}
                aria-label={useGateway ? "Disable AI Gateway" : "Enable AI Gateway"}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform",
                    useGateway ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Gateway API Key */}
            {useGateway && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gateway API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showGatewayKey ? "text" : "password"}
                    value={gatewayApiKey}
                    onChange={(e) => setGatewayApiKey(e.target.value)}
                    disabled={!enabled}
                    placeholder="ai_gateway_..."
                    className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGatewayKey(!showGatewayKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showGatewayKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get your API key from{' '}
                  <a
                    href="https://vercel.com/docs/ai-gateway"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Vercel AI Gateway
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex gap-2 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Recommended:</strong> AI Gateway provides automatic fallbacks, usage tracking, and access to multiple providers without installing separate packages.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Select AI Provider
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose from {AI_PROVIDERS.length} available providers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AI_PROVIDERS.map((p) => {
              const isSelected = provider === p.id;
              const isDisabled = !enabled || (useGateway && !gatewayApiKey);
              
              return (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  disabled={isDisabled}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all text-left group",
                    isSelected
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm",
                    isDisabled && "opacity-40 cursor-not-allowed hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-none"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 pr-8">
                    <div className="text-2xl flex-shrink-0" role="img" aria-label={p.name}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          <Bot className="w-3 h-3" />
                          {p.models.length} model{p.models.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        {selectedProvider && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Choose Model
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {availableModels.length} {selectedProvider.name} model{availableModels.length !== 1 ? 's' : ''} available
              </p>
            </div>
            
            <div className="space-y-3">
              {availableModels.map((m) => {
                const isSelected = model === m.id;
                const isDisabled = !enabled || (useGateway && !gatewayApiKey);
                
                return (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left group",
                      isSelected
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/30 dark:from-blue-900/20 dark:to-blue-900/5 shadow-md"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm",
                      isDisabled && "opacity-40 cursor-not-allowed hover:border-gray-200 dark:hover:border-gray-700"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={cn(
                            "font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
                            isDisabled && "group-hover:text-gray-900 dark:group-hover:text-gray-100"
                          )}>
                            {m.name}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                          {m.description}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md font-medium">
                            <Bot className="w-3 h-3" />
                            {m.contextWindow.toLocaleString()} tokens
                          </span>
                          {m.inputPricing && (
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md font-medium">
                              In: {m.inputPricing}
                            </span>
                          )}
                          {m.outputPricing && (
                            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md font-medium">
                              Out: {m.outputPricing}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* API Key Configuration */}
        {!useGateway && selectedProvider?.requiresApiKey && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              API Configuration
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedProvider.name} API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={!enabled}
                    placeholder="sk-..."
                    className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get your API key from{' '}
                  <a
                    href={selectedProvider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {selectedProvider.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Security:</strong> Your API key is stored locally in your browser and never sent to our servers. It's only used to make requests directly to {selectedProvider.name}.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Advanced Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fine-tune AI behavior and response characteristics
            </p>
          </div>
          
          <div className="space-y-5">
            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Temperature
                </label>
                <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                  {(temperature || 0.7).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                disabled={!enabled}
                className="w-full h-2 bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-900 dark:to-purple-900 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed slider-thumb"
                style={{
                  background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((temperature || 0.7) / 2) * 100}%, rgb(229 231 235) ${((temperature || 0.7) / 2) * 100}%, rgb(229 231 235) 100%)`
                }}
              />
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Precise</span> - Focused & consistent
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Creative</span> - Varied & exploratory
                </span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Max Response Tokens
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={maxTokens}
                  onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
                  disabled={!enabled}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  tokens
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Controls response length • Higher values allow longer responses but cost more
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        <div className={cn(
          "p-5 rounded-xl border-2 transition-all shadow-sm",
          !enabled
            ? "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            : isFullyConfigured
            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700"
            : "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-300 dark:border-orange-700"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md",
              !enabled
                ? "bg-gray-300 dark:bg-gray-700"
                : isFullyConfigured
                ? "bg-gradient-to-br from-green-500 to-emerald-500"
                : "bg-gradient-to-br from-orange-500 to-yellow-500"
            )}>
              {!enabled ? (
                <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : isFullyConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <AlertCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "font-semibold",
                  !enabled
                    ? "text-gray-700 dark:text-gray-300"
                    : isFullyConfigured
                    ? "text-green-900 dark:text-green-100"
                    : "text-orange-900 dark:text-orange-100"
                )}>
                  {!enabled
                    ? 'AI Features Disabled'
                    : isFullyConfigured
                    ? 'Ready to Use'
                    : 'Configuration Required'}
                </span>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  !enabled
                    ? "bg-gray-500"
                    : isFullyConfigured
                    ? "bg-green-500"
                    : "bg-orange-500"
                )} />
              </div>
              <p className={cn(
                "text-sm leading-relaxed",
                !enabled
                  ? "text-gray-600 dark:text-gray-400"
                  : isFullyConfigured
                  ? "text-green-700 dark:text-green-300"
                  : "text-orange-700 dark:text-orange-300"
              )}>
                {!enabled
                  ? 'Enable AI features above to start using intelligent error analysis, log summarization, and GitHub issue generation'
                  : isFullyConfigured
                  ? `Connected to ${selectedProvider?.name} • ${availableModels.find(m => m.id === model)?.name || 'Model'} ready for AI-powered features`
                  : useGateway
                  ? 'Please provide your AI Gateway API key to continue'
                  : 'Please provide your API key to continue'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
