/**
 * Call Memory Store
 * Zustand store for managing SmartMemory/Raindrop session state
 *
 * This store maintains a singleton Raindrop client and session during a call.
 * All components access the same client and session through this store.
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { produce } from "immer";
import { create } from "zustand";
import {
  CALL_MEMORY_CONFIG,
  MemorySessionInfo,
  MemorySessionState,
  MemorySyncStats,
} from "../../videocall/lib";

// ============================================================================
// TYPES
// ============================================================================

/**
 * SmartMemory location configuration
 */
interface SmartMemoryLocation {
  smartMemory: {
    name: string;
    applicationName: string;
    version: string;
  };
}

/**
 * Memory entry from working memory
 */
export interface MemoryEntry {
  content: string;
  at: Date;
}

/**
 * Options for putting memory
 */
export interface PutMemoryOptions {
  content: string;
  timeline?: string;
}

/**
 * Options for getting memory
 */
export interface GetMemoryOptions {
  timeline?: string;
  nMostRecent?: number;
}

/**
 * Options for searching memory
 */
export interface SearchMemoryOptions {
  terms: string;
  nMostRecent?: number;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface CallMemoryStore {
  // Connection state
  state: MemorySessionState;
  error: string | null;

  // Session info
  sessionId: string | null;
  roomId: string | null;
  sessionInfo: MemorySessionInfo | null;

  // Stats
  syncStats: MemorySyncStats;

  // Internal refs (not persisted, managed by actions)
  _client: Raindrop | null;
  _location: SmartMemoryLocation | null;

  // Actions - Session lifecycle
  /**
   * Initialize and start a new memory session
   * @param apiKey - Raindrop API key from room.metadata
   * @param roomId - Room identifier
   * @returns sessionId if successful, null otherwise
   */
  startSession: (apiKey: string, roomId: string) => Promise<string | null>;

  /**
   * End the current session
   * @param flush - Whether to flush to episodic memory (default: true)
   */
  endSession: (flush?: boolean) => Promise<boolean>;

  // Actions - Memory operations
  /**
   * Store content to working memory
   */
  putMemory: (options: PutMemoryOptions) => Promise<string | null>;

  /**
   * Retrieve recent memories from a timeline
   */
  getMemory: (options: GetMemoryOptions) => Promise<MemoryEntry[] | null>;

  /**
   * Semantic search across all memories in the session
   */
  searchMemory: (options: SearchMemoryOptions) => Promise<MemoryEntry[] | null>;

  // Actions - Stats
  updateSyncStats: (updates: Partial<MemorySyncStats>) => void;
  incrementTurnsStored: () => void;
  incrementFailedWrites: () => void;

  // Actions - State
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const INITIAL_SYNC_STATS: MemorySyncStats = {
  batchesStored: 0,
  turnsStored: 0,
  failedWrites: 0,
  retriedWrites: 0,
  pendingRetries: 0,
};

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = "[CallMemoryStore]";

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCallMemoryStore = create<CallMemoryStore>((set, get) => ({
  // Initial state
  state: "disconnected",
  error: null,
  sessionId: null,
  roomId: null,
  sessionInfo: null,
  syncStats: { ...INITIAL_SYNC_STATS },
  _client: null,
  _location: null,

  // ==========================================================================
  // SESSION LIFECYCLE
  // ==========================================================================

  startSession: async (apiKey: string, roomId: string) => {
    const { state, sessionId, _client } = get();

    // Already have a session
    if (sessionId && state === "connected") {
      log("Session already active:", sessionId);
      return sessionId;
    }

    // Already connecting
    if (state === "connecting") {
      log("Session already connecting");
      return null;
    }

    log("Starting session for room:", roomId);
    set({ state: "connecting", error: null, roomId });

    try {
      // Create or reuse client
      let client = _client;
      if (!client) {
        log("Creating new Raindrop client");
        client = new Raindrop({ apiKey });
      }

      // Create location config
      const location: SmartMemoryLocation = {
        smartMemory: {
          name: CALL_MEMORY_CONFIG.name,
          applicationName: CALL_MEMORY_CONFIG.applicationName,
          version: CALL_MEMORY_CONFIG.version,
        },
      };

      // Start SmartMemory session
      const session = await client.startSession.create({
        smartMemoryLocation: location,
      });

      const newSessionId = session.sessionId || `session-${Date.now()}`;

      log("Session started:", newSessionId);

      set(
        produce((draft) => {
          draft.state = "connected";
          draft.sessionId = newSessionId;
          draft._client = client;
          draft._location = location;
          draft.sessionInfo = {
            sessionId: newSessionId,
            roomId,
            startedAt: Date.now(),
            batchCount: 0,
            turnCount: 0,
            lastSyncAt: null,
            state: "connected",
          };
        })
      );

      return newSessionId;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start session";
      logError("Failed to start session:", message);
      set({ state: "error", error: message });
      return null;
    }
  },

  endSession: async (flush = true) => {
    const { sessionId, _client, _location } = get();

    if (!sessionId || !_client || !_location) {
      log("No active session to end");
      return false;
    }

    log("Ending session:", sessionId, flush ? "(with flush)" : "(no flush)");
    set({ state: "flushing" });

    try {
      await _client.endSession.create({
        smartMemoryLocation: _location,
        sessionId,
        flush,
      });

      log("Session ended successfully");

      // Reset state
      set({
        state: "disconnected",
        sessionId: null,
        roomId: null,
        sessionInfo: null,
        _client: null,
        _location: null,
        syncStats: { ...INITIAL_SYNC_STATS },
      });

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to end session";
      logError("Failed to end session:", message);
      set({ state: "error", error: message });
      return false;
    }
  },

  // ==========================================================================
  // MEMORY OPERATIONS
  // ==========================================================================

  putMemory: async (options: PutMemoryOptions) => {
    const { sessionId, _client, _location } = get();

    if (!sessionId || !_client || !_location) {
      log("No active session, cannot put memory");
      return null;
    }

    try {
      await _client.putMemory.create({
        smartMemoryLocation: _location,
        sessionId,
        content: options.content,
        timeline: options.timeline,
      });

      return sessionId;
    } catch (err) {
      logError("Failed to put memory:", err);
      get().incrementFailedWrites();
      return null;
    }
  },

  getMemory: async (options: GetMemoryOptions) => {
    const { sessionId, _client, _location } = get();

    if (!sessionId || !_client || !_location) {
      log("No active session, cannot get memory");
      return null;
    }

    try {
      const result = await _client.getMemory.retrieve({
        smartMemoryLocation: _location,
        sessionId,
        timeline: options.timeline,
        nMostRecent: options.nMostRecent,
      });

      return (result.memories ?? []).map((m) => ({
        content: m.content ?? "",
        at: new Date(m.at ?? Date.now()),
      }));
    } catch (err) {
      logError("Failed to get memory:", err);
      return null;
    }
  },

  searchMemory: async (options: SearchMemoryOptions) => {
    const { sessionId, _client, _location } = get();

    if (!sessionId || !_client || !_location) {
      log("No active session, cannot search memory");
      return null;
    }

    try {
      const result = await _client.query.memory.search({
        smartMemoryLocation: _location,
        sessionId,
        terms: options.terms,
        nMostRecent: options.nMostRecent,
      });

      return (result.memories ?? []).map((m) => ({
        content: m.content ?? "",
        at: new Date(m.at ?? Date.now()),
      }));
    } catch (err) {
      logError("Failed to search memory:", err);
      return null;
    }
  },

  // ==========================================================================
  // STATS
  // ==========================================================================

  updateSyncStats: (updates: Partial<MemorySyncStats>) => {
    set(
      produce((draft) => {
        Object.assign(draft.syncStats, updates);
      })
    );
  },

  incrementTurnsStored: () => {
    set(
      produce((draft) => {
        draft.syncStats.turnsStored += 1;
        if (draft.sessionInfo) {
          draft.sessionInfo.turnCount += 1;
          draft.sessionInfo.lastSyncAt = Date.now();
        }
      })
    );
  },

  incrementFailedWrites: () => {
    set(
      produce((draft) => {
        draft.syncStats.failedWrites += 1;
      })
    );
  },

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  setError: (error: string | null) => set({ error }),

  clearError: () => set({ error: null }),

  reset: () => {
    set({
      state: "disconnected",
      error: null,
      sessionId: null,
      roomId: null,
      sessionInfo: null,
      syncStats: { ...INITIAL_SYNC_STATS },
      _client: null,
      _location: null,
    });
  },
}));

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/**
 * Get current session state
 */
export const useCallMemoryState = () =>
  useCallMemoryStore((s) => ({
    state: s.state,
    sessionId: s.sessionId,
    roomId: s.roomId,
    isConnected: s.state === "connected",
    error: s.error,
  }));

/**
 * Get sync statistics
 */
export const useCallMemorySyncStats = () =>
  useCallMemoryStore((s) => s.syncStats);

/**
 * Get session info
 */
export const useCallMemorySessionInfo = () =>
  useCallMemoryStore((s) => s.sessionInfo);
