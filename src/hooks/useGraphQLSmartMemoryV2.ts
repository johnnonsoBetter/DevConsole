/**
 * useGraphQLSmartMemory V2 - Full SmartMemory Integration
 *
 * OPTIMIZED VERSION:
 * - Batched schema ingestion (few large docs instead of many small ones)
 * - Progress callbacks for UI feedback
 * - Verification of stored data
 *
 * Memory Types:
 * - Semantic Memory: Schema stored as searchable documents
 * - Working Memory: Session context for query generation
 * - Procedural Memory: Saved templates
 */

import Raindrop from "@liquidmetal-ai/lm-raindrop";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRaindropSettings } from "./useRaindropSettings";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SMART_MEMORY_CONFIG = {
  name: "graphql-memory",
  applicationName: "graphql-smartmemory",
  version: "01kazjvbmqqdz4hkrn89zj2a5e",
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedQuery {
  query: string;
  variables?: Record<string, unknown>;
  explanation?: string;
  relevantTypes?: string[];
}

export interface QueryTemplate {
  name: string;
  query: string;
  description: string;
  variables?: string;
  endpoint?: string;
  createdAt: number;
  tags?: string[];
}

export interface SchemaStats {
  queriesCount: number;
  mutationsCount: number;
  subscriptionsCount: number;
  typesCount: number;
  storedAt: number;
  endpoint: string;
}

export interface SemanticSearchResult {
  text: string;
  score: number;
  docType?: string;
  name?: string;
}

export interface SessionInfo {
  sessionId: string;
  startedAt: number;
  memoriesCount: number;
}

export interface IndexingProgress {
  phase:
    | "introspecting"
    | "processing"
    | "storing"
    | "verifying"
    | "done"
    | "error";
  message: string;
  current?: number;
  total?: number;
}

// ============================================================================
// THE REAL HOOK
// ============================================================================

export function useGraphQLSmartMemoryV2() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [schemaStats, setSchemaStats] = useState<SchemaStats | null>(null);
  const [indexingProgress, setIndexingProgress] =
    useState<IndexingProgress | null>(null);

  // Refs for persistent state
  const clientRef = useRef<Raindrop | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // --------------------------------------------------------------------------
  // CLIENT & SESSION MANAGEMENT
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

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const client = await getClient();
    const location = getLocation();

    const session = await client.startSession.create({
      smartMemoryLocation: location,
    });

    sessionIdRef.current = session.sessionId || `session-${Date.now()}`;
    setSessionInfo({
      sessionId: sessionIdRef.current,
      startedAt: Date.now(),
      memoriesCount: 0,
    });

    return sessionIdRef.current;
  }, [getClient, getLocation]);

  // Check configuration on mount
  useEffect(() => {
    getRaindropSettings().then((settings) => {
      setIsConfigured(settings.enabled && Boolean(settings.apiKey));
    });
  }, []);

  // --------------------------------------------------------------------------
  // 1. SCHEMA INGESTION - OPTIMIZED BATCHED VERSION
  // --------------------------------------------------------------------------

  /**
   * Ingest a GraphQL schema into semantic memory
   * OPTIMIZED: Batches documents by category for faster indexing
   */
  const ingestSchema = useCallback(
    async (
      introspectionResult: {
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
      endpoint: string
    ): Promise<{ success: boolean; stats: SchemaStats }> => {
      setIsLoading(true);
      setError(null);
      setIndexingProgress({
        phase: "processing",
        message: "Processing schema...",
      });

      try {
        const client = await getClient();
        const location = getLocation();
        const schema = introspectionResult.__schema;

        // Collect all data first (fast, local processing)
        const queries: Array<{
          name: string;
          signature: string;
          description: string;
          args: string;
          returnType: string;
        }> = [];
        const mutations: Array<{
          name: string;
          signature: string;
          description: string;
          args: string;
          returnType: string;
        }> = [];
        const subscriptions: Array<{
          name: string;
          signature: string;
          description: string;
          args: string;
          returnType: string;
        }> = [];
        const types: Array<{
          name: string;
          kind: string;
          description: string;
          fields: string;
        }> = [];
        const enums: Array<{
          name: string;
          description: string;
          values: string;
        }> = [];

        const queryTypeName = schema.queryType?.name || "Query";
        const mutationTypeName = schema.mutationType?.name || "Mutation";
        const subscriptionTypeName =
          schema.subscriptionType?.name || "Subscription";

        setIndexingProgress({
          phase: "processing",
          message: "Analyzing types and operations...",
        });

        for (const type of schema.types) {
          if (type.name.startsWith("__")) continue;

          const isQueryRoot = type.name === queryTypeName;
          const isMutationRoot = type.name === mutationTypeName;
          const isSubscriptionRoot = type.name === subscriptionTypeName;

          if (isQueryRoot || isMutationRoot || isSubscriptionRoot) {
            for (const field of type.fields || []) {
              const argsStr = (field.args || [])
                .map((a) => `${a.name}: ${formatType(a.type)}`)
                .join(", ");
              const returnType = formatType(field.type);
              const signature = `${field.name}(${argsStr}): ${returnType}`;

              const op = {
                name: field.name,
                signature,
                description: field.description || "",
                args: argsStr,
                returnType,
              };

              if (isQueryRoot) queries.push(op);
              else if (isMutationRoot) mutations.push(op);
              else subscriptions.push(op);
            }
          } else if (
            type.kind === "OBJECT" ||
            type.kind === "INTERFACE" ||
            type.kind === "INPUT_OBJECT"
          ) {
            const fields = (type.fields || type.inputFields || [])
              .map((f) => `${f.name}: ${formatType(f.type)}`)
              .join(", ");
            types.push({
              name: type.name,
              kind: type.kind.toLowerCase(),
              description: type.description || "",
              fields,
            });
          } else if (type.kind === "ENUM") {
            enums.push({
              name: type.name,
              description: type.description || "",
              values: (type.enumValues || []).map((v) => v.name).join(", "),
            });
          }
        }

        // Now store in BATCHED documents (only 5-6 API calls total!)
        const totalDocs = 5; // queries, mutations, subscriptions, types, enums (+ meta)
        let storedDocs = 0;

        setIndexingProgress({
          phase: "storing",
          message: `Storing queries (${queries.length})...`,
          current: storedDocs,
          total: totalDocs,
        });

        // 1. Store all queries as one document
        if (queries.length > 0) {
          const queriesDoc = {
            docType: "operations-batch",
            endpoint,
            kind: "query",
            count: queries.length,
            operations: queries,
            searchText: queries
              .map((q) => `query ${q.name} ${q.description} ${q.signature}`)
              .join(" | "),
          };
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(queriesDoc),
          });
          storedDocs++;
        }

        setIndexingProgress({
          phase: "storing",
          message: `Storing mutations (${mutations.length})...`,
          current: storedDocs,
          total: totalDocs,
        });

        // 2. Store all mutations as one document
        if (mutations.length > 0) {
          const mutationsDoc = {
            docType: "operations-batch",
            endpoint,
            kind: "mutation",
            count: mutations.length,
            operations: mutations,
            searchText: mutations
              .map((m) => `mutation ${m.name} ${m.description} ${m.signature}`)
              .join(" | "),
          };
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(mutationsDoc),
          });
          storedDocs++;
        }

        setIndexingProgress({
          phase: "storing",
          message: `Storing subscriptions (${subscriptions.length})...`,
          current: storedDocs,
          total: totalDocs,
        });

        // 3. Store all subscriptions as one document
        if (subscriptions.length > 0) {
          const subsDoc = {
            docType: "operations-batch",
            endpoint,
            kind: "subscription",
            count: subscriptions.length,
            operations: subscriptions,
            searchText: subscriptions
              .map(
                (s) => `subscription ${s.name} ${s.description} ${s.signature}`
              )
              .join(" | "),
          };
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(subsDoc),
          });
          storedDocs++;
        }

        setIndexingProgress({
          phase: "storing",
          message: `Storing types (${types.length})...`,
          current: storedDocs,
          total: totalDocs,
        });

        // 4. Store all types as one document
        if (types.length > 0) {
          const typesDoc = {
            docType: "types-batch",
            endpoint,
            count: types.length,
            types: types,
            searchText: types
              .map((t) => `${t.kind} ${t.name} ${t.description} ${t.fields}`)
              .join(" | "),
          };
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(typesDoc),
          });
          storedDocs++;
        }

        setIndexingProgress({
          phase: "storing",
          message: `Storing enums (${enums.length})...`,
          current: storedDocs,
          total: totalDocs,
        });

        // 5. Store all enums as one document
        if (enums.length > 0) {
          const enumsDoc = {
            docType: "enums-batch",
            endpoint,
            count: enums.length,
            enums: enums,
            searchText: enums
              .map((e) => `enum ${e.name} ${e.description} ${e.values}`)
              .join(" | "),
          };
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify(enumsDoc),
          });
          storedDocs++;
        }

        // 6. Store schema metadata
        const stats: SchemaStats = {
          queriesCount: queries.length,
          mutationsCount: mutations.length,
          subscriptionsCount: subscriptions.length,
          typesCount: types.length + enums.length,
          storedAt: Date.now(),
          endpoint,
        };

        await client.putSemanticMemory.create({
          smartMemoryLocation: location,
          document: JSON.stringify({
            docType: "schema-meta",
            endpoint,
            ...stats,
            searchText: `schema metadata ${endpoint} ${queries.length} queries ${mutations.length} mutations ${types.length} types`,
          }),
        });

        setIndexingProgress({
          phase: "verifying",
          message: "Verifying storage...",
        });

        // Verify by searching
        const verifyResult = await client.query.semanticMemory.search({
          smartMemoryLocation: location,
          needle: "schema metadata",
        });

        const verified =
          (verifyResult.documentSearchResponse?.results?.length || 0) > 0;

        setSchemaStats(stats);
        setIndexingProgress({
          phase: "done",
          message: `✓ Indexed ${queries.length} queries, ${mutations.length} mutations, ${types.length + enums.length} types`,
        });

        // Clear progress after a moment
        setTimeout(() => setIndexingProgress(null), 5000);

        return { success: verified, stats };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to ingest schema";
        setError(msg);
        setIndexingProgress({ phase: "error", message: msg });
        return {
          success: false,
          stats: {
            queriesCount: 0,
            mutationsCount: 0,
            subscriptionsCount: 0,
            typesCount: 0,
            storedAt: 0,
            endpoint,
          },
        };
      } finally {
        setIsLoading(false);
      }
    },
    [getClient, getLocation]
  );

  // --------------------------------------------------------------------------
  // 2. VERIFY / CHECK INDEXED DATA
  // --------------------------------------------------------------------------

  /**
   * Check if schema has been indexed by searching for metadata
   */
  const checkIndexedSchema =
    useCallback(async (): Promise<SchemaStats | null> => {
      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.query.semanticMemory.search({
          smartMemoryLocation: location,
          needle: "schema metadata docType",
        });

        for (const r of result.documentSearchResponse?.results || []) {
          try {
            const doc = JSON.parse(r.text || "{}");
            if (doc.docType === "schema-meta") {
              const stats: SchemaStats = {
                queriesCount: doc.queriesCount || 0,
                mutationsCount: doc.mutationsCount || 0,
                subscriptionsCount: doc.subscriptionsCount || 0,
                typesCount: doc.typesCount || 0,
                storedAt: doc.storedAt || 0,
                endpoint: doc.endpoint || "",
              };
              setSchemaStats(stats);
              return stats;
            }
          } catch {
            // Not JSON
          }
        }
        return null;
      } catch {
        return null;
      }
    }, [getClient, getLocation]);

  // --------------------------------------------------------------------------
  // 3. SEMANTIC SEARCH
  // --------------------------------------------------------------------------

  const searchSchema = useCallback(
    async (
      query: string,
      options?: {
        docType?: "operation" | "type" | "all";
        limit?: number;
      }
    ): Promise<SemanticSearchResult[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.query.semanticMemory.search({
          smartMemoryLocation: location,
          needle: query,
        });

        const results: SemanticSearchResult[] = [];

        for (const r of result.documentSearchResponse?.results || []) {
          try {
            const doc = JSON.parse(r.text || "{}");

            // Handle batch documents by extracting relevant items
            if (doc.docType === "operations-batch") {
              for (const op of doc.operations || []) {
                if (
                  op.name.toLowerCase().includes(query.toLowerCase()) ||
                  op.description?.toLowerCase().includes(query.toLowerCase()) ||
                  op.signature.toLowerCase().includes(query.toLowerCase())
                ) {
                  results.push({
                    text: JSON.stringify({
                      ...op,
                      kind: doc.kind,
                      docType: "operation",
                    }),
                    score: r.score || 0,
                    docType: "operation",
                    name: op.name,
                  });
                }
              }
            } else if (doc.docType === "types-batch") {
              for (const t of doc.types || []) {
                if (
                  t.name.toLowerCase().includes(query.toLowerCase()) ||
                  t.description?.toLowerCase().includes(query.toLowerCase()) ||
                  t.fields.toLowerCase().includes(query.toLowerCase())
                ) {
                  results.push({
                    text: JSON.stringify({ ...t, docType: "type" }),
                    score: r.score || 0,
                    docType: "type",
                    name: t.name,
                  });
                }
              }
            } else if (doc.docType === "enums-batch") {
              for (const e of doc.enums || []) {
                if (
                  e.name.toLowerCase().includes(query.toLowerCase()) ||
                  e.values.toLowerCase().includes(query.toLowerCase())
                ) {
                  results.push({
                    text: JSON.stringify({ ...e, docType: "enum" }),
                    score: r.score || 0,
                    docType: "enum",
                    name: e.name,
                  });
                }
              }
            } else {
              // Non-batch document
              results.push({
                text: r.text || "",
                score: r.score || 0,
                docType: doc.docType,
                name: doc.name,
              });
            }

            if (options?.limit && results.length >= options.limit) break;
          } catch {
            results.push({
              text: r.text || "",
              score: r.score || 0,
            });
          }
        }

        // Sort by score and limit
        results.sort((a, b) => b.score - a.score);
        return options?.limit ? results.slice(0, options.limit) : results;
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

  // --------------------------------------------------------------------------
  // 4. CONTEXT TRACKING
  // --------------------------------------------------------------------------

  const trackExploration = useCallback(
    async (
      action:
        | "view_type"
        | "view_operation"
        | "search"
        | "generate_query"
        | "execute_query",
      details: Record<string, unknown>
    ): Promise<void> => {
      try {
        const client = await getClient();
        const location = getLocation();
        const sessionId = await ensureSession();

        await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          content: JSON.stringify({
            action,
            ...details,
            timestamp: Date.now(),
          }),
          timeline: "exploration",
          agent: "graphql-explorer",
        });

        setSessionInfo((prev) =>
          prev ? { ...prev, memoriesCount: prev.memoriesCount + 1 } : null
        );
      } catch {
        // Silent fail for tracking
      }
    },
    [getClient, getLocation, ensureSession]
  );

  const getExplorationContext = useCallback(
    async (limit = 10): Promise<string> => {
      try {
        const client = await getClient();
        const location = getLocation();
        const sessionId = await ensureSession();

        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId,
          timeline: "exploration",
          nMostRecent: limit,
        });

        if (!memories.memories?.length) return "No recent exploration context.";

        const actions: string[] = [];
        for (const m of memories.memories) {
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
                actions.push(`Searched for: "${data.query}"`);
                break;
              case "generate_query":
                actions.push(`Generated query for: "${data.intent}"`);
                break;
            }
          } catch {
            /* skip */
          }
        }

        return actions.length > 0
          ? `Recent activity:\n${actions.map((a) => `- ${a}`).join("\n")}`
          : "No recent exploration context.";
      } catch {
        return "Unable to retrieve context.";
      }
    },
    [getClient, getLocation, ensureSession]
  );

  // --------------------------------------------------------------------------
  // 5. QUERY GENERATION
  // --------------------------------------------------------------------------

  const generateQuery = useCallback(
    async (naturalLanguage: string): Promise<GeneratedQuery | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const location = getLocation();
        const sessionId = await ensureSession();

        // Search for relevant schema parts
        const schemaResults = await searchSchema(naturalLanguage, {
          limit: 10,
        });

        // Build schema context
        const schemaContext = schemaResults
          .filter((r) => r.score > 0.3)
          .map((r) => {
            try {
              const doc = JSON.parse(r.text);
              if (doc.docType === "operation" || doc.kind) {
                return `${(doc.kind || "query").toUpperCase()}: ${doc.signature || `${doc.name}(${doc.args}): ${doc.returnType}`}\n  ${doc.description || ""}`;
              } else if (doc.docType === "type") {
                return `TYPE ${doc.name} (${doc.kind}): ${doc.fields}\n  ${doc.description || ""}`;
              }
            } catch {
              return null;
            }
            return null;
          })
          .filter(Boolean)
          .join("\n\n");

        // Get exploration context
        const explorationContext = await getExplorationContext(5);

        // Store intent
        await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          content: JSON.stringify({
            intent: naturalLanguage,
            timestamp: Date.now(),
          }),
          timeline: "query-intents",
          agent: "graphql-generator",
        });

        // Get memories for AI
        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId,
          nMostRecent: 15,
        });

        const memoryIds = (memories.memories || [])
          .map((m) => m.id)
          .filter((id): id is string => !!id);

        // AI Summarization
        const systemPrompt = `You are an expert GraphQL query generator.

## User Request
"${naturalLanguage}"

## Available Schema Context
${schemaContext || "No specific schema context. Generate a reasonable query structure."}

## ${explorationContext}

## Instructions
Generate a valid GraphQL query. Use exact operation names and fields from the schema.
Respond with ONLY the GraphQL query in a code block.

Example:
\`\`\`graphql
query GetUsers($limit: Int) {
  users(limit: $limit) {
    id
    name
  }
}
\`\`\``;

        const result = await client.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId,
          memoryIds: memoryIds.slice(0, 10),
          systemPrompt,
        });

        const responseText = result.summary || "";
        const codeBlockMatch = responseText.match(
          /```(?:graphql)?\s*([\s\S]*?)```/
        );
        const query = codeBlockMatch
          ? codeBlockMatch[1].trim()
          : responseText.trim();

        await trackExploration("generate_query", {
          intent: naturalLanguage,
          success: !!codeBlockMatch,
        });

        return {
          query,
          explanation: codeBlockMatch
            ? responseText.replace(/```[\s\S]*?```/, "").trim() || undefined
            : undefined,
          relevantTypes: schemaResults
            .map((r) => r.name)
            .filter((n): n is string => !!n),
        };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Query generation failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      getClient,
      getLocation,
      ensureSession,
      searchSchema,
      getExplorationContext,
      trackExploration,
    ]
  );

  // --------------------------------------------------------------------------
  // 6. TEMPLATES
  // --------------------------------------------------------------------------

  const saveTemplate = useCallback(
    async (template: Omit<QueryTemplate, "createdAt">): Promise<boolean> => {
      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.putProcedure.create({
          smartMemoryLocation: location,
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

  const getTemplate = useCallback(
    async (name: string): Promise<QueryTemplate | null> => {
      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.getProcedure.create({
          smartMemoryLocation: location,
          key: `template:${name}`,
        });

        return result.found && result.value ? JSON.parse(result.value) : null;
      } catch {
        return null;
      }
    },
    [getClient, getLocation]
  );

  const listTemplates = useCallback(async (): Promise<QueryTemplate[]> => {
    try {
      const client = await getClient();
      const location = getLocation();

      const result = await client.listProcedures.create({
        smartMemoryLocation: location,
      });

      const templates: QueryTemplate[] = [];
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

  const deleteTemplate = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.deleteProcedure.create({
          smartMemoryLocation: location,
          key: `template:${name}`,
        });

        return result.success ?? false;
      } catch {
        return false;
      }
    },
    [getClient, getLocation]
  );

  const searchTemplates = useCallback(
    async (query: string): Promise<QueryTemplate[]> => {
      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.query.procedures.search({
          smartMemoryLocation: location,
          terms: query,
          searchKeys: true,
          searchValues: true,
        });

        const templates: QueryTemplate[] = [];
        for (const p of result.procedures || []) {
          if (p.key?.startsWith("template:") && p.value) {
            try {
              templates.push(JSON.parse(p.value));
            } catch {
              /* skip */
            }
          }
        }

        return templates;
      } catch {
        return [];
      }
    },
    [getClient, getLocation]
  );

  // --------------------------------------------------------------------------
  // 7. EXPLAIN & OPTIMIZE
  // --------------------------------------------------------------------------

  const explainQuery = useCallback(
    async (query: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const location = getLocation();
        const sessionId = await ensureSession();

        await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          content: `Query to explain:\n${query}`,
          timeline: "explanations",
        });

        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId,
          nMostRecent: 5,
        });

        const memoryIds = (memories.memories || [])
          .map((m) => m.id)
          .filter((id): id is string => !!id);

        const result = await client.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId,
          memoryIds,
          systemPrompt: `Explain this GraphQL query clearly and concisely:
1. What operation type is it?
2. What does it do in plain English?
3. What arguments/variables does it expect?
4. What data will it return?
Be practical and use bullet points.`,
        });

        return result.summary || "Unable to explain query.";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Explanation failed";
        setError(msg);
        return msg;
      } finally {
        setIsLoading(false);
      }
    },
    [getClient, getLocation, ensureSession]
  );

  const optimizeQuery = useCallback(
    async (
      query: string
    ): Promise<{ optimizedQuery: string; suggestions: string[] }> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const location = getLocation();
        const sessionId = await ensureSession();

        await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          content: `Query to optimize:\n${query}`,
          timeline: "optimizations",
        });

        const memories = await client.getMemory.retrieve({
          smartMemoryLocation: location,
          sessionId,
          nMostRecent: 5,
        });

        const memoryIds = (memories.memories || [])
          .map((m) => m.id)
          .filter((id): id is string => !!id);

        const result = await client.summarizeMemory.create({
          smartMemoryLocation: location,
          sessionId,
          memoryIds,
          systemPrompt: `Analyze this GraphQL query and suggest optimizations:
1. Identify any performance issues (N+1, over-fetching)
2. Suggest improvements
3. Provide an optimized version

Format:
## Suggestions
- [list]

## Optimized Query
\`\`\`graphql
[query]
\`\`\``,
        });

        const responseText = result.summary || "";
        const suggestionsMatch = responseText.match(
          /## Suggestions\n([\s\S]*?)(?=##|$)/
        );
        const suggestions = suggestionsMatch
          ? suggestionsMatch[1]
              .split("\n")
              .filter((l) => l.trim().startsWith("-"))
              .map((l) => l.replace(/^-\s*/, "").trim())
          : [];

        const queryMatch = responseText.match(
          /```(?:graphql)?\s*([\s\S]*?)```/
        );
        const optimizedQuery = queryMatch ? queryMatch[1].trim() : query;

        return { optimizedQuery, suggestions };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Optimization failed";
        setError(msg);
        return { optimizedQuery: query, suggestions: [] };
      } finally {
        setIsLoading(false);
      }
    },
    [getClient, getLocation, ensureSession]
  );

  // --------------------------------------------------------------------------
  // 8. SESSION & UTILS
  // --------------------------------------------------------------------------

  const endSession = useCallback(
    async (flush = true): Promise<boolean> => {
      if (!sessionIdRef.current) return false;

      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.endSession.create({
          smartMemoryLocation: location,
          sessionId: sessionIdRef.current,
          flush,
        });

        sessionIdRef.current = null;
        setSessionInfo(null);

        return result.success ?? false;
      } catch {
        return false;
      }
    },
    [getClient, getLocation]
  );

  const searchHistory = useCallback(
    async (
      query: string,
      limit = 10
    ): Promise<
      Array<{ sessionId: string; summary: string; createdAt: string }>
    > => {
      try {
        const client = await getClient();
        const location = getLocation();

        const result = await client.query.episodicMemory.search({
          smartMemoryLocation: location,
          terms: query,
          nMostRecent: limit,
        });

        return (result.entries || []).map((e) => ({
          sessionId: e.sessionId || "",
          summary: e.summary || "",
          createdAt: e.createdAt || new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    },
    [getClient, getLocation]
  );

  const testConnection = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    try {
      const client = await getClient();
      const location = getLocation();

      await client.query.semanticMemory.search({
        smartMemoryLocation: location,
        needle: "test",
      });

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }, [getClient, getLocation]);

  const checkConfigured = useCallback(async (): Promise<boolean> => {
    const settings = await getRaindropSettings();
    const configured = settings.enabled && Boolean(settings.apiKey);
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
    sessionInfo,
    schemaStats,
    indexingProgress,

    // Schema
    ingestSchema,
    checkIndexedSchema,
    searchSchema,

    // Context
    trackExploration,
    getExplorationContext,

    // Query generation
    generateQuery,
    explainQuery,
    optimizeQuery,

    // Templates
    saveTemplate,
    getTemplate,
    listTemplates,
    deleteTemplate,
    searchTemplates,

    // Session
    endSession,
    searchHistory,

    // Utils
    testConnection,
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
