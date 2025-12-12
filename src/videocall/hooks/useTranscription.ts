import {
  useConnectionState,
  useTranscriptions,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = "[useTranscriptionManager]";

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

/**
 * Simplified transcription segment with speaker info
 */
export interface TranscriptSegment {
  id: string;
  text: string;
  speaker: string;
  isFinal: boolean;
  timestamp: number;
}

/**
 * Custom hook to manage LiveKit transcriptions
 * Uses the official useTranscriptions hook which subscribes to 'lk.transcription' text streams
 * This works for ALL participants in the room, not just the room creator
 *
 * @param options - Configuration options for transcription handling
 * @returns Transcription data and utility functions
 */
export function useTranscriptionManager(options?: {
  maxSegments?: number;
  onSegmentReceived?: (segment: TranscriptSegment) => void;
}) {
  const { maxSegments = 100, onSegmentReceived } = options || {};

  const state = useConnectionState();

  // Use LiveKit's official useTranscriptions hook - works for all participants
  // This listens to the 'lk.transcription' text stream topic
  const transcriptions = useTranscriptions();

  // Track last logged state to prevent duplicate logs
  const lastLoggedRef = useRef<{ count: number; latestId: string | undefined }>(
    { count: 0, latestId: undefined }
  );
  const hasLoggedInitialRef = useRef(false);

  useEffect(() => {
    // Only log when transcription data actually changes meaningfully
    const latestId = transcriptions[transcriptions.length - 1]?.streamInfo?.id;
    const hasNewData =
      transcriptions.length !== lastLoggedRef.current.count ||
      latestId !== lastLoggedRef.current.latestId;

    if (transcriptions.length > 0 && hasNewData) {
      // Update tracking ref
      lastLoggedRef.current = { count: transcriptions.length, latestId };

      log("📢 Transcriptions updated:", {
        count: transcriptions.length,
        latest: transcriptions[transcriptions.length - 1],
        all: transcriptions.map((t) => ({
          text: t.text?.substring(0, 50),
          speaker: t.participantInfo?.identity,
          isFinal: t.streamInfo?.attributes?.["lk.transcription_final"],
          streamId: t.streamInfo?.id,
        })),
      });
    } else if (!hasLoggedInitialRef.current && transcriptions.length === 0) {
      log("⏳ Waiting for transcriptions, hook is listening...");
      hasLoggedInitialRef.current = true;
    }
  }, [transcriptions]);

  // Track processed segment IDs to avoid duplicate callbacks
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Track timestamps for stable IDs
  const segmentTimestampsRef = useRef<Map<string, number>>(new Map());

  // Store callback in ref to avoid dependency issues
  const onSegmentReceivedRef = useRef(onSegmentReceived);
  onSegmentReceivedRef.current = onSegmentReceived;

  // Local state to track cleared state (allows manual clearing while hook keeps receiving)
  const [clearedAt, setClearedAt] = useState<number>(0);

  // Clear processed IDs on disconnect
  useEffect(() => {
    if (state === ConnectionState.Disconnected) {
      processedIdsRef.current.clear();
      segmentTimestampsRef.current.clear();
      setClearedAt(Date.now());
      lastLoggedRef.current = { count: 0, latestId: undefined };
      hasLoggedInitialRef.current = false;
    }
  }, [state]);

  // Transform TextStreamData[] to TranscriptSegment[]
  const segments = useMemo(() => {
    const mapped: TranscriptSegment[] = transcriptions
      .map((t) => {
        // Extract segment info from streamInfo attributes
        const isFinal =
          t.streamInfo?.attributes?.["lk.transcription_final"] === "true";

        // Use streamInfo.id or segment_id attribute, fallback to generated ID
        const segmentId =
          t.streamInfo?.id ||
          t.streamInfo?.attributes?.["lk.segment_id"] ||
          `${t.participantInfo?.identity || "unknown"}-${transcriptions.indexOf(t)}`;

        // Get or create a stable timestamp for this segment
        let timestamp = segmentTimestampsRef.current.get(segmentId);
        if (!timestamp) {
          timestamp = t.streamInfo?.timestamp
            ? new Date(t.streamInfo.timestamp).getTime()
            : Date.now();
          segmentTimestampsRef.current.set(segmentId, timestamp);
        }

        return {
          id: segmentId,
          text: t.text || "",
          speaker: t.participantInfo?.identity || "Unknown",
          isFinal,
          timestamp,
        };
      })
      // Filter out segments from before clear was called
      .filter((seg) => seg.timestamp > clearedAt)
      .slice(-maxSegments); // Keep only last N segments

    return mapped;
  }, [transcriptions, maxSegments, clearedAt]);

  // Call callback for new final segments
  useEffect(() => {
    if (!onSegmentReceivedRef.current) return;

    for (const segment of segments) {
      if (segment.isFinal && !processedIdsRef.current.has(segment.id)) {
        processedIdsRef.current.add(segment.id);
        onSegmentReceivedRef.current(segment);
      }
    }

    // Cleanup old IDs to prevent memory leak
    if (processedIdsRef.current.size > maxSegments * 2) {
      const segmentIds = new Set(segments.map((s) => s.id));
      processedIdsRef.current.forEach((id) => {
        if (!segmentIds.has(id)) {
          processedIdsRef.current.delete(id);
        }
      });
    }
  }, [segments, maxSegments]);

  // Get only final segments for transcript
  const finalSegments = useMemo(
    () => segments.filter((s) => s.isFinal),
    [segments]
  );

  // Build full transcript from final segments
  const fullTranscript = useMemo(
    () => finalSegments.map((s) => `${s.speaker}: ${s.text}`).join("\n"),
    [finalSegments]
  );

  // Latest segment (final or interim)
  const latestSegment = segments[segments.length - 1] || null;

  // Clear transcription history (resets our view, though hook still receives)
  const clearTranscript = useCallback(() => {
    processedIdsRef.current.clear();
    setClearedAt(Date.now());
  }, []);

  return {
    // All segments (including interim)
    segments,

    // Only final segments
    finalSegments,

    // Aggregated full transcript (final only)
    fullTranscript,

    // Latest segment (could be interim)
    latestSegment,

    // Utility functions
    clearTranscript,

    // Metadata
    hasTranscription: segments.length > 0,

    // Connection state
    isConnected: state === ConnectionState.Connected,

    // Debug info
    _debug: {
      rawTranscriptionCount: transcriptions.length,
      clearedAt,
    },
  };
}
