/**
 * Video Call Types
 * Shared type definitions for video call components
 */

export interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  isLocal?: boolean;
  isAgent?: boolean;
}

export interface MeetingInfo {
  id: string;
  title: string;
  startedAt?: Date;
}

export interface CallControls {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
}
