/**
 * LiveKit Token Generation Server
 * Production-ready Express server for Vultr deployment
 *
 * POST /api/livekit-token
 *
 * Operations:
 * 1. CREATE ROOM: { operation: "create", roomName, participantName, raindropApiKey? }
 * 2. JOIN ROOM: { operation: "join", roomName, participantName }
 */

import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

// Load environment variables
config();

const app = express();

// Environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const SERVER_URL = process.env.LIVEKIT_SERVER_URL;
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ============================================================================
// TYPES
// ============================================================================

interface CreateRoomParams {
  roomName: string;
  participantName: string;
  raindropApiKey?: string;
}

interface JoinRoomParams {
  roomName: string;
  participantName: string;
}

interface TokenResult {
  token: string;
  serverUrl: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sanitizeRoomName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "-").substring(0, 64);
}

function sanitizeIdentity(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 64);
}

async function createRoom(params: CreateRoomParams): Promise<TokenResult> {
  const { roomName, participantName, raindropApiKey } = params;

  const sanitizedRoomName = sanitizeRoomName(roomName);
  const participantIdentity = sanitizeIdentity(participantName);

  // Build room metadata
  const roomMetadata: Record<string, unknown> = {};
  if (raindropApiKey && typeof raindropApiKey === "string") {
    roomMetadata.raindropApiKey = raindropApiKey;
  }
  const roomMetadataStr =
    Object.keys(roomMetadata).length > 0
      ? JSON.stringify(roomMetadata)
      : undefined;

  // Create room with metadata
  const roomService = new RoomServiceClient(SERVER_URL!, API_KEY!, API_SECRET!);
  await roomService.createRoom({
    name: sanitizedRoomName,
    metadata: roomMetadataStr,
    emptyTimeout: 10 * 60, // 10 minutes
    maxParticipants: 20,
  });

  console.log(
    `[Create] Room: ${sanitizedRoomName}, Memory: ${Boolean(raindropApiKey)}`
  );

  // Create access token
  const token = new AccessToken(API_KEY!, API_SECRET!, {
    identity: participantIdentity,
    name: participantName,
    ttl: 6 * 60 * 60, // 6 hours
  });

  token.addGrant({
    roomJoin: true,
    room: sanitizedRoomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  return {
    token: await token.toJwt(),
    serverUrl: SERVER_URL!,
  };
}

async function joinRoom(params: JoinRoomParams): Promise<TokenResult> {
  const { roomName, participantName } = params;

  const sanitizedRoomName = sanitizeRoomName(roomName);
  const participantIdentity = sanitizeIdentity(participantName);

  const token = new AccessToken(API_KEY!, API_SECRET!, {
    identity: participantIdentity,
    name: participantName,
    ttl: 6 * 60 * 60,
  });

  token.addGrant({
    roomJoin: true,
    room: sanitizedRoomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  console.log(`[Join] ${participantName} -> ${sanitizedRoomName}`);

  return {
    token: await token.toJwt(),
    serverUrl: SERVER_URL!,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    configured: Boolean(API_KEY && API_SECRET && SERVER_URL),
  });
});

// Token endpoint
app.post("/api/livekit-token", async (req, res) => {
  // Check configuration
  if (!API_KEY || !API_SECRET || !SERVER_URL) {
    console.error("[Error] Missing environment variables");
    return res.status(500).json({
      error: "Server configuration error",
      hint: "Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_SERVER_URL",
    });
  }

  try {
    const { operation, roomName, participantName, raindropApiKey } = req.body;

    // Validate operation
    if (!operation || !["create", "join"].includes(operation)) {
      return res.status(400).json({
        error: "operation is required and must be 'create' or 'join'",
      });
    }

    // Validate required fields
    if (!roomName || typeof roomName !== "string") {
      return res.status(400).json({ error: "roomName is required" });
    }

    if (!participantName || typeof participantName !== "string") {
      return res.status(400).json({ error: "participantName is required" });
    }

    // Handle operation
    let result: TokenResult;

    if (operation === "create") {
      result = await createRoom({ roomName, participantName, raindropApiKey });
    } else {
      result = await joinRoom({ roomName, participantName });
    }

    res.json(result);
  } catch (error) {
    console.error("[Error]", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
🚀 LiveKit Token Server running on port ${PORT}

Environment:
  LIVEKIT_API_KEY:    ${API_KEY ? "✓ configured" : "✗ missing"}
  LIVEKIT_API_SECRET: ${API_SECRET ? "✓ configured" : "✗ missing"}
  LIVEKIT_SERVER_URL: ${SERVER_URL || "✗ missing"}
  ALLOWED_ORIGINS:    ${ALLOWED_ORIGINS.join(", ")}

Endpoints:
  GET  /health              - Health check
  POST /api/livekit-token   - Generate token

Ready to accept connections...
  `);
});
