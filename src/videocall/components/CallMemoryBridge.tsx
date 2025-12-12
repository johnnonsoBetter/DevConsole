/**
 * CallMemoryBridge
 * 
 * Provides access to call memory state and functions.
 * 
 * NOTE: Session lifecycle is now managed directly in CustomVideoConference
 * using RoomEvent.TranscriptionReceived for immediate storage.
 * 
 * The CallMemoryBridge component is kept for backward compatibility but
 * is no longer the primary way to handle transcription storage.
 */

import { useCallMemory } from '../hooks';
import type { MemoryTimeline, TranscriptTurn } from '../lib/callMemoryTypes';

// ============================================================================
// TYPES
// ============================================================================

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
    turnsStored: number;
  };
  /** Error message if any */
  error: string | null;
  /** Search within the current session's working memory */
  fsearchSession: (query: string) => Promise<string[]>;
  /** Store a tagged insight to a specific timeline */
  storeToTimeline: (
    timeline: MemoryTimeline,
    content: Record<string, unknown>
  ) => Promise<string | null>;
  /** Get all locally cached turns */
  getLocalTurns: () => TranscriptTurn[];
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access call memory state and functions
 * 
 * Use this when you need access to memory state in your component.
 * Session lifecycle is managed by CustomVideoConference.
 * 
 * Gets the Raindrop API key directly from room.metadata (set server-side).
 */
export function useCallMemoryBridge(): UseCallMemoryBridgeReturn {
  const {
    canUseMemory,
    state,
    sessionInfo,
    syncStats,
    error,
    searchSession,
    storeToTimeline,
    getLocalTurns,
  } = useCallMemory();
  
  const isActive = state === 'connected';

  return {
    canUseMemory,
    isActive,
    sessionId: sessionInfo?.sessionId ?? null,
    state,
    syncStats: {
      turnsStored: syncStats.turnsStored,
    },
    error,
    fsearchSession: searchSession,
    storeToTimeline,
    getLocalTurns,
  };
}

// ============================================================================
// LEGACY COMPONENT (for backward compatibility)
// ============================================================================

interface CallMemoryBridgeProps {
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
  onError?: (error: string) => void;
  onSyncStatsUpdate?: (stats: { turnsStored: number }) => void;
}

/**
 * @deprecated Session management is now handled by CustomVideoConference.
 * Use useCallMemoryBridge hook instead for accessing memory state.
 */
export function CallMemoryBridge(_props: CallMemoryBridgeProps = {}) {
  // This component is no longer needed - session management moved to CustomVideoConference
  // Kept for backward compatibility but does nothing
  console.warn('[CallMemoryBridge] This component is deprecated. Session management is now in CustomVideoConference.');
  return null;
}
