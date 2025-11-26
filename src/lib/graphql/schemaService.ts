/**
 * GraphQL Schema Memory Service
 * 
 * High-level service that orchestrates:
 * - Schema introspection and processing
 * - Local caching (chrome.storage)
 * - Remote SmartMemory storage (Raindrop)
 * - Unified search and query API
 */

import { fetchSchemaIntrospection } from "./introspection";
import { processSchema } from "./schemaProcessor";
import type { ProcessedSchema, ProcessedQuery, ProcessedMutation, ProcessedSubscription, ProcessedObjectType } from "./types";
import { GraphQLSmartMemory, createGraphQLSmartMemory, type GraphQLMemoryConfig, type SemanticSearchResult } from "./smartMemory";

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaServiceConfig {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Optional custom headers for introspection */
  headers?: Record<string, string>;
  /** Raindrop API key (enables cloud SmartMemory) */
  raindropApiKey?: string;
  /** SmartMemory configuration */
  raindropConfig?: Omit<GraphQLMemoryConfig, "apiKey">;
  /** Auto-sync to SmartMemory on fetch (default: true) */
  autoSync?: boolean;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
}

export interface SchemaServiceState {
  /** Current processed schema */
  schema: ProcessedSchema | null;
  /** Last fetch timestamp */
  lastFetched: number | null;
  /** Schema hash for change detection */
  hash: string | null;
  /** Is currently loading */
  loading: boolean;
  /** Last error */
  error: string | null;
  /** Is SmartMemory enabled */
  smartMemoryEnabled: boolean;
}

export interface TypeSearchResult {
  name: string;
  category: "object" | "interface" | "enum" | "union" | "input" | "scalar";
  description: string | null;
  fields?: string[];
}

export interface OperationSearchResult {
  name: string;
  kind: "query" | "mutation" | "subscription";
  description: string | null;
  signature: string;
  returnType: string;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_PREFIX = "devconsole_graphql_";
const SCHEMA_CACHE_KEY = (endpoint: string) => `${STORAGE_PREFIX}schema_${btoa(endpoint)}`;
const SCHEMA_META_KEY = (endpoint: string) => `${STORAGE_PREFIX}meta_${btoa(endpoint)}`;

// ============================================================================
// LOCAL CACHE (chrome.storage)
// ============================================================================

async function getCachedSchema(endpoint: string): Promise<ProcessedSchema | null> {
  try {
    const key = SCHEMA_CACHE_KEY(endpoint);
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  } catch {
    return null;
  }
}

async function setCachedSchema(endpoint: string, schema: ProcessedSchema): Promise<void> {
  try {
    const schemaKey = SCHEMA_CACHE_KEY(endpoint);
    const metaKey = SCHEMA_META_KEY(endpoint);
    await chrome.storage.local.set({
      [schemaKey]: schema,
      [metaKey]: {
        hash: schema.meta.hash,
        fetchedAt: schema.meta.fetchedAt,
        endpoint: schema.meta.endpoint,
      },
    });
  } catch (e) {
    console.warn("[SchemaService] Failed to cache schema:", e);
  }
}

async function getCacheMeta(endpoint: string): Promise<{ hash: string; fetchedAt: number } | null> {
  try {
    const key = SCHEMA_META_KEY(endpoint);
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  } catch {
    return null;
  }
}

async function clearCache(endpoint: string): Promise<void> {
  try {
    await chrome.storage.local.remove([
      SCHEMA_CACHE_KEY(endpoint),
      SCHEMA_META_KEY(endpoint),
    ]);
  } catch {
    // ignore
  }
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class GraphQLSchemaService {
  private config: SchemaServiceConfig;
  private state: SchemaServiceState;
  private smartMemory: GraphQLSmartMemory | null = null;
  private listeners: Set<(state: SchemaServiceState) => void> = new Set();

  constructor(config: SchemaServiceConfig) {
    this.config = {
      autoSync: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      ...config,
    };

    this.state = {
      schema: null,
      lastFetched: null,
      hash: null,
      loading: false,
      error: null,
      smartMemoryEnabled: false,
    };

    // Initialize SmartMemory if API key provided
    if (config.raindropApiKey) {
      this.smartMemory = createGraphQLSmartMemory({
        apiKey: config.raindropApiKey,
        ...config.raindropConfig,
      });
      this.state.smartMemoryEnabled = true;
    }
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  private updateState(partial: Partial<SchemaServiceState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn(this.state));
  }

  /** Subscribe to state changes */
  subscribe(listener: (state: SchemaServiceState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current state */
  getState(): SchemaServiceState {
    return { ...this.state };
  }

  /** Get current schema */
  getSchema(): ProcessedSchema | null {
    return this.state.schema;
  }

  // ==========================================================================
  // SCHEMA FETCHING
  // ==========================================================================

  /**
   * Fetch and process schema from endpoint
   */
  async fetchSchema(options?: { 
    force?: boolean; 
    skipCache?: boolean;
    syncToCloud?: boolean;
  }): Promise<ProcessedSchema> {
    const { force = false, skipCache = false, syncToCloud } = options ?? {};
    const shouldSync = syncToCloud ?? this.config.autoSync;

    // Check cache first (unless forced or skipped)
    if (!force && !skipCache) {
      const cached = await this.loadFromCache();
      if (cached) {
        return cached;
      }
    }

    this.updateState({ loading: true, error: null });

    try {
      // Fetch introspection
      const result = await fetchSchemaIntrospection({
        endpoint: this.config.endpoint,
        headers: this.config.headers,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch schema");
      }

      // Process schema
      const schema = processSchema(result.data, {
        endpoint: this.config.endpoint,
      });

      // Update state
      this.updateState({
        schema,
        lastFetched: Date.now(),
        hash: schema.meta.hash,
        loading: false,
        error: null,
      });

      // Cache locally
      await setCachedSchema(this.config.endpoint, schema);

      // Sync to SmartMemory if enabled
      if (shouldSync && this.smartMemory) {
        this.syncToSmartMemory(schema).catch(e => {
          console.warn("[SchemaService] SmartMemory sync failed:", e);
        });
      }

      return schema;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Unknown error";
      this.updateState({ loading: false, error });
      throw new Error(error);
    }
  }

  /**
   * Load schema from local cache
   */
  async loadFromCache(): Promise<ProcessedSchema | null> {
    const meta = await getCacheMeta(this.config.endpoint);
    
    // Check if cache is still valid
    if (meta && this.config.cacheTTL) {
      const age = Date.now() - meta.fetchedAt;
      if (age > this.config.cacheTTL) {
        return null; // Cache expired
      }
    }

    const cached = await getCachedSchema(this.config.endpoint);
    if (cached) {
      this.updateState({
        schema: cached,
        lastFetched: cached.meta.fetchedAt,
        hash: cached.meta.hash,
        loading: false,
        error: null,
      });
      return cached;
    }

    return null;
  }

  /**
   * Clear local cache
   */
  async clearCache(): Promise<void> {
    await clearCache(this.config.endpoint);
    this.updateState({
      schema: null,
      lastFetched: null,
      hash: null,
    });
  }

  // ==========================================================================
  // SMART MEMORY SYNC
  // ==========================================================================

  /**
   * Sync schema to SmartMemory
   */
  async syncToSmartMemory(schema?: ProcessedSchema): Promise<{
    schemaId: string | null;
    typesStored: number;
    operationsStored: number;
  }> {
    if (!this.smartMemory) {
      throw new Error("SmartMemory not configured");
    }

    const schemaToSync = schema ?? this.state.schema;
    if (!schemaToSync) {
      throw new Error("No schema to sync");
    }

    // Store full schema
    const schemaId = await this.smartMemory.storeSchema(schemaToSync);

    // Store individual types and operations for granular search
    const [typesStored, operationsStored] = await Promise.all([
      this.smartMemory.storeAllTypes(schemaToSync),
      this.smartMemory.storeAllOperations(schemaToSync),
    ]);

    return { schemaId, typesStored, operationsStored };
  }

  /**
   * Search schema using SmartMemory (semantic search)
   */
  async searchSemantic(query: string): Promise<SemanticSearchResult[]> {
    if (!this.smartMemory) {
      throw new Error("SmartMemory not configured");
    }
    return this.smartMemory.search(query);
  }

  // ==========================================================================
  // LOCAL SEARCH (in-memory)
  // ==========================================================================

  /**
   * Search types in current schema
   */
  searchTypes(query: string): TypeSearchResult[] {
    if (!this.state.schema) return [];

    const q = query.toLowerCase();
    const results: TypeSearchResult[] = [];

    // Search objects
    for (const t of this.state.schema.objects) {
      if (this.matchesQuery(t.name, t.description, q)) {
        results.push({
          name: t.name,
          category: "object",
          description: t.description,
          fields: t.fields.map(f => f.name),
        });
      }
    }

    // Search enums
    for (const t of this.state.schema.enums) {
      if (this.matchesQuery(t.name, t.description, q)) {
        results.push({
          name: t.name,
          category: "enum",
          description: t.description,
          fields: t.values.map(v => v.name),
        });
      }
    }

    // Search interfaces
    for (const t of this.state.schema.interfaces) {
      if (this.matchesQuery(t.name, t.description, q)) {
        results.push({
          name: t.name,
          category: "interface",
          description: t.description,
          fields: t.fields.map(f => f.name),
        });
      }
    }

    // Search input types
    for (const t of this.state.schema.inputTypes) {
      if (this.matchesQuery(t.name, t.description, q)) {
        results.push({
          name: t.name,
          category: "input",
          description: t.description,
          fields: t.fields.map(f => f.name),
        });
      }
    }

    return results;
  }

  /**
   * Search operations in current schema
   */
  searchOperations(query: string): OperationSearchResult[] {
    if (!this.state.schema) return [];

    const q = query.toLowerCase();
    const results: OperationSearchResult[] = [];

    const searchOps = (
      kind: "query" | "mutation" | "subscription",
      ops: Array<ProcessedQuery | ProcessedMutation | ProcessedSubscription>
    ) => {
      for (const op of ops) {
        if (this.matchesQuery(op.name, op.description, q)) {
          const args = op.arguments.map(a => `${a.name}: ${a.typeName}`).join(", ");
          results.push({
            name: op.name,
            kind,
            description: op.description,
            signature: `${op.name}(${args}): ${op.returnType}`,
            returnType: op.returnType,
          });
        }
      }
    };

    searchOps("query", this.state.schema.queries);
    searchOps("mutation", this.state.schema.mutations);
    searchOps("subscription", this.state.schema.subscriptions);

    return results;
  }

  private matchesQuery(name: string, description: string | null, query: string): boolean {
    return (
      name.toLowerCase().includes(query) ||
      (description?.toLowerCase().includes(query) ?? false)
    );
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  /** Get all queries */
  getQueries(): ProcessedQuery[] {
    return this.state.schema?.queries ?? [];
  }

  /** Get all mutations */
  getMutations(): ProcessedMutation[] {
    return this.state.schema?.mutations ?? [];
  }

  /** Get all subscriptions */
  getSubscriptions(): ProcessedSubscription[] {
    return this.state.schema?.subscriptions ?? [];
  }

  /** Get all object types */
  getObjectTypes(): ProcessedObjectType[] {
    return this.state.schema?.objects ?? [];
  }

  /** Get type by name */
  getType(name: string): ProcessedObjectType | undefined {
    return this.state.schema?.objects.find(t => t.name === name);
  }

  /** Get query by name */
  getQuery(name: string): ProcessedQuery | undefined {
    return this.state.schema?.queries.find(q => q.name === name);
  }

  /** Get mutation by name */
  getMutation(name: string): ProcessedMutation | undefined {
    return this.state.schema?.mutations.find(m => m.name === name);
  }

  /** Get schema stats */
  getStats() {
    return this.state.schema?.stats ?? null;
  }

  // ==========================================================================
  // TEMPLATES (via SmartMemory)
  // ==========================================================================

  /** Save query template */
  async saveTemplate(name: string, query: string, description: string): Promise<boolean> {
    if (!this.smartMemory) return false;
    return this.smartMemory.saveTemplate({ name, query, description });
  }

  /** Get query template */
  async getTemplate(name: string) {
    if (!this.smartMemory) return null;
    return this.smartMemory.getTemplate(name);
  }

  /** List all templates */
  async listTemplates() {
    if (!this.smartMemory) return [];
    return this.smartMemory.listTemplates();
  }

  /** Search templates */
  async searchTemplates(query: string) {
    if (!this.smartMemory) return [];
    return this.smartMemory.searchTemplates(query);
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /** Update endpoint */
  setEndpoint(endpoint: string): void {
    if (this.config.endpoint !== endpoint) {
      this.config.endpoint = endpoint;
      this.updateState({
        schema: null,
        lastFetched: null,
        hash: null,
        error: null,
      });
    }
  }

  /** Update headers */
  setHeaders(headers: Record<string, string>): void {
    this.config.headers = headers;
  }

  /** Enable SmartMemory */
  enableSmartMemory(apiKey: string, config?: Omit<GraphQLMemoryConfig, "apiKey">): void {
    this.smartMemory = createGraphQLSmartMemory({ apiKey, ...config });
    this.updateState({ smartMemoryEnabled: true });
  }

  /** Disable SmartMemory */
  disableSmartMemory(): void {
    this.smartMemory = null;
    this.updateState({ smartMemoryEnabled: false });
  }

  /** Test SmartMemory connection */
  async testSmartMemoryConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.smartMemory) {
      return { ok: false, error: "SmartMemory not configured" };
    }
    return this.smartMemory.testConnection();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new GraphQL Schema Service
 */
export function createSchemaService(config: SchemaServiceConfig): GraphQLSchemaService {
  return new GraphQLSchemaService(config);
}

// ============================================================================
// SINGLETON INSTANCE (for global access)
// ============================================================================

let globalService: GraphQLSchemaService | null = null;

/**
 * Get or create the global schema service instance
 */
export function getSchemaService(config?: SchemaServiceConfig): GraphQLSchemaService {
  if (!globalService && config) {
    globalService = createSchemaService(config);
  }
  if (!globalService) {
    throw new Error("Schema service not initialized. Call with config first.");
  }
  return globalService;
}

/**
 * Reset the global service (for testing or reconfiguration)
 */
export function resetSchemaService(): void {
  globalService = null;
}
