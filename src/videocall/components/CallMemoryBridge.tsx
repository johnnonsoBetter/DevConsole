/**
 * CallMemoryBridge Component
 * Bridges LiveKit transcription with SmartMemory storage
 * 
 * This component should be placed inside a LiveKitRoom context.
 * It automatically:
 * 1. Uses useCallMemory which reads API key from room.metadata
 * 2. Starts a memory session when mounted (if API key is available)
 * 3. Pipes transcription messages to SmartMemory in batches
 * 4. Ends the session and flushes to episodic memory on unmount
 * 
 * No props needed - everything is derived from the LiveKit room context via useCallMemory.
 */

import { useRoomContext } from '@livekit/components-react';
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
// COMPONENT
// ============================================================================

interface CallMemoryBridgeProps {
  /** Optional callback when memory session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Optional callback when memory session ends */
  onSessionEnd?: () => void;
  /** Optional callback on memory error */
  onError?: (error: string) => void;
  /** Optional callback with sync stats updates */
  onSyncStatsUpdate?: (stats: { batchesStored: number; turnsStored: number }) => void;
}

export function CallMemoryBridge({
  onSessionStart,
  onSessionEnd,
  onError,
  onSyncStatsUpdate,
}: CallMemoryBridgeProps = {}) {
  const room = useRoomContext();
  const { segments } = useTranscriptionManager();
  
  // Get memory management from hook (reads API key from room.metadata internally)
  const {
    canUseMemory,
    displayName,
    state,
    sessionInfo,
    syncStats,
    error,
    startSession,
    addTranscripts,
    endSession,
  } = useCallMemory();
  
  // Track state
  const lastProcessedIndexRef = useRef(0);
  const sessionStartedRef = useRef(false);

  // Start memory session when room is connected and API key is available
  useEffect(() => {
    log('Checking if should start session:', {
      canUseMemory,
      roomState: room.state,
      sessionAlreadyStarted: sessionStartedRef.current,
    });

    if (!canUseMemory || sessionStartedRef.current) {
      if (!canUseMemory) {
        log('Cannot start session - memory not available (no API key in room metadata)');
      }
      return;
    }

    if (room.state === 'connected') {
      log('Room connected, starting memory session');
      sessionStartedRef.current = true;
      
      startSession().then((success) => {
        if (success && sessionInfo?.sessionId) {
          log('Memory session started successfully:', sessionInfo.sessionId);
          onSessionStart?.(sessionInfo.sessionId);
        } else if (!success) {
          logError('Failed to start memory session');
        }
      });
    }
  }, [canUseMemory, room.state, startSession, sessionInfo?.sessionId, onSessionStart]);

  // End session on unmount
  useEffect(() => {
    return () => {
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

    const newSegments = segments.slice(lastProcessedIndexRef.current);
    if (newSegments.length === 0) {
      return;
    }

    // Use displayName from useCallMemory to identify local participant
    const turns: TranscriptTurn[] = newSegments
      .filter((seg) => seg.isFinal)
      .map((seg) => {
        const isLocal = seg.speaker === displayName || seg.speaker === 'You';
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
  }, [segments, state, addTranscripts, displayName]);

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


interface UseCallMemoryBridgeReturn {
  /** Whether memory can be used (API key available in room metadata) */
  canUseMemory: boolean;
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
 * Gets the Raindrop API key directly from room.metadata (set server-side).
 * No need to pass props - everything is derived from the LiveKit room context via useCallMemory.
 */
export function useCallMemoryBridge(): UseCallMemoryBridgeReturn {
  const room = useRoomContext();
  const { segments } = useTranscriptionManager();
  
  // Get memory management from hook (reads API key from room.metadata internally)
  const {
    canUseMemory,
    displayName,
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
  
  // Is memory active?
  const isActive = state === 'connected' || state === 'syncing';

  // Start session when API key is available
  useEffect(() => {
    if (!canUseMemory || sessionStartedRef.current) {
      return;
    }

    if (room.state === 'connected') {
      sessionStartedRef.current = true;
      console.log('[useCallMemoryBridge] Starting session with room metadata API key');
      startSession();
    }
  }, [canUseMemory, room.state, startSession]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) {
        endSession(true);
      }
    };
  }, [endSession]);

  // Pipe transcriptions
  useEffect(() => {
    if (state !== 'connected' && state !== 'syncing') {
      return;
    }

    const newSegments = segments.slice(lastProcessedIndexRef.current);
    if (newSegments.length === 0) return;

    // Use displayName from useCallMemory to identify local participant
    const turns: TranscriptTurn[] = newSegments
      .filter((seg) => seg.isFinal)
      .map((seg) => {
        const isLocal = seg.speaker === displayName || seg.speaker === 'You';
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
  }, [segments, state, addTranscripts, displayName]);

  return {
    canUseMemory,
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
