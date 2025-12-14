/**
 * useCallMemory Hook
 * Manages SmartMemory session lifecycle for video calls
 *
 * Features:
 * - Automatic session management tied to call lifecycle
 * - Gets Raindrop API key directly from room.metadata
 * - IMMEDIATE transcript storage (no batching) for instant searchability
 * - Uses global callMemory store for singleton client/session
 * - Episodic memory flush on call end
 *
 * The hook wraps the callMemory store and adds:
 * - Room context integration (room.metadata for API key)
 * - Turn management via ImmediateTurnManager
 * - Convenience methods for the video call use case
 */

import { useEnsureRoom, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useCallMemoryStore } from "../../utils/stores/callMemory";
import {
  MEMORY_TIMELINES,
  SessionMetadataContent,
  TranscriptTurn,
  UseCallMemoryReturn,
} from "../lib";
import { ImmediateTurnManager } from "../lib/ImmediateTurnManager";

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = "[useCallMemory]";

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================================================
// TYPES
// ============================================================================

interface RoomMetadata {
  raindropApiKey?: string;
}

function parseRoomMetadata(metadataStr: string | undefined): RoomMetadata {
  if (!metadataStr) {
    return {};
  }
  try {
    const parsed = JSON.parse(metadataStr) as RoomMetadata;
    return parsed;
  } catch (e) {
    logError("Failed to parse room metadata:", e, "raw:", metadataStr);
    return {};
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCallMemory(): UseCallMemoryReturn {
  // Get room context
  const room = useEnsureRoom();
  const { localParticipant } = useLocalParticipant();
  const workingMemoryTimeline = useMemo(
    () => `transcriptions:${room.name}`,
    [room.name]
  );
  // Get store state and actions
  const {
    state,
    sessionId,
    sessionInfo,
    syncStats,
    error,
    startSession: storeStartSession,
    endSession: storeEndSession,
    putMemory,
    searchMemory,
    incrementTurnsStored,
    clearError,
  } = useCallMemoryStore();

  // Track if we've already logged initialization (prevent spam)
  const hasLoggedInitRef = useRef(false);
  const lastMetadataRef = useRef<string | undefined>(undefined);
  const turnManagerRef = useRef<ImmediateTurnManager | null>(null);
  const sessionStartedRef = useRef(false);

  // Parse room metadata for Raindrop API key
  const parsedMetadata = useMemo(() => {
    const parsed = parseRoomMetadata(room.metadata);

    // Only log once on init, or when metadata actually changes
    const metadataChanged = lastMetadataRef.current !== room.metadata;
    if (!hasLoggedInitRef.current || metadataChanged) {
      log("Metadata parsed", {
        roomName: room.name,
        roomState: room.state,
        hasMetadata: Boolean(room.metadata),
        hasRaindropApiKey: Boolean(parsed.raindropApiKey),
        isInitialParse: !hasLoggedInitRef.current,
      });
      hasLoggedInitRef.current = true;
      lastMetadataRef.current = room.metadata;
    }

    return parsed;
  }, [room.metadata, room.name, room.state]);

  // Derived values from room context
  const raindropApiKey = parsedMetadata.raindropApiKey;
  const roomName = room.name;
  const displayName =
    localParticipant?.name || localParticipant?.identity || "Unknown";
  const canUseMemory = Boolean(raindropApiKey);

  // Listen for metadata changes
  useEffect(() => {
    const handleMetadataChanged = (newMetadata: string | undefined) => {
      log("Room metadata changed:", {
        hasRaindropApiKey: Boolean(
          parseRoomMetadata(newMetadata).raindropApiKey
        ),
      });
    };

    room.on(RoomEvent.RoomMetadataChanged, handleMetadataChanged);
    return () => {
      room.off(RoomEvent.RoomMetadataChanged, handleMetadataChanged);
    };
  }, [room]);

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  const startSession = useCallback(async (): Promise<boolean> => {
    log("startSession called", {
      hasRaindropApiKey: Boolean(raindropApiKey),
      sessionAlreadyStarted: sessionStartedRef.current,
      roomName,
      displayName,
    });

    if (!raindropApiKey) {
      log("Cannot start session - no Raindrop API key in room metadata");
      return false;
    }

    if (sessionStartedRef.current || sessionId) {
      log("Session already started");
      return true;
    }

    // Start session via store
    const newSessionId = await storeStartSession(raindropApiKey, roomName);

    if (!newSessionId) {
      return false;
    }

    sessionStartedRef.current = true;

    // Store session metadata
    const sessionMetadata: SessionMetadataContent = {
      type: "session_metadata",
      roomId: roomName,
      roomName,
      timestamp: new Date().toISOString(),
      participants: [displayName],
      localParticipantName: displayName,
      startedAt: new Date().toISOString(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    log("📝 STORING SESSION METADATA:", {
      timeline: MEMORY_TIMELINES.METADATA,
      content: sessionMetadata,
    });

    await putMemory({
      content: JSON.stringify(sessionMetadata),
      timeline: workingMemoryTimeline,
    });

    // Create immediate turn manager
    // We create a wrapper that uses the store's putMemory
    const workingMemoryWrapper = {
      putMemory: async (entry: { content: string; timeline?: string }) => {
        const result = await putMemory(entry);
        return result ?? "";
      },
      getMemory: async () => null, // Not used by ImmediateTurnManager
      searchMemory: async () => null, // Not used by ImmediateTurnManager
      endSession: async () => {}, // Managed by hook
    };

    turnManagerRef.current = new ImmediateTurnManager({
      workingMemory: workingMemoryWrapper,
      roomId: roomName,
      onTurnStored: () => {
        incrementTurnsStored();
      },
      onError: (err: Error) => {
        logError("Turn storage error:", err.message);
      },
    });

    log("Session started:", newSessionId);
    return true;
  }, [
    raindropApiKey,
    roomName,
    displayName,
    sessionId,
    storeStartSession,
    putMemory,
    incrementTurnsStored,
  ]);

  const endSession = useCallback(
    async (flush = true): Promise<boolean> => {
      log("endSession called", { hasActiveSession: Boolean(sessionId), flush });

      if (!sessionId) {
        log("No active session to end");
        return false;
      }

      // Destroy turn manager
      if (turnManagerRef.current) {
        turnManagerRef.current.destroy();
        turnManagerRef.current = null;
      }

      sessionStartedRef.current = false;

      // End session via store
      return storeEndSession(flush);
    },
    [sessionId, storeEndSession]
  );

  // --------------------------------------------------------------------------
  // TRANSCRIPT STORAGE
  // --------------------------------------------------------------------------

  const addTurn = useCallback(
    async (turn: TranscriptTurn): Promise<boolean> => {
      if (!turnManagerRef.current) {
        log("No active turn manager, cannot add turn");
        return false;
      }

      return turnManagerRef.current.addTurn(turn);
    },
    []
  );

  const addTranscripts = useCallback(
    async (turns: TranscriptTurn[]): Promise<void> => {
      if (!turnManagerRef.current) {
        log("No active turn manager, cannot add transcripts");
        return;
      }

      log("Adding transcripts immediately:", {
        turnCount: turns.length,
        speakers: [...new Set(turns.map((t) => t.participantName))],
      });

      await turnManagerRef.current.addTurns(turns);
    },
    []
  );

  const hasTurn = useCallback((turnId: string): boolean => {
    return turnManagerRef.current?.hasTurn(turnId) ?? false;
  }, []);

  const getLocalTurns = useCallback((): TranscriptTurn[] => {
    return turnManagerRef.current?.getLocalTurns() ?? [];
  }, []);

  // --------------------------------------------------------------------------
  // SEARCH
  // --------------------------------------------------------------------------

  const searchSession = useCallback(
    async (query: string): Promise<string[]> => {
      const results = await searchMemory({ terms: query, nMostRecent: 20 });

      if (!results) return [];

      return results.map((r) => r.content);
    },
    [searchMemory]
  );

  // --------------------------------------------------------------------------
  // TIMELINE STORAGE
  // --------------------------------------------------------------------------

  const storeToTimeline = useCallback(
    async (
      timeline: String,
      content: Record<string, unknown> | string
    ): Promise<string | null> => {
      if (!sessionId) {
        log("No active session, cannot store to timeline");
        return null;
      }

      try {
        const enrichedContent = {
          ...(typeof content === "string" ? { text: content } : content),
          roomId: roomName,
          timestamp: new Date().toISOString(),
          storedBy: displayName,
        };

        log(`📝 STORING TO TIMELINE "${timeline}":`, {
          timeline,
          enrichedContent,
        });

        const memoryId = await putMemory({
          content: JSON.stringify(enrichedContent),
          timeline: workingMemoryTimeline,
        });

        log(`Stored to timeline "${timeline}" with ID:`, memoryId);
        return memoryId;
      } catch (err) {
        logError(`Failed to store to timeline "${timeline}":`, err);
        return null;
      }
    },
    [sessionId, roomName, displayName, putMemory]
  );

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (turnManagerRef.current) {
        turnManagerRef.current.destroy();
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // RETURN
  // --------------------------------------------------------------------------

  return {
    // Room context derived values
    raindropApiKey,
    canUseMemory,
    roomName,
    displayName,

    // State (from store)
    sessionId,
    isConfigured: Boolean(sessionId),
    isAvailable: state === "connected",
    state,
    sessionInfo,
    syncStats,
    error,

    // Actions
    startSession,
    addTurn,
    addTranscripts,
    hasTurn,
    getLocalTurns,
    endSession,
    searchSession,
    storeToTimeline,
    clearError,
  };
}
