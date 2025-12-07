/**
 * Room Manager Service
 * Handles room creation, joining, token generation, and settings persistence
 */

import type { LiveKitSettings } from "./types";
import {
  DEFAULT_LIVEKIT_SETTINGS,
  LIVEKIT_STORAGE_KEY,
  ROOM_PREFIX,
} from "./types";

// ============================================================================
// SETTINGS PERSISTENCE
// ============================================================================

/**
 * Save LiveKit settings to storage
 */
export async function saveLiveKitSettings(
  settings: LiveKitSettings
): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({ [LIVEKIT_STORAGE_KEY]: settings });
    } else {
      localStorage.setItem(LIVEKIT_STORAGE_KEY, JSON.stringify(settings));
    }
  } catch (error) {
    console.error("[RoomManager] Failed to save settings:", error);
    throw error;
  }
}

/**
 * Load LiveKit settings from storage
 */
export async function loadLiveKitSettings(): Promise<LiveKitSettings> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(LIVEKIT_STORAGE_KEY);
      return { ...DEFAULT_LIVEKIT_SETTINGS, ...result[LIVEKIT_STORAGE_KEY] };
    } else {
      const stored = localStorage.getItem(LIVEKIT_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_LIVEKIT_SETTINGS, ...JSON.parse(stored) };
      }
    }
  } catch (error) {
    console.error("[RoomManager] Failed to load settings:", error);
  }
  return DEFAULT_LIVEKIT_SETTINGS;
}

/**
 * Clear LiveKit settings
 */
export async function clearLiveKitSettings(): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.remove(LIVEKIT_STORAGE_KEY);
    } else {
      localStorage.removeItem(LIVEKIT_STORAGE_KEY);
    }
  } catch (error) {
    console.error("[RoomManager] Failed to clear settings:", error);
    throw error;
  }
}

// ============================================================================
// ROOM NAME GENERATION
// ============================================================================

/**
 * Generate a unique room name
 */
export function generateRoomName(prefix?: string): string {
  const effectivePrefix = prefix || ROOM_PREFIX;
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${effectivePrefix}${timestamp}-${randomPart}`;
}

/**
 * Validate room name format
 */
export function isValidRoomName(roomName: string): boolean {
  // Room names should be alphanumeric with hyphens, 3-64 characters
  const pattern = /^[a-zA-Z0-9-]{3,64}$/;
  return pattern.test(roomName);
}

/**
 * Sanitize room name for use
 */
export function sanitizeRoomName(roomName: string): string {
  return roomName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 64);
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Token request payload
 */
export interface TokenRequest {
  roomName: string;
  participantName: string;
  /** Optional participant identity (defaults to participantName) */
  identity?: string;
}

/**
 * Token response from server
 */
export interface TokenResponse {
  token: string;
  serverUrl?: string;
}

/**
 * Fetch a token from the token server
 * This is the recommended approach for production
 */
export async function fetchToken(
  tokenServerUrl: string,
  request: TokenRequest
): Promise<TokenResponse> {
  const response = await fetch(tokenServerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomName: request.roomName,
      participantName: request.participantName,
      identity: request.identity || request.participantName,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token server error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// ROOM UTILITIES
// ============================================================================

/**
 * Create shareable room link
 */
export function createRoomLink(roomName: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/join/${roomName}`;
}

/**
 * Extract room name from a room link
 */
export function extractRoomName(link: string): string | null {
  const match = link.match(/\/join\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Check if LiveKit is configured
 */
export function isLiveKitConfigured(settings: LiveKitSettings): boolean {
  return settings.enabled && !!settings.serverUrl && !!settings.tokenServerUrl;
}

/**
 * Get token for joining a room
 * Fetches token from the configured token server
 */
export async function getJoinToken(
  settings: LiveKitSettings,
  roomName: string,
  participantName: string
): Promise<string> {
  if (!settings.tokenServerUrl) {
    throw new Error(
      "Token Server URL is required. LiveKit tokens must be generated server-side for security. " +
        "Please set up a token server endpoint and configure it in Settings → LiveKit."
    );
  }

  const request: TokenRequest = {
    roomName,
    participantName,
    identity: participantName.replace(/[^a-zA-Z0-9-_]/g, "_"),
  };

  const response = await fetchToken(settings.tokenServerUrl, request);
  return response.token;
}
