/**
 * LiveKit Types and Configuration
 * Type definitions for video calling feature
 */

import type {
  ConnectionState,
  LocalParticipant,
  RemoteParticipant,
  Room,
} from "livekit-client";

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface LiveKitSettings {
  enabled: boolean;
  serverUrl: string;
  /** Token server URL for token generation (required) */
  tokenServerUrl: string;
  /** Default display name for calls */
  displayName?: string;
  /** LiveKit Cloud project ID (optional, for reference) */
  cloudProjectId?: string;
}

export const DEFAULT_LIVEKIT_SETTINGS: LiveKitSettings = {
  enabled: false,
  serverUrl: "",
  tokenServerUrl: "",
  displayName: "DevConsole User",
  cloudProjectId: "",
};

// ============================================================================
// ROOM TYPES
// ============================================================================

export interface RoomInfo {
  name: string;
  createdAt: number;
  participantCount: number;
}

export interface RoomConnectionOptions {
  roomName: string;
  participantName: string;
  token?: string;
  /** Whether to enable video on join */
  enableVideo?: boolean;
  /** Whether to enable audio on join */
  enableAudio?: boolean;
}

export interface RoomConnectionResult {
  success: boolean;
  room?: Room;
  error?: string;
}

// ============================================================================
// PARTICIPANT TYPES
// ============================================================================

export interface ParticipantInfo {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "unknown";
}

export type ParticipantType = LocalParticipant | RemoteParticipant;

// ============================================================================
// CALL STATE TYPES
// ============================================================================

export type CallStatus =
  | "idle" // Not in a call
  | "connecting" // Connecting to room
  | "connected" // In an active call
  | "reconnecting" // Temporarily disconnected
  | "disconnected"; // Call ended

export interface CallState {
  status: CallStatus;
  roomName: string | null;
  participants: ParticipantInfo[];
  localParticipant: ParticipantInfo | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: ConnectionState | null;
  error: string | null;
}

export const INITIAL_CALL_STATE: CallState = {
  status: "idle",
  roomName: null,
  participants: [],
  localParticipant: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  connectionState: null,
  error: null,
};

// ============================================================================
// ACTION TYPES (for store)
// ============================================================================

export interface JoinCallPayload {
  roomName: string;
  displayName: string;
  enableVideo?: boolean;
  enableAudio?: boolean;
}

export interface CallControlsPayload {
  enableAudio?: boolean;
  enableVideo?: boolean;
  enableScreenShare?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const LIVEKIT_STORAGE_KEY = "devconsole_livekit_settings";

/** Default room prefix for DevConsole rooms */
export const ROOM_PREFIX = "devconsole-";

/** Maximum participants per room (for UI layout planning) */
export const MAX_PARTICIPANTS = 8;

/** Connection quality thresholds */
export const CONNECTION_QUALITY = {
  EXCELLENT: "excellent",
  GOOD: "good",
  POOR: "poor",
  UNKNOWN: "unknown",
} as const;
