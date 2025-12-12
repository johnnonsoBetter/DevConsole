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
 * Operation type for token requests
 */
export type TokenOperation = "create" | "join";

/**
 * Token request payload
 */
export interface TokenRequest {
  /** Operation: create a new room or join existing */
  operation: TokenOperation;
  roomName: string;
  participantName: string;
  /** Optional participant identity (defaults to participantName) */
  identity?: string;
  /** Optional Raindrop API key (only for create operation) */
  raindropApiKey?: string;
}

/**
 * Room metadata for video calls
 * Contains configuration that applies to all participants
 */
export interface RoomMetadata {
  /** Raindrop API key for call memory feature */
  raindropApiKey?: string;
}

/**
 * Token response from server
 */
export interface TokenResponse {
  token: string;
  serverUrl: string;
}

/**
 * Default token server URL - can be overridden via environment or build config
 * In production, this should point to your Vercel deployment
 */
const DEFAULT_TOKEN_SERVER_URL = import.meta.env.VITE_LIVEKIT_TOKEN_SERVER_URL;

/**
 * Fetch a token from the token server
 * This is the recommended approach for production
 */
export async function fetchToken(
  request: TokenRequest,
  tokenServerUrl?: string
): Promise<TokenResponse> {
  const url = tokenServerUrl || DEFAULT_TOKEN_SERVER_URL;

  console.log("[fetchToken] Requesting token:", {
    url,
    operation: request.operation,
    roomName: request.roomName,
    participantName: request.participantName,
    hasRaindropApiKey: Boolean(request.raindropApiKey),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation: request.operation,
      roomName: request.roomName,
      participantName: request.participantName,
      raindropApiKey: request.raindropApiKey,
    }),
  });

  console.log("[fetchToken] Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[fetchToken] Error response:", errorText);
    throw new Error(`Token server error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  console.log("[fetchToken] Token received:", {
    hasToken: Boolean(data.token),
    hasServerUrl: Boolean(data.serverUrl),
    serverUrl: data.serverUrl,
  });

  if (!data.token || !data.serverUrl) {
    throw new Error("Invalid token response: missing token or serverUrl");
  }

  return {
    token: data.token,
    serverUrl: data.serverUrl,
  };
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
 * Check if LiveKit is enabled (simplified - just checks if feature is on)
 * Since token server provides serverUrl, we don't need local config validation
 */
export function isLiveKitEnabled(): boolean {
  // LiveKit is always available now that config is server-side
  return true;
}

/**
 * @deprecated Use isLiveKitEnabled instead
 * Kept for backwards compatibility
 */
export function isLiveKitConfigured(settings: LiveKitSettings): boolean {
  return settings.enabled;
}

/**
 * Get token and serverUrl for a room
 * @param operation - "create" for new room, "join" for existing room
 * @param roomName - The room name
 * @param participantName - The participant's display name
 * @param raindropApiKey - Optional Raindrop API key (only for create operation)
 */
export async function getToken(
  operation: TokenOperation,
  roomName: string,
  participantName: string,
  raindropApiKey?: string
): Promise<TokenResponse> {
  const request: TokenRequest = {
    operation,
    roomName,
    participantName,
    raindropApiKey: operation === "create" ? raindropApiKey : undefined,
  };

  return fetchToken(request);
}

/**
 * @deprecated Use getToken instead
 * Get token for joining a room (backwards compatibility)
 */
export async function getJoinToken(
  roomName: string,
  participantName: string,
  roomMetadata?: RoomMetadata
): Promise<TokenResponse> {
  // For backwards compatibility, determine operation based on whether metadata is provided
  const operation: TokenOperation = roomMetadata?.raindropApiKey
    ? "create"
    : "join";
  return getToken(
    operation,
    roomName,
    participantName,
    roomMetadata?.raindropApiKey
  );
}
