/**
 * PreCallView Component
 * Pre-call lobby with mode selection and forms
 */

import { Loader2, Video, X } from 'lucide-react';
import { CreateCallForm } from './CreateCallForm';
import { JoinCallForm } from './JoinCallForm';
import { ModeSelector } from './ModeSelector';

export type JoinMode = 'create' | 'join' | null;

interface RaindropMemorySettings {
  enabled: boolean;
  apiKey: string;
}

interface PreCallViewProps {
  joinMode: JoinMode;
  isConnecting: boolean;
  error: string | null;
  displayName: string;
  joinRoomName: string;
  onModeSelect: (mode: JoinMode) => void;
  onDisplayNameChange: (name: string) => void;
  onJoinRoomNameChange: (name: string) => void;
  onStartCall: (memorySettings?: RaindropMemorySettings) => void;
  onJoinCall: () => void;
  onDismissError: () => void;
  onClose: () => void;
  /** Initial memory settings from local Raindrop config (for prefilling the form) */
  initialMemorySettings?: RaindropMemorySettings;
}

export function PreCallView({
  joinMode,
  isConnecting,
  error,
  displayName,
  joinRoomName,
  onModeSelect,
  onDisplayNameChange,
  onJoinRoomNameChange,
  onStartCall,
  onJoinCall,
  onDismissError,
  onClose,
  initialMemorySettings,
}: PreCallViewProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Video Call</h1>
                <p className="text-sm text-gray-400">DevConsole</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={onDismissError}
              className="text-xs text-red-400 hover:underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Connecting State */}
        {isConnecting && (
          <div className="flex items-center justify-center gap-3 p-6 bg-gray-800 rounded-xl border border-gray-700">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-sm text-gray-300">Connecting...</span>
          </div>
        )}

        {/* Mode Selection */}
        {!isConnecting && joinMode === null && (
          <ModeSelector
            onSelectCreate={() => onModeSelect('create')}
            onSelectJoin={() => onModeSelect('join')}
          />
        )}

        {/* Create Room Form */}
        {!isConnecting && joinMode === 'create' && (
          <CreateCallForm
            displayName={displayName}
            onDisplayNameChange={onDisplayNameChange}
            onBack={() => onModeSelect(null)}
            onSubmit={onStartCall}
            initialMemorySettings={initialMemorySettings}
          />
        )}

        {/* Join Room Form */}
        {!isConnecting && joinMode === 'join' && (
          <JoinCallForm
            roomName={joinRoomName}
            displayName={displayName}
            onRoomNameChange={onJoinRoomNameChange}
            onDisplayNameChange={onDisplayNameChange}
            onBack={() => onModeSelect(null)}
            onSubmit={onJoinCall}
          />
        )}
      </div>
    </div>
  );
}
