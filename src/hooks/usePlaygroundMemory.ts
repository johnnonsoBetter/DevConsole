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
    _client: client,
    setError,
    isConnected,
    isLoading,
    error,
    setClient,
    setSessionId,
    reset,
    location,
  } = usePlaygroundMemoryStore();

  // Local state for memories (component-specific)
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

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
    // Actions
    connect,
    disconnect,
    putMemory,
    getMemory,
    searchMemory,
    clearMemories,
    clearError,
    config,
  };
}
