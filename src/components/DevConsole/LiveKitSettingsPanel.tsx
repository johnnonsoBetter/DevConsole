import {
    AlertCircle,
    CheckCircle,
    Code,
    Copy,
    ExternalLink,
    Globe,
    Info,
    Key,
    RotateCcw,
    Save,
    Server,
    User,
    Video
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
    loadLiveKitSettings,
    saveLiveKitSettings
} from '../../lib/livekit/roomManager';
import type { LiveKitSettings } from '../../lib/livekit/types';

interface LiveKitSettingsPanelProps {
  className?: string;
}

const DEFAULT_SETTINGS: LiveKitSettings = {
  enabled: false,
  serverUrl: '',
  tokenServerUrl: '',
  displayName: '',
};

// Example token server code for documentation
const TOKEN_SERVER_EXAMPLE = `// Example Node.js token server (Express)
import { AccessToken } from 'livekit-server-sdk';

app.post('/api/livekit/token', (req, res) => {
  const { roomName, participantName } = req.body;
  
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: participantName }
  );
  
  token.addGrant({ 
    roomJoin: true, 
    room: roomName,
    canPublish: true,
    canSubscribe: true 
  });
  
  res.json({ token: token.toJwt() });
});`;

export const LiveKitSettingsPanel: React.FC<LiveKitSettingsPanelProps> = ({ 
  className = '' 
}) => {
  const [settings, setSettings] = useState<LiveKitSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCodeExample, setShowCodeExample] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      const loaded = await loadLiveKitSettings();
      if (loaded) {
        setSettings(loaded);
      }
    };
    load();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      await saveLiveKitSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('[LiveKit] Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSaveStatus('idle');
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const updateSetting = <K extends keyof LiveKitSettings>(
    key: K, 
    value: LiveKitSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <Video className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">LiveKit Video Calling</h3>
          <p className="text-sm text-gray-400">
            Real-time video communication for team collaboration
          </p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-amber-200 font-medium">
              Token Server Required
            </p>
            <p className="text-xs text-amber-300/80">
              LiveKit requires a <strong>server-side token endpoint</strong> for security. 
              Tokens must be generated on your backend using the{' '}
              <code className="px-1 py-0.5 bg-amber-500/20 rounded">livekit-server-sdk</code>.
              Your API keys and secrets should <strong>never</strong> be exposed to the browser.
            </p>
            <a 
              href="https://docs.livekit.io/home/get-started/authentication/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Read the LiveKit Authentication Guide
            </a>
          </div>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
            <Video className={`w-4 h-4 ${settings.enabled ? 'text-green-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Enable Video Calling</p>
            <p className="text-xs text-gray-400">Show the Video tab in DevConsole</p>
          </div>
        </div>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              settings.enabled ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Connection Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Connection Settings
        </h4>

        {/* LiveKit Server URL */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">
            LiveKit Server URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              value={settings.serverUrl}
              onChange={(e) => updateSetting('serverUrl', e.target.value)}
              placeholder="wss://your-app.livekit.cloud"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            Your LiveKit Cloud or self-hosted server WebSocket URL
          </p>
        </div>

        {/* Token Server URL */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">
            Token Server URL <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              value={settings.tokenServerUrl}
              onChange={(e) => updateSetting('tokenServerUrl', e.target.value)}
              placeholder="https://your-server.com/api/livekit/token"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            Your backend endpoint that generates LiveKit JWT tokens
          </p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={settings.displayName}
              onChange={(e) => updateSetting('displayName', e.target.value)}
              placeholder="Your Name"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            How you'll appear to other participants
          </p>
        </div>
      </div>

      {/* Token Server Setup Guide */}
      <div className="space-y-3">
        <button
          onClick={() => setShowCodeExample(!showCodeExample)}
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Code className="w-4 h-4" />
          {showCodeExample ? 'Hide' : 'Show'} Token Server Example
        </button>

        {showCodeExample && (
          <div className="relative">
            <div className="absolute top-2 right-2">
              <button
                onClick={() => copyToClipboard(TOKEN_SERVER_EXAMPLE)}
                className="p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs text-gray-300 overflow-x-auto">
              <code>{TOKEN_SERVER_EXAMPLE}</code>
            </pre>
            <p className="mt-2 text-xs text-gray-500">
              Install: <code className="px-1 py-0.5 bg-gray-800 rounded">npm install livekit-server-sdk</code>
            </p>
          </div>
        )}
      </div>

      {/* Quick Setup Steps */}
      <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 space-y-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Quick Setup Steps
        </h4>
        <ol className="space-y-2 text-xs text-gray-400 list-decimal list-inside">
          <li>
            Create a LiveKit Cloud account at{' '}
            <a 
              href="https://cloud.livekit.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              cloud.livekit.io
            </a>
          </li>
          <li>Copy your server URL (e.g., <code className="px-1 bg-gray-800 rounded">wss://your-app.livekit.cloud</code>)</li>
          <li>Get your API Key and Secret from the dashboard</li>
          <li>Create a token server endpoint on your backend (see example above)</li>
          <li>Enter the token server URL above and save</li>
        </ol>
      </div>

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          saveStatus === 'success' 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {saveStatus === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Settings saved successfully</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Failed to save settings</span>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all duration-200"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          onClick={handleReset}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  );
};

export default LiveKitSettingsPanel;
