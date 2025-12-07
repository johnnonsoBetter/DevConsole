/**
 * LiveKit Agent with STT Transcription
 *
 * This agent joins video call rooms and provides real-time
 * speech-to-text transcription for all participants.
 *
 * Transcriptions are automatically published to the 'lk.transcription'
 * topic and received by the useTranscriptions hook in the frontend.
 *
 * Based on:
 * - https://docs.livekit.io/agents/build/text/
 * - https://docs.livekit.io/agents/ops/deployment/
 */

import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as silero from "@livekit/agents-plugin-silero";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Load environment variables
dotenv.config();

/**
 * Transcription-only Agent
 *
 * This agent joins the room and transcribes all participant speech.
 * It doesn't respond (no LLM/TTS) - it only publishes transcriptions
 * to the lk.transcription topic for the frontend to display.
 */
class TranscriptionAgent extends voice.Agent {
  constructor() {
    super({
      // Minimal instructions since this agent doesn't respond
      instructions: `You are a transcription assistant. You listen and transcribe speech but do not respond.`,
    });
  }
}

export default defineAgent({
  // Prewarm: Load VAD model once and reuse across sessions
  prewarm: async (proc: JobProcess) => {
    console.log("[Agent] Prewarming: Loading Silero VAD model...");
    proc.userData.vad = await silero.VAD.load();
    console.log("[Agent] VAD model loaded successfully");
  },

  entry: async (ctx: JobContext) => {
    console.log("[Agent] New session starting...");

    // Create the voice pipeline session with STT for transcription
    // Transcriptions are automatically published to lk.transcription topic
    const session = new voice.AgentSession({
      // Speech-to-Text provider - Deepgram is recommended for low-latency
      // Transcriptions are published to the lk.transcription topic automatically
      stt: new deepgram.STT({
        model: "nova-3",
        language: "en",
        // Enable interim results for real-time feedback
        interimResults: true,
        // Punctuate the transcription
        punctuate: true,
        // Smart formatting for better readability
        smartFormat: true,
      }),

      // Voice Activity Detection for turn detection
      vad: ctx.proc.userData.vad as silero.VAD,

      // No LLM - this is transcription-only
      // Uncomment to add AI responses:
      // llm: new openai.LLM({ model: 'gpt-4o-mini' }),

      // No TTS - this is transcription-only
      // Uncomment to add voice responses:
      // tts: new openai.TTS({ model: 'tts-1', voice: 'alloy' }),
    });

    // Listen for transcription events (for logging/debugging)
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      const status = ev.isFinal ? "final" : "interim";
      console.log(`[Transcription][${status}] ${ev.transcript}`);
    });

    // Log when conversation items are added (includes both user and agent messages)
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      console.log("[Conversation] Item added:", ev.item.role, "-", ev.item);
    });

    // Start the session
    // Transcriptions are automatically forwarded to all participants via lk.transcription topic
    await session.start({
      agent: new TranscriptionAgent(),
      room: ctx.room,
      // Disable audio output since this is transcription-only
      outputOptions: {
        audioEnabled: false,
        transcriptionEnabled: true, // Ensure transcriptions are published
      },
    });

    console.log("[Agent] Transcription session started");
    console.log(
      "[Agent] Transcriptions will be published to lk.transcription topic"
    );

    // Connect to the room
    await ctx.connect();
    console.log("[Agent] Connected to room:", ctx.room.name);
  },
});

// CLI entry point - required for LiveKit Cloud deployment
cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
