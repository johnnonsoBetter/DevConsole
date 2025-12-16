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
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import {
  AudioStream,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  RoomEvent,
  TrackKind,
  TrackSource,
} from '@livekit/rtc-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Constants for transcription publishing
const TOPIC_TRANSCRIPTION = 'lk.transcription';
const ATTRIBUTE_TRANSCRIPTION_FINAL = 'lk.transcription_final';
const ATTRIBUTE_TRANSCRIPTION_TRACK_ID = 'lk.transcribed_track_id';
const ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID = 'lk.segment_id';

// Error types for better handling
enum TranscriptionErrorType {
  NETWORK_DISCONNECTION = 'NETWORK_DISCONNECTION',
  DEEPGRAM_API_FAILURE = 'DEEPGRAM_API_FAILURE',
  ROOM_CONNECTION_ERROR = 'ROOM_CONNECTION_ERROR',
  AUDIO_STREAM_ERROR = 'AUDIO_STREAM_ERROR',
  STT_STREAM_ERROR = 'STT_STREAM_ERROR',
}

class TranscriptionError extends Error {
  public type: TranscriptionErrorType;
  public originalCause?: unknown;

  constructor(type: TranscriptionErrorType, message: string, originalCause?: unknown) {
    super(message);
    this.name = 'TranscriptionError';
    this.type = type;
    this.originalCause = originalCause;
  }
}

/**
 * Generate a unique segment ID
 */
function generateSegmentId(): string {
  return `SG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

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
  private isRunning: boolean = false;

  constructor(ctx: JobContext, participant: RemoteParticipant, sttProvider: deepgram.STT) {
    this.ctx = ctx;
    this.participant = participant;
    this.sttStream = sttProvider.stream();
    this.abortController = new AbortController();
    this.segmentId = generateSegmentId();
  }

  /**
   * Reset segment ID - call on track changes or reconnections
   */
  resetSegmentId() {
    this.segmentId = generateSegmentId();
    console.log(
      `[Transcriber] Reset segment ID for ${this.participant.identity}: ${this.segmentId}`,
    );
  }

  /**
   * Start transcribing the participant's audio
   */
  async start(track: RemoteTrack, trackSid: string) {
    // Reset segment ID on new track start (handles reconnections)
    this.resetSegmentId();
    this.trackSid = trackSid;
    this.isRunning = true;

    console.log(
      `[Transcriber] Starting transcription for ${this.participant.identity}, track: ${trackSid}`,
    );

    try {
      // Create audio stream from the track
      this.audioStream = new AudioStream(track, {
        sampleRate: 16000, // Deepgram prefers 16kHz
        numChannels: 1,
      });
    } catch (error) {
      throw new TranscriptionError(
        TranscriptionErrorType.AUDIO_STREAM_ERROR,
        `Failed to create audio stream for ${this.participant.identity}`,
        error,
      );
    }

    // Run both tasks with proper cleanup coordination
    const results = await Promise.allSettled([this.forwardAudioToSTT(), this.processSTTEvents()]);

    // Log any errors from the parallel tasks
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(`[Transcriber] Task failed for ${this.participant.identity}:`, result.reason);
      }
    }

    this.isRunning = false;
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
      if (this.abortController.signal.aborted) return;

      // Classify and handle the error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT');

      if (isNetworkError) {
        console.error(
          `[Transcriber] Network disconnection for ${this.participant.identity}:`,
          errorMessage,
        );
        throw new TranscriptionError(
          TranscriptionErrorType.NETWORK_DISCONNECTION,
          `Network error during audio forwarding for ${this.participant.identity}`,
          error,
        );
      }

      console.error(
        `[Transcriber] Audio forwarding error for ${this.participant.identity}:`,
        error,
      );
      throw new TranscriptionError(
        TranscriptionErrorType.AUDIO_STREAM_ERROR,
        `Audio stream error for ${this.participant.identity}`,
        error,
      );
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
          `[Transcription][${this.participant.identity}][${isFinal ? 'final' : 'interim'}] ${transcript}`,
        );

        // Publish transcription to the room
        await this.publishTranscription(transcript, isFinal);

        // Generate new segment ID for next final transcript
        if (isFinal) {
          this.segmentId = generateSegmentId();
        }
      }
    } catch (error) {
      if (this.abortController.signal.aborted) return;

      // Classify the error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isDeepgramError =
        errorMessage.includes('deepgram') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota');

      if (isDeepgramError) {
        console.error(
          `[Transcriber] Deepgram API failure for ${this.participant.identity}:`,
          errorMessage,
        );
        throw new TranscriptionError(
          TranscriptionErrorType.DEEPGRAM_API_FAILURE,
          `Deepgram API error for ${this.participant.identity}`,
          error,
        );
      }

      console.error(`[Transcriber] STT processing error for ${this.participant.identity}:`, error);
      throw new TranscriptionError(
        TranscriptionErrorType.STT_STREAM_ERROR,
        `STT stream error for ${this.participant.identity}`,
        error,
      );
    }
  }

  private async publishTranscription(text: string, isFinal: boolean) {
    try {
      const room = this.ctx.room;
      const localParticipant = room.localParticipant;

      if (!localParticipant) {
        console.warn('[Transcriber] No local participant to publish from');
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRoomConnectionError =
        errorMessage.includes('disconnected') ||
        errorMessage.includes('room') ||
        errorMessage.includes('connection closed');

      if (isRoomConnectionError) {
        console.error(
          `[Transcriber] Room connection error for ${this.participant.identity}:`,
          errorMessage,
        );
        // Don't throw here, let the transcription continue if possible
        // The room event handlers will handle cleanup
      } else {
        console.error(
          `[Transcriber] Failed to publish transcription for ${this.participant.identity}:`,
          error,
        );
      }
    }
  }

  /**
   * Stop transcription for this participant
   */
  async stop() {
    console.log(`[Transcriber] Stopping transcription for ${this.participant.identity}`);
    this.isRunning = false;
    this.abortController.abort();

    // Close STT stream with error handling
    try {
      await this.sttStream.close();
    } catch (error) {
      console.warn(
        `[Transcriber] Error closing STT stream for ${this.participant.identity}:`,
        error,
      );
    }

    // Clean up audio stream reference
    this.audioStream = null;
  }

  /**
   * Check if transcriber is currently running
   */
  get running(): boolean {
    return this.isRunning;
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
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`[Manager] Participant connected: ${participant.identity}`);
    });

    // Handle track subscriptions
    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        // Only transcribe audio tracks from microphones
        if (
          publication.kind === TrackKind.KIND_AUDIO &&
          publication.source === TrackSource.SOURCE_MICROPHONE &&
          publication.sid
        ) {
          console.log(`[Manager] Audio track subscribed from ${participant.identity}`);
          this.startTranscriber(participant, track, publication.sid);
        }
      },
    );

    // Handle track unsubscriptions
    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        _track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        if (
          publication.kind === TrackKind.KIND_AUDIO &&
          publication.source === TrackSource.SOURCE_MICROPHONE
        ) {
          console.log(`[Manager] Audio track unsubscribed from ${participant.identity}`);
          this.stopTranscriber(participant.identity);
        }
      },
    );

    // Handle participant disconnections
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`[Manager] Participant disconnected: ${participant.identity}`);
      this.stopTranscriber(participant.identity);
    });

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
          this.startTranscriber(participant, publication.track, publication.sid);
        }
      }
    }
  }

  private async startTranscriber(
    participant: RemoteParticipant,
    track: RemoteTrack,
    trackSid: string,
  ) {
    // Stop existing transcriber if any
    await this.stopTranscriber(participant.identity);

    // Create new transcriber
    const transcriber = new ParticipantTranscriber(this.ctx, participant, this.sttProvider);
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
    console.log('[Manager] Stopping all transcribers');
    for (const [identity, transcriber] of this.transcribers) {
      await transcriber.stop();
      console.log(`[Manager] Stopped transcriber for ${identity}`);
    }
    this.transcribers.clear();
  }
}

export default defineAgent({
  // Prewarm: No models to preload for this approach
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prewarm: async (_proc: JobProcess) => {
    console.log('[Agent] Prewarm phase (no models to preload)');
  },

  entry: async (ctx: JobContext) => {
    console.log('[Agent] Multi-participant transcription agent starting...');

    // Connect to the room with error handling
    try {
      await ctx.connect();
      console.log('[Agent] Connected to room:', ctx.room.name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Agent] Failed to connect to room:', errorMessage);
      throw new TranscriptionError(
        TranscriptionErrorType.ROOM_CONNECTION_ERROR,
        'Failed to connect to LiveKit room',
        error,
      );
    }

    // Create STT provider (Deepgram for low-latency transcription)
    let sttProvider: deepgram.STT;
    try {
      sttProvider = new deepgram.STT({
        model: 'nova-3',
        language: 'en',
        interimResults: true,
        punctuate: true,
        smartFormat: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Agent] Failed to initialize Deepgram STT:', errorMessage);
      throw new TranscriptionError(
        TranscriptionErrorType.DEEPGRAM_API_FAILURE,
        'Failed to initialize Deepgram STT provider',
        error,
      );
    }

    // Create and start the multi-participant transcription manager
    const manager = new MultiParticipantTranscriptionManager(ctx, sttProvider);
    manager.start();

    console.log('[Agent] Transcription manager started');
    console.log('[Agent] Listening for all participant audio tracks...');
    console.log('[Agent] Transcriptions will be published to lk.transcription topic');

    // Handle room disconnection
    ctx.room.on(RoomEvent.Disconnected, async (reason) => {
      console.log('[Agent] Room disconnected, reason:', reason);
      await manager.stop();
    });

    // Handle reconnection events
    ctx.room.on(RoomEvent.Reconnecting, () => {
      console.log('[Agent] Room reconnecting...');
    });

    ctx.room.on(RoomEvent.Reconnected, () => {
      console.log('[Agent] Room reconnected');
    });

    // Keep the agent running until the room is closed
    // The manager handles all participant lifecycle events
  },
});

// CLI entry point - required for LiveKit Cloud deployment
cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
