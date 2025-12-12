/**
 * ImmediateTurnManager
 * Stores transcript turns immediately to working memory for instant searchability
 *
 * Unlike the batched TranscriptMemoryStream, this class:
 * 1. Stores each turn immediately when received
 * 2. Maintains a local cache for instant local search
 * 3. Merges local and server search results
 */

import type { TranscriptTurn } from "./callMemoryTypes";
import { MEMORY_TIMELINES } from "./callMemoryTypes";

// ============================================================================
// TYPES
// ============================================================================

interface WorkingMemoryInterface {
  putMemory: (entry: {
    content: string;
    timeline?: string;
    agent?: string;
  }) => Promise<string>;
  searchMemory: (query: {
    terms: string;
    nMostRecent?: number;
  }) => Promise<Array<{ content: string; at: Date }> | null>;
}

interface ImmediateTurnManagerOptions {
  /** Working memory instance from Raindrop SDK */
  workingMemory: WorkingMemoryInterface;
  /** Room identifier */
  roomId: string;
  /** Callback when turn is successfully stored */
  onTurnStored?: (turn: TranscriptTurn) => void;
  /** Callback when error occurs */
  onError?: (error: Error, turn: TranscriptTurn) => void;
}

export interface TurnSearchResult {
  turn: TranscriptTurn;
  source: "local" | "server";
}

interface TurnMemoryContent {
  type: "transcript_turn";
  roomId: string;
  timestamp: string;
  turn: TranscriptTurn;
}

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = "[ImmediateTurnManager]";

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================================================
// IMMEDIATE TURN MANAGER CLASS
// ============================================================================

export class ImmediateTurnManager {
  /** Local cache of turns for instant search */
  private localTurns: TranscriptTurn[] = [];

  /** Set of turn IDs that have been stored (to prevent duplicates) */
  private storedTurnIds: Set<string> = new Set();

  /** Count of turns stored */
  private turnsStored = 0;

  /** Count of failed writes */
  private failedWrites = 0;

  /** Whether manager is destroyed */
  private isDestroyed = false;

  private readonly workingMemory: WorkingMemoryInterface;
  private readonly roomId: string;
  private readonly onTurnStored?: ImmediateTurnManagerOptions["onTurnStored"];
  private readonly onError?: ImmediateTurnManagerOptions["onError"];

  constructor(options: ImmediateTurnManagerOptions) {
    this.workingMemory = options.workingMemory;
    this.roomId = options.roomId;
    this.onTurnStored = options.onTurnStored;
    this.onError = options.onError;

    log("Created for room:", this.roomId);
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Add a single turn - stores immediately to working memory
   * Also caches locally for instant search
   */
  async addTurn(turn: TranscriptTurn): Promise<boolean> {
    if (this.isDestroyed) {
      logError("Cannot add turn to destroyed manager");
      return false;
    }

    // Skip if already stored (prevents duplicates from React re-renders)
    if (this.storedTurnIds.has(turn.id)) {
      log("Turn already stored, skipping:", turn.id);
      return true;
    }

    // 1. Store locally for instant access
    this.localTurns.push(turn);
    this.storedTurnIds.add(turn.id);

    log("📥 ADDING TURN:", {
      id: turn.id,
      speaker: turn.participantName,
      text: turn.text.substring(0, 80) + (turn.text.length > 80 ? "..." : ""),
      isLocal: turn.isLocal,
      timestamp: new Date(turn.timestamp).toISOString(),
    });

    // 2. Create memory content
    const content: TurnMemoryContent = {
      type: "transcript_turn",
      roomId: this.roomId,
      timestamp: new Date().toISOString(),
      turn,
    };

    const contentStr = JSON.stringify(content);

    log("📝 STORING TO WORKING MEMORY:", {
      timeline: MEMORY_TIMELINES.CONVERSATION,
      speaker: turn.participantName,
      textPreview: turn.text.substring(0, 50),
      contentLength: contentStr.length,
    });

    // 3. Store in working memory immediately
    try {
      await this.workingMemory.putMemory({
        content: contentStr,
        timeline: MEMORY_TIMELINES.CONVERSATION,
        agent: turn.participantName,
      });

      this.turnsStored++;
      this.onTurnStored?.(turn);

      log("✅ Turn stored successfully:", {
        id: turn.id,
        totalStored: this.turnsStored,
      });

      return true;
    } catch (error) {
      this.failedWrites++;
      const err = error instanceof Error ? error : new Error(String(error));

      logError("❌ Failed to store turn:", {
        id: turn.id,
        error: err.message,
        failedWrites: this.failedWrites,
      });

      this.onError?.(err, turn);
      return false;
    }
  }

  /**
   * Add multiple turns - stores each immediately
   */
  async addTurns(turns: TranscriptTurn[]): Promise<void> {
    log(`Adding ${turns.length} turns`);

    // Store all turns in parallel for speed
    await Promise.all(turns.map((turn) => this.addTurn(turn)));
  }

  /**
   * Search turns - merges local cache with server results
   */
  async searchTurns(query: string): Promise<TurnSearchResult[]> {
    const lowerQuery = query.toLowerCase();
    const results: TurnSearchResult[] = [];
    const seenIds = new Set<string>();

    // 1. Search local cache first (instant results)
    const localMatches = this.localTurns.filter(
      (t) =>
        t.text.toLowerCase().includes(lowerQuery) ||
        t.participantName.toLowerCase().includes(lowerQuery)
    );

    for (const turn of localMatches) {
      seenIds.add(turn.id);
      results.push({ turn, source: "local" });
    }

    log(`Local search for "${query}": ${localMatches.length} results`);

    // 2. Search server for any we might have missed
    try {
      const serverResults = await this.workingMemory.searchMemory({
        terms: query,
        nMostRecent: 50,
      });

      if (serverResults) {
        for (const result of serverResults) {
          try {
            const parsed = JSON.parse(result.content) as TurnMemoryContent;
            if (parsed.type === "transcript_turn" && parsed.turn) {
              if (!seenIds.has(parsed.turn.id)) {
                seenIds.add(parsed.turn.id);
                results.push({ turn: parsed.turn, source: "server" });
              }
            }
          } catch {
            // Skip unparseable results
          }
        }
      }

      log(
        `Server search for "${query}": ${serverResults?.length ?? 0} raw results`
      );
    } catch (err) {
      logError("Server search failed:", err);
      // Local results still returned
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.turn.timestamp - a.turn.timestamp);

    return results;
  }

  /**
   * Get all local turns (for UI display)
   */
  getLocalTurns(): TranscriptTurn[] {
    return [...this.localTurns];
  }

  /**
   * Get statistics
   */
  getStats(): {
    turnsStored: number;
    failedWrites: number;
    localCacheSize: number;
  } {
    return {
      turnsStored: this.turnsStored,
      failedWrites: this.failedWrites,
      localCacheSize: this.localTurns.length,
    };
  }

  /**
   * Check if turn was already stored
   */
  hasTurn(turnId: string): boolean {
    return this.storedTurnIds.has(turnId);
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    log("Destroying manager:", {
      turnsStored: this.turnsStored,
      failedWrites: this.failedWrites,
      localCacheSize: this.localTurns.length,
    });

    this.isDestroyed = true;
    this.localTurns = [];
    this.storedTurnIds.clear();
  }
}
