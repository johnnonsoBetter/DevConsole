/**
 * GraphQL SmartMemory Client
 * 
 * A comprehensive client for GraphQL schema intelligence using LiquidMetal's 
 * Raindrop SmartMemory with full AI capabilities.
 * 
 * Memory Architecture:
 * - Semantic Memory: Long-term schema knowledge (types, operations, relationships)
 * - Procedural Memory: Reusable templates, prompts, and workflows
 * - Working Memory: Session-based context for multi-turn interactions
 * - Episodic Memory: Historical sessions for context retrieval
 * 
 * AI Features:
 * - Semantic search with vector embeddings
 * - AI-powered memory summarization
 * - Natural language to query understanding
 * - Session context management
 * 
 * @see https://docs.liquidmetal.ai/sdk/examples/smart-memory/
 * @see https://docs.liquidmetal.ai/reference/smartmemory/
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import type { ProcessedSchema } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface GraphQLMemoryConfig {
  apiKey: string;
  memoryName?: string;
  applicationName?: string;
  version?: string;
}

const DEFAULT_CONFIG = {
  memoryName: "graphql-schema-memory",
  applicationName: "devconsole",
  version: "1",
} as const;

// ============================================================================
// SESSION TYPES
// ============================================================================

/** Active working memory session */
export interface MemorySession {
  sessionId: string;
  startedAt: number;
  timeline?: string;
}

/** Memory entry in working memory */
export interface MemoryEntry {
  id: string;
  content: string;
  timeline: string;
  createdAt: string;
  agent?: string;
  key?: string;
}

/** Episodic memory summary */
export interface EpisodicEntry {
  sessionId: string;
  summary: string;
  duration: number;
  entryCount: number;
  createdAt: string;
  score?: number;
}

/** AI summarization result */
export interface SummarizationResult {
  summary: string;
  summarizedIds: string[];
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/** Full schema document stored in semantic memory */
export interface SchemaDocument {
  docType: "schema";
  endpoint: string;
  hash: string;
  fetchedAt: number;
  stats: {
    queries: number;
    mutations: number;
    subscriptions: number;
    types: number;
  };
  schema: ProcessedSchema;
}

/** Individual type document for granular search */
export interface TypeDocument {
  docType: "type";
  endpoint: string;
  category: "object" | "interface" | "enum" | "union" | "input" | "scalar";
  name: string;
  description: string;
  fields: string;
  relatedTypes: string[];
}

/** Operation document (query/mutation/subscription) */
export interface OperationDocument {
  docType: "operation";
  endpoint: string;
  kind: "query" | "mutation" | "subscription";
  name: string;
  description: string;
  signature: string;
  arguments: string;
  returnType: string;
}

/** Query template stored in procedural memory */
export interface QueryTemplate {
  name: string;
  query: string;
  description: string;
  variables?: string;
  createdAt?: number;
  tags?: string[];
}

/** System prompt stored in procedural memory */
export interface SystemPrompt {
  key: string;
  prompt: string;
  description?: string;
  createdAt?: number;
}

/** Search result from semantic memory */
export interface SemanticSearchResult {
  text: string;
  source: string;
  score: number;
  chunkSignature?: string;
  payloadSignature?: string;
  type?: string;
}

/** Working memory search result */
export interface MemorySearchResult {
  id: string;
  content: string;
  timeline: string;
  createdAt: string;
  agent?: string;
  dueTo?: string;
}

/** Procedure search result */
export interface ProcedureSearchResult {
  key: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// CLIENT
// ============================================================================

export class GraphQLSmartMemory {
  private client: Raindrop;
  private location: {
    smartMemory: { name: string; application_name: string; version: string };
  };
  private currentSession: MemorySession | null = null;

  constructor(config: GraphQLMemoryConfig) {
    this.client = new Raindrop({ apiKey: config.apiKey });
    this.location = {
      smartMemory: {
        name: config.memoryName ?? DEFAULT_CONFIG.memoryName,
        application_name: config.applicationName ?? DEFAULT_CONFIG.applicationName,
        version: config.version ?? DEFAULT_CONFIG.version,
      },
    };
  }

  // ==========================================================================
  // SESSION MANAGEMENT - Working Memory
  // ==========================================================================

  /**
   * Start a new working memory session for contextual interactions
   */
  async startSession(): Promise<MemorySession> {
    const res = await this.client.startSession.create({
      smartMemoryLocation: this.location,
    });

    const session: MemorySession = {
      sessionId: res.sessionId ?? `session-${Date.now()}`,
      startedAt: Date.now(),
    };

    this.currentSession = session;
    return session;
  }

  /**
   * End the current session, optionally flushing to episodic memory
   */
  async endSession(options?: {
    flush?: boolean;
    systemPrompt?: string;
  }): Promise<boolean> {
    if (!this.currentSession) return false;

    const res = await this.client.endSession.create({
      smartMemoryLocation: this.location,
      sessionId: this.currentSession.sessionId,
      flush: options?.flush ?? true,
      systemPrompt: options?.systemPrompt,
    });

    this.currentSession = null;
    return res.success ?? false;
  }

  /**
   * Rehydrate a previous session from episodic memory
   */
  async rehydrateSession(
    sessionId: string,
    summaryOnly = false
  ): Promise<{ success: boolean; statusKey?: string }> {
    const res = await this.client.rehydrateSession.rehydrate({
      smartMemoryLocation: this.location,
      sessionId,
      summaryOnly,
    });

    if (res.success) {
      this.currentSession = {
        sessionId,
        startedAt: Date.now(),
      };
    }

    return {
      success: res.success ?? false,
      statusKey: res.statusKey ?? undefined,
    };
  }

  /**
   * Get current session or start a new one
   */
  async ensureSession(): Promise<MemorySession> {
    if (this.currentSession) return this.currentSession;
    return this.startSession();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.currentSession?.sessionId ?? null;
  }

  // ==========================================================================
  // WORKING MEMORY - Short-term Context
  // ==========================================================================

  /**
   * Store a memory in the current session's working memory
   */
  async putMemory(
    content: string,
    options?: {
      key?: string;
      timeline?: string;
      agent?: string;
    }
  ): Promise<string | null> {
    const session = await this.ensureSession();

    const res = await this.client.putMemory.create({
      smartMemoryLocation: this.location,
      sessionId: session.sessionId,
      content,
      key: options?.key,
      timeline: options?.timeline ?? "default",
      agent: options?.agent ?? "graphql-assistant",
    });

    return res.memoryId ?? null;
  }

  /**
   * Retrieve memories from the current session
   */
  async getMemories(options?: {
    key?: string;
    timeline?: string;
    nMostRecent?: number;
    startTime?: Date;
    endTime?: Date;
  }): Promise<MemoryEntry[]> {
    const session = await this.ensureSession();

    const res = await this.client.getMemory.retrieve({
      smartMemoryLocation: this.location,
      sessionId: session.sessionId,
      key: options?.key,
      timeline: options?.timeline,
      nMostRecent: options?.nMostRecent,
      startTime: options?.startTime?.toISOString(),
      endTime: options?.endTime?.toISOString(),
    });

    return (res.memories ?? []).map((m) => ({
      id: m.id ?? "",
      content: m.content ?? "",
      timeline: m.timeline ?? "default",
      createdAt: m.at ?? new Date().toISOString(),
      agent: m.agent ?? undefined,
      key: m.key ?? undefined,
    }));
  }

  /**
   * Search within working memory semantically
   */
  async searchMemory(
    terms: string,
    options?: {
      timeline?: string;
      nMostRecent?: number;
    }
  ): Promise<MemorySearchResult[]> {
    const session = await this.ensureSession();

    const res = await this.client.query.memory.search({
      smartMemoryLocation: this.location,
      sessionId: session.sessionId,
      terms,
      timeline: options?.timeline,
      nMostRecent: options?.nMostRecent,
    });

    return (res.memories ?? []).map((m) => ({
      id: m.id ?? "",
      content: m.content ?? "",
      timeline: m.timeline ?? "default",
      createdAt: m.at ?? new Date().toISOString(),
      agent: m.agent ?? undefined,
      dueTo: m.dueTo,
    }));
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const session = await this.ensureSession();

    const res = await this.client.deleteMemory.create({
      smartMemoryLocation: this.location,
      sessionId: session.sessionId,
      memoryId,
    });

    return res.success ?? false;
  }

  // ==========================================================================
  // AI SUMMARIZATION
  // ==========================================================================

  /**
   * Generate AI summary of specified memories
   * This is a key built-in AI feature of SmartMemory!
   */
  async summarizeMemories(
    memoryIds: string[],
    options?: {
      systemPrompt?: string;
    }
  ): Promise<SummarizationResult | null> {
    const session = await this.ensureSession();

    const res = await this.client.summarizeMemory.create({
      smartMemoryLocation: this.location,
      sessionId: session.sessionId,
      memoryIds,
      systemPrompt: options?.systemPrompt,
    });

    if (!res.summary) return null;

    return {
      summary: res.summary,
      summarizedIds: res.summarizedMemoryIds ?? memoryIds,
    };
  }

  /**
   * Summarize recent context for GraphQL query generation
   */
  async summarizeContext(
    nRecent = 10,
    customPrompt?: string
  ): Promise<string | null> {
    const memories = await this.getMemories({ nMostRecent: nRecent });
    if (memories.length === 0) return null;

    const systemPrompt =
      customPrompt ??
      `You are a GraphQL schema expert. Summarize the following context 
       focusing on: user intent, relevant types, fields, and operations 
       that might be useful for generating a GraphQL query. Be concise 
       and actionable.`;

    const result = await this.summarizeMemories(
      memories.map((m) => m.id),
      { systemPrompt }
    );

    return result?.summary ?? null;
  }

  // ==========================================================================
  // EPISODIC MEMORY - Historical Sessions
  // ==========================================================================

  /**
   * Search past sessions (episodic memory)
   */
  async searchEpisodicMemory(
    terms: string,
    options?: {
      nMostRecent?: number;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<EpisodicEntry[]> {
    const res = await this.client.query.episodicMemory.search({
      smartMemoryLocation: this.location,
      terms,
      nMostRecent: options?.nMostRecent,
      startTime: options?.startTime?.toISOString(),
      endTime: options?.endTime?.toISOString(),
    });

    return (res.entries ?? []).map((e) => ({
      sessionId: e.sessionId ?? "",
      summary: e.summary ?? "",
      duration: typeof e.duration === "number" ? e.duration : 0,
      entryCount: e.entryCount ?? 0,
      createdAt: e.createdAt ?? new Date().toISOString(),
      score: e.score ?? undefined,
    }));
  }

  // ==========================================================================
  // SEMANTIC MEMORY - Schema Storage
  // ==========================================================================

  /**
   * Store entire schema as a searchable document
   */
  async storeSchema(schema: ProcessedSchema): Promise<string | null> {
    const doc: SchemaDocument = {
      docType: "schema",
      endpoint: schema.meta.endpoint,
      hash: schema.meta.hash,
      fetchedAt: schema.meta.fetchedAt,
      stats: {
        queries: schema.queries.length,
        mutations: schema.mutations.length,
        subscriptions: schema.subscriptions.length,
        types: schema.stats.totalTypes,
      },
      schema,
    };

    const res = await this.client.putSemanticMemory.create({
      smartMemoryLocation: this.location,
      document: JSON.stringify(doc),
    });

    return res.objectId ?? null;
  }

  /**
   * Store all types as individual searchable documents
   */
  async storeAllTypes(schema: ProcessedSchema): Promise<number> {
    let count = 0;
    const endpoint = schema.meta.endpoint;

    // Object types
    for (const t of schema.objects) {
      const doc: TypeDocument = {
        docType: "type",
        endpoint,
        category: "object",
        name: t.name,
        description: t.description ?? "",
        fields: t.fields.map(f => `${f.name}: ${f.typeName}`).join(", "),
        relatedTypes: [...t.interfaces, ...t.fields.map(f => f.typeName)],
      };
      await this.client.putSemanticMemory.create({
        smartMemoryLocation: this.location,
        document: JSON.stringify(doc),
      });
      count++;
    }

    // Enums
    for (const t of schema.enums) {
      const doc: TypeDocument = {
        docType: "type",
        endpoint,
        category: "enum",
        name: t.name,
        description: t.description ?? "",
        fields: t.values.map(v => v.name).join(", "),
        relatedTypes: [],
      };
      await this.client.putSemanticMemory.create({
        smartMemoryLocation: this.location,
        document: JSON.stringify(doc),
      });
      count++;
    }

    // Interfaces
    for (const t of schema.interfaces) {
      const doc: TypeDocument = {
        docType: "type",
        endpoint,
        category: "interface",
        name: t.name,
        description: t.description ?? "",
        fields: t.fields.map(f => `${f.name}: ${f.typeName}`).join(", "),
        relatedTypes: [...t.implementedBy, ...t.fields.map(f => f.typeName)],
      };
      await this.client.putSemanticMemory.create({
        smartMemoryLocation: this.location,
        document: JSON.stringify(doc),
      });
      count++;
    }

    // Input types
    for (const t of schema.inputTypes) {
      const doc: TypeDocument = {
        docType: "type",
        endpoint,
        category: "input",
        name: t.name,
        description: t.description ?? "",
        fields: t.fields.map(f => `${f.name}: ${f.typeName}`).join(", "),
        relatedTypes: t.fields.map(f => f.typeName),
      };
      await this.client.putSemanticMemory.create({
        smartMemoryLocation: this.location,
        document: JSON.stringify(doc),
      });
      count++;
    }

    return count;
  }

  /**
   * Store all operations as searchable documents
   */
  async storeAllOperations(schema: ProcessedSchema): Promise<number> {
    let count = 0;
    const endpoint = schema.meta.endpoint;

    const storeOps = async (
      kind: "query" | "mutation" | "subscription",
      ops: typeof schema.queries
    ) => {
      for (const op of ops) {
        const args = op.arguments.map(a => `${a.name}: ${a.typeName}`).join(", ");
        const doc: OperationDocument = {
          docType: "operation",
          endpoint,
          kind,
          name: op.name,
          description: op.description ?? "",
          signature: `${op.name}(${args}): ${op.returnType}`,
          arguments: args,
          returnType: op.returnType,
        };
        await this.client.putSemanticMemory.create({
          smartMemoryLocation: this.location,
          document: JSON.stringify(doc),
        });
        count++;
      }
    };

    await storeOps("query", schema.queries);
    await storeOps("mutation", schema.mutations);
    await storeOps("subscription", schema.subscriptions);

    return count;
  }

  /**
   * Search schema content with natural language (semantic search)
   */
  async search(query: string): Promise<SemanticSearchResult[]> {
    const res = await this.client.query.semanticMemory.search({
      smartMemoryLocation: this.location,
      needle: query,
    });

    return (res.documentSearchResponse?.results ?? []).map((r) => ({
      text: r.text ?? "",
      source: r.source ?? "",
      score: r.score ?? 0,
      chunkSignature: r.chunkSignature ?? undefined,
      payloadSignature: r.payloadSignature ?? undefined,
      type: r.type ?? undefined,
    }));
  }

  /**
   * Get a stored document by ID
   */
  async getDocument(objectId: string): Promise<unknown | null> {
    const res = await this.client.getSemanticMemory.create({
      smartMemoryLocation: this.location,
      objectId,
    });

    if (!res.success || !res.document) return null;

    try {
      return typeof res.document === "string" 
        ? JSON.parse(res.document) 
        : res.document;
    } catch {
      return res.document;
    }
  }

  /**
   * Delete a stored document
   */
  async deleteDocument(objectId: string): Promise<boolean> {
    const res = await this.client.deleteSemanticMemory.delete({
      smartMemoryLocation: this.location,
      objectId,
    });
    return res.success ?? false;
  }

  // ==========================================================================
  // PROCEDURAL MEMORY - Query Templates
  // ==========================================================================

  /**
   * Store a query template
   */
  async saveTemplate(template: QueryTemplate): Promise<boolean> {
    const res = await this.client.putProcedure.create({
      smartMemoryLocation: this.location,
      key: `template:${template.name}`,
      value: JSON.stringify(template),
    });
    return res.success ?? false;
  }

  /**
   * Get a query template by name
   */
  async getTemplate(name: string): Promise<QueryTemplate | null> {
    const res = await this.client.getProcedure.create({
      smartMemoryLocation: this.location,
      key: `template:${name}`,
    });

    if (!res.found || !res.value) return null;

    try {
      return JSON.parse(res.value) as QueryTemplate;
    } catch {
      return null;
    }
  }

  /**
   * List all stored templates
   */
  async listTemplates(): Promise<QueryTemplate[]> {
    const res = await this.client.listProcedures.create({
      smartMemoryLocation: this.location,
    });

    const templates: QueryTemplate[] = [];
    for (const p of res.procedures ?? []) {
      if (p.key?.startsWith("template:") && p.value) {
        try {
          templates.push(JSON.parse(p.value));
        } catch {
          // skip
        }
      }
    }
    return templates;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(name: string): Promise<boolean> {
    const res = await this.client.deleteProcedure.create({
      smartMemoryLocation: this.location,
      key: `template:${name}`,
    });
    return res.success ?? false;
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<QueryTemplate[]> {
    const res = await this.client.query.procedures.search({
      smartMemoryLocation: this.location,
      terms: query,
      searchKeys: true,
      searchValues: true,
    });

    const templates: QueryTemplate[] = [];
    for (const p of res.procedures ?? []) {
      if (p.key?.startsWith("template:") && p.value) {
        try {
          templates.push(JSON.parse(p.value));
        } catch {
          // skip
        }
      }
    }
    return templates;
  }

  // ==========================================================================
  // PROCEDURAL MEMORY - System Prompts
  // ==========================================================================

  /**
   * Store a system prompt
   */
  async savePrompt(key: string, prompt: string): Promise<boolean> {
    const res = await this.client.putProcedure.create({
      smartMemoryLocation: this.location,
      key: `prompt:${key}`,
      value: prompt,
    });
    return res.success ?? false;
  }

  /**
   * Get a system prompt
   */
  async getPrompt(key: string): Promise<string | null> {
    const res = await this.client.getProcedure.create({
      smartMemoryLocation: this.location,
      key: `prompt:${key}`,
    });
    return res.found ? (res.value ?? null) : null;
  }

  /**
   * Delete a system prompt
   */
  async deletePrompt(key: string): Promise<boolean> {
    const res = await this.client.deleteProcedure.create({
      smartMemoryLocation: this.location,
      key: `prompt:${key}`,
    });
    return res.success ?? false;
  }

  /**
   * Search all procedures (templates + prompts)
   */
  async searchProcedures(
    terms: string,
    options?: {
      searchKeys?: boolean;
      searchValues?: boolean;
      nMostRecent?: number;
    }
  ): Promise<ProcedureSearchResult[]> {
    const res = await this.client.query.procedures.search({
      smartMemoryLocation: this.location,
      terms,
      searchKeys: options?.searchKeys ?? true,
      searchValues: options?.searchValues ?? true,
      nMostRecent: options?.nMostRecent,
    });

    return (res.procedures ?? []).map((p) => ({
      key: p.key ?? "",
      value: p.value ?? "",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  // ==========================================================================
  // GRAPHQL-SPECIFIC AI HELPERS
  // ==========================================================================

  /**
   * Store user's natural language query intent for context building
   */
  async recordQueryIntent(
    naturalLanguageQuery: string,
    options?: {
      generatedQuery?: string;
      successful?: boolean;
    }
  ): Promise<string | null> {
    const content = JSON.stringify({
      intent: naturalLanguageQuery,
      generatedQuery: options?.generatedQuery,
      successful: options?.successful,
      timestamp: Date.now(),
    });

    return this.putMemory(content, {
      timeline: "query-intents",
      key: `intent-${Date.now()}`,
    });
  }

  /**
   * Store schema exploration context
   */
  async recordSchemaExploration(
    action: "view_type" | "view_field" | "search" | "generate_query",
    details: {
      typeName?: string;
      fieldName?: string;
      searchTerm?: string;
      query?: string;
    }
  ): Promise<string | null> {
    const content = JSON.stringify({
      action,
      ...details,
      timestamp: Date.now(),
    });

    return this.putMemory(content, {
      timeline: "schema-exploration",
    });
  }

  /**
   * Get recent query intents for context
   */
  async getRecentIntents(n = 5): Promise<Array<{
    intent: string;
    generatedQuery?: string;
    successful?: boolean;
    timestamp: number;
  }>> {
    const memories = await this.getMemories({
      timeline: "query-intents",
      nMostRecent: n,
    });

    return memories
      .map((m) => {
        try {
          return JSON.parse(m.content);
        } catch {
          return null;
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }

  /**
   * Build context prompt from recent session activity
   * This leverages AI summarization for optimal context
   */
  async buildContextPrompt(): Promise<string> {
    // Get recent exploration context
    const explorations = await this.getMemories({
      timeline: "schema-exploration",
      nMostRecent: 10,
    });

    // Get recent query intents
    const intents = await this.getRecentIntents(5);

    // Combine all memory IDs for summarization
    const allMemoryIds = explorations.map((m) => m.id);

    if (allMemoryIds.length === 0) {
      return "No recent activity context available.";
    }

    // Use AI to summarize the context
    const summary = await this.summarizeMemories(allMemoryIds, {
      systemPrompt: `Summarize the user's recent GraphQL exploration activity:
        - What types and fields have they been looking at?
        - What queries have they tried to generate?
        - What patterns emerge from their exploration?
        
        Provide a concise summary that would help generate a relevant GraphQL query.`,
    });

    // Build the final context
    const parts: string[] = [];

    if (summary?.summary) {
      parts.push(`## Recent Activity Summary\n${summary.summary}`);
    }

    if (intents.length > 0) {
      const intentList = intents
        .map((i) => `- "${i.intent}"${i.successful ? " ✓" : ""}`)
        .join("\n");
      parts.push(`## Recent Query Intents\n${intentList}`);
    }

    return parts.join("\n\n") || "No context available.";
  }

  /**
   * Initialize default system prompts for GraphQL operations
   */
  async initializeDefaultPrompts(): Promise<void> {
    const prompts: Record<string, string> = {
      "query-generator": `You are a GraphQL query generator. Given a schema context and user intent:
1. Identify the relevant types and fields
2. Construct a valid GraphQL query
3. Include appropriate arguments and variables
4. Add useful field selections based on the return type

Format your response as a valid GraphQL query.`,

      "schema-explainer": `You are a GraphQL schema expert. When asked about types, fields, or operations:
1. Explain what the type/field represents
2. Describe its relationships to other types
3. Provide usage examples
4. Suggest related types that might be useful`,

      "query-optimizer": `You are a GraphQL query optimizer. Analyze the given query and:
1. Identify any N+1 query problems
2. Suggest field consolidation opportunities
3. Recommend fragment usage for repeated selections
4. Provide the optimized query version`,

      "error-resolver": `You are a GraphQL error resolver. When given an error:
1. Identify the root cause
2. Explain what went wrong
3. Provide a corrected query
4. Suggest how to avoid this error in the future`,
    };

    for (const [key, prompt] of Object.entries(prompts)) {
      // Only save if not already present
      const existing = await this.getPrompt(key);
      if (!existing) {
        await this.savePrompt(key, prompt);
      }
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Test connection to SmartMemory
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client.query.semanticMemory.search({
        smartMemoryLocation: this.location,
        needle: "connection test",
      });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  /**
   * Get memory configuration
   */
  getConfig(): {
    name: string;
    applicationName: string;
    version: string;
  } {
    return {
      name: this.location.smartMemory.name,
      applicationName: this.location.smartMemory.application_name,
      version: this.location.smartMemory.version,
    };
  }

  /**
   * Get statistics about stored content
   */
  async getStats(): Promise<{
    hasSession: boolean;
    sessionId: string | null;
    templatesCount: number;
  }> {
    const templates = await this.listTemplates();

    return {
      hasSession: this.currentSession !== null,
      sessionId: this.currentSession?.sessionId ?? null,
      templatesCount: templates.length,
    };
  }

  /**
   * Clear all session-related state (does not delete remote data)
   */
  clearLocalState(): void {
    this.currentSession = null;
  }

  /**
   * Full cleanup - end session and clear state
   */
  async cleanup(flushSession = true): Promise<void> {
    if (this.currentSession) {
      await this.endSession({ flush: flushSession });
    }
    this.clearLocalState();
  }
}

// ============================================================================
// FACTORY & HELPERS
// ============================================================================

/**
 * Create a new GraphQL SmartMemory client
 */
export function createGraphQLSmartMemory(
  config: GraphQLMemoryConfig
): GraphQLSmartMemory {
  return new GraphQLSmartMemory(config);
}

/**
 * Create client with automatic session initialization
 */
export async function createGraphQLSmartMemoryWithSession(
  config: GraphQLMemoryConfig
): Promise<{ client: GraphQLSmartMemory; session: MemorySession }> {
  const client = new GraphQLSmartMemory(config);
  const session = await client.startSession();
  return { client, session };
}

/**
 * Helper to check if SmartMemory is configured
 */
export function isSmartMemoryConfigured(config: Partial<GraphQLMemoryConfig>): boolean {
  return Boolean(config.apiKey && config.apiKey.length > 0);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  ProcessedSchema,
} from "./types";
