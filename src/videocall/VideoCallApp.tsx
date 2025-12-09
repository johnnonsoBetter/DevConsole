/**
 * VideoCallApp Component
 * Full video call experience in a popup window with media permissions
 * 
 * Simplified: No local LiveKit settings required.
 * Token server provides both token and serverUrl.
 */

import '@livekit/components-styles';
import { useCallback } from 'react';
import {
  InCallView,
  LoadingView,
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
    isReady,
    callStatus,
    token,
    serverUrl,
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
  if (!isReady) {
    return <LoadingView />;
  }

  // ============================================================================
  // RENDER: In-call view
  // ============================================================================
  if (callStatus === 'connected' && token && roomName && serverUrl) {
    return (
      <InCallView
        token={token}
        roomName={roomName}
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
