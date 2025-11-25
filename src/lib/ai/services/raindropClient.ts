/**
 * Raindrop Client Service
 * Integration with LiquidMetal's Raindrop SmartMemory for persistent AI context
 *
 * Uses the official @liquidmetal-ai/lm-raindrop SDK
 * @see https://docs.liquidmetal.ai/sdk/examples/smart-memory/
 * @see https://docs.liquidmetal.ai/reference/smartmemory/
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import type { RaindropSettings, SmartMemoryLocation } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default timeline for memory entries when not specified */
export const DEFAULT_TIMELINE = "*defaultTimeline";

/** Default agent name for DevConsole operations */
export const DEFAULT_AGENT = "devconsole-log-explainer";

// ============================================================================
// TYPES - Based on SmartMemory Reference
// ============================================================================

/**
 * Memory entry stored in working memory
 * @see https://docs.liquidmetal.ai/reference/smartmemory/#memoryentry
 */
export interface MemoryEntry {
  /** Unique entry identifier */
  id: string;
  /** Session this entry belongs to (called 'in' in server API, 'sessionId' in SDK) */
  sessionId: string;
  /** Timeline organization (defaults to "*defaultTimeline") */
  timeline: string;
  /** Entry originator */
  by: string;
  /** Entry cause or trigger */
  dueTo: string;
  /** Actual memory content */
  content: string;
  /** Timestamp when entry was created (ISO string) */
  at: string;
  /** Optional metadata for filtering */
  key?: string;
  /** Optional agent name that created this entry */
  agent?: string;
}

/**
 * New memory entry to be stored
 * @see https://docs.liquidmetal.ai/reference/smartmemory/#newmemoryentry
 */
export interface NewMemoryEntry {
  /** Required memory content */
  content: string;
  /** Optional timeline (defaults to "*defaultTimeline") */
  timeline?: string;
  /** Optional metadata for filtering */
  key?: string;
  /** Optional agent name */
  agent?: string;
}

/**
 * Query parameters for retrieving memories
 */
export interface WorkingMemoryQuery {
  /** Timeline to filter (defaults to "*defaultTimeline") */
  timeline?: string;
  /** Optional metadata filtering */
  key?: string;
  /** Maximum number of recent entries (defaults to 'all') */
  nMostRecent?: number;
  /** Optional time range start (ISO string) */
  startTime?: string;
  /** Optional time range end (ISO string) */
  endTime?: string;
}

/**
 * Query parameters for searching memories
 */
export interface WorkingMemorySearchQuery extends WorkingMemoryQuery {
  /** Required search terms for semantic search */
  terms: string;
}

/**
 * Episodic memory entry - summarized past session
 */
export interface EpisodicMemoryEntry {
  /** Session identifier */
  sessionId: string;
  /** AI-generated summary of the session */
  summary: string;
  /** Agent that created this episodic memory */
  agent?: string;
  /** Number of individual memory entries in this session */
  entryCount: number;
  /** Number of different timelines in this session */
  timelineCount: number;
  /** Duration of the session in milliseconds */
  duration: number;
  /** When this episodic memory was created (ISO string) */
  createdAt: string;
  /** Relevance score for search results */
  score: number;
}

/**
 * Procedure entry - reusable template or skill
 * @see https://docs.liquidmetal.ai/reference/smartmemory/#procedureentry
 */
export interface ProcedureEntry {
  /** Procedure identifier/key */
  key: string;
  /** Procedure content or template */
  value: string;
  /** Creation timestamp (ISO string) */
  createdAt: string;
  /** Last modification timestamp (ISO string) */
  updatedAt: string;
}

/**
 * Semantic memory document - structured knowledge
 */
export interface SemanticDocument {
  /** Document title */
  title?: string;
  /** Document content */
  content: string;
  /** Optional category */
  category?: string;
  /** Optional tags for organization */
  tags?: string[];
  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  /** Unique signature for this search result chunk */
  chunkSignature: string;
  /** Matched text content from the document */
  text: string;
  /** Source reference for the matched content */
  source: string;
  /** Relevance score for this search result */
  score: number;
  /** Optional payload signature */
  payloadSignature?: string;
  /** Optional content type */
  type?: string;
}

// ============================================================================
// RAINDROP CLIENT
// ============================================================================

export class RaindropClient {
  private client: Raindrop;
  private smartMemoryLocation: SmartMemoryLocation;

  constructor(settings: RaindropSettings) {
    // Initialize the official SDK client
    this.client = new Raindrop({
      apiKey: settings.apiKey,
    });

    // SmartMemoryLocation is required for all memory operations
    this.smartMemoryLocation = {
      smartMemory: {
        name: settings.smartMemoryName || "devconsole-memory",
        application_name: settings.applicationName || "devconsole",
        version: settings.version || "1",
      },
    };
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Start a new working memory session
   */
  async startSession(): Promise<{ sessionId: string }> {
    const response = await this.client.startSession.create({
      smartMemoryLocation: this.smartMemoryLocation,
    });
    return { sessionId: response.sessionId ?? "" };
  }

  /**
   * End a session with optional flush to episodic memory
   */
  async endSession(
    sessionId: string,
    flush: boolean = true
  ): Promise<{ success: boolean }> {
    const response = await this.client.endSession.create({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      flush,
    });
    return { success: response.success ?? false };
  }

  /**
   * Rehydrate a previous session from episodic memory
   */
  async rehydrateSession(
    sessionId: string,
    summaryOnly: boolean = false
  ): Promise<{ success: boolean; operation: string }> {
    const response = await this.client.rehydrateSession.rehydrate({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      summaryOnly,
    });
    return {
      success: response.success ?? false,
      operation: response.operation ?? "",
    };
  }

  // ============================================================================
  // WORKING MEMORY
  // ============================================================================

  /**
   * Store a memory entry in working memory
   * Memories are organized by timeline and can include contextual information
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#putmemory
   */
  async putMemory(
    sessionId: string,
    content: string,
    options?: {
      timeline?: string;
      key?: string;
      agent?: string;
    }
  ): Promise<{ memoryId: string }> {
    const response = await this.client.putMemory.create({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      content,
      timeline: options?.timeline ?? DEFAULT_TIMELINE,
      key: options?.key,
      agent: options?.agent ?? DEFAULT_AGENT,
    });
    return { memoryId: response.memoryId ?? "" };
  }

  /**
   * Retrieve memories from working memory with optional filtering
   * Supports timeline, key, temporal, and recency filtering
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#getmemory
   */
  async getMemory(
    sessionId: string,
    query?: WorkingMemoryQuery
  ): Promise<{ memories: MemoryEntry[] }> {
    const response = await this.client.getMemory.retrieve({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      timeline: query?.timeline,
      key: query?.key,
      nMostRecent: query?.nMostRecent,
      startTime: query?.startTime,
      endTime: query?.endTime,
    });

    // Map SDK response to our MemoryEntry type
    const memories: MemoryEntry[] = (response.memories ?? []).map((m) => ({
      id: m.id ?? "",
      sessionId: m.sessionId ?? "",
      timeline: m.timeline ?? DEFAULT_TIMELINE,
      by: m.by ?? "",
      dueTo: m.dueTo ?? "",
      content: m.content ?? "",
      at: m.at ?? "",
      key: m.key ?? undefined,
      agent: m.agent ?? undefined,
    }));

    return { memories };
  }

  /**
   * Search working memory using semantic/vector search
   * Finds semantically similar content regardless of exact keyword matches
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#searchmemory
   */
  async searchMemory(
    sessionId: string,
    terms: string,
    query?: Omit<WorkingMemoryQuery, "key">
  ): Promise<{ memories: MemoryEntry[] }> {
    const response = await this.client.query.memory.search({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      terms,
      timeline: query?.timeline,
      nMostRecent: query?.nMostRecent,
      startTime: query?.startTime,
      endTime: query?.endTime,
    });

    // Map SDK response to our MemoryEntry type
    const memories: MemoryEntry[] = (response.memories ?? []).map((m) => ({
      id: m.id ?? "",
      sessionId: m.sessionId ?? "",
      timeline: m.timeline ?? DEFAULT_TIMELINE,
      by: m.by ?? "",
      dueTo: m.dueTo ?? "",
      content: m.content ?? "",
      at: m.at ?? "",
      key: m.key ?? undefined,
      agent: m.agent ?? undefined,
    }));

    return { memories };
  }

  /**
   * Delete a specific memory entry by ID
   * This operation is permanent and cannot be undone
   */
  async deleteMemory(
    sessionId: string,
    memoryId: string
  ): Promise<{ success: boolean }> {
    const response = await this.client.deleteMemory.create({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      memoryId,
    });
    return { success: response.success ?? false };
  }

  // ============================================================================
  // EPISODIC MEMORY
  // ============================================================================

  /**
   * Search episodic memory for past sessions
   * Finds relevant past sessions based on natural language queries
   * Returns summaries and metadata from stored episodic memory sessions
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#searchepisodicmemory
   */
  async searchEpisodicMemory(
    terms: string,
    options?: {
      nMostRecent?: number;
      startTime?: string;
      endTime?: string;
    }
  ): Promise<{ entries: EpisodicMemoryEntry[] }> {
    const response = await this.client.query.episodicMemory.search({
      smartMemoryLocation: this.smartMemoryLocation,
      terms,
      nMostRecent: options?.nMostRecent,
      startTime: options?.startTime,
      endTime: options?.endTime,
    });

    // Map SDK response to our EpisodicMemoryEntry type
    const entries: EpisodicMemoryEntry[] = (response.entries ?? []).map(
      (e) => ({
        sessionId: e.sessionId ?? "",
        summary: e.summary ?? "",
        agent: e.agent ?? undefined,
        entryCount: e.entryCount ?? 0,
        timelineCount: e.timelineCount ?? 0,
        duration:
          typeof e.duration === "string"
            ? parseInt(e.duration, 10)
            : (e.duration ?? 0),
        createdAt: e.createdAt ?? "",
        score: e.score ?? 0,
      })
    );

    return { entries };
  }

  // ============================================================================
  // SEMANTIC MEMORY (KNOWLEDGE BASE)
  // ============================================================================

  /**
   * Store a document in semantic memory for long-term knowledge retrieval
   * Semantic memory stores structured knowledge, facts, and information
   * that can be searched and retrieved across different sessions
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#putsemanticmemory
   */
  async putSemanticMemory(
    document: SemanticDocument | string
  ): Promise<{ success: boolean; objectId?: string }> {
    // Convert to JSON string if object provided
    const documentStr =
      typeof document === "string" ? document : JSON.stringify(document);

    const response = await this.client.putSemanticMemory.create({
      smartMemoryLocation: this.smartMemoryLocation,
      document: documentStr,
    });
    return {
      success: response.success ?? false,
      objectId: response.objectId ?? undefined,
    };
  }

  /**
   * Search semantic memory with natural language
   * Uses vector embeddings to find semantically similar content
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#searchsemanticmemory
   */
  async searchSemanticMemory(
    needle: string
  ): Promise<{ success: boolean; results: SemanticSearchResult[] }> {
    const response = await this.client.query.semanticMemory.search({
      smartMemoryLocation: this.smartMemoryLocation,
      needle,
    });

    // Map SDK response to our SemanticSearchResult type
    const results: SemanticSearchResult[] = (
      response.documentSearchResponse?.results ?? []
    ).map((r) => ({
      chunkSignature: r.chunkSignature ?? "",
      text: r.text ?? "",
      source: r.source ?? "",
      score: r.score ?? 0,
      payloadSignature: r.payloadSignature ?? undefined,
      type: r.type ?? undefined,
    }));

    return {
      success: response.success ?? false,
      results,
    };
  }

  /**
   * Get a specific semantic memory document by ID
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#getsemanticmemory
   */
  async getSemanticMemory(
    objectId: string
  ): Promise<{ success: boolean; document?: SemanticDocument | unknown }> {
    const response = await this.client.getSemanticMemory.create({
      smartMemoryLocation: this.smartMemoryLocation,
      objectId,
    });

    // Try to parse the document if it's a JSON string
    let doc = response.document;
    if (typeof doc === "string") {
      try {
        doc = JSON.parse(doc);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    return { success: response.success ?? false, document: doc };
  }

  /**
   * Delete a semantic memory document
   * This operation is permanent and cannot be undone
   * @see https://docs.liquidmetal.ai/reference/smartmemory/#deletesemanticmemory
   */
  async deleteSemanticMemory(objectId: string): Promise<{ success: boolean }> {
    const response = await this.client.deleteSemanticMemory.delete({
      smartMemoryLocation: this.smartMemoryLocation,
      objectId,
    });
    return { success: response.success ?? false };
  }

  // ============================================================================
  // PROCEDURAL MEMORY (TEMPLATES & SKILLS)
  // ============================================================================

  /**
   * Store a procedure (template, prompt, workflow)
   */
  async putProcedure(
    key: string,
    value: string
  ): Promise<{ success: boolean }> {
    const response = await this.client.putProcedure.create({
      smartMemoryLocation: this.smartMemoryLocation,
      key,
      value,
    });
    return { success: response.success ?? false };
  }

  /**
   * Retrieve a stored procedure
   */
  async getProcedure(key: string): Promise<{ found: boolean; value?: string }> {
    const response = await this.client.getProcedure.create({
      smartMemoryLocation: this.smartMemoryLocation,
      key,
    });
    return {
      found: response.found ?? false,
      value: response.value ?? undefined,
    };
  }

  /**
   * List all stored procedures
   */
  async listProcedures(): Promise<{ procedures: ProcedureEntry[] }> {
    const response = await this.client.listProcedures.create({
      smartMemoryLocation: this.smartMemoryLocation,
    });

    // Map SDK response to our ProcedureEntry type
    const procedures: ProcedureEntry[] = (response.procedures ?? []).map(
      (p) => ({
        key: p.key ?? "",
        value: p.value ?? "",
        createdAt: p.createdAt ?? "",
        updatedAt: p.updatedAt ?? "",
      })
    );

    return { procedures };
  }

  /**
   * Search procedures by text
   */
  async searchProcedures(
    terms: string,
    options?: {
      nMostRecent?: number;
      searchKeys?: boolean;
      searchValues?: boolean;
    }
  ): Promise<{ procedures: ProcedureEntry[] }> {
    const response = await this.client.query.procedures.search({
      smartMemoryLocation: this.smartMemoryLocation,
      terms,
      nMostRecent: options?.nMostRecent,
      searchKeys: options?.searchKeys ?? true,
      searchValues: options?.searchValues ?? true,
    });

    // Map SDK response to our ProcedureEntry type
    const procedures: ProcedureEntry[] = (response.procedures ?? []).map(
      (p) => ({
        key: p.key ?? "",
        value: p.value ?? "",
        createdAt: p.createdAt ?? "",
        updatedAt: p.updatedAt ?? "",
      })
    );

    return { procedures };
  }

  /**
   * Delete a procedure
   */
  async deleteProcedure(key: string): Promise<{ success: boolean }> {
    const response = await this.client.deleteProcedure.create({
      smartMemoryLocation: this.smartMemoryLocation,
      key,
    });
    return { success: response.success ?? false };
  }

  // ============================================================================
  // SUMMARIZATION
  // ============================================================================

  /**
   * Summarize a collection of memories using AI
   * Generates intelligent summaries identifying key themes, patterns, and decisions
   */
  async summarizeMemory(
    sessionId: string,
    memoryIds: string[],
    systemPrompt?: string
  ): Promise<{ summary: string; summarizedMemoryIds: string[] }> {
    const response = await this.client.summarizeMemory.create({
      smartMemoryLocation: this.smartMemoryLocation,
      sessionId,
      memoryIds,
      systemPrompt,
    });

    return {
      summary: response.summary ?? "",
      summarizedMemoryIds: response.summarizedMemoryIds ?? [],
    };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Test connection to Raindrop API
   * Attempts to start a session to verify SmartMemory is accessible
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    needsSetup?: boolean;
  }> {
    try {
      // Try to start a session - this validates both API key and SmartMemory existence
      const { sessionId } = await this.startSession();

      // End the test session immediately (don't flush)
      await this.endSession(sessionId, false);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";

      // Check if this is a "SmartMemory not found" error
      const isNotFound =
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("not_found");

      if (isNotFound) {
        return {
          success: false,
          error: `SmartMemory "${this.smartMemoryLocation.smartMemory.name}" not found. Please create it in your Raindrop dashboard first.`,
          needsSetup: true,
        };
      }

      // Check for authentication errors
      if (
        errorMessage.includes("401") ||
        errorMessage.toLowerCase().includes("unauthorized")
      ) {
        return {
          success: false,
          error: "Invalid API key. Please check your Raindrop API key.",
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get the current SmartMemoryLocation configuration
   */
  getSmartMemoryLocation(): SmartMemoryLocation {
    return this.smartMemoryLocation;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Raindrop client from settings
 */
export function createRaindropClient(
  settings: RaindropSettings
): RaindropClient {
  return new RaindropClient(settings);
}

/**
 * Check if Raindrop is configured and enabled
 */
export function isRaindropEnabled(settings?: RaindropSettings): boolean {
  return !!(settings?.enabled && settings?.apiKey);
}
