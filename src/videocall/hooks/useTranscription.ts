import {
  useConnectionState,
  useTranscriptions,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  useEffect(() => {
    if (transcriptions.length > 0) {
      console.log("Transcriptions:", transcriptions);
    }
  }, [transcriptions]);

  // Track processed segment IDs to avoid duplicate callbacks
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Store callback in ref to avoid dependency issues
  const onSegmentReceivedRef = useRef(onSegmentReceived);
  onSegmentReceivedRef.current = onSegmentReceived;

  // Local state to track cleared state (allows manual clearing while hook keeps receiving)
  const [clearedAt, setClearedAt] = useState<number>(0);

  // Clear processed IDs on disconnect
  useEffect(() => {
    if (state === ConnectionState.Disconnected) {
      processedIdsRef.current.clear();
      setClearedAt(Date.now());
    }
  }, [state]);

  // Transform TextStreamData[] to TranscriptSegment[]
  const segments = useMemo(() => {
    // Filter out transcriptions from before clear was called
    const mapped: TranscriptSegment[] = transcriptions
      .map((t) => {
        // Extract segment info from streamInfo attributes
        const isFinal =
          t.streamInfo.attributes?.["lk.transcription_final"] === "true";
        const segmentId =
          t.streamInfo.id || `${t.participantInfo.identity}-${Date.now()}`;

        return {
          id: segmentId,
          text: t.text,
          speaker: t.participantInfo.identity || "Unknown",
          isFinal,
          timestamp: Date.now(),
        };
      })
      .slice(-maxSegments); // Keep only last N segments

    return mapped;
  }, [transcriptions, maxSegments]);

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
