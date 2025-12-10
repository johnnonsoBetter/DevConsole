/**
 * useCallMemory Hook
 * Manages SmartMemory session lifecycle for video calls
 *
 * Features:
 * - Automatic session management tied to call lifecycle
 * - Gets Raindrop API key directly from room.metadata
 * - Batched transcript storage with debouncing
 * - Error handling with retry logic
 * - Episodic memory flush on call end
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useEnsureRoom, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CALL_MEMORY_CONFIG,
  MEMORY_TIMELINES,
  MemorySessionInfo,
  MemorySessionState,
  MemorySyncStats,
  SessionMetadataContent,
  TranscriptTurn,
  UseCallMemoryReturn,
} from "../lib";
import { TranscriptMemoryStream } from "../lib/TranscriptMemoryStream";

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

interface WorkingMemorySession {
  putMemory: (entry: {
    content: string;
    timeline?: string;
    agent?: string;
  }) => Promise<string>;
  getMemory: (query: {
    timeline?: string;
    nMostRecent?: number;
  }) => Promise<Array<{ content: string; at: Date }> | null>;
  searchMemory: (query: {
    terms: string;
    nMostRecent?: number;
  }) => Promise<Array<{ content: string; at: Date }> | null>;
  endSession: (flush: boolean) => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCallMemory(): UseCallMemoryReturn {
  // Get room context directly
  const room = useEnsureRoom();
  const { localParticipant } = useLocalParticipant();

  // Track if we've already logged initialization (prevent spam)
  const hasLoggedInitRef = useRef(false);
  const lastMetadataRef = useRef<string | undefined>(undefined);

  // Listen for metadata changes and track version for re-parsing
  const [metadataVersion, setMetadataVersion] = useState(0);

  useEffect(() => {
    const handleMetadataChanged = (newMetadata: string | undefined) => {
      log("Room metadata changed:", {
        hasRaindropApiKey: Boolean(
          parseRoomMetadata(newMetadata).raindropApiKey
        ),
        metadataLength: newMetadata?.length ?? 0,
      });
      // Trigger re-parse by incrementing version
      setMetadataVersion((v) => v + 1);
    };

    room.on(RoomEvent.RoomMetadataChanged, handleMetadataChanged);
    return () => {
      room.off(RoomEvent.RoomMetadataChanged, handleMetadataChanged);
    };
  }, [room]);

  // Parse room metadata for Raindrop API key
  // Re-parse when metadata changes or version increments (from metadata change event)
  const parsedMetadata = useMemo(() => {
    const parsed = parseRoomMetadata(room.metadata);

    // Only log once on init, or when metadata actually changes
    const metadataChanged = lastMetadataRef.current !== room.metadata;
    if (!hasLoggedInitRef.current || metadataChanged) {
      log("Metadata parsed", {
        roomName: room.name,
        roomState: room.state,
        hasMetadata: Boolean(room.metadata),
        metadataLength: room.metadata?.length ?? 0,
        hasRaindropApiKey: Boolean(parsed.raindropApiKey),
        isInitialParse: !hasLoggedInitRef.current,
      });
      hasLoggedInitRef.current = true;
      lastMetadataRef.current = room.metadata;
    }

    return parsed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.metadata, room.name, room.state, metadataVersion]);

  // Derived values from room context
  const raindropApiKey = parsedMetadata.raindropApiKey;
  const roomName = room.name;
  const displayName =
    localParticipant?.name || localParticipant?.identity || "Unknown";

  // Can we use memory?
  const canUseMemory = Boolean(raindropApiKey);

  // State
  const [state, setState] = useState<MemorySessionState>("disconnected");
  const [sessionInfo, setSessionInfo] = useState<MemorySessionInfo | null>(
    null
  );
  const [syncStats, setSyncStats] = useState<MemorySyncStats>({
    batchesStored: 0,
    turnsStored: 0,
    failedWrites: 0,
    retriedWrites: 0,
    pendingRetries: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Refs
  const clientRef = useRef<Raindrop | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const workingMemoryRef = useRef<WorkingMemorySession | null>(null);
  const streamRef = useRef<TranscriptMemoryStream | null>(null);
  const sessionStartedRef = useRef(false);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getSmartMemoryLocation = useCallback(
    () => ({
      smartMemory: {
        name: CALL_MEMORY_CONFIG.name,
        applicationName: CALL_MEMORY_CONFIG.applicationName,
        version: CALL_MEMORY_CONFIG.version,
      },
    }),
    []
  );

  /**
   * Get a Raindrop client using the API key from room metadata
   */
  const getCallClient = useCallback((): Raindrop => {
    if (!raindropApiKey) {
      logError("getCallClient called but no Raindrop API key in room metadata");
      throw new Error("No Raindrop API key in room metadata.");
    }

    // Create client with the room's API key
    if (!clientRef.current) {
      log("Creating new Raindrop client");
      clientRef.current = new Raindrop({ apiKey: raindropApiKey });
    }
    return clientRef.current;
  }, [raindropApiKey]);

  const updateSyncStats = useCallback(() => {
    if (streamRef.current) {
      setSyncStats(streamRef.current.getStats());
    }
  }, []);

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Start a memory session for the call
   * Uses room name and participant info from room context
   * Uses Raindrop API key from room.metadata
   */
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

    if (sessionStartedRef.current) {
      log("Session already started");
      return true;
    }

    log("Starting memory session for room:", roomName);
    setState("connecting");
    setError(null);

    try {
      const client = getCallClient();
      const location = getSmartMemoryLocation();

      // Start SmartMemory session
      const session = await client.startSession.create({
        smartMemoryLocation: location,
      });

      const newSessionId = session.sessionId || `session-${Date.now()}`;
      sessionIdRef.current = newSessionId;
      sessionStartedRef.current = true;

      // Get working memory interface wrapper around SDK
      const workingMemory: WorkingMemorySession = {
        putMemory: async (entry) => {
          await client.putMemory.create({
            smartMemoryLocation: location,
            sessionId: newSessionId,
            content: entry.content,
            timeline: entry.timeline,
            agent: entry.agent,
          });
          return newSessionId;
        },
        getMemory: async (query) => {
          const result = await client.getMemory.retrieve({
            smartMemoryLocation: location,
            sessionId: newSessionId,
            timeline: query.timeline,
            nMostRecent: query.nMostRecent,
          });
          return (result.memories ?? []).map((m) => ({
            content: m.content ?? "",
            at: new Date(m.at ?? Date.now()),
          }));
        },
        searchMemory: async (query) => {
          const result = await client.query.memory.search({
            smartMemoryLocation: location,
            sessionId: newSessionId,
            terms: query.terms,
            nMostRecent: query.nMostRecent,
          });
          return (result.memories ?? []).map((m) => ({
            content: m.content ?? "",
            at: new Date(m.at ?? Date.now()),
          }));
        },
        endSession: async (flush) => {
          await client.endSession.create({
            smartMemoryLocation: location,
            sessionId: newSessionId,
            flush,
          });
        },
      };

      workingMemoryRef.current = workingMemory;

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

      await workingMemory.putMemory({
        content: JSON.stringify(sessionMetadata),
        timeline: MEMORY_TIMELINES.METADATA,
        agent: "session_manager",
      });

      // Create transcript stream
      streamRef.current = new TranscriptMemoryStream({
        workingMemory,
        roomId: roomName,
        batchIntervalMs: CALL_MEMORY_CONFIG.batchIntervalMs,
        maxRetries: CALL_MEMORY_CONFIG.maxRetries,
        retryDelayMs: CALL_MEMORY_CONFIG.retryDelayMs,
        onBatchStored: (batchIndex: number, turnCount: number) => {
          log(`Batch ${batchIndex} stored with ${turnCount} turns`);
          updateSyncStats();
          setSessionInfo((prev: MemorySessionInfo | null) =>
            prev
              ? {
                  ...prev,
                  batchCount: batchIndex + 1,
                  turnCount: (prev.turnCount || 0) + turnCount,
                  lastSyncAt: Date.now(),
                }
              : null
          );
        },
        onError: (err: Error, retriesRemaining: number) => {
          logError(
            "Stream error:",
            err.message,
            `(${retriesRemaining} retries left)`
          );
          updateSyncStats();
          if (retriesRemaining === 0) {
            setError(`Failed to sync transcript: ${err.message}`);
          }
        },
        onRetry: (attempt: number, maxAttempts: number) => {
          log(`Retrying batch write (${attempt}/${maxAttempts})`);
        },
      });

      // Update session info
      setSessionInfo({
        sessionId: newSessionId,
        roomId: roomName,
        startedAt: Date.now(),
        batchCount: 0,
        turnCount: 0,
        lastSyncAt: null,
        state: "connected",
      });

      setState("connected");
      log("Session started:", newSessionId);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start memory session";
      logError("Failed to start session:", message);
      setError(message);
      setState("error");
      return false;
    }
  }, [getCallClient, getSmartMemoryLocation, updateSyncStats]);

  const endSession = useCallback(
    async (flush = true): Promise<boolean> => {
      log("endSession called", {
        hasActiveSession: Boolean(sessionIdRef.current),
        flush,
      });

      if (!sessionIdRef.current || !workingMemoryRef.current) {
        log("No active session to end");
        return false;
      }

      log(
        "Ending session:",
        sessionIdRef.current,
        flush ? "(with flush)" : "(no flush)"
      );
      setState("flushing");

      try {
        // Flush any pending transcript batches
        if (streamRef.current) {
          await streamRef.current.destroy();
          updateSyncStats();
        }

        // End the SmartMemory session
        await workingMemoryRef.current.endSession(flush);

        log("Session ended successfully");

        // Clean up
        sessionIdRef.current = null;
        workingMemoryRef.current = null;
        streamRef.current = null;
        setSessionInfo(null);
        setState("disconnected");

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to end session";
        logError("Failed to end session:", message);
        setError(message);
        setState("error");
        return false;
      }
    },
    [updateSyncStats]
  );

  // --------------------------------------------------------------------------
  // TRANSCRIPT STORAGE
  // --------------------------------------------------------------------------

  const addTranscripts = useCallback((turns: TranscriptTurn[]) => {
    if (!streamRef.current) {
      log("No active stream, cannot add transcripts");
      return;
    }

    log("Adding transcripts:", {
      turnCount: turns.length,
      speakers: [...new Set(turns.map((t) => t.participantName))],
    });

    streamRef.current.add(turns);
    setState("syncing");

    // Reset to connected after a brief delay
    setTimeout(() => {
      setState((current: MemorySessionState) =>
        current === "syncing" ? "connected" : current
      );
    }, 500);
  }, []);

  const flushBatch = useCallback(async () => {
    if (!streamRef.current) {
      return;
    }

    await streamRef.current.flush();
    updateSyncStats();
  }, [updateSyncStats]);

  // --------------------------------------------------------------------------
  // SEARCH
  // --------------------------------------------------------------------------

  const searchSession = useCallback(
    async (query: string): Promise<string[]> => {
      if (!workingMemoryRef.current) {
        return [];
      }

      try {
        const results = await workingMemoryRef.current.searchMemory({
          terms: query,
          nMostRecent: 20,
        });

        if (!results) return [];

        return results.map((r) => r.content);
      } catch (err) {
        logError("Search failed:", err);
        return [];
      }
    },
    []
  );

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.destroy().catch(console.error);
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

    // State
    isConfigured: Boolean(clientRef.current),
    isAvailable: state === "connected" || state === "syncing",
    state,
    sessionInfo,
    syncStats,
    error,

    // Actions
    startSession,
    addTranscripts,
    endSession,
    flushBatch,
    searchSession,
    clearError: () => setError(null),
  };
}
