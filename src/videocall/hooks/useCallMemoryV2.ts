/**
 * useCallMemoryV2 Hook (minimal)
 *
 * A simplified SmartMemory hook for video calls that only supports:
 * - Starting a SmartMemory session lazily
 * - addTranscription(): store a transcription segment immediately
 *
 * Notes:
 * - Uses the Raindrop API key from `room.metadata` (same as useCallMemory).
 * - Uses Raindrop SDK param casing (`smartMemoryLocation`, `sessionId`, etc.).
 */

import { useEnsureRoom } from "@livekit/components-react";
import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useCallback, useMemo, useRef, useState } from "react";
import { CALL_MEMORY_CONFIG, MEMORY_TIMELINES } from "../lib";

// ============================================================================
// TYPES
// ============================================================================

interface RoomMetadata {
  raindropApiKey?: string;
}

export interface SmartMemoryLocationLike {
  smartMemory: {
    name: string;
    version: string;
    applicationName?: string;
    application_name?: string;
  };
}

export interface CallMemoryV2Config {
  smartMemoryLocation: SmartMemoryLocationLike;
  timeline: string;
  agent?: string;
}

export interface TranscriptionInfo {
  text: string;
  trackSid?: string;
  agent?: string;
  timeline?: string;
}

export interface WorkingMemoryEntry {
  id: string;
  content: string;
  at: string;
  agent?: string | null;
  key?: string | null;
  timeline?: string | null;
}

export interface MemoryQueryOptions {
  timeline?: string;
  key?: string;
  nMostRecent?: number;
  startTime?: Date;
  endTime?: Date;
}

export type CallMemoryV2State = "disconnected" | "connecting" | "connected" | "error";

export interface UseCallMemoryV2Return {
  canUseMemory: boolean;
  sessionId: string | null;
  state: CallMemoryV2State;
  addTranscription: (transcription: TranscriptionInfo) => Promise<string | null>;
  searchMemories: (terms: string, options?: MemoryQueryOptions) => Promise<WorkingMemoryEntry[]>;
  getMemories: (options?: MemoryQueryOptions) => Promise<WorkingMemoryEntry[]>;
  summarizeMemories: (memoryIds: string[], systemPrompt?: string) => Promise<string | null>;
  endSession: (flush?: boolean, systemPrompt?: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_CONFIG: CallMemoryV2Config = {
  smartMemoryLocation: {
    smartMemory: {
      name: CALL_MEMORY_CONFIG.name,
      applicationName: CALL_MEMORY_CONFIG.applicationName,
      version: CALL_MEMORY_CONFIG.version,
    },
  },
  timeline: MEMORY_TIMELINES.CONVERSATION,
  agent: "livekit-transcription",
};

function parseRoomMetadata(metadataStr: string | undefined): RoomMetadata {
  if (!metadataStr) return {};
  try {
    return JSON.parse(metadataStr) as RoomMetadata;
  } catch {
    return {};
  }
}

function normalizeLocation(location: SmartMemoryLocationLike) {
  const applicationName =
    location.smartMemory.applicationName ?? location.smartMemory.application_name;

  if (!applicationName) {
    throw new Error(
      "Missing smartMemoryLocation.smartMemory.applicationName/application_name"
    );
  }

  return {
    smartMemory: {
      name: location.smartMemory.name,
      applicationName,
      version: location.smartMemory.version,
    },
  };
}

function toIsoStringOrNull(d: Date | undefined): string | null {
  return d ? d.toISOString() : null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCallMemoryV2(
  config: Partial<CallMemoryV2Config> = {}
): UseCallMemoryV2Return {
  const room = useEnsureRoom();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<CallMemoryV2State>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<Raindrop | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const mergedConfig = useMemo<CallMemoryV2Config>(() => {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      smartMemoryLocation: config.smartMemoryLocation ?? DEFAULT_CONFIG.smartMemoryLocation,
      timeline: config.timeline ?? DEFAULT_CONFIG.timeline,
      agent: config.agent ?? DEFAULT_CONFIG.agent,
    };
  }, [config]);

  const raindropApiKey = useMemo(() => {
    return parseRoomMetadata(room.metadata).raindropApiKey;
  }, [room.metadata]);

  const canUseMemory = Boolean(raindropApiKey);

  const clearError = useCallback(() => setError(null), []);

  const getClient = useCallback((): Raindrop => {
    if (clientRef.current) return clientRef.current;
    if (!raindropApiKey) {
      throw new Error("No Raindrop API key found in room metadata");
    }
    clientRef.current = new Raindrop({ apiKey: raindropApiKey });
    return clientRef.current;
  }, [raindropApiKey]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    sessionPromiseRef.current = (async () => {
      setState("connecting");
      const client = getClient();
      const location = normalizeLocation(mergedConfig.smartMemoryLocation);

      const session = await client.startSession.create({
        smartMemoryLocation: location,
      });

      const newSessionId = session.sessionId || `call-session-${Date.now()}`;

      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);
      setState("connected");

      return newSessionId;
    })();

    try {
      return await sessionPromiseRef.current;
    } finally {
      sessionPromiseRef.current = null;
    }
  }, [getClient, mergedConfig.smartMemoryLocation]);

  const addTranscription = useCallback(
    async (transcription: TranscriptionInfo): Promise<string | null> => {
      if (!transcription.text.trim()) return null;

      try {
        const client = getClient();
        const sessionId = await ensureSession();
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const result = await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          timeline: transcription.timeline ?? mergedConfig.timeline,
          content: transcription.text,
          agent: transcription.agent ?? mergedConfig.agent,
          key: transcription.trackSid,
        });

        setState("connected");
        return result.memoryId ?? null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to store transcription";
        setError(message);
        setState("error");
        return null;
      }
    },
    [ensureSession, getClient, mergedConfig]
  );

  const searchMemories = useCallback(
    async (terms: string, options: MemoryQueryOptions = {}): Promise<WorkingMemoryEntry[]> => {
      if (!terms.trim()) return [];

      try {
        const client = getClient();
        const sessionId = await ensureSession();
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await client.query.memory.search({
          smartMemoryLocation: location,
          sessionId,
          terms,
          timeline: options.timeline ?? mergedConfig.timeline,
          nMostRecent: options.nMostRecent ?? 30,
          startTime: toIsoStringOrNull(options.startTime),
          endTime: toIsoStringOrNull(options.endTime),
        });

        setState("connected");
        return (res.memories ?? [])
          .filter((m): m is NonNullable<typeof m> => Boolean(m?.id && m?.content))
          .map((m) => ({
            id: m.id as string,
            content: (m.content ?? "") as string,
            at: (m.at ?? new Date().toISOString()) as string,
            agent: m.agent ?? null,
            key: m.key ?? null,
            timeline: m.timeline ?? null,
          }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to search memories";
        setError(message);
        setState("error");
        return [];
      }
    },
    [ensureSession, getClient, mergedConfig.smartMemoryLocation, mergedConfig.timeline]
  );

  const getMemories = useCallback(
    async (options: MemoryQueryOptions = {}): Promise<WorkingMemoryEntry[]> => {
      try {
        const client = getClient();
        const sessionId = await ensureSession();
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId,
          timeline: options.timeline ?? mergedConfig.timeline,
          key: options.key,
          nMostRecent: options.nMostRecent ?? 50,
          startTime: toIsoStringOrNull(options.startTime),
          endTime: toIsoStringOrNull(options.endTime),
        });

        setState("connected");
        return (res.memories ?? [])
          .filter((m): m is NonNullable<typeof m> => Boolean(m?.id && m?.content))
          .map((m) => ({
            id: m.id as string,
            content: (m.content ?? "") as string,
            at: (m.at ?? new Date().toISOString()) as string,
            agent: m.agent ?? null,
            key: m.key ?? null,
            timeline: m.timeline ?? null,
          }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load memories";
        setError(message);
        setState("error");
        return [];
      }
    },
    [ensureSession, getClient, mergedConfig.smartMemoryLocation, mergedConfig.timeline]
  );

  const summarizeMemories = useCallback(
    async (memoryIds: string[], systemPrompt?: string): Promise<string | null> => {
      const ids = memoryIds.filter(Boolean);
      if (ids.length === 0) return null;

      try {
        const client = getClient();
        const sessionId = await ensureSession();
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await client.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId,
          memoryIds: ids.slice(0, 50),
          systemPrompt,
        });

        setState("connected");
        return res.summary ?? null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to summarize memories";
        setError(message);
        setState("error");
        return null;
      }
    },
    [ensureSession, getClient, mergedConfig.smartMemoryLocation]
  );

  const endSession = useCallback(
    async (flush = true, systemPrompt?: string): Promise<boolean> => {
      const existingSessionId = sessionIdRef.current;
      if (!existingSessionId) return false;

      try {
        const client = getClient();
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await client.endSession.create({
          smartMemoryLocation: location,
          sessionId: existingSessionId,
          flush,
          systemPrompt,
        });

        clientRef.current = null;
        sessionIdRef.current = null;
        sessionPromiseRef.current = null;
        setSessionId(null);
        setState("disconnected");

        return res.success ?? false;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to end session";
        setError(message);
        setState("error");
        return false;
      }
    },
    [getClient, mergedConfig.smartMemoryLocation]
  );

  return {
    canUseMemory,
    sessionId,
    state,
    addTranscription,
    searchMemories,
    getMemories,
    summarizeMemories,
    endSession,
    error,
    clearError,
  };
}
