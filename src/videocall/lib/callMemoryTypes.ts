/**
 * Call Memory Types
 * Type definitions for SmartMemory-powered video call memory
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export const CALL_MEMORY_CONFIG = {
  /** SmartMemory instance name */
  name: "call-memory",
  /** Raindrop application name */
  applicationName: "video-call-memory",
  /** Current deployment version - update after deploying changes */
  version: "01kc96acj29p86gpgbxzda1kpp",
  /** Batch interval in milliseconds */
  batchIntervalMs: 3000,
  /** Maximum retries for failed memory writes */
  maxRetries: 3,
  /** Retry delay base in milliseconds (exponential backoff) */
  retryDelayMs: 1000,
} as const;

// ============================================================================
// TIMELINES
// ============================================================================

/**
 * Timeline names for organizing memories within a session
 */
export const MEMORY_TIMELINES = {
  /** Session metadata (room info, participants, start time) */
  METADATA: "metadata",
  /** Raw transcript conversation batches */
  CONVERSATION: "conversation",
  /** Detected action items and TODOs */
  ACTION_ITEMS: "action-items",
  /** Key decisions made during the call */
  DECISIONS: "decisions",
  /** Questions that were raised */
  QUESTIONS: "questions",
  /** Topic markers for navigation */
  TOPICS: "topics",
} as const;

export type MemoryTimeline =
  (typeof MEMORY_TIMELINES)[keyof typeof MEMORY_TIMELINES];

// ============================================================================
// TRANSCRIPT TYPES (aligned with useTranscription.ts)
// ============================================================================

/**
 * Individual transcript turn within a batch
 */
export interface TranscriptTurn {
  /** Unique identifier */
  id: string;
  /** Participant's stable identity */
  participantIdentity: string;
  /** Participant's display name */
  participantName: string;
  /** Transcript text content */
  text: string;
  /** Unix timestamp */
  timestamp: number;
  /** Whether this is from the local user */
  isLocal: boolean;
}

// ============================================================================
// MEMORY CONTENT TYPES
// ============================================================================

/**
 * Base type for all memory content objects
 */
interface BaseMemoryContent {
  type: string;
  roomId: string;
  timestamp: string;
}

/**
 * Session metadata stored at call start
 */
export interface SessionMetadataContent extends BaseMemoryContent {
  type: "session_metadata";
  roomName: string;
  participants: string[];
  localParticipantName: string;
  startedAt: string;
  userAgent?: string;
}

/**
 * Transcript batch content
 */
export interface TranscriptBatchContent extends BaseMemoryContent {
  type: "transcript_batch";
  batch: TranscriptTurn[];
  batchIndex: number;
  batchTimestamp: string;
  speakerCount: number;
}

/**
 * Action item detected during call
 */
export interface ActionItemContent extends BaseMemoryContent {
  type: "action_item";
  text: string;
  speaker: string;
  detectedPattern: string;
  confidence: number;
}

/**
 * Decision detected during call
 */
export interface DecisionContent extends BaseMemoryContent {
  type: "decision";
  text: string;
  speaker: string;
  participants: string[];
}

/**
 * Topic marker for navigation
 */
export interface TopicMarkerContent extends BaseMemoryContent {
  type: "topic_marker";
  topic: string;
  startedAt: string;
  previousTopic?: string;
}

/**
 * Union of all memory content types
 */
export type MemoryContent =
  | SessionMetadataContent
  | TranscriptBatchContent
  | ActionItemContent
  | DecisionContent
  | TopicMarkerContent;

// ============================================================================
// SESSION & STATE TYPES
// ============================================================================

/**
 * Memory session state
 */
export type MemorySessionState =
  | "disconnected" // No session active
  | "connecting" // Starting session
  | "connected" // Session active, ready for writes
  | "syncing" // Writing batch to memory
  | "flushing" // Ending session, creating episode
  | "error"; // Error state

/**
 * Information about the current memory session
 */
export interface MemorySessionInfo {
  /** SmartMemory session ID */
  sessionId: string;
  /** Room ID this session is for */
  roomId: string;
  /** When the session started */
  startedAt: number;
  /** Number of batches stored */
  batchCount: number;
  /** Total transcript turns stored */
  turnCount: number;
  /** Last successful sync timestamp */
  lastSyncAt: number | null;
  /** Current state */
  state: MemorySessionState;
}

/**
 * Memory sync statistics
 */
export interface MemorySyncStats {
  /** Total batches stored this session */
  batchesStored: number;
  /** Total turns stored this session */
  turnsStored: number;
  /** Failed write attempts */
  failedWrites: number;
  /** Successful retries */
  retriedWrites: number;
  /** Pending items in retry queue */
  pendingRetries: number;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useCallMemory hook
 */
export interface UseCallMemoryReturn {
  // Room context derived values
  /** The Raindrop API key from room.metadata (set by room creator) */
  raindropApiKey: string | undefined;
  /** Whether memory can be used (API key exists in room metadata) */
  canUseMemory: boolean;
  /** Room name from room context */
  roomName: string;
  /** Local participant display name */
  displayName: string;

  // State
  /** Current session ID (null if not started) */
  sessionId: string | null;
  /** Whether Raindrop client has been instantiated */
  isConfigured: boolean;
  /** Whether memory is currently available (configured + session active) */
  isAvailable: boolean;
  /** Current session state */
  state: MemorySessionState;
  /** Session info if active */
  sessionInfo: MemorySessionInfo | null;
  /** Sync statistics */
  syncStats: MemorySyncStats;
  /** Error message if any */
  error: string | null;

  // Actions
  /**
   * Start a new memory session for the current room
   * Uses room name and participant info from room context
   * Uses Raindrop API key from room.metadata
   */
  startSession: () => Promise<boolean>;
  /**
   * Add a single transcript turn - stored immediately to working memory
   * This is the preferred method for real-time storage
   */
  addTurn: (turn: TranscriptTurn) => Promise<boolean>;
  /**
   * Add multiple transcript turns - each stored immediately in parallel
   * @deprecated Use addTurn for each turn as they arrive for best real-time search
   */
  addTranscripts: (turns: TranscriptTurn[]) => Promise<void>;
  /** Check if a turn has already been stored (prevents duplicates) */
  hasTurn: (turnId: string) => boolean;
  /** Get all locally cached turns (for instant UI access) */
  getLocalTurns: () => TranscriptTurn[];
  /** End the session and flush to episodic memory */
  endSession: (flush?: boolean) => Promise<boolean>;
  /** Search within current session */
  searchSession: (query: string) => Promise<string[]>;
  /**
   * Store a tagged insight to a specific timeline
   * @param timeline - The timeline to store to (decisions, action-items, questions, topics)
   * @param content - The content to store (will be JSON stringified)
   * @returns The memory ID if successful
   */
  storeToTimeline: (
    timeline: String,
    content: Record<string, unknown> | string
  ) => Promise<string | null>;
  /** Clear error state */
  clearError: () => void;
}

// ============================================================================
// RETRY QUEUE TYPES
// ============================================================================

/**
 * Item in the retry queue for failed writes
 */
export interface RetryQueueItem {
  /** Content to store */
  content: string;
  /** Timeline to store in */
  timeline: MemoryTimeline;
  /** Number of retry attempts */
  attempts: number;
  /** When this item was first queued */
  queuedAt: number;
}

// ============================================================================
// EPISODE TYPES (for post-call data)
// ============================================================================

/**
 * Summary of a completed call episode
 */
export interface CallEpisodeSummary {
  /** Session ID of the episode */
  sessionId: string;
  /** Room identifier */
  roomId: string;
  /** Room display name */
  roomName: string;
  /** Participants in the call */
  participants: string[];
  /** When the call started */
  startedAt: string;
  /** When the call ended */
  endedAt: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** AI-generated summary (if available) */
  summary?: string;
  /** Key topics discussed */
  topics?: string[];
  /** Action items extracted */
  actionItems?: string[];
  /** Decisions made */
  decisions?: string[];
}
