/**
 * useVideoCall Hook
 * Manages video call state and operations
 */

import { useCallback, useEffect, useState } from "react";
import {
  generateRoomName,
  getJoinToken,
  isLiveKitConfigured,
  loadLiveKitSettings,
  type LiveKitSettings,
} from "../../lib/livekit";
import type { JoinMode } from "../components/PreCallView";

// ============================================================================
// TYPES
// ============================================================================

export type CallStatus = "idle" | "connecting" | "connected" | "error";

interface UseVideoCallOptions {
  initialRoomName?: string;
  initialMode?: JoinMode;
}

interface UseVideoCallReturn {
  // Settings state
  settings: LiveKitSettings | null;
  settingsLoaded: boolean;
  isConfigured: boolean;

  // Call state
  callStatus: CallStatus;
  token: string | null;
  roomName: string;
  error: string | null;

  // Form state
  joinRoomName: string;
  displayName: string;
  joinMode: JoinMode;

  // Form actions
  setJoinRoomName: (name: string) => void;
  setDisplayName: (name: string) => void;
  setJoinMode: (mode: JoinMode) => void;
  setError: (error: string | null) => void;

  // Call actions
  startCall: () => Promise<void>;
  joinCall: () => Promise<void>;
  endCall: () => void;

  // Event handlers
  handleDisconnected: () => void;
  handleError: (error: Error) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useVideoCall({
  initialRoomName = "",
  initialMode = null,
}: UseVideoCallOptions = {}): UseVideoCallReturn {
  // Settings state
  const [settings, setSettings] = useState<LiveKitSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Call state
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>(initialRoomName);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [joinRoomName, setJoinRoomName] = useState(initialRoomName);
  const [displayName, setDisplayName] = useState("");
  const [joinMode, setJoinMode] = useState<JoinMode>(initialMode);

  // Start call with specific settings
  const startCallWithSettings = useCallback(
    async (s: LiveKitSettings) => {
      setCallStatus("connecting");
      setError(null);

      try {
        const newRoomName = generateRoomName();
        const participantName =
          displayName || s.displayName || "DevConsole User";
        const newToken = await getJoinToken(s, newRoomName, participantName);

        setRoomName(newRoomName);
        setToken(newToken);
        setCallStatus("connected");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start call";
        setError(message);
        setCallStatus("error");
      }
    },
    [displayName]
  );

  // Join call with specific settings
  const joinCallWithSettings = useCallback(
    async (s: LiveKitSettings, room: string) => {
      setCallStatus("connecting");
      setError(null);

      try {
        const participantName =
          displayName || s.displayName || "DevConsole User";
        const newToken = await getJoinToken(s, room, participantName);

        setRoomName(room);
        setToken(newToken);
        setCallStatus("connected");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join call";
        setError(message);
        setCallStatus("error");
      }
    },
    [displayName]
  );

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadLiveKitSettings();
        setSettings(loaded);
        setIsConfigured(isLiveKitConfigured(loaded));
        setDisplayName(loaded.displayName || "");

        // Auto-start if mode and room provided
        if (
          initialMode === "join" &&
          initialRoomName &&
          isLiveKitConfigured(loaded)
        ) {
          joinCallWithSettings(loaded, initialRoomName);
        } else if (initialMode === "create" && isLiveKitConfigured(loaded)) {
          startCallWithSettings(loaded);
        }
      } catch (err) {
        console.error("[VideoCallApp] Failed to load settings:", err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    load();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Public start call
  const startCall = useCallback(async () => {
    if (!settings) return;
    await startCallWithSettings(settings);
  }, [settings, startCallWithSettings]);

  // Public join call
  const joinCall = useCallback(async () => {
    if (!settings || !joinRoomName.trim()) return;
    await joinCallWithSettings(settings, joinRoomName.trim());
  }, [settings, joinRoomName, joinCallWithSettings]);

  // End the call
  const endCall = useCallback(() => {
    setToken(null);
    setRoomName("");
    setCallStatus("idle");
    setJoinMode(null);
    setJoinRoomName("");
  }, []);

  // Handle LiveKit disconnect
  const handleDisconnected = useCallback(() => {
    console.log("[VideoCallApp] Disconnected from room");
    endCall();
  }, [endCall]);

  // Handle LiveKit error
  const handleError = useCallback((error: Error) => {
    console.error("[VideoCallApp] LiveKit error:", error);
    setError(error.message);
  }, []);

  return {
    // Settings state
    settings,
    settingsLoaded,
    isConfigured,

    // Call state
    callStatus,
    token,
    roomName,
    error,

    // Form state
    joinRoomName,
    displayName,
    joinMode,

    // Form actions
    setJoinRoomName,
    setDisplayName,
    setJoinMode,
    setError,

    // Call actions
    startCall,
    joinCall,
    endCall,

    // Event handlers
    handleDisconnected,
    handleError,
  };
}
