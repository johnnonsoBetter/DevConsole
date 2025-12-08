/**
 * CallMemoryBridge Component
 * Bridges LiveKit transcription with SmartMemory storage
 * 
 * This component should be placed inside a LiveKitRoom context.
 * It automatically:
 * 1. Starts a memory session when mounted
 * 2. Pipes transcription messages to SmartMemory in batches
 * 3. Ends the session and flushes to episodic memory on unmount
 */

import { useRoomContext } from '@livekit/components-react';
import { useEffect, useRef } from 'react';
import { useCallMemory, useTranscription, type TranscriptMessage } from '../hooks';
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
  
  // Get transcription data
  const { messages } = useTranscription();
  
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
  useEffect(() => {
    if (!isConfigured) {
      log('Memory not configured, skipping session start');
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

    // Get only new messages since last processing
    const newMessages = messages.slice(lastProcessedIndexRef.current);
    
    if (newMessages.length === 0) {
      return;
    }

    // Convert TranscriptMessage to TranscriptTurn
    const turns: TranscriptTurn[] = newMessages.map((msg: TranscriptMessage) => ({
      id: msg.id,
      participantIdentity: msg.participantIdentity,
      participantName: msg.participantName,
      text: msg.text,
      timestamp: msg.timestamp,
      isLocal: msg.isLocal,
    }));

    log(`Adding ${turns.length} new transcription turns to memory`);
    addTranscripts(turns);
    
    lastProcessedIndexRef.current = messages.length;
  }, [messages, state, addTranscripts]);

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
  /** Whether memory is configured */
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
 */
export function useCallMemoryBridge({
  roomName,
  displayName,
  enabled = true,
}: UseCallMemoryBridgeOptions): UseCallMemoryBridgeReturn {
  const room = useRoomContext();
  const { messages } = useTranscription();
  
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

  // Start session
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

  // Pipe transcriptions
  useEffect(() => {
    if (!enabled || (state !== 'connected' && state !== 'syncing')) {
      return;
    }

    const newMessages = messages.slice(lastProcessedIndexRef.current);
    if (newMessages.length === 0) return;

    const turns: TranscriptTurn[] = newMessages.map((msg) => ({
      id: msg.id,
      participantIdentity: msg.participantIdentity,
      participantName: msg.participantName,
      text: msg.text,
      timestamp: msg.timestamp,
      isLocal: msg.isLocal,
    }));

    addTranscripts(turns);
    lastProcessedIndexRef.current = messages.length;
  }, [enabled, messages, state, addTranscripts]);

  return {
    isConfigured,
    isActive: state === 'connected' || state === 'syncing',
    sessionId: sessionInfo?.sessionId ?? null,
    state,
    syncStats: {
      batchesStored: syncStats.batchesStored,
      turnsStored: syncStats.turnsStored,
    },
    error,
  };
}
