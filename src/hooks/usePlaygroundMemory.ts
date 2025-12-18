/**
 * usePlaygroundMemory Hook
 * A simplified hook for testing SmartMemory's working memory
 * with putMemory and getMemory/searchMemory operations
 *
 * Uses Zustand store for shared connection state (sessionId, isConnected, error, config)
 * and local state for component-specific data (memories)
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useCallback, useEffect, useState } from "react";
import {
  usePlaygroundMemoryStore,
  type SmartMemoryConfig,
} from "../utils/stores/playgroundMemory";
import { getRaindropSettings } from "./useRaindropSettings";

// ============================================================================
// TYPES
// ============================================================================

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  timeline?: string;
  agent?: string;
  key?: string;
}

/** Episodic memory entry from completed sessions */
export interface EpisodicEntry {
  sessionId: string;
  summary: string;
  agent?: string;
  entryCount: number;
  timelineCount: number;
  duration: number;
  createdAt: Date;
  score?: number;
}

/** Procedural memory entry (reusable templates/skills) */
export interface ProcedureEntry {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export for convenience
export type { SmartMemoryConfig } from "../utils/stores/playgroundMemory";

export interface PlaygroundMemoryState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  memories: MemoryEntry[];
  config: SmartMemoryConfig | null;
}

/**
 * Hook options for different contexts
 */
export interface UsePlaygroundMemoryOptions {
  // Reserved for future options
}

/**
 * Options for connecting to SmartMemory
 */
export interface ConnectOptions {
  /**
   * Optional Raindrop API key for video call context.
   * When provided, bypasses Chrome storage settings lookup.
   * Use this when the API key comes from room metadata.
   */
  raindropApiKey?: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePlaygroundMemory() {
  // Get shared state from Zustand store
  const {
    setConnected,
    setLoading,
    sessionId,
    config,
    setError,
    isConnected,
    isLoading,
    error,
    setSessionId,
    reset,
    location,
  } = usePlaygroundMemoryStore();
  // Local state for memories (component-specific)
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [client, setClient] = useState<Raindrop | null>(null);

  /**
   * Initialize the Raindrop client and start a session
   * @param options - Optional connect options including API key for video call context
   */
  const connect = useCallback(
    async (options: ConnectOptions = {}) => {
      const { raindropApiKey: externalApiKey } = options;

      setLoading(true);
      setError(null);

      try {
        let apiKey: string | undefined;

        // Check if we have an external API key (video call context)
        if (externalApiKey) {
          apiKey = externalApiKey;
        } else {
          // Fall back to Chrome storage settings (extension context)
          const settings = await getRaindropSettings();
          if (!settings.enabled || !settings.apiKey) {
            throw new Error(
              "Raindrop not configured. Go to Settings → Raindrop and add your API key."
            );
          }
          apiKey = settings.apiKey;
        }

        if (!apiKey) {
          throw new Error("No Raindrop API key available.");
        }

        // Initialize client
        const client = new Raindrop({ apiKey });
        setClient(client);

        // Start a session

        const session = await client.startSession.create({
          smartMemoryLocation: location,
        });

        const sessionId = session.sessionId || `session-${Date.now()}`;

        setSessionId(sessionId);
        setConnected(true);
        setLoading(false);

        return sessionId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to connect";
        setConnected(false);
        setLoading(false);
        setError(errorMessage);
        return null;
      }
    },
    [setConnected, setLoading, setError, location, setClient, setSessionId]
  );

  /**
   * Disconnect and end the session
   */
  const disconnect = useCallback(async () => {
    if (!client || !sessionId || !location) {
      return;
    }

    try {
      await client.endSession.create({
        smartMemoryLocation: location,
        sessionId: sessionId,
        flush: false, // Don't flush to episodic memory for playground
      });
    } catch (err) {
      console.warn("Failed to end session:", err);
    }

    // Reset store and local state
    reset();
    setMemories([]);
  }, [reset, client, sessionId, location]);

  /**
   * Store content in working memory
   */
  const putMemory = useCallback(
    async (
      content: string,
      timeline?: string,
      agent?: string
    ): Promise<string | null> => {
      if (!client || !sessionId || !location) {
        setError("Not connected. Please connect first.");
        return null;
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId: sessionId,
          content,
          timeline: timeline,
          agent: agent,
        });

        const memoryId = response.memoryId || `memory-${Date.now()}`;

        // Add to local state
        const newEntry: MemoryEntry = {
          id: memoryId,
          content,
          timestamp: new Date(),
          timeline: timeline || "default",
        };

        setMemories((prev) => [newEntry, ...prev]);
        setLocalLoading(false);

        return memoryId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to store memory";
        setError(errorMessage);
        setLocalLoading(false);
        return null;
      }
    },
    [client, sessionId, location]
  );

  /**
   * Retrieve memories from working memory
   */
  const getMemory = useCallback(
    async (
      options: { timeline?: string; nMostRecent?: number } = {}
    ): Promise<MemoryEntry[]> => {
      if (!client || !sessionId) {
        setError("Not connected. Please connect first.");
        return [];
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId: sessionId,
          timeline: options.timeline,
          nMostRecent: options.nMostRecent || 50,
        });

        const fetchedMemories: MemoryEntry[] = (response.memories ?? []).map(
          (m) => ({
            id: m.id || `memory-${Date.now()}`,
            content: m.content || "",
            timestamp: m.at ? new Date(m.at) : new Date(),
            timeline: m.timeline || "default",
          })
        );

        setMemories(fetchedMemories);
        setLocalLoading(false);

        return fetchedMemories;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to retrieve memories";
        setError(errorMessage);
        setLocalLoading(false);
        return [];
      }
    },
    [client, sessionId, location]
  );

  /**
   * Search memories using semantic search
   */
  const searchMemory = useCallback(
    async (
      searchTerms: string,
      options: { nMostRecent?: number } = {}
    ): Promise<MemoryEntry[]> => {
      if (!client || !sessionId) {
        setError("Not connected. Please connect first.");
        return [];
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.query.memory.search({
          smartMemoryLocation: location,
          sessionId: sessionId,
          terms: searchTerms,
          nMostRecent: options.nMostRecent || 20,
        });

        const fetchedMemories: MemoryEntry[] = (response.memories ?? []).map(
          (m) => ({
            id: m.id || `memory-${Date.now()}`,
            content: m.content || "",
            timestamp: m.at ? new Date(m.at) : new Date(),
            timeline: m.timeline || "default",
          })
        );

        setMemories(fetchedMemories);
        setLocalLoading(false);

        return fetchedMemories;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search memories";
        setError(errorMessage);
        setLocalLoading(false);
        return [];
      }
    },
    [client, sessionId, location]
  );

  /**
   * Summarize memories using AI
   * @param memoryIds - Array of memory IDs to summarize (if empty, summarizes all recent memories)
   * @param systemPrompt - Optional custom system prompt for the summarization
   */
  const summarizeMemory = useCallback(
    async (
      memoryIds?: string[],
      systemPrompt?: string
    ): Promise<string | null> => {
      if (!client || !sessionId) {
        setError("Not connected. Please connect first.");
        return null;
      }

      setLocalLoading(true);
      setError(null);

      try {
        // If no memoryIds provided, use the current memories
        const ids = memoryIds?.length
          ? memoryIds.filter(Boolean)
          : memories.map((m) => m.id).filter(Boolean);

        if (ids.length === 0) {
          setError("No memories to summarize.");
          setLocalLoading(false);
          return null;
        }

        const response = await client.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId: sessionId,
          memoryIds: ids.slice(0, 50), // Limit to 50 memories
          systemPrompt,
        });

        setLocalLoading(false);
        return response?.summary ?? null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to summarize memories";
        setError(errorMessage);
        setLocalLoading(false);
        return null;
      }
    },
    [client, sessionId, location, memories]
  );

  /**
   * Clear local memory state
   */
  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // EPISODIC MEMORY (Conversation History Archives)
  // ============================================================================

  /**
   * Search episodic memory for relevant past sessions
   * Uses semantic/vector search across all historical sessions
   */
  const searchEpisodicMemory = useCallback(
    async (
      query: string,
      options: { nMostRecent?: number } = {}
    ): Promise<EpisodicEntry[]> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return [];
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.query.episodicMemory.search({
          smartMemoryLocation: location,
          terms: query,
          nMostRecent: options.nMostRecent || 10,
        });

        const entries: EpisodicEntry[] = (response.entries ?? []).map((e) => ({
          sessionId: e.sessionId || "",
          summary: e.summary || "",
          agent: e.agent || undefined,
          entryCount: e.entryCount || 0,
          timelineCount: e.timelineCount || 0,
          duration:
            typeof e.duration === "number"
              ? e.duration
              : Number(e.duration) || 0,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          score: e.score ?? undefined,
        }));

        setLocalLoading(false);
        return entries;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search episodic memory";
        setError(errorMessage);
        setLocalLoading(false);
        return [];
      }
    },
    [client, location]
  );

  /**
   * Rehydrate a previous session from episodic memory
   * Restores complete conversational state for seamless continuation
   */
  const rehydrateSession = useCallback(
    async (
      targetSessionId: string,
      summaryOnly = false
    ): Promise<{ success: boolean; entriesRestored?: number }> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return { success: false };
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.rehydrateSession.rehydrate({
          smartMemoryLocation: location,
          sessionId: targetSessionId,
          summaryOnly,
        });

        setLocalLoading(false);
        return {
          success: response.success ?? false,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to rehydrate session";
        setError(errorMessage);
        setLocalLoading(false);
        return { success: false };
      }
    },
    [client, location]
  );

  // ============================================================================
  // SEMANTIC MEMORY (Structured Knowledge Documents)
  // ============================================================================

  /**
   * Search semantic memory for relevant knowledge documents
   * Uses vector embeddings for semantic similarity search
   */
  const searchSemanticMemory = useCallback(
    async (
      query: string
    ): Promise<Array<{ text: string; score: number; source?: string }>> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return [];
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.query.semanticMemory.search({
          smartMemoryLocation: location,
          needle: query,
        });

        const results = (response.documentSearchResponse?.results ?? []).map(
          (r) => ({
            text: r.text || "",
            score: r.score || 0,
            source: r.source ?? undefined,
          })
        );

        setLocalLoading(false);
        return results;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search semantic memory";
        setError(errorMessage);
        setLocalLoading(false);
        return [];
      }
    },
    [client, location]
  );

  /**
   * Store a knowledge document in semantic memory
   */
  const putSemanticMemory = useCallback(
    async (document: Record<string, unknown>): Promise<string | null> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return null;
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.putSemanticMemory.create({
          smartMemoryLocation: location,
          document: JSON.stringify(document),
        });

        setLocalLoading(false);
        return response.objectId ?? null;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to store semantic memory";
        setError(errorMessage);
        setLocalLoading(false);
        return null;
      }
    },
    [client, location]
  );

  // ============================================================================
  // PROCEDURAL MEMORY (Reusable Templates & Skills)
  // ============================================================================

  /**
   * Store a reusable procedure (system prompt, template, workflow)
   */
  const putProcedure = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return false;
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.putProcedure.create({
          smartMemoryLocation: location,
          key,
          value,
        });

        setLocalLoading(false);
        return response.success ?? false;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to store procedure";
        setError(errorMessage);
        setLocalLoading(false);
        return false;
      }
    },
    [client, location]
  );

  /**
   * Get a specific procedure by key
   */
  const getProcedure = useCallback(
    async (key: string): Promise<string | null> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return null;
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.getProcedure.create({
          smartMemoryLocation: location,
          key,
        });

        setLocalLoading(false);
        return response.found ? (response.value ?? null) : null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get procedure";
        setError(errorMessage);
        setLocalLoading(false);
        return null;
      }
    },
    [client, location]
  );

  /**
   * List all stored procedures
   */
  const listProcedures = useCallback(async (): Promise<ProcedureEntry[]> => {
    if (!client) {
      setError("Not connected. Please connect first.");
      return [];
    }

    setLocalLoading(true);
    setError(null);

    try {
      const response = await client.listProcedures.create({
        smartMemoryLocation: location,
      });

      const procedures: ProcedureEntry[] = (response.procedures ?? []).map(
        (p) => ({
          key: p.key || "",
          value: p.value || "",
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        })
      );

      setLocalLoading(false);
      return procedures;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to list procedures";
      setError(errorMessage);
      setLocalLoading(false);
      return [];
    }
  }, [client, location]);

  /**
   * Search procedures by text matching
   */
  const searchProcedures = useCallback(
    async (
      query: string,
      options: { searchKeys?: boolean; searchValues?: boolean } = {}
    ): Promise<ProcedureEntry[]> => {
      if (!client) {
        setError("Not connected. Please connect first.");
        return [];
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.query.procedures.search({
          smartMemoryLocation: location,
          terms: query,
          searchKeys: options.searchKeys ?? true,
          searchValues: options.searchValues ?? true,
        });

        const procedures: ProcedureEntry[] = (response.procedures ?? []).map(
          (p) => ({
            key: p.key || "",
            value: p.value || "",
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          })
        );

        setLocalLoading(false);
        return procedures;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search procedures";
        setError(errorMessage);
        setLocalLoading(false);
        return [];
      }
    },
    [client, location]
  );

  // ============================================================================
  // SESSION LIFECYCLE
  // ============================================================================

  /**
   * End session with optional flush to episodic memory
   * When flush=true, session is summarized and stored for future retrieval
   */
  const endSession = useCallback(
    async (flush = false, systemPrompt?: string): Promise<boolean> => {
      if (!client || !sessionId) {
        return false;
      }

      setLocalLoading(true);
      setError(null);

      try {
        const response = await client.endSession.create({
          smartMemoryLocation: location,
          sessionId: sessionId,
          flush,
          systemPrompt,
        });

        // Reset store and local state
        reset();
        setMemories([]);
        setLocalLoading(false);

        return response.success ?? false;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to end session";
        setError(errorMessage);
        setLocalLoading(false);
        return false;
      }
    },
    [client, sessionId, location, reset]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client && sessionId && location) {
        client.endSession
          .create({
            smartMemoryLocation: location,
            sessionId: sessionId,
            flush: false,
          })
          .catch(() => {
            // Ignore cleanup errors
          });
      }
    };
  }, [client, sessionId]);

  return {
    // State from store
    isConnected: isConnected,
    isLoading: isLoading || localLoading,
    error: error,
    sessionId: sessionId,

    // Local state
    memories,
    location,

    // Working Memory Actions
    connect,
    disconnect,
    putMemory,
    getMemory,
    searchMemory, // Semantic search across working memory
    summarizeMemory,
    clearMemories,
    clearError,
    config,

    // Episodic Memory (Conversation History)
    searchEpisodicMemory, // Search past sessions semantically
    rehydrateSession, // Restore a previous session

    // Semantic Memory (Knowledge Documents)
    searchSemanticMemory, // Search knowledge base semantically
    putSemanticMemory, // Store knowledge document

    // Procedural Memory (Templates & Skills)
    putProcedure, // Store reusable procedure
    getProcedure, // Get procedure by key
    listProcedures, // List all procedures
    searchProcedures, // Search procedures by text

    // Session Lifecycle
    endSession, // End with optional flush to episodic
  };
}
