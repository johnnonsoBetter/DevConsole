/**
 * useLiveKitRoom Hook
 * Provides LiveKit room functionality with React integration
 */

import { useCallback, useEffect, useRef } from "react";
import { useCallSessionStore } from "../utils/stores/callSession";

// ============================================================================
// HOOK
// ============================================================================

export function useLiveKitRoom() {
  const hasInitialized = useRef(false);

  // Store state
  const status = useCallSessionStore((s) => s.status);
  const roomName = useCallSessionStore((s) => s.roomName);
  const participants = useCallSessionStore((s) => s.participants);
  const localParticipant = useCallSessionStore((s) => s.localParticipant);
  const isAudioEnabled = useCallSessionStore((s) => s.isAudioEnabled);
  const isVideoEnabled = useCallSessionStore((s) => s.isVideoEnabled);
  const isScreenSharing = useCallSessionStore((s) => s.isScreenSharing);
  const connectionState = useCallSessionStore((s) => s.connectionState);
  const error = useCallSessionStore((s) => s.error);
  const settings = useCallSessionStore((s) => s.settings);
  const settingsLoaded = useCallSessionStore((s) => s.settingsLoaded);
  const isConfigured = useCallSessionStore((s) => s.isConfigured);
  const client = useCallSessionStore((s) => s.client);

  // Store actions
  const loadSettings = useCallSessionStore((s) => s.loadSettings);
  const updateSettings = useCallSessionStore((s) => s.updateSettings);
  const createRoom = useCallSessionStore((s) => s.createRoom);
  const joinRoom = useCallSessionStore((s) => s.joinRoom);
  const leaveCall = useCallSessionStore((s) => s.leaveCall);
  const toggleAudio = useCallSessionStore((s) => s.toggleAudio);
  const toggleVideo = useCallSessionStore((s) => s.toggleVideo);
  const toggleScreenShare = useCallSessionStore((s) => s.toggleScreenShare);
  const clearError = useCallSessionStore((s) => s.clearError);

  // Initialize on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadSettings();
    }
  }, [loadSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Disconnect when component unmounts if in a call
      if (status === "connected" || status === "connecting") {
        leaveCall();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived state
  const isInCall = status === "connected";
  const isConnecting = status === "connecting";
  const isReconnecting = status === "reconnecting";
  const hasError = !!error;
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const participantCount = participants.length;

  // Start a new call (create room)
  const startCall = useCallback(
    async (displayName?: string) => {
      const result = await createRoom(displayName);
      if ("error" in result) {
        return { success: false, error: result.error };
      }
      return { success: true, roomName: result.roomName };
    },
    [createRoom]
  );

  // Join an existing call
  const joinCall = useCallback(
    async (room: string, displayName?: string) => {
      return joinRoom(room, displayName);
    },
    [joinRoom]
  );

  // End the current call
  const endCall = useCallback(async () => {
    await leaveCall();
  }, [leaveCall]);

  // Get the LiveKit Room instance (for advanced use cases)
  const getRoom = useCallback(() => {
    return client?.getRoom() || null;
  }, [client]);

  return {
    // Connection state
    status,
    roomName,
    isInCall,
    isConnecting,
    isReconnecting,
    connectionState,

    // Participants
    participants,
    localParticipant,
    remoteParticipants,
    participantCount,

    // Media state
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,

    // Error state
    error,
    hasError,
    clearError,

    // Configuration
    settings,
    settingsLoaded,
    isConfigured,
    updateSettings,

    // Actions
    startCall,
    joinCall,
    endCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,

    // Advanced
    getRoom,
    client,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type UseLiveKitRoomReturn = ReturnType<typeof useLiveKitRoom>;
