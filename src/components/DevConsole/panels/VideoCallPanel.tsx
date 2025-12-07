/**
 * VideoCallPanel Component
 * Launcher for video calls - opens in a popup window to get proper media permissions
 */

import {
  Copy,
  ExternalLink,
  Loader2,
  Phone,
  Settings,
  Users,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  isLiveKitConfigured,
  loadLiveKitSettings,
  type LiveKitSettings,
} from '../../../lib/livekit';
import { cn } from '../../../utils';

// ============================================================================
// TYPES
// ============================================================================

interface VideoCallPanelProps {
  onOpenSettings?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VideoCallPanel({ onOpenSettings }: VideoCallPanelProps) {
  const [settings, setSettings] = useState<LiveKitSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [joinRoomName, setJoinRoomName] = useState('');
  const [joinMode, setJoinMode] = useState<'create' | 'join' | null>(null);

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadLiveKitSettings();
        setSettings(loaded);
        setIsConfigured(isLiveKitConfigured(loaded));
      } catch (err) {
        console.error('[VideoCallPanel] Failed to load settings:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    load();
  }, []);

  // Open video call in popup window
  const openVideoCallWindow = useCallback((mode: 'create' | 'join', roomName?: string) => {
    const width = 1000;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Build URL with params
    const url = new URL(chrome.runtime.getURL('src/videocall/index.html'));
    url.searchParams.set('mode', mode);
    if (roomName) {
      url.searchParams.set('room', roomName);
    }

    // Open popup window
    window.open(
      url.toString(),
      'DevConsoleVideoCall',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }, []);

  // Start a new call
  const handleStartCall = useCallback(() => {
    openVideoCallWindow('create');
    setJoinMode(null);
  }, [openVideoCallWindow]);

  // Join an existing call
  const handleJoinCall = useCallback(() => {
    if (!joinRoomName.trim()) return;
    openVideoCallWindow('join', joinRoomName.trim());
    setJoinMode(null);
    setJoinRoomName('');
  }, [openVideoCallWindow, joinRoomName]);

  // ============================================================================
  // RENDER: Loading state
  // ============================================================================
  if (!settingsLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Not configured state
  // ============================================================================
  if (!isConfigured || !settings) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Video Calls Not Configured
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure LiveKit settings to enable video calling. You'll need a LiveKit server URL
            and a token server to get started.
          </p>
          <button
            onClick={onOpenSettings}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
            )}
          >
            <Settings className="w-4 h-4" />
            Configure LiveKit
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Main view - Call launcher
  // ============================================================================
  return (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Video className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Video Calls
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start a new call or join an existing one. Video calls open in a separate window
            to ensure camera and microphone access.
          </p>
        </div>

        {/* Info Banner */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Video calls open in a popup window to enable camera and microphone access,
              which isn't available in DevTools panels.
            </p>
          </div>
        </div>

        {/* Action Selection */}
        {joinMode === null && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setJoinMode('create')}
              className={cn(
                'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all',
                'border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-500/5'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <span className="block font-medium text-gray-900 dark:text-gray-100">
                  Start Call
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Create a new room
                </span>
              </div>
            </button>

            <button
              onClick={() => setJoinMode('join')}
              className={cn(
                'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all',
                'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-500/5'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center">
                <span className="block font-medium text-gray-900 dark:text-gray-100">
                  Join Call
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Enter room name
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Start Call Confirmation */}
        {joinMode === 'create' && (
          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A new room will be created and you'll receive a room code to share with others.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setJoinMode(null)}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                Back
              </button>
              <button
                onClick={handleStartCall}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'bg-green-600 hover:bg-green-500 text-white'
                )}
              >
                <ExternalLink className="w-4 h-4" />
                Open Video Call
              </button>
            </div>
          </div>
        )}

        {/* Join Room Form */}
        {joinMode === 'join' && (
          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Room Name
              </label>
              <input
                type="text"
                value={joinRoomName}
                onChange={(e) => setJoinRoomName(e.target.value)}
                placeholder="Enter room name"
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border',
                  'bg-white dark:bg-gray-900',
                  'border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:ring-2 focus:ring-primary/20 focus:border-primary/30'
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinRoomName.trim()) {
                    handleJoinCall();
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setJoinMode(null)}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                Back
              </button>
              <button
                onClick={handleJoinCall}
                disabled={!joinRoomName.trim()}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'bg-blue-600 hover:bg-blue-500 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <ExternalLink className="w-4 h-4" />
                Join Call
              </button>
            </div>
          </div>
        )}

        {/* Settings Link */}
        <div className="text-center">
          <button
            onClick={onOpenSettings}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
          >
            <Settings className="w-3 h-3 inline mr-1" />
            LiveKit Settings
          </button>
        </div>
      </div>
    </div>
  );
}
