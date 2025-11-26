/**
 * useGraphQLSmartMemory V2 - Full SmartMemory Integration
 * 
 * This hook properly leverages ALL SmartMemory capabilities:
 * 
 * SEMANTIC MEMORY (Long-term, searchable):
 * - Schema types stored as searchable documents
 * - Operations (queries/mutations) stored individually
 * - Vector search: "find user mutations" → relevant operations
 * 
 * WORKING MEMORY (Session context):
 * - Tracks user's exploration (types viewed, searches made)
 * - Builds context for better query generation
 * - Multi-turn conversations within a session
 * 
 * PROCEDURAL MEMORY (Templates & Prompts):
 * - Save successful queries as reusable templates
 * - Custom system prompts for different tasks
 * 
 * EPISODIC MEMORY (History):
 * - Session summaries for "what did I do yesterday?"
 * - Rehydrate past sessions for context
 * 
 * AI SUMMARIZATION:
 * - Built-in LLM for query generation
 * - Schema explanation
 * - Query optimization suggestions
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { getRaindropSettings } from "./useRaindropSettings";
import Raindrop from "@liquidmetal-ai/lm-raindrop";

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

// ============================================================================
// THE REAL HOOK
// ============================================================================

export function useGraphQLSmartMemoryV2() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [schemaStats, setSchemaStats] = useState<SchemaStats | null>(null);
  
  // Refs for persistent state
  const clientRef = useRef<Raindrop | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // --------------------------------------------------------------------------
  // CLIENT & SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  const getLocation = useCallback(() => ({
    smartMemory: {
      name: SMART_MEMORY_CONFIG.name,
      applicationName: SMART_MEMORY_CONFIG.applicationName,
      version: SMART_MEMORY_CONFIG.version,
    },
  }), []);

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
    getRaindropSettings().then(settings => {
      setIsConfigured(settings.enabled && Boolean(settings.apiKey));
    });
  }, []);

  // --------------------------------------------------------------------------
  // 1. SCHEMA INGESTION - Store in Semantic Memory
  // --------------------------------------------------------------------------

  /**
   * Ingest a GraphQL schema into semantic memory
   * This makes types and operations searchable!
   */
  const ingestSchema = useCallback(async (
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
    
    try {
      const client = await getClient();
      const location = getLocation();
      const schema = introspectionResult.__schema;
      
      let queriesCount = 0;
      let mutationsCount = 0;
      let subscriptionsCount = 0;
      let typesCount = 0;

      // Find root types
      const queryTypeName = schema.queryType?.name || "Query";
      const mutationTypeName = schema.mutationType?.name || "Mutation";
      const subscriptionTypeName = schema.subscriptionType?.name || "Subscription";

      // Process each type
      for (const type of schema.types) {
        // Skip introspection types
        if (type.name.startsWith("__")) continue;
        
        // Check if it's a root operation type
        const isQueryRoot = type.name === queryTypeName;
        const isMutationRoot = type.name === mutationTypeName;
        const isSubscriptionRoot = type.name === subscriptionTypeName;

        if (isQueryRoot || isMutationRoot || isSubscriptionRoot) {
          // Store each field as an operation
          const kind = isQueryRoot ? "query" : isMutationRoot ? "mutation" : "subscription";
          
          for (const field of type.fields || []) {
            const argsStr = (field.args || [])
              .map(a => `${a.name}: ${formatType(a.type)}`)
              .join(", ");
            
            const returnType = formatType(field.type);
            const signature = `${field.name}(${argsStr}): ${returnType}`;
            
            // Store as searchable document
            await client.putSemanticMemory.create({
              smartMemoryLocation: location,
              document: JSON.stringify({
                docType: "operation",
                endpoint,
                kind,
                name: field.name,
                description: field.description || "",
                signature,
                arguments: argsStr,
                returnType,
                searchText: `${kind} ${field.name} ${field.description || ""} ${argsStr} ${returnType}`,
              }),
            });

            if (isQueryRoot) queriesCount++;
            else if (isMutationRoot) mutationsCount++;
            else subscriptionsCount++;
          }
        } else if (type.kind === "OBJECT" || type.kind === "INTERFACE" || type.kind === "INPUT_OBJECT") {
          // Store as a type document
          const fields = (type.fields || type.inputFields || [])
            .map(f => `${f.name}: ${formatType(f.type)}`)
            .join(", ");
          
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify({
              docType: "type",
              endpoint,
              category: type.kind.toLowerCase(),
              name: type.name,
              description: type.description || "",
              fields,
              interfaces: (type.interfaces || []).map(i => i.name),
              searchText: `${type.name} ${type.description || ""} ${fields}`,
            }),
          });
          typesCount++;
        } else if (type.kind === "ENUM") {
          const values = (type.enumValues || []).map(v => v.name).join(", ");
          
          await client.putSemanticMemory.create({
            smartMemoryLocation: location,
            document: JSON.stringify({
              docType: "type",
              endpoint,
              category: "enum",
              name: type.name,
              description: type.description || "",
              values,
              searchText: `enum ${type.name} ${type.description || ""} ${values}`,
            }),
          });
          typesCount++;
        }
      }

      const stats: SchemaStats = {
        queriesCount,
        mutationsCount,
        subscriptionsCount,
        typesCount,
        storedAt: Date.now(),
        endpoint,
      };

      // Store schema metadata
      await client.putSemanticMemory.create({
        smartMemoryLocation: location,
        document: JSON.stringify({
          docType: "schema-meta",
          endpoint,
          ...stats,
        }),
      });

      setSchemaStats(stats);
      return { success: true, stats };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to ingest schema";
      setError(msg);
      return { 
        success: false, 
        stats: { queriesCount: 0, mutationsCount: 0, subscriptionsCount: 0, typesCount: 0, storedAt: 0, endpoint } 
      };
    } finally {
      setIsLoading(false);
    }
  }, [getClient, getLocation]);

  // --------------------------------------------------------------------------
  // 2. SEMANTIC SEARCH - Find relevant schema parts
  // --------------------------------------------------------------------------

  /**
   * Search schema for relevant types/operations
   * This is the KEY feature - find "user mutations" or "authentication types"
   */
  const searchSchema = useCallback(async (
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
          
          // Filter by docType if specified
          if (options?.docType && options.docType !== "all") {
            if (doc.docType !== options.docType) continue;
          }
          
          results.push({
            text: r.text || "",
            score: r.score || 0,
            docType: doc.docType,
            name: doc.name,
          });
          
          if (options?.limit && results.length >= options.limit) break;
        } catch {
          // Not JSON, include raw
          results.push({
            text: r.text || "",
            score: r.score || 0,
          });
        }
      }
      
      return results;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getClient, getLocation]);

  // --------------------------------------------------------------------------
  // 3. CONTEXT TRACKING - Working Memory
  // --------------------------------------------------------------------------

  /**
   * Record user exploration (type viewed, search made)
   * Builds context for better query generation
   */
  const trackExploration = useCallback(async (
    action: "view_type" | "view_operation" | "search" | "generate_query" | "execute_query",
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
      
      // Update session info
      setSessionInfo(prev => prev ? {
        ...prev,
        memoriesCount: prev.memoriesCount + 1,
      } : null);
    } catch {
      // Silent fail for tracking
    }
  }, [getClient, getLocation, ensureSession]);

  /**
   * Get recent exploration context (for query generation)
   */
  const getExplorationContext = useCallback(async (
    limit = 10
  ): Promise<string> => {
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
      
      if (!memories.memories?.length) {
        return "No recent exploration context.";
      }
      
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
            case "execute_query":
              actions.push(`Executed query: ${data.operationName || "unnamed"}`);
              break;
          }
        } catch {
          // Skip malformed
        }
      }
      
      return actions.length > 0 
        ? `Recent activity:\n${actions.map(a => `- ${a}`).join("\n")}`
        : "No recent exploration context.";
    } catch {
      return "Unable to retrieve context.";
    }
  }, [getClient, getLocation, ensureSession]);

  // --------------------------------------------------------------------------
  // 4. QUERY GENERATION - The Main Event
  // --------------------------------------------------------------------------

  /**
   * Generate a GraphQL query using full SmartMemory context:
   * 1. Semantic search for relevant types/operations
   * 2. Get working memory context
   * 3. AI generates with real schema knowledge
   */
  const generateQuery = useCallback(async (
    naturalLanguage: string
  ): Promise<GeneratedQuery | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const client = await getClient();
      const location = getLocation();
      const sessionId = await ensureSession();
      
      // Step 1: Semantic search for relevant schema parts
      const schemaResults = await searchSchema(naturalLanguage, { limit: 10 });
      
      // Build schema context from search results
      const schemaContext = schemaResults
        .filter(r => r.score > 0.5) // Only high-confidence matches
        .map(r => {
          try {
            const doc = JSON.parse(r.text);
            if (doc.docType === "operation") {
              return `${doc.kind.toUpperCase()}: ${doc.signature}\n  Description: ${doc.description || "N/A"}`;
            } else if (doc.docType === "type") {
              return `TYPE ${doc.name} (${doc.category}): ${doc.fields || doc.values}\n  Description: ${doc.description || "N/A"}`;
            }
          } catch {
            return null;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n\n");
      
      // Step 2: Get exploration context
      const explorationContext = await getExplorationContext(5);
      
      // Step 3: Store the intent in working memory
      await client.putMemory.create({
        smartMemoryLocation: location,
        sessionId,
        content: JSON.stringify({
          intent: naturalLanguage,
          schemaContextLength: schemaContext.length,
          timestamp: Date.now(),
        }),
        timeline: "query-intents",
        agent: "graphql-generator",
      });
      
      // Step 4: Get all recent memories for AI context
      const memories = await client.getMemory.retrieve({
        smartMemoryLocation: location,
        sessionId,
        nMostRecent: 15,
      });
      
      const memoryIds = (memories.memories || [])
        .map(m => m.id)
        .filter((id): id is string => !!id);
      
      // Step 5: AI Summarization to generate query
      const systemPrompt = `You are an expert GraphQL query generator.

## User Request
"${naturalLanguage}"

## Available Schema Context
${schemaContext || "No schema context available. Generate a reasonable query structure."}

## ${explorationContext}

## Instructions
Generate a valid GraphQL query that fulfills the user's request.

1. Use the exact operation names and field names from the schema context
2. Include appropriate arguments based on the operation signature
3. Select relevant fields for the return type
4. Use variables for dynamic values (prefix with $)

Respond with ONLY the GraphQL query in a code block. Example:
\`\`\`graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}
\`\`\`

If you cannot generate a valid query based on the schema, explain what's missing.`;

      const result = await client.summarizeMemory.create({
        smartMemoryLocation: location,
        sessionId,
        memoryIds: memoryIds.slice(0, 10),
        systemPrompt,
      });
      
      const responseText = result.summary || "";
      
      // Extract query from code block
      const codeBlockMatch = responseText.match(/```(?:graphql)?\s*([\s\S]*?)```/);
      const query = codeBlockMatch ? codeBlockMatch[1].trim() : responseText.trim();
      
      // Track this generation
      await trackExploration("generate_query", { 
        intent: naturalLanguage,
        success: !!codeBlockMatch,
      });
      
      // Extract relevant type names from schema results
      const relevantTypes = schemaResults
        .map(r => {
          try {
            return JSON.parse(r.text).name;
          } catch {
            return null;
          }
        })
        .filter((n): n is string => !!n);
      
      return {
        query,
        explanation: codeBlockMatch 
          ? responseText.replace(/```[\s\S]*?```/, "").trim() || undefined
          : undefined,
        relevantTypes,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Query generation failed";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getClient, getLocation, ensureSession, searchSchema, getExplorationContext, trackExploration]);

  // --------------------------------------------------------------------------
  // 5. TEMPLATES - Procedural Memory
  // --------------------------------------------------------------------------

  /**
   * Save a successful query as a reusable template
   */
  const saveTemplate = useCallback(async (
    template: Omit<QueryTemplate, "createdAt">
  ): Promise<boolean> => {
    try {
      const client = await getClient();
      const location = getLocation();
      
      const fullTemplate: QueryTemplate = {
        ...template,
        createdAt: Date.now(),
      };
      
      const result = await client.putProcedure.create({
        smartMemoryLocation: location,
        key: `template:${template.name}`,
        value: JSON.stringify(fullTemplate),
      });
      
      return result.success ?? false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save template";
      setError(msg);
      return false;
    }
  }, [getClient, getLocation]);

  /**
   * Get a template by name
   */
  const getTemplate = useCallback(async (
    name: string
  ): Promise<QueryTemplate | null> => {
    try {
      const client = await getClient();
      const location = getLocation();
      
      const result = await client.getProcedure.create({
        smartMemoryLocation: location,
        key: `template:${name}`,
      });
      
      if (!result.found || !result.value) return null;
      
      return JSON.parse(result.value) as QueryTemplate;
    } catch {
      return null;
    }
  }, [getClient, getLocation]);

  /**
   * List all saved templates
   */
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
            // Skip malformed
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
  const deleteTemplate = useCallback(async (name: string): Promise<boolean> => {
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
  }, [getClient, getLocation]);

  /**
   * Search templates by query
   */
  const searchTemplates = useCallback(async (
    query: string
  ): Promise<QueryTemplate[]> => {
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
            // Skip
          }
        }
      }
      
      return templates;
    } catch {
      return [];
    }
  }, [getClient, getLocation]);

  // --------------------------------------------------------------------------
  // 6. QUERY EXPLANATION & OPTIMIZATION
  // --------------------------------------------------------------------------

  /**
   * Explain what a query does using AI
   */
  const explainQuery = useCallback(async (
    query: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const client = await getClient();
      const location = getLocation();
      const sessionId = await ensureSession();
      
      // Store query for context
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
        .map(m => m.id)
        .filter((id): id is string => !!id);
      
      const result = await client.summarizeMemory.create({
        smartMemoryLocation: location,
        sessionId,
        memoryIds,
        systemPrompt: `You are a GraphQL expert. Explain this query clearly and concisely:

1. What type of operation is it (query/mutation/subscription)?
2. What does it do in plain English?
3. What arguments/variables does it expect?
4. What data will it return?

Be concise and practical. Use bullet points where helpful.`,
      });
      
      return result.summary || "Unable to explain query.";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Explanation failed";
      setError(msg);
      return msg;
    } finally {
      setIsLoading(false);
    }
  }, [getClient, getLocation, ensureSession]);

  /**
   * Get optimization suggestions for a query
   */
  const optimizeQuery = useCallback(async (
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
        .map(m => m.id)
        .filter((id): id is string => !!id);
      
      const result = await client.summarizeMemory.create({
        smartMemoryLocation: location,
        sessionId,
        memoryIds,
        systemPrompt: `You are a GraphQL optimization expert. Analyze this query and:

1. Identify any performance issues (N+1, over-fetching, etc.)
2. Suggest improvements
3. Provide an optimized version

Format your response as:
## Suggestions
- [list of suggestions]

## Optimized Query
\`\`\`graphql
[optimized query]
\`\`\``,
      });
      
      const responseText = result.summary || "";
      
      // Extract suggestions
      const suggestionsMatch = responseText.match(/## Suggestions\n([\s\S]*?)(?=##|$)/);
      const suggestions = suggestionsMatch
        ? suggestionsMatch[1]
            .split("\n")
            .filter(l => l.trim().startsWith("-"))
            .map(l => l.replace(/^-\s*/, "").trim())
        : [];
      
      // Extract optimized query
      const queryMatch = responseText.match(/```(?:graphql)?\s*([\s\S]*?)```/);
      const optimizedQuery = queryMatch ? queryMatch[1].trim() : query;
      
      return { optimizedQuery, suggestions };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Optimization failed";
      setError(msg);
      return { optimizedQuery: query, suggestions: [] };
    } finally {
      setIsLoading(false);
    }
  }, [getClient, getLocation, ensureSession]);

  // --------------------------------------------------------------------------
  // 7. SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * End current session (optionally save to episodic memory)
   */
  const endSession = useCallback(async (
    flush = true
  ): Promise<boolean> => {
    if (!sessionIdRef.current) return false;
    
    try {
      const client = await getClient();
      const location = getLocation();
      
      const result = await client.endSession.create({
        smartMemoryLocation: location,
        sessionId: sessionIdRef.current,
        flush,
        systemPrompt: flush 
          ? "Summarize this GraphQL exploration session: what types/operations were viewed, what queries were generated, and what the user accomplished."
          : undefined,
      });
      
      sessionIdRef.current = null;
      setSessionInfo(null);
      
      return result.success ?? false;
    } catch {
      return false;
    }
  }, [getClient, getLocation]);

  /**
   * Search past sessions (episodic memory)
   */
  const searchHistory = useCallback(async (
    query: string,
    limit = 10
  ): Promise<Array<{ sessionId: string; summary: string; createdAt: string }>> => {
    try {
      const client = await getClient();
      const location = getLocation();
      
      const result = await client.query.episodicMemory.search({
        smartMemoryLocation: location,
        terms: query,
        nMostRecent: limit,
      });
      
      return (result.entries || []).map(e => ({
        sessionId: e.sessionId || "",
        summary: e.summary || "",
        createdAt: e.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }, [getClient, getLocation]);

  // --------------------------------------------------------------------------
  // 8. UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Test connection to SmartMemory
   */
  const testConnection = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
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

  /**
   * Check if Raindrop is configured
   */
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
    
    // Schema ingestion
    ingestSchema,
    searchSchema,
    
    // Context tracking
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
    
    // Session management
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
  
  if (t.kind === "NON_NULL") {
    return `${formatType(t.ofType)}!`;
  }
  if (t.kind === "LIST") {
    return `[${formatType(t.ofType)}]`;
  }
  return t.name || "Unknown";
}
