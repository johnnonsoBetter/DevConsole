/**
 * useTranscription Hook
 * Simplified wrapper around LiveKit's useTranscriptions hook
 *
 * Based on LiveKit docs:
 * https://docs.livekit.io/reference/components/react/hook/usetranscriptions/
 */

import { useLocalParticipant, useTranscriptions } from "@livekit/components-react";
import { useCallback, useMemo, useRef, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptSegment {
  id: string;
  participantIdentity: string;
  participantName: string;
  text: string;
  timestamp: number;
}

export interface TranscriptMessage {
  id: string;
  participantIdentity: string;
  participantName: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export interface UseTranscriptionReturn {
  /** Raw transcription data from LiveKit */
  transcriptions: ReturnType<typeof useTranscriptions>;
  /** Consolidated messages */
  messages: TranscriptMessage[];
  /** All segments */
  segments: TranscriptSegment[];
  /** Whether there are any transcriptions */
  isActive: boolean;
  /** Current interim text (if any) */
  interimText: string | null;
  /** Current speaker */
  currentSpeaker: string | null;
  /** Clear transcripts */
  clearTranscripts: () => void;
  /** Export as text */
  exportAsText: () => string;
  /** Export as JSON */
  exportAsJSON: () => string;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useTranscription(): UseTranscriptionReturn {
  // Use LiveKit's built-in hook - returns TextStreamData[]
  // No filtering options means we get ALL transcriptions including local user
  const transcriptions = useTranscriptions();
  
  // Get local participant to identify local transcriptions
  const { localParticipant } = useLocalParticipant();
  const localIdentity = localParticipant?.identity;

  // Track cleared state
  const [clearedIndex, setClearedIndex] = useState(0);

  // Keep a stable reference to accumulated messages
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const lastProcessedLength = useRef(0);

  // Convert transcriptions to segments
  const segments: TranscriptSegment[] = useMemo(() => {
    return transcriptions.slice(clearedIndex).map((t, index) => {
      const identity = t.participantInfo?.identity || "unknown";
      const isLocal = localIdentity ? identity === localIdentity : false;
      return {
        id: `seg-${clearedIndex + index}`,
        participantIdentity: identity,
        participantName: isLocal ? "You" : identity,
        text: t.text || "",
        timestamp: Date.now(),
      };
    });
  }, [transcriptions, clearedIndex, localIdentity]);

  // Build messages from segments
  const messages: TranscriptMessage[] = useMemo(() => {
    // Only process new transcriptions
    const newTranscriptions = transcriptions.slice(
      Math.max(lastProcessedLength.current, clearedIndex)
    );

    if (newTranscriptions.length === 0 && messagesRef.current.length > 0) {
      return messagesRef.current;
    }

    // Process new transcriptions into messages
    newTranscriptions.forEach((t, idx) => {
      const identity = t.participantInfo?.identity || "unknown";
      const text = t.text?.trim() || "";
      const isLocal = localIdentity ? identity === localIdentity : false;

      if (!text) return;

      const lastMessage = messagesRef.current[messagesRef.current.length - 1];

      // Merge if same speaker
      if (lastMessage && lastMessage.participantIdentity === identity) {
        lastMessage.text += " " + text;
      } else {
        messagesRef.current.push({
          id: `msg-${lastProcessedLength.current + idx}`,
          participantIdentity: identity,
          participantName: isLocal ? "You" : identity,
          text,
          timestamp: Date.now(),
          isLocal,
        });
      }
    });

    lastProcessedLength.current = transcriptions.length;

    return [...messagesRef.current];
  }, [transcriptions, clearedIndex, localIdentity]);

  // State derived from transcriptions
  const isActive = transcriptions.length > clearedIndex;
  const lastTranscription = transcriptions[transcriptions.length - 1];
  const interimText = lastTranscription?.text || null;
  const currentSpeaker = lastTranscription?.participantInfo?.identity || null;

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setClearedIndex(transcriptions.length);
    messagesRef.current = [];
    lastProcessedLength.current = transcriptions.length;
  }, [transcriptions.length]);

  // Export as text
  const exportAsText = useCallback((): string => {
    return messages
      .map((msg) => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        return `[${time}] ${msg.participantName}: ${msg.text}`;
      })
      .join("\n");
  }, [messages]);

  // Export as JSON
  const exportAsJSON = useCallback((): string => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        messages: messages.map((msg) => ({
          participant: msg.participantName,
          text: msg.text,
          timestamp: new Date(msg.timestamp).toISOString(),
        })),
      },
      null,
      2
    );
  }, [messages]);

  return {
    transcriptions,
    segments,
    messages,
    isActive,
    interimText,
    currentSpeaker,
    clearTranscripts,
    exportAsText,
    exportAsJSON,
  };
}
