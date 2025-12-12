/**
 * CreateCallForm Component
 * Form for starting a new video call
 */

import { Brain, Eye, EyeOff, Phone, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface RaindropMemorySettings {
  enabled: boolean;
  apiKey: string;
}

interface CreateCallFormProps {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onBack: () => void;
  onSubmit: (memorySettings?: RaindropMemorySettings) => void;
  /** Initial memory settings (e.g., from local Raindrop config) */
  initialMemorySettings?: RaindropMemorySettings;
}

// Demo API key for hackathon judges (temporary - remove after hackathon)
const DEMO_RAINDROP_KEY = import.meta.env.VITE_DEMO_RAINDROP_KEY || '';

export function CreateCallForm({
  displayName,
  onDisplayNameChange,
  onBack,
  onSubmit,
  initialMemorySettings,
}: CreateCallFormProps) {
  // Memory settings state
  const [memoryEnabled, setMemoryEnabled] = useState(initialMemorySettings?.enabled ?? false);
  const [memoryApiKey, setMemoryApiKey] = useState(initialMemorySettings?.apiKey ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [useDemoKey, setUseDemoKey] = useState(false);

  const hasDemoKey = Boolean(DEMO_RAINDROP_KEY);

  const handleUseDemoKey = () => {
    if (DEMO_RAINDROP_KEY) {
      setUseDemoKey(true);
      setMemoryEnabled(true);
      setMemoryApiKey(DEMO_RAINDROP_KEY);
    }
  };

  const handleUseOwnKey = () => {
    setUseDemoKey(false);
    setMemoryApiKey('');
  };

  const handleSubmit = () => {
    if (memoryEnabled && memoryApiKey.trim()) {
      onSubmit({ enabled: true, apiKey: memoryApiKey.trim() });
    } else {
      onSubmit(undefined);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-gray-800 rounded-xl border border-gray-700">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-900 border-gray-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50"
        />
      </div>

      {/* Raindrop Memory Section */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Call Memory</span>
          </div>
          <button
            type="button"
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              memoryEnabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                memoryEnabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mb-3">
          Enable AI-powered call memory to store transcripts and key moments. All participants will benefit from this feature.
        </p>

        {memoryEnabled && (
          <div className="space-y-3">
            {/* Demo Key Quick Enable Button */}
            {hasDemoKey && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUseDemoKey}
                  disabled={useDemoKey}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    useDemoKey 
                      ? 'bg-purple-600 text-white cursor-default' 
                      : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {useDemoKey ? 'Using Demo Key ✓' : 'Use Demo Key'}
                </button>
                {useDemoKey && (
                  <button
                    type="button"
                    onClick={handleUseOwnKey}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
                  >
                    Use Own Key
                  </button>
                )}
              </div>
            )}

            {/* API Key Input (show if no demo key or using own key) */}
            {(!hasDemoKey || !useDemoKey) && (
              <>
                <label className="block text-xs font-medium text-gray-400">
                  Raindrop API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={memoryApiKey}
                    onChange={(e) => setMemoryApiKey(e.target.value)}
                    placeholder="Enter your Raindrop API key"
                    className="w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-gray-900 border-gray-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Your API key is securely shared with participants for this call only.
                </p>
              </>
            )}

            {/* Show confirmation when using demo key */}
            {useDemoKey && (
              <p className="text-xs text-purple-400">
                ✨ Demo mode enabled - SmartMemory will power your call!
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white"
        >
          <Phone className="w-4 h-4" />
          Start Call
        </button>
      </div>
    </div>
  );
}
