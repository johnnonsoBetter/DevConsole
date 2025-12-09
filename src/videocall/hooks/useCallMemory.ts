/**
 * useCallMemory Hook
 * Manages SmartMemory session lifecycle for video calls
 *
 * Features:
 * - Automatic session management tied to call lifecycle
 * - Batched transcript storage with debouncing
 * - Error handling with retry logic
 * - Episodic memory flush on call end
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRaindropSettings } from "../../hooks/useRaindropSettings";
import {
  CALL_MEMORY_CONFIG,
  MEMORY_TIMELINES,
  type MemorySessionInfo,
  type MemorySessionState,
  type MemorySyncStats,
  type SessionMetadataContent,
  type TranscriptTurn,
  type UseCallMemoryReturn,
} from "../lib/callMemoryTypes";
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
  // State
  const [isConfigured, setIsConfigured] = useState(false);
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

  // --------------------------------------------------------------------------
  // CONFIGURATION CHECK
  // --------------------------------------------------------------------------

  useEffect(() => {
    getRaindropSettings().then((settings) => {
      const configured = settings.enabled && Boolean(settings.apiKey);
      setIsConfigured(configured);
      // Only log when configured - avoid noisy logs for participants without config
      if (configured) {
        log("Memory configured and ready");
      }
    });
  }, []);

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

  const getClient = useCallback(async (): Promise<Raindrop> => {
    if (clientRef.current) return clientRef.current;

    const settings = await getRaindropSettings();
    if (!settings.enabled || !settings.apiKey) {
      throw new Error("Raindrop not configured. Go to Settings → Raindrop.");
    }

    clientRef.current = new Raindrop({ apiKey: settings.apiKey });
    return clientRef.current;
  }, []);

  const updateSyncStats = useCallback(() => {
    if (streamRef.current) {
      setSyncStats(streamRef.current.getStats());
    }
  }, []);

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  const startSession = useCallback(
    async (
      roomId: string,
      roomName: string,
      localParticipantName: string
    ): Promise<boolean> => {
      log("Starting session for room:", roomId);
      setState("connecting");
      setError(null);

      try {
        const client = await getClient();
        const location = getSmartMemoryLocation();

        // Start SmartMemory session
        const session = await client.startSession.create({
          smartMemoryLocation: location,
        });

        const newSessionId = session.sessionId || `session-${Date.now()}`;
        sessionIdRef.current = newSessionId;

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
        const metadata: SessionMetadataContent = {
          type: "session_metadata",
          roomId,
          roomName,
          timestamp: new Date().toISOString(),
          participants: [localParticipantName],
          localParticipantName,
          startedAt: new Date().toISOString(),
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        };

        await workingMemory.putMemory({
          content: JSON.stringify(metadata),
          timeline: MEMORY_TIMELINES.METADATA,
          agent: "session_manager",
        });

        // Create transcript stream
        streamRef.current = new TranscriptMemoryStream({
          workingMemory,
          roomId,
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
          roomId,
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
    },
    [getClient, getSmartMemoryLocation, updateSyncStats]
  );

  const endSession = useCallback(
    async (flush = true): Promise<boolean> => {
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
    isConfigured,
    isAvailable: isConfigured && state === "connected",
    state,
    sessionInfo,
    syncStats,
    error,
    startSession,
    addTranscripts,
    endSession,
    flushBatch,
    searchSession,
    clearError: () => setError(null),
  };
}
