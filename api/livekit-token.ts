/**
 * LiveKit Token Generation Endpoint
 * Vercel Serverless Function
 *
 * POST /api/livekit-token
 * Body: { roomName: string, participantName: string, identity?: string }
 * Returns: { token: string }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AccessToken } from "livekit-server-sdk";

// Environment variables (set in Vercel dashboard)
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res
      .status(200)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .end();
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check environment variables
  if (!API_KEY || !API_SECRET) {
    console.error(
      "[LiveKit Token] Missing API_KEY or API_SECRET environment variables"
    );
    return res.status(500).json({
      error: "Server configuration error: LiveKit credentials not configured",
    });
  }

  try {
    const { roomName, participantName, identity } = req.body;

    // Validate required fields
    if (!roomName || typeof roomName !== "string") {
      return res.status(400).json({ error: "roomName is required" });
    }

    if (!participantName || typeof participantName !== "string") {
      return res.status(400).json({ error: "participantName is required" });
    }

    // Sanitize identity (use provided or derive from participantName)
    const participantIdentity = (identity || participantName)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 64);

    // Create access token
    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      // Token expires in 6 hours
      ttl: 6 * 60 * 60,
    });

    // Grant permissions for the room
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT
    const jwt = await token.toJwt();

    // Set CORS headers and return token
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(200).json({ token: jwt });
  } catch (error) {
    console.error("[LiveKit Token] Error generating token:", error);
    return res.status(500).json({
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
