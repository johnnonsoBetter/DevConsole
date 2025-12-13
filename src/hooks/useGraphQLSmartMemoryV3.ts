/**
 * useGraphQLSmartMemoryV3 - Simplified SmartMemory Integration
 *
 * A cleaner, simpler API for GraphQL schema memory using Raindrop SmartMemory.
 *
 * Memory Types Used:
 * - Semantic Memory: Schema types, fields, operations (searchable)
 * - Working Memory: Query patterns, exploration history
 * - Procedural Memory: Saved templates, optimization rules
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRaindropSettings } from "./useRaindropSettings";

// ============================================================================
// CONFIGURATION - Using deployed gql-memory app
// ============================================================================

const SMART_MEMORY_CONFIG = {
  name: "introspection-memory",
  applicationName: "gql-memory",
  version: "01kccmempyxnxvs672bd35dy8q",
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaType {
  name: string;
  kind: "OBJECT" | "INTERFACE" | "INPUT_OBJECT" | "ENUM" | "SCALAR" | "UNION";
  description?: string;
  fields?: SchemaField[];
  enumValues?: string[];
  interfaces?: string[];
  possibleTypes?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  args?: Array<{ name: string; type: string }>;
}

export interface SchemaOperation {
  name: string;
  kind: "query" | "mutation" | "subscription";
  signature: string;
  description?: string;
  args: string;
  returnType: string;
}

export interface QueryPattern {
  pattern: string;
  description: string;
  usageCount?: number;
  lastUsed?: number;
}

export interface SavedTemplate {
  name: string;
  query: string;
  description?: string;
  variables?: string;
  endpoint?: string;
  createdAt: number;
}

export interface SearchResult {
  text: string;
  score: number;
  type?: "operation" | "type" | "field" | "pattern";
  name?: string;
}

export interface SchemaStats {
  queriesCount: number;
  mutationsCount: number;
  subscriptionsCount: number;
  typesCount: number;
  endpoint: string;
  indexedAt: number;
  schemaHash?: string; // Hash of schema for change detection
}

export interface IndexedSchemaInfo {
  endpoint: string;
  stats: SchemaStats;
  indexedAt: number;
  schemaHash: string;
}

export interface IndexProgress {
  phase: "types" | "operations" | "patterns" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useGraphQLSmartMemoryV3() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [schemaStats, setSchemaStats] = useState<SchemaStats | null>(null);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(
    null
  );

  const clientRef = useRef<Raindrop | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getLocation = useCallback(
    () => ({
      smartMemory: {
        name: SMART_MEMORY_CONFIG.name,
        applicationName: SMART_MEMORY_CONFIG.applicationName,
        version: SMART_MEMORY_CONFIG.version,
      },
    }),
    []
  );

  const getClient = useCallback(async (): Promise<Raindrop> => {
    if (clientRef.current) return clientRef.current;

    const settings = await getRaindropSettings();
    if (!settings.enabled || !settings.apiKey) {
      throw new Error("Raindrop not configured. Go to Settings → Raindrop.");
    }

    clientRef.current = new Raindrop({ apiKey: settings.apiKey });
    return clientRef.current;
  }, []);

  const getSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const client = await getClient();
    const session = await client.startSession.create({
      smartMemoryLocation: getLocation(),
    });

    sessionIdRef.current = session.sessionId || `graphql-session-${Date.now()}`;
    return sessionIdRef.current;
  }, [getClient, getLocation]);

  // Check configuration on mount
  useEffect(() => {
    const checkConfig = async () => {
      const settings = await getRaindropSettings();
      const hasVersion = SMART_MEMORY_CONFIG.version.length > 0;
      setIsConfigured(
        settings.enabled && Boolean(settings.apiKey) && hasVersion
      );
    };
    checkConfig();
  }, []);

  // --------------------------------------------------------------------------
  // SEMANTIC MEMORY - Schema Storage
  // --------------------------------------------------------------------------

  /**
   * Store a schema type in semantic memory
   */
  const putSchemaType = useCallback(
    async (type: SchemaType): Promise<boolean> => {
      try {
        const client = await getClient();

        const document = {
          docType: "schema-type",
          ...type,
          searchText: `type ${type.name} ${type.kind} ${type.description || ""} ${
            type.fields
              ?.map((f) => `${f.name} ${f.type} ${f.description || ""}`)
              .join(" ") || ""
          }`,
        };

        await client.putSemanticMemory.create({
          smartMemoryLocation: getLocation(),
          document: JSON.stringify(document),
        });

        return true;
      } catch (err) {
        console.error("Failed to store schema type:", err);
        return false;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Store a schema operation (query/mutation/subscription) in semantic memory
   */
  const putSchemaOperation = useCallback(
    async (operation: SchemaOperation): Promise<boolean> => {
      try {
        const client = await getClient();

        const document = {
          docType: "schema-operation",
          ...operation,
          searchText: `${operation.kind} ${operation.name} ${operation.description || ""} ${operation.signature} ${operation.args} returns ${operation.returnType}`,
        };

        await client.putSemanticMemory.create({
          smartMemoryLocation: getLocation(),
          document: JSON.stringify(document),
        });

        return true;
      } catch (err) {
        console.error("Failed to store schema operation:", err);
        return false;
      }
    },
    [getClient, getLocation]
  );

  // --------------------------------------------------------------------------
  // SCHEMA PERSISTENCE - Check/Store Indexed Status
  // --------------------------------------------------------------------------

  /**
   * Check if a schema has already been indexed for an endpoint.
   * Uses procedural memory to persist the indexed status across sessions.
   */
  const checkSchemaIndexed = useCallback(
    async (endpoint: string): Promise<IndexedSchemaInfo | null> => {
      try {
        const client = await getClient();
        const key = getEndpointKey(endpoint);

        const result = await client.getProcedure.create({
          smartMemoryLocation: getLocation(),
          key,
        });

        if (result.found && result.value) {
          const info = JSON.parse(result.value) as IndexedSchemaInfo;
          // Update schemaStats if we found indexed data
          if (info.stats) {
            setSchemaStats(info.stats);
          }
          return info;
        }

        return null;
      } catch (err) {
        console.error("Failed to check schema indexed status:", err);
        return null;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Store the indexed schema marker in procedural memory
   */
  const storeSchemaIndexedMarker = useCallback(
    async (
      endpoint: string,
      stats: SchemaStats,
      schemaHash: string
    ): Promise<boolean> => {
      try {
        const client = await getClient();
        const key = getEndpointKey(endpoint);

        const info: IndexedSchemaInfo = {
          endpoint,
          stats,
          indexedAt: Date.now(),
          schemaHash,
        };

        const result = await client.putProcedure.create({
          smartMemoryLocation: getLocation(),
          key,
          value: JSON.stringify(info),
        });

        return result.success ?? false;
      } catch (err) {
        console.error("Failed to store schema indexed marker:", err);
        return false;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Get list of all indexed schemas
   */
  const getIndexedSchemas = useCallback(async (): Promise<
    IndexedSchemaInfo[]
  > => {
    try {
      const client = await getClient();

      const result = await client.listProcedures.create({
        smartMemoryLocation: getLocation(),
      });

      const schemas: IndexedSchemaInfo[] = [];
      for (const proc of result.procedures || []) {
        if (proc.key?.startsWith("schema:indexed:") && proc.value) {
          try {
            const info = JSON.parse(proc.value) as IndexedSchemaInfo;
            schemas.push(info);
          } catch {
            // Skip malformed entries
          }
        }
      }

      return schemas.sort((a, b) => b.indexedAt - a.indexedAt);
    } catch (err) {
      console.error("Failed to get indexed schemas:", err);
      return [];
    }
  }, [getClient, getLocation]);

  /**
   * Remove the indexed schema marker (to force re-indexing)
   */
  const clearSchemaIndex = useCallback(
    async (endpoint: string): Promise<boolean> => {
      try {
        const client = await getClient();
        const key = getEndpointKey(endpoint);

        const result = await client.deleteProcedure.create({
          smartMemoryLocation: getLocation(),
          key,
        });

        setSchemaStats(null);
        return result.success ?? false;
      } catch (err) {
        console.error("Failed to clear schema index:", err);
        return false;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Batch store entire schema from introspection.
   *
   * @param introspectionData - GraphQL introspection result
   * @param endpoint - The GraphQL endpoint URL
   * @param options - { forceReindex?: boolean } - Force re-indexing even if already indexed
   * @returns SchemaStats with indexing results, or null if skipped (already indexed)
   */
  const indexSchema = useCallback(
    async (
      introspectionData: {
        __schema: {
          queryType?: { name: string };
          mutationType?: { name: string };
          subscriptionType?: { name: string };
          types: Array<{
            name: string;
            kind: string;
            description?: string;
            fields?: Array<{
              name: string;
              description?: string;
              type: { name?: string; kind: string; ofType?: unknown };
              args?: Array<{ name: string; type: unknown }>;
            }>;
            enumValues?: Array<{ name: string; description?: string }>;
            inputFields?: Array<{ name: string; type: unknown }>;
            interfaces?: Array<{ name: string }>;
            possibleTypes?: Array<{ name: string }>;
          }>;
        };
      },
      endpoint: string,
      options?: { forceReindex?: boolean }
    ): Promise<{
      stats: SchemaStats;
      wasSkipped: boolean;
      reason?: string;
    }> => {
      setIsLoading(true);
      setError(null);

      const currentSchemaHash = generateSchemaHash(introspectionData);

      const stats: SchemaStats = {
        queriesCount: 0,
        mutationsCount: 0,
        subscriptionsCount: 0,
        typesCount: 0,
        endpoint,
        indexedAt: Date.now(),
        schemaHash: currentSchemaHash,
      };

      try {
        const client = await getClient();
        const location = getLocation();

        // Check if already indexed (unless forceReindex is true)
        if (!options?.forceReindex) {
          setIndexProgress({
            phase: "types",
            message: "Checking if schema is already indexed...",
          });

          const existing = await checkSchemaIndexed(endpoint);
          if (existing) {
            // Check if schema has changed by comparing hashes
            if (existing.schemaHash === currentSchemaHash) {
              setIndexProgress({
                phase: "done",
                message: `✓ Schema already indexed (${existing.stats.queriesCount} queries, ${existing.stats.mutationsCount} mutations, ${existing.stats.typesCount} types)`,
              });

              // Keep schema stats from existing
              setSchemaStats(existing.stats);
              setIsLoading(false);

              // Clear progress after delay
              setTimeout(() => setIndexProgress(null), 3000);

              return {
                stats: existing.stats,
                wasSkipped: true,
                reason: `Schema already indexed on ${new Date(existing.indexedAt).toLocaleString()}`,
              };
            } else {
              // Schema changed - will re-index
              setIndexProgress({
                phase: "types",
                message: "Schema changed, re-indexing...",
              });
            }
          }
        }

        const schema = introspectionData.__schema;

        const queryTypeName = schema.queryType?.name || "Query";
        const mutationTypeName = schema.mutationType?.name || "Mutation";
        const subscriptionTypeName =
          schema.subscriptionType?.name || "Subscription";

        // Collect operations
        const operations: SchemaOperation[] = [];
        const types: SchemaType[] = [];

        setIndexProgress({
          phase: "types",
          message: "Processing schema types...",
        });

        for (const type of schema.types) {
          if (type.name.startsWith("__")) continue;

          const isQueryRoot = type.name === queryTypeName;
          const isMutationRoot = type.name === mutationTypeName;
          const isSubscriptionRoot = type.name === subscriptionTypeName;

          if (isQueryRoot || isMutationRoot || isSubscriptionRoot) {
            // Extract operations
            for (const field of type.fields || []) {
              const argsStr = (field.args || [])
                .map((a) => `${a.name}: ${formatType(a.type)}`)
                .join(", ");
              const returnType = formatType(field.type);

              const kind = isQueryRoot
                ? "query"
                : isMutationRoot
                  ? "mutation"
                  : "subscription";

              operations.push({
                name: field.name,
                kind,
                signature: `${field.name}(${argsStr}): ${returnType}`,
                description: field.description,
                args: argsStr,
                returnType,
              });

              if (kind === "query") stats.queriesCount++;
              else if (kind === "mutation") stats.mutationsCount++;
              else stats.subscriptionsCount++;
            }
          } else {
            // Regular types
            const schemaType: SchemaType = {
              name: type.name,
              kind: type.kind as SchemaType["kind"],
              description: type.description,
            };

            if (type.fields) {
              schemaType.fields = type.fields.map((f) => ({
                name: f.name,
                type: formatType(f.type),
                description: f.description,
                args: f.args?.map((a) => ({
                  name: a.name,
                  type: formatType(a.type),
                })),
              }));
            }

            if (type.enumValues) {
              schemaType.enumValues = type.enumValues.map((v) => v.name);
            }

            if (type.interfaces) {
              schemaType.interfaces = type.interfaces.map((i) => i.name);
            }

            if (type.possibleTypes) {
              schemaType.possibleTypes = type.possibleTypes.map((t) => t.name);
            }

            types.push(schemaType);
            stats.typesCount++;
          }
        }

        // Store operations in batches
        setIndexProgress({
          phase: "operations",
          message: `Storing ${operations.length} operations...`,
          current: 0,
          total: operations.length,
        });

        // Store all operations as a batch document
        if (operations.length > 0) {
          const operationsDoc = {
            docType: "operations-batch",
            endpoint,
            count: operations.length,
            operations,
            searchText: operations
              .map(
                (o) =>
                  `${o.kind} ${o.name} ${o.description || ""} ${o.signature}`
              )
              .join(" | "),
          };

          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(operationsDoc),
          });
        }

        // Store types in batches (group by kind for better search)
        setIndexProgress({
          phase: "types",
          message: `Storing ${types.length} types...`,
          current: 0,
          total: types.length,
        });

        // Group types by kind
        const typesByKind = new Map<string, SchemaType[]>();
        for (const type of types) {
          const existing = typesByKind.get(type.kind) || [];
          existing.push(type);
          typesByKind.set(type.kind, existing);
        }

        for (const [kind, kindTypes] of typesByKind) {
          const typesDoc = {
            docType: "types-batch",
            endpoint,
            kind,
            count: kindTypes.length,
            types: kindTypes,
            searchText: kindTypes
              .map(
                (t) =>
                  `${t.kind} ${t.name} ${t.description || ""} ${
                    t.fields?.map((f) => `${f.name} ${f.type}`).join(" ") || ""
                  } ${t.enumValues?.join(" ") || ""}`
              )
              .join(" | "),
          };

          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(typesDoc),
          });
        }

        // Store schema metadata
        const metaDoc = {
          docType: "schema-metadata",
          ...stats,
          searchText: `schema metadata ${endpoint} ${stats.queriesCount} queries ${stats.mutationsCount} mutations ${stats.typesCount} types`,
        };

        await client.putSemanticMemory.create({
          smartMemoryLocation: location,
          document: JSON.stringify(metaDoc),
        });

        // Store the indexed marker in procedural memory for persistence
        await storeSchemaIndexedMarker(endpoint, stats, currentSchemaHash);

        setSchemaStats(stats);
        setIndexProgress({
          phase: "done",
          message: `✓ Indexed ${stats.queriesCount} queries, ${stats.mutationsCount} mutations, ${stats.typesCount} types`,
        });

        // Clear progress after delay
        setTimeout(() => setIndexProgress(null), 5000);

        return { stats, wasSkipped: false };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to index schema";
        setError(msg);
        setIndexProgress({ phase: "error", message: msg });
        return { stats, wasSkipped: false, reason: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [getClient, getLocation, checkSchemaIndexed, storeSchemaIndexedMarker]
  );

  // --------------------------------------------------------------------------
  // WORKING MEMORY - Query Patterns & Exploration
  // --------------------------------------------------------------------------

  /**
   * Store a query pattern in working memory
   */
  const storeQueryPattern = useCallback(
    async (pattern: string, description: string): Promise<boolean> => {
      try {
        const client = await getClient();
        const sessionId = await getSession();

        await client.putMemory.create({
          smartMemoryLocation: getLocation(),
          sessionId,
          content: JSON.stringify({
            type: "query-pattern",
            pattern,
            description,
            timestamp: Date.now(),
          }),
          timeline: "graphql-queries",
          agent: "graphql-explorer",
        });

        return true;
      } catch (err) {
        console.error("Failed to store query pattern:", err);
        return false;
      }
    },
    [getClient, getLocation, getSession]
  );

  /**
   * Track user exploration (viewing types, searching, etc.)
   */
  const trackExploration = useCallback(
    async (
      action:
        | "view_type"
        | "view_operation"
        | "search"
        | "run_query"
        | "generate",
      details: Record<string, unknown>
    ): Promise<void> => {
      try {
        const client = await getClient();
        const sessionId = await getSession();

        await client.putMemory.create({
          smartMemoryLocation: getLocation(),
          sessionId,
          content: JSON.stringify({
            action,
            ...details,
            timestamp: Date.now(),
          }),
          timeline: "exploration",
          agent: "graphql-explorer",
        });
      } catch {
        // Silent fail for tracking
      }
    },
    [getClient, getLocation, getSession]
  );

  /**
   * Get recent exploration context
   */
  const getExplorationContext = useCallback(
    async (limit = 10): Promise<string[]> => {
      try {
        const client = await getClient();
        const sessionId = await getSession();

        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: getLocation(),
          sessionId,
          timeline: "exploration",
          nMostRecent: limit,
        });

        const actions: string[] = [];
        for (const m of memories.memories || []) {
          try {
            const data = JSON.parse(m.content || "{}");
            switch (data.action) {
              case "view_type":
                actions.push(`Viewed type: ${data.typeName}`);
                break;
              case "view_operation":
                actions.push(`Viewed ${data.kind}: ${data.name}`);
                break;
              case "search":
                actions.push(`Searched: "${data.query}"`);
                break;
              case "run_query":
                actions.push(`Ran query: ${data.operationName || "anonymous"}`);
                break;
              case "generate":
                actions.push(`Generated query for: "${data.intent}"`);
                break;
            }
          } catch {
            /* skip */
          }
        }

        return actions;
      } catch {
        return [];
      }
    },
    [getClient, getLocation, getSession]
  );

  // --------------------------------------------------------------------------
  // PROCEDURAL MEMORY - Templates & Rules
  // --------------------------------------------------------------------------

  /**
   * Store an optimization rule
   */
  const storeOptimizationRule = useCallback(
    async (key: string, rule: string): Promise<boolean> => {
      try {
        const client = await getClient();

        const result = await client.putProcedure.create({
          smartMemoryLocation: getLocation(),
          key: `rule:${key}`,
          value: JSON.stringify({
            rule,
            createdAt: Date.now(),
          }),
        });

        return result.success ?? false;
      } catch {
        return false;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Get an optimization rule
   */
  const getOptimizationRule = useCallback(
    async (key: string): Promise<string | null> => {
      try {
        const client = await getClient();

        const result = await client.getProcedure.create({
          smartMemoryLocation: getLocation(),
          key: `rule:${key}`,
        });

        if (result.found && result.value) {
          const data = JSON.parse(result.value);
          return data.rule;
        }
        return null;
      } catch {
        return null;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Save a query template
   */
  const saveTemplate = useCallback(
    async (template: Omit<SavedTemplate, "createdAt">): Promise<boolean> => {
      try {
        const client = await getClient();

        const result = await client.putProcedure.create({
          smartMemoryLocation: getLocation(),
          key: `template:${template.name}`,
          value: JSON.stringify({ ...template, createdAt: Date.now() }),
        });

        return result.success ?? false;
      } catch {
        return false;
      }
    },
    [getClient, getLocation]
  );

  /**
   * Get a saved template
   */
  const getTemplate = useCallback(
    async (name: string): Promise<SavedTemplate | null> => {
      try {
        const client = await getClient();

        const result = await client.getProcedure.create({
          smartMemoryLocation: getLocation(),
          key: `template:${name}`,
        });

        return result.found && result.value ? JSON.parse(result.value) : null;
      } catch {
        return null;
      }
    },
    [getClient, getLocation]
  );

  /**
   * List all saved templates
   */
  const listTemplates = useCallback(async (): Promise<SavedTemplate[]> => {
    try {
      const client = await getClient();

      const result = await client.listProcedures.create({
        smartMemoryLocation: getLocation(),
      });

      const templates: SavedTemplate[] = [];
      for (const p of result.procedures || []) {
        if (p.key?.startsWith("template:") && p.value) {
          try {
            templates.push(JSON.parse(p.value));
          } catch {
            /* skip */
          }
        }
      }

      return templates.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }, [getClient, getLocation]);

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const client = await getClient();

        const result = await client.deleteProcedure.create({
          smartMemoryLocation: getLocation(),
          key: `template:${name}`,
        });

        return result.success ?? false;
      } catch {
        return false;
      }
    },
    [getClient, getLocation]
  );

  // --------------------------------------------------------------------------
  // SEARCH
  // --------------------------------------------------------------------------

  /**
   * Search across schema (semantic memory)
   */
  const searchSchema = useCallback(
    async (query: string, limit = 10): Promise<SearchResult[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();

        const result = await client.query.semanticMemory.search({
          smartMemoryLocation: getLocation(),
          needle: query,
        });

        const results: SearchResult[] = [];

        for (const r of result.documentSearchResponse?.results || []) {
          try {
            const doc = JSON.parse(r.text || "{}");

            // Handle batch documents
            if (doc.docType === "operations-batch") {
              for (const op of doc.operations || []) {
                if (matchesQuery(op, query)) {
                  results.push({
                    text: JSON.stringify(op),
                    score: r.score || 0,
                    type: "operation",
                    name: op.name,
                  });
                }
              }
            } else if (doc.docType === "types-batch") {
              for (const t of doc.types || []) {
                if (matchesQuery(t, query)) {
                  results.push({
                    text: JSON.stringify(t),
                    score: r.score || 0,
                    type: "type",
                    name: t.name,
                  });
                }
              }
            } else {
              results.push({
                text: r.text || "",
                score: r.score || 0,
                type: doc.docType?.includes("operation") ? "operation" : "type",
                name: doc.name,
              });
            }

            if (results.length >= limit) break;
          } catch {
            results.push({
              text: r.text || "",
              score: r.score || 0,
            });
          }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, limit);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [getClient, getLocation]
  );

  /**
   * Search query patterns (working memory)
   */
  const searchPatterns = useCallback(
    async (query: string): Promise<QueryPattern[]> => {
      try {
        const client = await getClient();
        const sessionId = await getSession();

        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: getLocation(),
          sessionId,
          timeline: "graphql-queries",
          nMostRecent: 50,
        });

        const patterns: QueryPattern[] = [];
        const queryLower = query.toLowerCase();

        for (const m of memories.memories || []) {
          try {
            const data = JSON.parse(m.content || "{}");
            if (data.type === "query-pattern") {
              if (
                data.pattern.toLowerCase().includes(queryLower) ||
                data.description.toLowerCase().includes(queryLower)
              ) {
                patterns.push({
                  pattern: data.pattern,
                  description: data.description,
                  lastUsed: data.timestamp,
                });
              }
            }
          } catch {
            /* skip */
          }
        }

        return patterns;
      } catch {
        return [];
      }
    },
    [getClient, getLocation, getSession]
  );

  // --------------------------------------------------------------------------
  // AI QUERY GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate a GraphQL query from natural language
   */
  const generateQuery = useCallback(
    async (
      intent: string
    ): Promise<{ query: string; explanation?: string } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const sessionId = await getSession();
        const location = getLocation();

        // Search for relevant schema context
        const schemaResults = await searchSchema(intent, 5);
        const schemaContext = schemaResults
          .filter((r) => r.score > 0.3)
          .map((r) => {
            try {
              const doc = JSON.parse(r.text);
              if (r.type === "operation") {
                return `${doc.kind?.toUpperCase() || "OPERATION"}: ${doc.signature || doc.name}`;
              } else {
                return `TYPE ${doc.name}: ${doc.fields?.map((f: SchemaField) => f.name).join(", ") || ""}`;
              }
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .join("\n");

        // Get exploration context
        const explorationContext = await getExplorationContext(5);

        // Store the intent
        await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          content: JSON.stringify({
            type: "generation-intent",
            intent,
            timestamp: Date.now(),
          }),
          timeline: "query-generation",
          agent: "graphql-generator",
        });

        // Get recent memories for AI
        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId,
          nMostRecent: 10,
        });

        const memoryIds = (memories.memories || [])
          .map((m) => m.id)
          .filter((id): id is string => !!id);

        // AI summarization to generate query
        const systemPrompt = `You are an expert GraphQL query generator.

## User Request
"${intent}"

## Available Schema
${schemaContext || "No specific schema found. Generate a reasonable query."}

## Recent Activity
${explorationContext.length > 0 ? explorationContext.join("\n") : "No recent activity."}

## Instructions
Generate a valid GraphQL query based on the request and available schema.
Use exact operation names and field names from the schema when available.

Respond with ONLY the GraphQL query in a code block:
\`\`\`graphql
query Example {
  ...
}
\`\`\``;

        const result = await client.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId,
          memoryIds: memoryIds.slice(0, 10),
          systemPrompt,
        });

        const responseText = result.summary || "";
        const codeMatch = responseText.match(/```(?:graphql)?\s*([\s\S]*?)```/);
        const query = codeMatch ? codeMatch[1].trim() : responseText.trim();

        // Track this generation
        await trackExploration("generate", { intent, success: !!codeMatch });

        return {
          query,
          explanation: codeMatch
            ? responseText.replace(/```[\s\S]*?```/, "").trim() || undefined
            : undefined,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      getClient,
      getLocation,
      getSession,
      searchSchema,
      getExplorationContext,
      trackExploration,
    ]
  );

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * End the current session
   */
  const endSession = useCallback(async (): Promise<boolean> => {
    if (!sessionIdRef.current) return false;

    try {
      const client = await getClient();

      const result = await client.endSession.create({
        smartMemoryLocation: getLocation(),
        sessionId: sessionIdRef.current,
        flush: true,
      });

      sessionIdRef.current = null;
      return result.success ?? false;
    } catch {
      return false;
    }
  }, [getClient, getLocation]);

  /**
   * Check if SmartMemory is configured and available
   */
  const checkConfigured = useCallback(async (): Promise<boolean> => {
    const settings = await getRaindropSettings();
    const hasVersion = SMART_MEMORY_CONFIG.version.length > 0;
    const configured =
      settings.enabled && Boolean(settings.apiKey) && hasVersion;
    setIsConfigured(configured);
    return configured;
  }, []);

  // --------------------------------------------------------------------------
  // RETURN
  // --------------------------------------------------------------------------

  return {
    // State
    isLoading,
    error,
    isConfigured,
    schemaStats,
    indexProgress,

    // Schema Persistence (check if already indexed)
    checkSchemaIndexed,
    getIndexedSchemas,
    clearSchemaIndex,

    // Semantic Memory (Schema)
    putSchemaType,
    putSchemaOperation,
    indexSchema,
    searchSchema,

    // Working Memory (Patterns & Exploration)
    storeQueryPattern,
    trackExploration,
    getExplorationContext,
    searchPatterns,

    // Procedural Memory (Templates & Rules)
    storeOptimizationRule,
    getOptimizationRule,
    saveTemplate,
    getTemplate,
    listTemplates,
    deleteTemplate,

    // AI
    generateQuery,

    // Session
    endSession,
    checkConfigured,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatType(type: unknown): string {
  if (!type || typeof type !== "object") return "Unknown";

  const t = type as { kind?: string; name?: string; ofType?: unknown };

  if (t.kind === "NON_NULL") return `${formatType(t.ofType)}!`;
  if (t.kind === "LIST") return `[${formatType(t.ofType)}]`;
  return t.name || "Unknown";
}

function matchesQuery(item: Record<string, unknown>, query: string): boolean {
  const queryLower = query.toLowerCase();
  const searchable = JSON.stringify(item).toLowerCase();
  return searchable.includes(queryLower);
}

/**
 * Generate a simple hash from a string (for endpoint keying and schema change detection)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a procedural memory key for an endpoint
 */
function getEndpointKey(endpoint: string): string {
  const hash = simpleHash(endpoint);
  return `schema:indexed:${hash}`;
}

/**
 * Generate a hash of schema introspection for change detection
 */
function generateSchemaHash(introspectionData: {
  __schema: { types: unknown[] };
}): string {
  // Create a deterministic hash based on type names and field counts
  const types = introspectionData.__schema.types || [];
  const signature = types
    .filter((t: unknown) => {
      const type = t as { name?: string };
      return type.name && !type.name.startsWith("__");
    })
    .map((t: unknown) => {
      const type = t as {
        name: string;
        fields?: unknown[];
        enumValues?: unknown[];
      };
      const fieldCount = type.fields?.length || 0;
      const enumCount = type.enumValues?.length || 0;
      return `${type.name}:${fieldCount}:${enumCount}`;
    })
    .sort()
    .join("|");

  return simpleHash(signature);
}
