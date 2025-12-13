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
}

export interface UseCallMemoryV2Return {
  canUseMemory: boolean;
  sessionId: string | null;
  addTranscription: (transcription: TranscriptionInfo) => Promise<string | null>;
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

// ============================================================================
// HOOK
// ============================================================================

export function useCallMemoryV2(
  config: Partial<CallMemoryV2Config> = {}
): UseCallMemoryV2Return {
  const room = useEnsureRoom();

  const [sessionId, setSessionId] = useState<string | null>(null);
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
      const client = getClient();
      const location = normalizeLocation(mergedConfig.smartMemoryLocation);

      const session = await client.startSession.create({
        smartMemoryLocation: location,
      });

      const newSessionId = session.sessionId || `call-session-${Date.now()}`;

      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);

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
          timeline: mergedConfig.timeline,
          content: transcription.text,
          agent: mergedConfig.agent,
          key: transcription.trackSid,
        });

        return result.memoryId ?? null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to store transcription";
        setError(message);
        return null;
      }
    },
    [ensureSession, getClient, mergedConfig]
  );

  return {
    canUseMemory,
    sessionId,
    addTranscription,
    error,
    clearError,
  };
}

