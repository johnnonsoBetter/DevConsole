/**
 * TranscriptMemoryStream
 * Handles batched storage of transcripts to SmartMemory with retry logic
 */

import type {
  MemorySyncStats,
  RetryQueueItem,
  TranscriptBatchContent,
  TranscriptTurn,
} from "./callMemoryTypes";
import { MEMORY_TIMELINES } from "./callMemoryTypes";

// ============================================================================
// TYPES
// ============================================================================

interface TranscriptMemoryStreamOptions {
  /** Working memory instance from Raindrop SDK */
  workingMemory: {
    putMemory: (entry: {
      content: string;
      timeline?: string;
      agent?: string;
    }) => Promise<string>;
  };
  /** Room identifier */
  roomId: string;
  /** Batch interval in milliseconds */
  batchIntervalMs?: number;
  /** Maximum retries for failed writes */
  maxRetries?: number;
  /** Base retry delay in milliseconds */
  retryDelayMs?: number;
  /** Callback when batch is successfully stored */
  onBatchStored?: (batchIndex: number, turnCount: number) => void;
  /** Callback when error occurs */
  onError?: (error: Error, retriesRemaining: number) => void;
  /** Callback when retrying */
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

// ============================================================================
// TRANSCRIPT MEMORY STREAM CLASS
// ============================================================================

export class TranscriptMemoryStream {
  private queue: TranscriptTurn[] = [];
  private retryQueue: RetryQueueItem[] = [];
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private batchCount = 0;
  private totalTurnsStored = 0;
  private failedWrites = 0;
  private retriedWrites = 0;
  private isProcessing = false;
  private isDestroyed = false;

  private readonly workingMemory: TranscriptMemoryStreamOptions["workingMemory"];
  private readonly roomId: string;
  private readonly batchIntervalMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly onBatchStored?: TranscriptMemoryStreamOptions["onBatchStored"];
  private readonly onError?: TranscriptMemoryStreamOptions["onError"];
  private readonly onRetry?: TranscriptMemoryStreamOptions["onRetry"];

  constructor(options: TranscriptMemoryStreamOptions) {
    this.workingMemory = options.workingMemory;
    this.roomId = options.roomId;
    this.batchIntervalMs = options.batchIntervalMs ?? 3000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.onBatchStored = options.onBatchStored;
    this.onError = options.onError;
    this.onRetry = options.onRetry;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Add transcript turns to the queue
   * Will be batched and stored after the debounce interval
   */
  add(turns: TranscriptTurn[]): void {
    if (this.isDestroyed) {
      console.warn("[TranscriptMemoryStream] Cannot add to destroyed stream");
      return;
    }

    // 🔍 LOG: Incoming transcript turns BEFORE queuing
    console.log("[TranscriptMemoryStream] 📥 RECEIVED TURNS TO QUEUE:", {
      turnCount: turns.length,
      currentQueueSize: this.queue.length,
      turns: turns.map((t) => ({
        id: t.id,
        speaker: t.participantName,
        text: t.text,
        timestamp: new Date(t.timestamp).toISOString(),
        isLocal: t.isLocal,
      })),
    });

    this.queue.push(...turns);
    this.scheduleBatchWrite();
  }

  /**
   * Add a single transcript turn
   */
  addTurn(turn: TranscriptTurn): void {
    this.add([turn]);
  }

  /**
   * Force immediate flush of current queue
   */
  async flush(): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    await this.processBatch();
  }

  /**
   * Get current sync statistics
   */
  getStats(): MemorySyncStats {
    return {
      batchesStored: this.batchCount,
      turnsStored: this.totalTurnsStored,
      failedWrites: this.failedWrites,
      retriedWrites: this.retriedWrites,
      pendingRetries: this.retryQueue.length,
    };
  }

  /**
   * Check if there are pending items
   */
  hasPending(): boolean {
    return this.queue.length > 0 || this.retryQueue.length > 0;
  }

  /**
   * Destroy the stream, flushing any remaining items
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Final flush of remaining queue
    if (this.queue.length > 0) {
      await this.processBatch();
    }

    // Process remaining retries
    await this.processRetryQueue();
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private scheduleBatchWrite(): void {
    if (this.debounceTimeout) {
      return; // Already scheduled
    }

    this.debounceTimeout = setTimeout(async () => {
      this.debounceTimeout = null;
      await this.processBatch();
    }, this.batchIntervalMs);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Take current queue contents
      const batch = this.queue.splice(0);
      const batchIndex = this.batchCount;

      // Count unique speakers
      const speakers = new Set(batch.map((t) => t.participantIdentity));

      // Create memory content
      const content: TranscriptBatchContent = {
        type: "transcript_batch",
        roomId: this.roomId,
        timestamp: new Date().toISOString(),
        batch,
        batchIndex,
        batchTimestamp: new Date().toISOString(),
        speakerCount: speakers.size,
      };

      const contentStr = JSON.stringify(content);

      // 🔍 LOG: Transcript batch content BEFORE storing to working memory
      console.log(
        `[TranscriptMemoryStream] 📝 STORING TRANSCRIPT BATCH ${batchIndex}:`,
        {
          timeline: MEMORY_TIMELINES.CONVERSATION,
          batchIndex,
          turnCount: batch.length,
          speakers: [...speakers],
          turns: batch.map((t) => ({
            speaker: t.participantName,
            text: t.text.substring(0, 100) + (t.text.length > 100 ? "..." : ""),
            timestamp: t.timestamp,
            isLocal: t.isLocal,
          })),
          fullContent: content,
          contentStringLength: contentStr.length,
        }
      );
      console.log(
        `[TranscriptMemoryStream] 📝 FULL CONTENT STRING:`,
        contentStr
      );

      try {
        await this.workingMemory.putMemory({
          content: contentStr,
          timeline: MEMORY_TIMELINES.CONVERSATION,
          agent: "transcript_stream",
        });

        // Success
        this.batchCount++;
        this.totalTurnsStored += batch.length;
        this.onBatchStored?.(batchIndex, batch.length);

        console.log(
          `[TranscriptMemoryStream] Stored batch ${batchIndex} with ${batch.length} turns`
        );
      } catch (error) {
        console.error("[TranscriptMemoryStream] Failed to store batch:", error);
        this.failedWrites++;

        // Add to retry queue
        this.retryQueue.push({
          content: contentStr,
          timeline: MEMORY_TIMELINES.CONVERSATION,
          attempts: 1,
          queuedAt: Date.now(),
        });

        this.scheduleRetry();
        this.onError?.(
          error instanceof Error ? error : new Error(String(error)),
          this.maxRetries - 1
        );
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimeout || this.retryQueue.length === 0) {
      return;
    }

    const item = this.retryQueue[0];
    const delay = this.retryDelayMs * Math.pow(2, item.attempts - 1);

    this.retryTimeout = setTimeout(async () => {
      this.retryTimeout = null;
      await this.processRetryQueue();
    }, delay);
  }

  private async processRetryQueue(): Promise<void> {
    while (this.retryQueue.length > 0) {
      const item = this.retryQueue[0];

      try {
        this.onRetry?.(item.attempts, this.maxRetries);

        await this.workingMemory.putMemory({
          content: item.content,
          timeline: item.timeline,
          agent: "transcript_stream",
        });

        // Success - remove from queue
        this.retryQueue.shift();
        this.retriedWrites++;
        this.batchCount++;

        // Parse to get turn count for stats
        try {
          const parsed = JSON.parse(item.content) as TranscriptBatchContent;
          this.totalTurnsStored += parsed.batch.length;
        } catch {
          // Ignore parse errors for stats
        }

        console.log("[TranscriptMemoryStream] Retry successful");
      } catch (error) {
        item.attempts++;

        if (item.attempts >= this.maxRetries) {
          console.error(
            "[TranscriptMemoryStream] Max retries reached, dropping batch:",
            error
          );
          this.retryQueue.shift();

          // Store to local backup
          this.storeToLocalBackup(item.content);

          this.onError?.(
            error instanceof Error ? error : new Error(String(error)),
            0
          );
        } else {
          // Schedule next retry with exponential backoff
          this.scheduleRetry();
          break;
        }
      }
    }
  }

  private storeToLocalBackup(content: string): void {
    try {
      const key = `transcript_backup_${this.roomId}`;
      const existing = localStorage.getItem(key);
      const backups: Array<{ content: string; timestamp: number }> = existing
        ? JSON.parse(existing)
        : [];

      backups.push({ content, timestamp: Date.now() });

      // Keep only last 50 backups
      if (backups.length > 50) {
        backups.splice(0, backups.length - 50);
      }

      localStorage.setItem(key, JSON.stringify(backups));
      console.log("[TranscriptMemoryStream] Stored to local backup");
    } catch (error) {
      console.error(
        "[TranscriptMemoryStream] Failed to store local backup:",
        error
      );
    }
  }
}
