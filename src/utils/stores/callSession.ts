/**
 * Call Session Store
 * Zustand store for managing video call state
 * Uses chrome.storage.local for settings persistence
 */

import { produce } from "immer";
import { create } from "zustand";
import {
  createLiveKitClient,
  generateRoomName,
  getJoinToken,
  isLiveKitConfigured,
  loadLiveKitSettings,
  saveLiveKitSettings,
  type CallState,
  type LiveKitClient,
  type LiveKitSettings,
} from "../../lib/livekit";
import {
  DEFAULT_LIVEKIT_SETTINGS,
  INITIAL_CALL_STATE,
} from "../../lib/livekit/types";

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface CallSessionStore extends CallState {
  // Settings
  settings: LiveKitSettings;
  settingsLoaded: boolean;
  isConfigured: boolean;

  // Client reference
  client: LiveKitClient | null;

  // Actions - Settings
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<LiveKitSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Actions - Call
  createRoom: (
    displayName?: string
  ) => Promise<{ roomName: string } | { error: string }>;
  joinRoom: (
    roomName: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  leaveCall: () => Promise<void>;

  // Actions - Media Controls
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  // Actions - UI State
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCallSessionStore = create<CallSessionStore>((set, get) => ({
  // Initial call state
  ...INITIAL_CALL_STATE,

  // Settings
  settings: DEFAULT_LIVEKIT_SETTINGS,
  settingsLoaded: false,
  isConfigured: false,

  // Client
  client: null,

  // ==========================================================================
  // SETTINGS ACTIONS
  // ==========================================================================

  loadSettings: async () => {
    try {
      const settings = await loadLiveKitSettings();
      const isConfigured = isLiveKitConfigured(settings);

      set(
        produce((draft) => {
          draft.settings = settings;
          draft.settingsLoaded = true;
          draft.isConfigured = isConfigured;
        })
      );

      // Initialize client if configured
      if (isConfigured) {
        const client = createLiveKitClient(settings);
        set({ client });

        // Subscribe to client state changes
        client.onStateChange((callState) => {
          set(
            produce((draft) => {
              draft.status = callState.status;
              draft.roomName = callState.roomName;
              draft.participants = callState.participants;
              draft.localParticipant = callState.localParticipant;
              draft.isAudioEnabled = callState.isAudioEnabled;
              draft.isVideoEnabled = callState.isVideoEnabled;
              draft.isScreenSharing = callState.isScreenSharing;
              draft.connectionState = callState.connectionState;
              draft.error = callState.error;
            })
          );
        });
      }
    } catch (error) {
      console.error("[CallSessionStore] Failed to load settings:", error);
    }
  },

  updateSettings: async (updates) => {
    const { settings } = get();
    const newSettings = { ...settings, ...updates };

    try {
      await saveLiveKitSettings(newSettings);
      const isConfigured = isLiveKitConfigured(newSettings);

      set(
        produce((draft) => {
          draft.settings = newSettings;
          draft.isConfigured = isConfigured;
        })
      );

      // Re-initialize client with new settings
      if (isConfigured) {
        const client = createLiveKitClient(newSettings);
        set({ client });

        client.onStateChange((callState) => {
          set(
            produce((draft) => {
              draft.status = callState.status;
              draft.roomName = callState.roomName;
              draft.participants = callState.participants;
              draft.localParticipant = callState.localParticipant;
              draft.isAudioEnabled = callState.isAudioEnabled;
              draft.isVideoEnabled = callState.isVideoEnabled;
              draft.isScreenSharing = callState.isScreenSharing;
              draft.connectionState = callState.connectionState;
              draft.error = callState.error;
            })
          );
        });
      }
    } catch (error) {
      console.error("[CallSessionStore] Failed to save settings:", error);
      throw error;
    }
  },

  resetSettings: async () => {
    const { client } = get();

    // Disconnect if in a call
    if (client) {
      await client.disconnect();
    }

    try {
      await saveLiveKitSettings(DEFAULT_LIVEKIT_SETTINGS);
      set(
        produce((draft) => {
          draft.settings = DEFAULT_LIVEKIT_SETTINGS;
          draft.isConfigured = false;
          draft.client = null;
          // Reset call state
          Object.assign(draft, INITIAL_CALL_STATE);
        })
      );
    } catch (error) {
      console.error("[CallSessionStore] Failed to reset settings:", error);
      throw error;
    }
  },

  // ==========================================================================
  // CALL ACTIONS
  // ==========================================================================

  createRoom: async (displayName) => {
    const { settings, client } = get();

    if (!client) {
      return {
        error: "LiveKit not configured. Please configure settings first.",
      };
    }

    const roomName = generateRoomName();
    const participantName =
      displayName || settings.displayName || "DevConsole User";

    try {
      set(
        produce((draft) => {
          draft.status = "connecting";
        })
      );

      const token = await getJoinToken(settings, roomName, participantName);
      const result = await client.connect({
        roomName,
        participantName,
        token,
        enableVideo: true,
        enableAudio: true,
      });

      if (!result.success) {
        set(
          produce((draft) => {
            draft.status = "idle";
            draft.error = result.error || "Failed to create room";
          })
        );
        return { error: result.error || "Failed to create room" };
      }

      return { roomName };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create room";
      set(
        produce((draft) => {
          draft.status = "idle";
          draft.error = errorMessage;
        })
      );
      return { error: errorMessage };
    }
  },

  joinRoom: async (roomName, displayName) => {
    const { settings, client } = get();

    if (!client) {
      return {
        success: false,
        error: "LiveKit not configured. Please configure settings first.",
      };
    }

    const participantName =
      displayName || settings.displayName || "DevConsole User";

    try {
      set(
        produce((draft) => {
          draft.status = "connecting";
        })
      );

      const token = await getJoinToken(settings, roomName, participantName);
      const result = await client.connect({
        roomName,
        participantName,
        token,
        enableVideo: true,
        enableAudio: true,
      });

      if (!result.success) {
        set(
          produce((draft) => {
            draft.status = "idle";
            draft.error = result.error || "Failed to join room";
          })
        );
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join room";
      set(
        produce((draft) => {
          draft.status = "idle";
          draft.error = errorMessage;
        })
      );
      return { success: false, error: errorMessage };
    }
  },

  leaveCall: async () => {
    const { client } = get();

    if (client) {
      await client.disconnect();
    }

    set(
      produce((draft) => {
        draft.status = "idle";
        draft.roomName = null;
        draft.participants = [];
        draft.localParticipant = null;
        draft.isScreenSharing = false;
        draft.connectionState = null;
        draft.error = null;
      })
    );
  },

  // ==========================================================================
  // MEDIA CONTROL ACTIONS
  // ==========================================================================

  toggleAudio: async () => {
    const { client } = get();
    if (client) {
      await client.toggleAudio();
    }
  },

  toggleVideo: async () => {
    const { client } = get();
    if (client) {
      await client.toggleVideo();
    }
  },

  toggleScreenShare: async () => {
    const { client } = get();
    if (client) {
      await client.toggleScreenShare();
    }
  },

  // ==========================================================================
  // UI STATE ACTIONS
  // ==========================================================================

  setError: (error) => {
    set(
      produce((draft) => {
        draft.error = error;
      })
    );
  },

  clearError: () => {
    set(
      produce((draft) => {
        draft.error = null;
      })
    );
  },
}));
