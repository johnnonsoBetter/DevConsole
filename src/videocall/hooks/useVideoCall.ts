/**
 * useVideoCall Hook
 * Manages video call state and operations
 *
 * Simplified: No local LiveKit settings needed.
 * Token server provides both token and serverUrl.
 * Uses token/serverUrl state to determine if in-call or pre-call view should be shown.
 */

import { useCallback, useEffect, useState } from "react";
import { generateRoomName, getToken } from "../../lib/livekit";
import type { JoinMode } from "../components/PreCallView";

// ============================================================================
// TYPES
// ============================================================================

interface UseVideoCallOptions {
  initialRoomName?: string;
  initialMode?: JoinMode;
}

interface UseVideoCallReturn {
  // Ready state
  isReady: boolean;
  isConnecting: boolean;

  // Call state - when both token and serverUrl are set, show InCallView
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
  startCall: (memorySettings?: {
    enabled: boolean;
    apiKey: string;
  }) => Promise<void>;
  joinCall: () => Promise<void>;
  endCall: () => void;

  // Event handlers
  handleDisconnected: () => void;
  handleError: (error: Error) => void;
}

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = "[useVideoCall]";

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useVideoCall({
  initialRoomName = "",
  initialMode = null,
}: UseVideoCallOptions = {}): UseVideoCallReturn {
  // Call state
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Form state
  const [joinRoomName, setJoinRoomName] = useState(initialRoomName);
  const [displayName, setDisplayName] = useState("");
  const [joinMode, setJoinMode] = useState<JoinMode>(initialMode);

  // Track if we've initialized
  const [isReady, setIsReady] = useState(false);

  // Start a new call (room creator) - uses operation: "create"
  const startCall = useCallback(
    async (memorySettings?: { enabled: boolean; apiKey: string }) => {
      log("Starting call...", {
        memoryEnabled: memorySettings?.enabled,
        hasApiKey: Boolean(memorySettings?.apiKey),
      });

      setError(null);
      setIsConnecting(true);

      try {
        const newRoomName = generateRoomName();
        const participantName = displayName.trim() || "DevConsole User";

        log("Creating room:", {
          roomName: newRoomName,
          participantName,
          memoryEnabled: memorySettings?.enabled,
        });

        // Get token with "create" operation
        // If memory is enabled, pass the raindrop API key
        const raindropApiKey = memorySettings?.enabled
          ? memorySettings.apiKey
          : undefined;

        const response = await getToken(
          "create",
          newRoomName,
          participantName,
          raindropApiKey
        );

        log("Room created successfully:", {
          roomName: newRoomName,
          hasToken: Boolean(response.token),
          serverUrl: response.serverUrl,
        });

        setRoomName(newRoomName);
        setToken(response.token);
        setServerUrl(response.serverUrl);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start call";
        logError("Failed to start call:", err);
        setError(message);
      } finally {
        setIsConnecting(false);
      }
    },
    [displayName]
  );

  // Join an existing call - uses operation: "join"
  const joinCall = useCallback(async () => {
    if (!joinRoomName.trim()) {
      setError("Please enter a room name");
      return;
    }

    log("Joining call...", { roomName: joinRoomName });

    setError(null);
    setIsConnecting(true);

    try {
      const room = joinRoomName.trim();
      const participantName = displayName.trim() || "DevConsole User";

      log("Requesting join token:", { roomName: room, participantName });

      // Get token with "join" operation
      const response = await getToken("join", room, participantName);

      log("Join token received:", {
        roomName: room,
        hasToken: Boolean(response.token),
        serverUrl: response.serverUrl,
      });

      setRoomName(room);
      setToken(response.token);
      setServerUrl(response.serverUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join call";
      logError("Failed to join call:", err);
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [displayName, joinRoomName]);

  // End the call
  const endCall = useCallback(() => {
    setToken(null);
    setServerUrl(null);
    setRoomName("");
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
    isConnecting,

    // Call state - when both token and serverUrl are set, show InCallView
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
