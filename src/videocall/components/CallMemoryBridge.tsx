/**
 * CallMemoryBridge Component
 * Bridges LiveKit transcription with SmartMemory storage
 * 
 * This component should be placed inside a LiveKitRoom context.
 * It automatically:
 * 1. Starts a memory session when mounted (if configured)
 * 2. Pipes transcription messages to SmartMemory in batches
 * 3. Ends the session and flushes to episodic memory on unmount
 * 
 * Memory is a room-wide feature - only one participant needs to have
 * Raindrop configured. The transcriptions come from the AI agent and
 * include all participants' speech.
 */

import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useEffect, useRef } from 'react';
import { useCallMemory, useTranscriptionManager } from '../hooks';
import type { TranscriptTurn } from '../lib/callMemoryTypes';

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = '[CallMemoryBridge]';

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================================================
// TYPES
// ============================================================================

interface CallMemoryBridgeProps {
  /** Room name for the call */
  roomName: string;
  /** Local participant's display name */
  displayName: string;
  /** Optional callback when memory session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Optional callback when memory session ends */
  onSessionEnd?: () => void;
  /** Optional callback on memory error */
  onError?: (error: string) => void;
  /** Optional callback with sync stats updates */
  onSyncStatsUpdate?: (stats: { batchesStored: number; turnsStored: number }) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CallMemoryBridge({
  roomName,
  displayName,
  onSessionStart,
  onSessionEnd,
  onError,
  onSyncStatsUpdate,
}: CallMemoryBridgeProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  
  // Get transcription data
  const { segments } = useTranscriptionManager();
  
  // Get memory management
  const {
    isConfigured,
    state,
    sessionInfo,
    syncStats,
    error,
    startSession,
    addTranscripts,
    endSession,
  } = useCallMemory();
  
  // Track last processed message index
  const lastProcessedIndexRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const unmountingRef = useRef(false);

  // Start memory session when room is connected
  // Only the participant with memory configured will manage the session
  useEffect(() => {
    // Silently skip if not configured - this is expected for participants
    // who haven't set up Raindrop. Memory will be managed by whoever has it configured.
    if (!isConfigured) {
      return;
    }

    if (sessionStartedRef.current) {
      return;
    }

    if (room.state === 'connected') {
      log('Room connected, starting memory session');
      sessionStartedRef.current = true;
      
      const roomId = room.name || roomName;
      
      startSession(roomId, roomName, displayName).then((success) => {
        if (success && sessionInfo?.sessionId) {
          log('Memory session started:', sessionInfo.sessionId);
          onSessionStart?.(sessionInfo.sessionId);
        } else if (!success) {
          logError('Failed to start memory session');
        }
      });
    }
  }, [isConfigured, room.state, room.name, roomName, displayName, startSession, sessionInfo?.sessionId, onSessionStart]);

  // End session on unmount
  useEffect(() => {
    return () => {
      unmountingRef.current = true;
      
      if (sessionStartedRef.current) {
        log('Component unmounting, ending memory session');
        endSession(true).then((success) => {
          if (success) {
            log('Memory session ended with flush');
            onSessionEnd?.();
          }
        }).catch((err) => {
          logError('Error ending session:', err);
        });
      }
    };
  }, [endSession, onSessionEnd]);

  // Pipe new transcription messages to memory
  useEffect(() => {
    if (state !== 'connected' && state !== 'syncing') {
      return;
    }

    // Get only new segments since last processing
    const newSegments = segments.slice(lastProcessedIndexRef.current);
    
    if (newSegments.length === 0) {
      return;
    }

    // Convert TranscriptSegment to TranscriptTurn
    const localIdentity = localParticipant?.identity;
    const turns: TranscriptTurn[] = newSegments
      .filter((seg) => seg.isFinal) // Only process final segments
      .map((seg) => {
        const isLocal = localIdentity ? seg.speaker === localIdentity : false;
        return {
          id: seg.id,
          participantIdentity: seg.speaker,
          participantName: isLocal ? 'You' : seg.speaker,
          text: seg.text,
          timestamp: seg.timestamp,
          isLocal,
        };
      });

    if (turns.length > 0) {
      log(`Adding ${turns.length} new transcription turns to memory`);
      addTranscripts(turns);
    }
    
    lastProcessedIndexRef.current = segments.length;
  }, [segments, state, addTranscripts, localParticipant?.identity]);

  // Report sync stats updates
  useEffect(() => {
    onSyncStatsUpdate?.({
      batchesStored: syncStats.batchesStored,
      turnsStored: syncStats.turnsStored,
    });
  }, [syncStats.batchesStored, syncStats.turnsStored, onSyncStatsUpdate]);

  // Report errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // This is a bridge component - no UI
  return null;
}

// ============================================================================
// HOOK VERSION (for flexibility)
// ============================================================================

interface UseCallMemoryBridgeOptions {
  roomName: string;
  displayName: string;
  enabled?: boolean;
}

interface UseCallMemoryBridgeReturn {
  /** Whether memory is configured locally */
  isConfigured: boolean;
  /** Whether memory is active for this call */
  isActive: boolean;
  /** Current session ID if active */
  sessionId: string | null;
  /** Memory state */
  state: string;
  /** Sync statistics */
  syncStats: {
    batchesStored: number;
    turnsStored: number;
  };
  /** Error message if any */
  error: string | null;
}

/**
 * Hook version of the CallMemoryBridge for more control
 * Use this when you need access to memory state in your component
 * 
 * Memory is a room-wide feature. Only participants with Raindrop configured
 * will store transcriptions, but the AI agent captures everyone's speech.
 */
export function useCallMemoryBridge({
  roomName,
  displayName,
  enabled = true,
}: UseCallMemoryBridgeOptions): UseCallMemoryBridgeReturn {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { segments } = useTranscriptionManager();
  
  const {
    isConfigured,
    state,
    sessionInfo,
    syncStats,
    error,
    startSession,
    addTranscripts,
    endSession,
  } = useCallMemory();
  
  const lastProcessedIndexRef = useRef(0);
  const sessionStartedRef = useRef(false);
  
  // Determine if memory is active
  const isActive = state === 'connected' || state === 'syncing';

  // Start session (only if configured)
  useEffect(() => {
    if (!enabled || !isConfigured || sessionStartedRef.current) {
      return;
    }

    if (room.state === 'connected') {
      sessionStartedRef.current = true;
      const roomId = room.name || roomName;
      startSession(roomId, roomName, displayName);
    }
  }, [enabled, isConfigured, room.state, room.name, roomName, displayName, startSession]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) {
        endSession(true);
      }
    };
  }, [endSession]);

  // Pipe transcriptions (only if configured and connected)
  useEffect(() => {
    if (!enabled || (state !== 'connected' && state !== 'syncing')) {
      return;
    }

    const newSegments = segments.slice(lastProcessedIndexRef.current);
    if (newSegments.length === 0) return;

    const localIdentity = localParticipant?.identity;
    const turns: TranscriptTurn[] = newSegments
      .filter((seg) => seg.isFinal)
      .map((seg) => {
        const isLocal = localIdentity ? seg.speaker === localIdentity : false;
        return {
          id: seg.id,
          participantIdentity: seg.speaker,
          participantName: isLocal ? 'You' : seg.speaker,
          text: seg.text,
          timestamp: seg.timestamp,
          isLocal,
        };
      });

    if (turns.length > 0) {
      addTranscripts(turns);
    }
    lastProcessedIndexRef.current = segments.length;
  }, [enabled, segments, state, addTranscripts, localParticipant?.identity]);

  return {
    isConfigured,
    isActive,
    sessionId: sessionInfo?.sessionId ?? null,
    state,
    syncStats: {
      batchesStored: syncStats.batchesStored,
      turnsStored: syncStats.turnsStored,
    },
    error,
  };
}
