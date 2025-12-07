/**
 * LiveKit Client Service
 * Handles room connection, media track management, and participant events
 */

import {
  ConnectionQuality,
  ConnectionState,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  Room,
  RoomEvent,
  VideoPresets,
} from "livekit-client";
import type {
  CallState,
  LiveKitSettings,
  ParticipantInfo,
  RoomConnectionOptions,
  RoomConnectionResult,
} from "./types";
import { INITIAL_CALL_STATE } from "./types";

// ============================================================================
// LIVEKIT CLIENT CLASS
// ============================================================================

export class LiveKitClient {
  private room: Room | null = null;
  private settings: LiveKitSettings;
  private stateListeners: Set<(state: CallState) => void> = new Set();
  private currentState: CallState = { ...INITIAL_CALL_STATE };

  constructor(settings: LiveKitSettings) {
    this.settings = settings;
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Subscribe to call state changes
   */
  onStateChange(listener: (state: CallState) => void): () => void {
    this.stateListeners.add(listener);
    // Immediately emit current state
    listener(this.currentState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<CallState>): void {
    this.currentState = { ...this.currentState, ...updates };
    this.stateListeners.forEach((listener) => listener(this.currentState));
  }

  /**
   * Get current call state
   */
  getState(): CallState {
    return this.currentState;
  }

  // ==========================================================================
  // ROOM CONNECTION
  // ==========================================================================

  /**
   * Connect to a LiveKit room
   */
  async connect(options: RoomConnectionOptions): Promise<RoomConnectionResult> {
    if (!this.settings.serverUrl) {
      return { success: false, error: "LiveKit server URL not configured" };
    }

    if (!options.token) {
      return { success: false, error: "Access token is required" };
    }

    try {
      this.updateState({ status: "connecting", error: null });

      // Create room with optimal settings for debugging sessions
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      // Set up event listeners before connecting
      this.setupRoomEventListeners();

      // Connect to the room
      await this.room.connect(this.settings.serverUrl, options.token);

      // Set local participant info
      if (this.room.localParticipant) {
        await this.setupLocalParticipant(options);
      }

      this.updateState({
        status: "connected",
        roomName: options.roomName,
        connectionState: this.room.state,
      });

      // Refresh participant list
      this.refreshParticipants();

      return { success: true, room: this.room };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect";
      this.updateState({ status: "idle", error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Disconnect from the current room
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.updateState({ ...INITIAL_CALL_STATE });
  }

  /**
   * Get the current room instance
   */
  getRoom(): Room | null {
    return this.room;
  }

  // ==========================================================================
  // MEDIA CONTROLS
  // ==========================================================================

  /**
   * Toggle local audio (microphone)
   */
  async toggleAudio(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
    this.updateState({ isAudioEnabled: !enabled });
    this.refreshParticipants();
    return !enabled;
  }

  /**
   * Toggle local video (camera)
   */
  async toggleVideo(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled);
    this.updateState({ isVideoEnabled: !enabled });
    this.refreshParticipants();
    return !enabled;
  }

  /**
   * Toggle screen sharing
   */
  async toggleScreenShare(): Promise<boolean> {
    if (!this.room?.localParticipant) return false;

    const enabled = this.room.localParticipant.isScreenShareEnabled;
    await this.room.localParticipant.setScreenShareEnabled(!enabled);
    this.updateState({ isScreenSharing: !enabled });
    return !enabled;
  }

  /**
   * Set audio enabled state
   */
  async setAudioEnabled(enabled: boolean): Promise<void> {
    if (!this.room?.localParticipant) return;
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
    this.updateState({ isAudioEnabled: enabled });
    this.refreshParticipants();
  }

  /**
   * Set video enabled state
   */
  async setVideoEnabled(enabled: boolean): Promise<void> {
    if (!this.room?.localParticipant) return;
    await this.room.localParticipant.setCameraEnabled(enabled);
    this.updateState({ isVideoEnabled: enabled });
    this.refreshParticipants();
  }

  // ==========================================================================
  // PARTICIPANT MANAGEMENT
  // ==========================================================================

  /**
   * Convert LiveKit participant to ParticipantInfo
   */
  private toParticipantInfo(
    participant: Participant,
    isLocal: boolean
  ): ParticipantInfo {
    return {
      identity: participant.identity,
      name: participant.name || participant.identity,
      isLocal,
      isSpeaking: participant.isSpeaking,
      isMuted: !participant.isMicrophoneEnabled,
      isVideoEnabled: participant.isCameraEnabled,
      connectionQuality: this.mapConnectionQuality(
        participant.connectionQuality
      ),
    };
  }

  /**
   * Map LiveKit connection quality to our type
   */
  private mapConnectionQuality(
    quality: ConnectionQuality
  ): ParticipantInfo["connectionQuality"] {
    // ConnectionQuality enum: Unknown = 0, Poor = 1, Good = 2, Excellent = 3
    switch (quality) {
      case ConnectionQuality.Excellent:
        return "excellent";
      case ConnectionQuality.Good:
        return "good";
      case ConnectionQuality.Poor:
        return "poor";
      default:
        return "unknown";
    }
  }

  /**
   * Refresh the participant list from the room
   */
  private refreshParticipants(): void {
    if (!this.room) return;

    const participants: ParticipantInfo[] = [];

    // Add local participant
    if (this.room.localParticipant) {
      const localInfo = this.toParticipantInfo(
        this.room.localParticipant,
        true
      );
      participants.push(localInfo);
      this.updateState({ localParticipant: localInfo });
    }

    // Add remote participants
    this.room.remoteParticipants.forEach((participant) => {
      participants.push(this.toParticipantInfo(participant, false));
    });

    this.updateState({ participants });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Set up local participant with initial media settings
   */
  private async setupLocalParticipant(
    options: RoomConnectionOptions
  ): Promise<void> {
    if (!this.room?.localParticipant) return;

    const enableVideo = options.enableVideo ?? true;
    const enableAudio = options.enableAudio ?? true;

    try {
      await this.room.localParticipant.setCameraEnabled(enableVideo);
      await this.room.localParticipant.setMicrophoneEnabled(enableAudio);
    } catch (error) {
      console.warn("[LiveKitClient] Failed to enable media:", error);
    }

    this.updateState({
      isVideoEnabled: enableVideo,
      isAudioEnabled: enableAudio,
    });
  }

  /**
   * Set up room event listeners
   */
  private setupRoomEventListeners(): void {
    if (!this.room) return;

    // Connection state changes
    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      this.updateState({ connectionState: state });

      if (state === ConnectionState.Disconnected) {
        this.updateState({ status: "disconnected" });
      } else if (state === ConnectionState.Reconnecting) {
        this.updateState({ status: "reconnecting" });
      } else if (state === ConnectionState.Connected) {
        this.updateState({ status: "connected" });
      }
    });

    // Participant joined
    this.room.on(
      RoomEvent.ParticipantConnected,
      (participant: RemoteParticipant) => {
        console.log(
          "[LiveKitClient] Participant joined:",
          participant.identity
        );
        this.refreshParticipants();
      }
    );

    // Participant left
    this.room.on(
      RoomEvent.ParticipantDisconnected,
      (participant: RemoteParticipant) => {
        console.log("[LiveKitClient] Participant left:", participant.identity);
        this.refreshParticipants();
      }
    );

    // Track subscribed (remote participant's media)
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _publication, participant: RemoteParticipant) => {
        console.log(
          "[LiveKitClient] Track subscribed:",
          track.kind,
          "from",
          participant.identity
        );
        this.refreshParticipants();
      }
    );

    // Track unsubscribed
    this.room.on(RoomEvent.TrackUnsubscribed, () => {
      this.refreshParticipants();
    });

    // Track muted/unmuted
    this.room.on(RoomEvent.TrackMuted, () => {
      this.refreshParticipants();
    });

    this.room.on(RoomEvent.TrackUnmuted, () => {
      this.refreshParticipants();
    });

    // Speaking state changed
    this.room.on(RoomEvent.ActiveSpeakersChanged, () => {
      this.refreshParticipants();
    });

    // Connection quality changed
    this.room.on(RoomEvent.ConnectionQualityChanged, () => {
      this.refreshParticipants();
    });

    // Disconnection
    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log("[LiveKitClient] Disconnected:", reason);
      this.updateState({ status: "disconnected", roomName: null });
    });
  }

  /**
   * Update settings
   */
  updateSettings(settings: LiveKitSettings): void {
    this.settings = settings;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let clientInstance: LiveKitClient | null = null;

/**
 * Get or create the LiveKit client instance
 */
export function getLiveKitClient(
  settings?: LiveKitSettings
): LiveKitClient | null {
  if (!settings && !clientInstance) {
    return null;
  }

  if (settings) {
    if (clientInstance) {
      clientInstance.updateSettings(settings);
    } else {
      clientInstance = new LiveKitClient(settings);
    }
  }

  return clientInstance;
}

/**
 * Create a new LiveKit client (for explicit initialization)
 */
export function createLiveKitClient(settings: LiveKitSettings): LiveKitClient {
  clientInstance = new LiveKitClient(settings);
  return clientInstance;
}
