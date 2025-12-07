/**
 * VideoCallApp Component
 * Full video call experience in a popup window with media permissions
 */

import '@livekit/components-styles';
import { useCallback } from 'react';
import {
    InCallView,
    LoadingView,
    NotConfiguredView,
    PreCallView,
} from './components';
import { useVideoCall } from './hooks';

// ============================================================================
// MAIN APP
// ============================================================================

export function VideoCallApp() {
  // Parse URL params for room info
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomName = urlParams.get('room') || '';
  const initialMode = urlParams.get('mode') as 'create' | 'join' | null;

  // Use the video call hook for all state management
  const {
    settings,
    settingsLoaded,
    isConfigured,
    callStatus,
    token,
    roomName,
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
  if (!settingsLoaded) {
    return <LoadingView />;
  }

  // ============================================================================
  // RENDER: Not configured state
  // ============================================================================
  if (!isConfigured || !settings) {
    return <NotConfiguredView onClose={handleClose} />;
  }

  // ============================================================================
  // RENDER: In-call view
  // ============================================================================
  if (callStatus === 'connected' && token && roomName && settings.serverUrl) {
    return (
      <InCallView
        token={token}
        roomName={roomName}
        serverUrl={settings.serverUrl}
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
      isConnecting={callStatus === 'connecting'}
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
    />
  );
}
