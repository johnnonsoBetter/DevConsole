/**
 * LiveKit Token Generation Server
 * Simple HTTP server for local development
 *
 * Run with: npx tsx api/livekit-token.ts
 *
 * POST /api/livekit-token
 *
 * Operations:
 *
 * 1. CREATE ROOM:
 * Body: {
 *   operation: "create",
 *   roomName: string,
 *   participantName: string,
 *   raindropApiKey?: string,  // Optional - enables memory for all participants
 * }
 * Returns: { token, serverUrl }
 *
 * 2. JOIN ROOM:
 * Body: {
 *   operation: "join",
 *   roomName: string,
 *   participantName: string,
 * }
 * Returns: { token, serverUrl }
 */

import { config } from "dotenv";
import http from "http";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

// Load environment variables from .env file
config();

// Environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const SERVER_URL = process.env.LIVEKIT_SERVER_URL;
const PORT = process.env.PORT || 3001;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface CreateRoomParams {
  roomName: string;
  participantName: string;
  raindropApiKey?: string;
}

interface CreateRoomResult {
  token: string;
  serverUrl: string;
}

/**
 * Create a new room with optional Raindrop memory enabled
 * Sets room metadata server-side so all participants can access it
 */
async function createRoom(params: CreateRoomParams): Promise<CreateRoomResult> {
  const { roomName, participantName, raindropApiKey } = params;

  // Sanitize room name
  const sanitizedRoomName = roomName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .substring(0, 64);

  // Sanitize participant identity
  const participantIdentity = participantName
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 64);

  // Build room metadata object
  const roomMetadata: Record<string, unknown> = {};
  if (raindropApiKey && typeof raindropApiKey === "string") {
    roomMetadata.raindropApiKey = raindropApiKey;
  }
  const roomMetadataStr =
    Object.keys(roomMetadata).length > 0
      ? JSON.stringify(roomMetadata)
      : undefined;

  // Create Room Service client to create the room with metadata
  const roomService = new RoomServiceClient(SERVER_URL!, API_KEY!, API_SECRET!);

  // Create the room with metadata (server-side)
  // This ensures the metadata is set on the room itself, accessible to all
  await roomService.createRoom({
    name: sanitizedRoomName,
    metadata: roomMetadataStr,
    emptyTimeout: 10 * 60, // 10 minutes empty timeout
    maxParticipants: 20,
  });

  console.log(`[Create Room] Room created: ${sanitizedRoomName}`, {
    memoryEnabled: Boolean(raindropApiKey),
  });

  // Create access token for the room creator
  const token = new AccessToken(API_KEY!, API_SECRET!, {
    identity: participantIdentity,
    name: participantName,
    ttl: 6 * 60 * 60, // 6 hours
  });

  // Grant permissions for the room (creator gets full permissions)
  token.addGrant({
    roomJoin: true,
    room: sanitizedRoomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  const jwt = await token.toJwt();

  return {
    token: jwt,
    serverUrl: SERVER_URL!,
  };
}

// ============================================================================

interface JoinRoomParams {
  roomName: string;
  participantName: string;
}

interface JoinRoomResult {
  token: string;
  serverUrl: string;
}

/**
 * Join an existing room
 * Room metadata (including Raindrop API key) is already set on the room
 * and will be accessible via room.metadata when the participant connects
 */
async function joinRoom(params: JoinRoomParams): Promise<JoinRoomResult> {
  const { roomName, participantName } = params;

  // Sanitize room name
  const sanitizedRoomName = roomName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .substring(0, 64);

  // Sanitize participant identity
  const participantIdentity = participantName
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 64);

  // Create access token for the joiner
  const token = new AccessToken(API_KEY!, API_SECRET!, {
    identity: participantIdentity,
    name: participantName,
    ttl: 6 * 60 * 60, // 6 hours
  });

  // Grant permissions for the room
  await token.addGrant({
    roomJoin: true,
    room: sanitizedRoomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  const jwt = await token.toJwt();

  console.log(
    `[Join Room] Token generated for: ${participantName} -> ${sanitizedRoomName}`
  );

  return {
    token: jwt,
    serverUrl: SERVER_URL!,
  };
}

// ============================================================================
// HTTP SERVER
// ============================================================================

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Check environment variables
  if (!API_KEY || !API_SECRET || !SERVER_URL) {
    console.error("[LiveKit Token] Missing environment variables:", {
      hasApiKey: Boolean(API_KEY),
      hasApiSecret: Boolean(API_SECRET),
      hasServerUrl: Boolean(SERVER_URL),
    });
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Server configuration error: LiveKit credentials not configured",
        hint: "Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_SERVER_URL in .env file",
      })
    );
    return;
  }

  // Parse request body
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const { operation, roomName, participantName, raindropApiKey } =
      JSON.parse(body);

    console.log("[LiveKit Token] Request:", {
      operation,
      roomName,
      participantName,
      hasRaindropApiKey: Boolean(raindropApiKey),
    });

    // Validate operation
    if (!operation || (operation !== "create" && operation !== "join")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "operation is required and must be 'create' or 'join'",
        })
      );
      return;
    }

    // Validate required fields
    if (!roomName || typeof roomName !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "roomName is required" }));
      return;
    }

    if (!participantName || typeof participantName !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "participantName is required" }));
      return;
    }

    // Handle operation
    let result: CreateRoomResult | JoinRoomResult;

    if (operation === "create") {
      console.log("[LiveKit Token] Creating room:", roomName);
      result = await createRoom({
        roomName,
        participantName,
        raindropApiKey,
      });
      console.log("[LiveKit Token] Room created successfully");
    } else {
      console.log("[LiveKit Token] Joining room:", roomName);
      result = await joinRoom({
        roomName,
        participantName,
      });
      console.log("[LiveKit Token] Join token generated");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error("[LiveKit Token] Error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    );
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 LiveKit Token Server running at http://localhost:${PORT}`);
  console.log("");
  console.log("Environment:");
  console.log(`  LIVEKIT_API_KEY: ${API_KEY ? "✓ configured" : "✗ missing"}`);
  console.log(
    `  LIVEKIT_API_SECRET: ${API_SECRET ? "✓ configured" : "✗ missing"}`
  );
  console.log(`  LIVEKIT_SERVER_URL: ${SERVER_URL || "✗ missing"}`);
  console.log("");
  console.log("Endpoints:");
  console.log(`  POST http://localhost:${PORT}/api/livekit-token`);
  console.log("");
  console.log("Example requests:");
  console.log(
    `  Create room: curl -X POST http://localhost:${PORT}/api/livekit-token \\`
  );
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(
    `    -d '{"operation":"create","roomName":"test-room","participantName":"user1"}'`
  );
  console.log("");
  console.log(
    `  Join room: curl -X POST http://localhost:${PORT}/api/livekit-token \\`
  );
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(
    `    -d '{"operation":"join","roomName":"test-room","participantName":"user2"}'`
  );
  console.log("");
  console.log("Press Ctrl+C to stop");
});
