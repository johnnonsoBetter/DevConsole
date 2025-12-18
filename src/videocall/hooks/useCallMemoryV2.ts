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

import { useCallMemoryStore } from "@/utils/stores";
import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useEnsureRoom } from "@livekit/components-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { CALL_MEMORY_CONFIG, MEMORY_TIMELINES } from "../lib";
import { useCallMemory } from "./useCallMemory";

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

/** Episodic memory entry from completed sessions/calls */
export interface EpisodicEntry {
  sessionId: string;
  summary: string;
  agent?: string;
  entryCount: number;
  timelineCount: number;
  duration: number;
  createdAt: Date;
  score?: number;
}

export type CallMemoryV2State = any;

export interface UseCallMemoryV2Return {
  canUseMemory: boolean;
  sessionId: string | null;
  state: CallMemoryV2State;
  addTranscription: (
    transcription: TranscriptionInfo
  ) => Promise<string | null>;
  searchMemories: (
    terms: string,
    options?: MemoryQueryOptions
  ) => Promise<WorkingMemoryEntry[]>;
  getMemories: (options?: MemoryQueryOptions) => Promise<WorkingMemoryEntry[]>;
  summarizeMemories: (
    memoryIds: string[],
    systemPrompt?: string
  ) => Promise<string | null>;
  endSession: (flush?: boolean, systemPrompt?: string) => Promise<boolean>;
  // Episodic Memory (Past Sessions/Calls)
  searchEpisodicMemory: (
    query: string,
    options?: { nMostRecent?: number }
  ) => Promise<EpisodicEntry[]>;
  error: string | null;
  clearError: () => void;
  addTranscriptionImpl: (transcript: {
    participant: { identity: string };
    text: string;
    isFinal: boolean;
  }) => Promise<void>;
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
    location.smartMemory.applicationName ??
    location.smartMemory.application_name;

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
  const workingMemoryTimeline = useMemo(
    () => `transcriptions:${room.name}`,
    [room.name]
  );
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Raindrop | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const { _client } = useCallMemoryStore();
  const { sessionId, state, storeToTimeline } = useCallMemory();

  const mergedConfig = useMemo<CallMemoryV2Config>(() => {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      smartMemoryLocation:
        config.smartMemoryLocation ?? DEFAULT_CONFIG.smartMemoryLocation,
      timeline: workingMemoryTimeline,
      agent: config.agent ?? DEFAULT_CONFIG.agent,
    };
  }, [config, workingMemoryTimeline]);

  const raindropApiKey = useMemo(() => {
    return parseRoomMetadata(room.metadata).raindropApiKey;
  }, [room.metadata]);

  const canUseMemory = Boolean(raindropApiKey);

  const clearError = useCallback(() => setError(null), []);

  const addTranscriptionImpl = useCallback(
    async (transcript: {
      participant: { identity: string };
      text: string;
      isFinal: boolean;
    }) => {
      const isFinal = transcript.isFinal;
      if (!isFinal || !canUseMemory) {
        return;
      }

      const transcription: TranscriptionInfo = {
        text: transcript.text,
        agent: mergedConfig.agent,
        timeline: workingMemoryTimeline,
        trackSid: `transcript-${transcript.participant.identity}-${Date.now()}`,
      };

      await storeToTimeline(workingMemoryTimeline, transcription.text);
      // await clientRef.current?.putMemory.create({
      //   smartMemoryLocation: normalizeLocation(
      //     mergedConfig.smartMemoryLocation
      //   ),
      //   sessionId: sessionId!,
      //   timeline: transcription.timeline ?? mergedConfig.timeline,
      //   content: transcription.text,
      //   agent: transcription.agent ?? mergedConfig.agent,
      //   key: transcription.trackSid,
      // });
    },
    []
  );
  const addTranscription = useCallback(
    async (transcription: TranscriptionInfo): Promise<string | null> => {
      if (!transcription.text.trim()) return null;

      try {
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const result = await _client?.putMemory.create({
          smartMemoryLocation: location,
          sessionId: sessionId!,
          content: transcription.text,
          agent: transcription.agent ?? mergedConfig.agent,
          key: transcription.trackSid,
        });

        return result?.memoryId ?? null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to store transcription";
        setError(message);

        return null;
      }
    },
    [mergedConfig]
  );

  const searchMemories = useCallback(
    async (
      terms: string,
      options: MemoryQueryOptions = {}
    ): Promise<WorkingMemoryEntry[]> => {
      if (!terms.trim()) return [];

      try {
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await _client?.query.memory.search({
          smartMemoryLocation: location,
          sessionId: sessionId!,
          terms,
          timeline: workingMemoryTimeline,
          nMostRecent: options.nMostRecent ?? 30,
          startTime: toIsoStringOrNull(options.startTime),
          endTime: toIsoStringOrNull(options.endTime),
        });

        return (res?.memories ?? [])
          .filter((m): m is NonNullable<typeof m> =>
            Boolean(m?.id && m?.content)
          )
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

        return [];
      }
    },
    [mergedConfig.smartMemoryLocation, workingMemoryTimeline]
  );

  const getMemories = useCallback(
    async (options: MemoryQueryOptions = {}): Promise<WorkingMemoryEntry[]> => {
      try {
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await _client?.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId: sessionId!,
          timeline: workingMemoryTimeline,
          key: options.key,
          nMostRecent: options.nMostRecent ?? 50,
          startTime: toIsoStringOrNull(options.startTime),
          endTime: toIsoStringOrNull(options.endTime),
        });

        return (res?.memories ?? [])
          .filter((m): m is NonNullable<typeof m> =>
            Boolean(m?.id && m?.content)
          )
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

        return [];
      }
    },
    [mergedConfig.smartMemoryLocation, workingMemoryTimeline]
  );

  const summarizeMemories = useCallback(
    async (
      memoryIds: string[],
      systemPrompt?: string
    ): Promise<string | null> => {
      const ids = memoryIds.filter(Boolean);
      if (ids.length === 0) return null;

      try {
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await _client?.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId: sessionId!,
          memoryIds: ids.slice(0, 50),
          systemPrompt,
        });

        return res?.summary ?? null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to summarize memories";
        setError(message);

        return null;
      }
    },
    [mergedConfig.smartMemoryLocation]
  );

  /**
   * Search episodic memory for relevant past sessions/calls
   * Uses semantic/vector search across all historical sessions
   */
  const searchEpisodicMemory = useCallback(
    async (
      query: string,
      options: { nMostRecent?: number } = {}
    ): Promise<EpisodicEntry[]> => {
      if (!_client) {
        setError("Not connected.");
        return [];
      }

      try {
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const response = await _client.query.episodicMemory.search({
          smartMemoryLocation: location,
          terms: query,
          nMostRecent: options.nMostRecent || 10,
        });

        return (response.entries ?? []).map((e) => ({
          sessionId: e.sessionId || "",
          summary: e.summary || "",
          agent: e.agent || undefined,
          entryCount: e.entryCount || 0,
          timelineCount: e.timelineCount || 0,
          duration: typeof e.duration === 'number' ? e.duration : Number(e.duration) || 0,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          score: e.score ?? undefined,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to search episodic memory";
        setError(message);
        return [];
      }
    },
    [mergedConfig.smartMemoryLocation]
  );

  const endSession = useCallback(
    async (flush = true, systemPrompt?: string): Promise<boolean> => {
      if (!sessionId) return false;

      try {
        const location = normalizeLocation(mergedConfig.smartMemoryLocation);

        const res = await _client?.endSession.create({
          smartMemoryLocation: location,
          sessionId: sessionId!,
          flush,
          systemPrompt,
        });

        clientRef.current = null;
        sessionPromiseRef.current = null;

        return res?.success ?? false;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to end session";
        setError(message);

        return false;
      }
    },
    [mergedConfig.smartMemoryLocation]
  );

  return {
    state,
    canUseMemory,
    sessionId,
    addTranscription,
    searchMemories,         // Semantic search in current working memory
    getMemories,
    summarizeMemories,
    endSession,
    searchEpisodicMemory,   // Semantic search across past sessions/calls
    error,
    clearError,
    addTranscriptionImpl,
  };
}
