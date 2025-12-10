/**
 * VideoCallApp Component
 * Full video call experience in a popup window with media permissions
 * 
 * Simplified: No local LiveKit settings required.
 * Token server provides both token and serverUrl.
 */

import '@livekit/components-styles';
import { useCallback, useEffect, useState } from 'react';
import { getRaindropSettings } from '../hooks/useRaindropSettings';
import {
  InCallView,
  LoadingView,
  PreCallView,
} from './components';
import { useVideoCall } from './hooks';

// ============================================================================
// TYPES
// ============================================================================

interface RaindropMemorySettings {
  enabled: boolean;
  apiKey: string;
}

// ============================================================================
// MAIN APP
// ============================================================================

export function VideoCallApp() {
  // Parse URL params for room info
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomName = urlParams.get('room') || '';
  const initialMode = urlParams.get('mode') as 'create' | 'join' | null;

  // Local Raindrop settings (for prefilling the memory toggle in CreateCallForm)
  const [localRaindropSettings, setLocalRaindropSettings] = useState<RaindropMemorySettings | undefined>();

  // Load local Raindrop settings on mount
  useEffect(() => {
    getRaindropSettings().then((settings) => {
      if (settings.enabled && settings.apiKey) {
        setLocalRaindropSettings({
          enabled: true,
          apiKey: settings.apiKey,
        });
      }
    });
  }, []);

  // Use the video call hook for all state management
  const {
    isReady,
    isConnecting,
    token,
    serverUrl,
    error,
    joinRoomName,
    displayName,
    joinMode,
    setJoinRoomName,
    setDisplayName,
    setJoinMode,
    setError,
    startCall,
    joinCall,
    handleDisconnected,
    handleError,
  } = useVideoCall({
    initialRoomName,
    initialMode,
  });

  // Close window handler
  const handleClose = useCallback(() => {
    window.close();
  }, []);

  // ============================================================================
  // RENDER: Loading state
  // ============================================================================
  if (!isReady) {
    return <LoadingView />;
  }

  // ============================================================================
  // RENDER: In-call view (when we have token and serverUrl)
  // ============================================================================
  if (token && serverUrl) {
    return (
      <InCallView
        token={token}
        serverUrl={serverUrl}
        onDisconnected={handleDisconnected}
        onError={handleError}
        onClose={handleClose}
      />
    );
  }

  // ============================================================================
  // RENDER: Pre-call view
  // ============================================================================
  return (
    <PreCallView
      joinMode={joinMode}
      isConnecting={isConnecting}
      error={error}
      displayName={displayName}
      joinRoomName={joinRoomName}
      onModeSelect={setJoinMode}
      onDisplayNameChange={setDisplayName}
      onJoinRoomNameChange={setJoinRoomName}
      onStartCall={startCall}
      onJoinCall={joinCall}
      onDismissError={() => setError(null)}
      onClose={handleClose}
      initialMemorySettings={localRaindropSettings}
    />
  );
}
