/**
 * Simple local test server for the LiveKit token endpoint
 * Run with: npx ts-node api/test-server.ts
 * Or: npx tsx api/test-server.ts
 */

import http from "http";
import { AccessToken } from "livekit-server-sdk";

// Load from .env if available
import { config } from "dotenv";
config();

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const SERVER_URL = process.env.LIVEKIT_SERVER_URL;
const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle POST to /api/livekit-token
  if (req.method !== "POST" || req.url !== "/api/livekit-token") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  // Check credentials
  if (!API_KEY || !API_SECRET || !SERVER_URL) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error:
          "Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_SERVER_URL in .env",
      })
    );
    return;
  }

  // Parse body
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const { roomName, participantName, identity } = JSON.parse(body);

    if (!roomName || !participantName) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "roomName and participantName required" })
      );
      return;
    }

    const participantIdentity = (identity || participantName)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 64);

    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      ttl: 6 * 60 * 60,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ token: jwt, serverUrl: SERVER_URL }));
  } catch (error) {
    console.error("Error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Failed to generate token",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`\n🔐 LiveKit Token Server running at http://localhost:${PORT}`);
  console.log(`\n📍 Endpoint: POST http://localhost:${PORT}/api/livekit-token`);
  console.log(`\n🧪 Test with:`);
  console.log(`   curl -X POST http://localhost:${PORT}/api/livekit-token \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(
    `     -d '{"roomName": "test-room", "participantName": "John"}'\n`
  );

  if (!API_KEY || !API_SECRET || !SERVER_URL) {
    console.log(
      "⚠️  Warning: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_SERVER_URL not set in .env\n"
    );
  } else {
    console.log("✅ LiveKit credentials loaded from .env\n");
    console.log(`🌐 Server URL: ${SERVER_URL}\n`);
  }
});
