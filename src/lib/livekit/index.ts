/**
 * LiveKit Module Index
 * Exports all LiveKit-related types, services, and utilities
 */

// Types
export * from "./types";

// Services
export {
  LiveKitClient,
  createLiveKitClient,
  getLiveKitClient,
} from "./livekitClient";

// Room Manager
export {
  clearLiveKitSettings,
  createRoomLink,
  extractRoomName,
  fetchToken,
  generateRoomName,
  getJoinToken,
  isLiveKitConfigured,
  isValidRoomName,
  loadLiveKitSettings,
  sanitizeRoomName,
  saveLiveKitSettings,
  type TokenRequest,
  type TokenResponse,
} from "./roomManager";

// Permissions helpers
export { ensureCapturePermissions } from "./permissions";
