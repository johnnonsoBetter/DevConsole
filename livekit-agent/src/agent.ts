/**
 * LiveKit Multi-Participant Transcription Agent
 *
 * This agent joins video call rooms and provides real-time
 * speech-to-text transcription for ALL participants.
 *
 * Unlike the default voice.AgentSession which only transcribes one participant,
 * this agent uses lower-level APIs to create separate STT streams for each
 * participant's audio track.
 *
 * Transcriptions are published to the 'lk.transcription' topic with
 * the correct participant identity as the sender.
 *
 * Based on:
 * - https://docs.livekit.io/agents/build/text/
 * - https://github.com/livekit/agents-js RoomIO implementation
 */

import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  stt,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import {
  AudioStream,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  RoomEvent,
  TrackKind,
  TrackSource,
} from "@livekit/rtc-node";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Load environment variables
dotenv.config();

// Constants for transcription publishing
const TOPIC_TRANSCRIPTION = "lk.transcription";
const ATTRIBUTE_TRANSCRIPTION_FINAL = "lk.transcription_final";
const ATTRIBUTE_TRANSCRIPTION_TRACK_ID = "lk.transcribed_track_id";
const ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID = "lk.segment_id";

/**
 * Manages transcription for a single participant
 */
class ParticipantTranscriber {
  private participant: RemoteParticipant;
  private sttStream: stt.SpeechStream;
  private audioStream: AudioStream | null = null;
  private abortController: AbortController;
  private ctx: JobContext;
  private segmentId: string;
  private trackSid: string | null = null;

  constructor(
    ctx: JobContext,
    participant: RemoteParticipant,
    sttProvider: deepgram.STT
  ) {
    this.ctx = ctx;
    this.participant = participant;
    this.sttStream = sttProvider.stream();
    this.abortController = new AbortController();
    this.segmentId = `SG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Start transcribing the participant's audio
   */
  async start(track: RemoteTrack, trackSid: string) {
    this.trackSid = trackSid;
    console.log(
      `[Transcriber] Starting transcription for ${this.participant.identity}, track: ${trackSid}`
    );

    // Create audio stream from the track
    this.audioStream = new AudioStream(track, {
      sampleRate: 16000, // Deepgram prefers 16kHz
      numChannels: 1,
    });

    // Forward audio frames to STT
    this.forwardAudioToSTT();

    // Process STT events and publish transcriptions
    this.processSTTEvents();
  }

  private async forwardAudioToSTT() {
    try {
      // AudioStream is an AsyncIterable, use for-await-of
      for await (const frame of this.audioStream!) {
        if (this.abortController.signal.aborted) break;
        // Push audio frame to STT stream
        this.sttStream.pushFrame(frame);
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        console.error(
          `[Transcriber] Audio forwarding error for ${this.participant.identity}:`,
          error
        );
      }
    }
  }

  private async processSTTEvents() {
    try {
      for await (const event of this.sttStream) {
        if (this.abortController.signal.aborted) break;

        const transcript = event.alternatives?.[0]?.text;
        if (!transcript) continue;

        const isFinal =
          event.type === stt.SpeechEventType.FINAL_TRANSCRIPT ||
          event.type === stt.SpeechEventType.END_OF_SPEECH;

        console.log(
          `[Transcription][${this.participant.identity}][${isFinal ? "final" : "interim"}] ${transcript}`
        );

        // Publish transcription to the room
        await this.publishTranscription(transcript, isFinal);

        // Generate new segment ID for next final transcript
        if (isFinal) {
          this.segmentId = `SG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        }
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        console.error(
          `[Transcriber] STT processing error for ${this.participant.identity}:`,
          error
        );
      }
    }
  }

  private async publishTranscription(text: string, isFinal: boolean) {
    try {
      const room = this.ctx.room;
      const localParticipant = room.localParticipant;

      if (!localParticipant) {
        console.warn("[Transcriber] No local participant to publish from");
        return;
      }

      // Build attributes for the text stream
      const attributes: Record<string, string> = {
        [ATTRIBUTE_TRANSCRIPTION_FINAL]: isFinal.toString(),
        [ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID]: this.segmentId,
      };

      if (this.trackSid) {
        attributes[ATTRIBUTE_TRANSCRIPTION_TRACK_ID] = this.trackSid;
      }

      // Publish transcription using text streams
      // senderIdentity makes it appear as if the participant sent it
      const writer = await localParticipant.streamText({
        topic: TOPIC_TRANSCRIPTION,
        senderIdentity: this.participant.identity,
        attributes,
      });

      await writer.write(text);
      await writer.close();
    } catch (error) {
      console.error(
        `[Transcriber] Failed to publish transcription for ${this.participant.identity}:`,
        error
      );
    }
  }

  /**
   * Stop transcription for this participant
   */
  async stop() {
    console.log(
      `[Transcriber] Stopping transcription for ${this.participant.identity}`
    );
    this.abortController.abort();
    await this.sttStream.close();
  }
}

/**
 * Manages transcription for all participants in the room
 */
class MultiParticipantTranscriptionManager {
  private ctx: JobContext;
  private sttProvider: deepgram.STT;
  private transcribers: Map<string, ParticipantTranscriber> = new Map();

  constructor(ctx: JobContext, sttProvider: deepgram.STT) {
    this.ctx = ctx;
    this.sttProvider = sttProvider;
  }

  /**
   * Start listening for participants and their audio tracks
   */
  start() {
    const room = this.ctx.room;

    // Handle new participants
    room.on(
      RoomEvent.ParticipantConnected,
      (participant: RemoteParticipant) => {
        console.log(`[Manager] Participant connected: ${participant.identity}`);
      }
    );

    // Handle track subscriptions
    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        // Only transcribe audio tracks from microphones
        if (
          publication.kind === TrackKind.KIND_AUDIO &&
          publication.source === TrackSource.SOURCE_MICROPHONE &&
          publication.sid
        ) {
          console.log(
            `[Manager] Audio track subscribed from ${participant.identity}`
          );
          this.startTranscriber(participant, track, publication.sid);
        }
      }
    );

    // Handle track unsubscriptions
    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        _track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (
          publication.kind === TrackKind.KIND_AUDIO &&
          publication.source === TrackSource.SOURCE_MICROPHONE
        ) {
          console.log(
            `[Manager] Audio track unsubscribed from ${participant.identity}`
          );
          this.stopTranscriber(participant.identity);
        }
      }
    );

    // Handle participant disconnections
    room.on(
      RoomEvent.ParticipantDisconnected,
      (participant: RemoteParticipant) => {
        console.log(
          `[Manager] Participant disconnected: ${participant.identity}`
        );
        this.stopTranscriber(participant.identity);
      }
    );

    // Process existing participants
    for (const participant of room.remoteParticipants.values()) {
      console.log(`[Manager] Existing participant: ${participant.identity}`);
      for (const publication of participant.trackPublications.values()) {
        if (
          publication.kind === TrackKind.KIND_AUDIO &&
          publication.source === TrackSource.SOURCE_MICROPHONE &&
          publication.track &&
          publication.sid
        ) {
          this.startTranscriber(
            participant,
            publication.track,
            publication.sid
          );
        }
      }
    }
  }

  private async startTranscriber(
    participant: RemoteParticipant,
    track: RemoteTrack,
    trackSid: string
  ) {
    // Stop existing transcriber if any
    await this.stopTranscriber(participant.identity);

    // Create new transcriber
    const transcriber = new ParticipantTranscriber(
      this.ctx,
      participant,
      this.sttProvider
    );
    this.transcribers.set(participant.identity, transcriber);

    // Start transcription
    await transcriber.start(track, trackSid);
  }

  private async stopTranscriber(participantIdentity: string) {
    const transcriber = this.transcribers.get(participantIdentity);
    if (transcriber) {
      await transcriber.stop();
      this.transcribers.delete(participantIdentity);
    }
  }

  /**
   * Stop all transcribers
   */
  async stop() {
    console.log("[Manager] Stopping all transcribers");
    for (const [identity, transcriber] of this.transcribers) {
      await transcriber.stop();
      console.log(`[Manager] Stopped transcriber for ${identity}`);
    }
    this.transcribers.clear();
  }
}

export default defineAgent({
  // Prewarm: No models to preload for this approach
  prewarm: async (_proc: JobProcess) => {
    console.log("[Agent] Prewarm phase (no models to preload)");
  },

  entry: async (ctx: JobContext) => {
    console.log("[Agent] Multi-participant transcription agent starting...");

    // Connect to the room first
    await ctx.connect();
    console.log("[Agent] Connected to room:", ctx.room.name);

    // Create STT provider (Deepgram for low-latency transcription)
    const sttProvider = new deepgram.STT({
      model: "nova-3",
      language: "en",
      interimResults: true,
      punctuate: true,
      smartFormat: true,
    });

    // Create and start the multi-participant transcription manager
    const manager = new MultiParticipantTranscriptionManager(ctx, sttProvider);
    manager.start();

    console.log("[Agent] Transcription manager started");
    console.log("[Agent] Listening for all participant audio tracks...");
    console.log(
      "[Agent] Transcriptions will be published to lk.transcription topic"
    );

    // Keep the agent running until the room is closed
    // The manager handles all participant lifecycle events
  },
});

// CLI entry point - required for LiveKit Cloud deployment
cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
