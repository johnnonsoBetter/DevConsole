/**
 * Playground Memory Store
 * Zustand store for managing SmartMemory playground session state
 *
 * This store maintains session state for the memory playground feature.
 * Components can access session info and config through this store.
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import produce from "immer";
import { create } from "zustand";

// ============================================================================
// TYPES
// ============================================================================

/**
 * SmartMemory configuration
 */
export interface SmartMemoryConfig {
  name: string;
  applicationName: string;
  version: string;
}

/**
 * SmartMemory location for SDK calls
 */
export interface SmartMemoryLocation {
  smartMemory: {
    name: string;
    application_name: string;
    version: string;
  };
}

/**
 * Memory entry from working memory
 */
export interface PlaygroundMemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  timeline?: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================
const DEFAULT_PLAYGROUND_CONFIG: SmartMemoryConfig = {
  name: "playground-memory",
  applicationName: "memory-playground",
  version: "01kcefc88gbhahe1jmka62hrcc",
};

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface PlaygroundMemoryStore {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  config: SmartMemoryConfig | null;
  // Session info
  sessionId: string | null;

  // Internal refs (not persisted)
  _client: Raindrop | null;

  // Actions - Connection
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  location: SmartMemoryLocation | null;
  // Actions - Session
  setSessionId: (sessionId: string | null) => void;

  // Actions - Config
  setConfig: (config: SmartMemoryConfig) => void;
  updateConfig: <K extends keyof SmartMemoryConfig>(
    key: K,
    value: SmartMemoryConfig[K]
  ) => void;
  resetConfig: () => void;

  // Actions - Client management
  setClient: (client: Raindrop | null) => void;
  setLocation: (location: SmartMemoryLocation | null) => void;

  // Actions - Full reset
  reset: () => void;

  // Computed helpers
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const usePlaygroundMemoryStore = create<PlaygroundMemoryStore>(
  (set) => ({
    // Initial state
    isConnected: false,
    isLoading: false,
    error: null,
    sessionId: null,
    _client: null,
    config: { ...DEFAULT_PLAYGROUND_CONFIG },
    location: {
      smartMemory: {
        name: DEFAULT_PLAYGROUND_CONFIG.name,
        application_name: DEFAULT_PLAYGROUND_CONFIG.applicationName,
        version: DEFAULT_PLAYGROUND_CONFIG.version,
      },
    },

    // Connection actions
    setConnected: (connected) =>
      set(
        produce((draft) => {
          draft.isConnected = connected;
        })
      ),
    setLoading: (loading) =>
      set(
        produce((draft) => {
          draft.isLoading = loading;
        })
      ),
    setError: (error) =>
      set(
        produce((draft) => {
          draft.error = error;
        })
      ),
    clearError: () =>
      set(
        produce((draft) => {
          draft.error = null;
        })
      ),

    // Session actions
    setSessionId: (sessionId) =>
      set(
        produce((draft) => {
          draft.sessionId = sessionId;
        })
      ),

    // Config actions
    setConfig: (config) =>
      set(
        produce((draft) => {
          draft.config = config;
        })
      ),
    updateConfig: (key, value) =>
      set(
        produce((draft) => {
          draft.config[key] = value;
        })
      ),
    resetConfig: () =>
      set(
        produce((draft) => {
          draft.config = { ...DEFAULT_PLAYGROUND_CONFIG };
        })
      ),

    // Client management
    setClient: (client) =>
      set(
        produce((draft) => {
          draft._client = client;
        })
      ),
    setLocation: (location) =>
      set(
        produce((draft) => {
          draft.location = location;
        })
      ),

    // Full reset
    reset: () =>
      set(
        produce((draft) => {
          draft.isConnected = false;
          draft.isLoading = false;
          draft.error = null;
          draft.sessionId = null;
          draft.config = { ...DEFAULT_PLAYGROUND_CONFIG };
          draft._client = null;
          draft._location = null;
        })
      ),
  })
);

// ============================================================================
// STORE EXPORT
// ============================================================================
