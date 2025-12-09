/**
 * useVideoCall Hook
 * Manages video call state and operations
 *
 * Simplified: No local LiveKit settings needed.
 * Token server provides both token and serverUrl.
 */

import { useCallback, useEffect, useState } from "react";
import { generateRoomName, getJoinToken } from "../../lib/livekit";
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
  // Ready state
  isReady: boolean;

  // Call state
  callStatus: CallStatus;
  token: string | null;
  serverUrl: string | null;
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
  // Call state
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>(initialRoomName);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [joinRoomName, setJoinRoomName] = useState(initialRoomName);
  const [displayName, setDisplayName] = useState("");
  const [joinMode, setJoinMode] = useState<JoinMode>(initialMode);

  // Track if we've initialized
  const [isReady, setIsReady] = useState(false);

  // Start a new call
  const startCall = useCallback(async () => {
    setCallStatus("connecting");
    setError(null);

    try {
      const newRoomName = generateRoomName();
      const participantName = displayName.trim() || "DevConsole User";

      // Token server returns both token and serverUrl
      const response = await getJoinToken(newRoomName, participantName);

      setRoomName(newRoomName);
      setToken(response.token);
      setServerUrl(response.serverUrl);
      setCallStatus("connected");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start call";
      setError(message);
      setCallStatus("error");
    }
  }, [displayName]);

  // Join an existing call
  const joinCall = useCallback(async () => {
    if (!joinRoomName.trim()) {
      setError("Please enter a room name");
      return;
    }

    setCallStatus("connecting");
    setError(null);

    try {
      const room = joinRoomName.trim();
      const participantName = displayName.trim() || "DevConsole User";

      // Token server returns both token and serverUrl
      const response = await getJoinToken(room, participantName);

      setRoomName(room);
      setToken(response.token);
      setServerUrl(response.serverUrl);
      setCallStatus("connected");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join call";
      setError(message);
      setCallStatus("error");
    }
  }, [displayName, joinRoomName]);

  // End the call
  const endCall = useCallback(() => {
    setToken(null);
    setServerUrl(null);
    setRoomName("");
    setCallStatus("idle");
    setJoinMode(null);
    setJoinRoomName("");
  }, []);

  // Handle LiveKit disconnect
  const handleDisconnected = useCallback(() => {
    console.log("[VideoCall] Disconnected from room");
    endCall();
  }, [endCall]);

  // Handle LiveKit error
  const handleError = useCallback((error: Error) => {
    console.error("[VideoCall] LiveKit error:", error);
    setError(error.message);
  }, []);

  // Initialize on mount - handle auto-join scenarios
  useEffect(() => {
    const init = async () => {
      // Auto-start if mode provided via URL params
      if (initialMode === "join" && initialRoomName) {
        setDisplayName(""); // Will prompt for name in PreCallView
        setJoinMode("join");
        setJoinRoomName(initialRoomName);
      } else if (initialMode === "create") {
        setJoinMode("create");
      }

      setIsReady(true);
    };

    init();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // Ready state
    isReady,

    // Call state
    callStatus,
    token,
    serverUrl,
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
