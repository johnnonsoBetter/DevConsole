/**
 * useGraphQLSmartMemory Hook
 * 
 * Simplified React hook for GraphQL AI query generation.
 * Just gets the API key and performs operations directly - no complex state management.
 */

import { useCallback, useState } from "react";
import { getRaindropSettings } from "./useRaindropSettings";
import Raindrop from "@liquidmetal-ai/lm-raindrop";

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedQuery {
  query: string;
  variables?: Record<string, unknown>;
  explanation?: string;
}

export interface QuerySuggestion {
  name: string;
  description: string;
  type: "query" | "mutation";
}

// ============================================================================
// SIMPLE DIRECT HOOK
// ============================================================================

/**
 * Simple hook that directly uses Raindrop SDK
 * No complex initialization - just call the methods
 */
export function useGraphQLSmartMemory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get a configured Raindrop client
   */
  const getClient = useCallback(async () => {
    const settings = await getRaindropSettings();
    
    if (!settings.enabled || !settings.apiKey) {
      throw new Error("Raindrop not configured. Go to Settings → Raindrop and add your API key.");
    }

    // Use dedicated GraphQL SmartMemory
    // Deploy with: application "graphql-smartmemory" { smartmemory "graphql-memory" {} }
    return {
      client: new Raindrop({ apiKey: settings.apiKey }),
      location: {
        smartMemory: {
          name: "graphql-memory",
          applicationName: "graphql-smartmemory",
          version: "01kazjvbmqqdz4hkrn89zj2a5e",
        },
      },
    };
  }, []);

  /**
   * Generate a GraphQL query from natural language
   */
  const generateQuery = useCallback(async (
    naturalLanguage: string,
    schemaContext?: string
  ): Promise<GeneratedQuery | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { client, location } = await getClient();

      // Start a session
      const session = await client.startSession.create({
        smartMemoryLocation: location,
      });

      const sessionId = session.sessionId || `session-${Date.now()}`;

      // Store the user's request in working memory
      await client.putMemory.create({
        smartMemoryLocation: location,
        sessionId,
        content: `User wants to generate GraphQL query: "${naturalLanguage}"`,
        timeline: "query-requests",
      });

      // If we have schema context, store it too
      if (schemaContext) {
        await client.putMemory.create({
          smartMemoryLocation: location,
          sessionId,
          content: `Available schema context:\n${schemaContext}`,
          timeline: "schema-context",
        });
      }

      // Get recent memories for context
      const memories = await client.getMemory.retrieve({
        smartMemoryLocation: location,
        sessionId,
        nMostRecent: 10,
      });

      const memoryIds = (memories.memories || []).map(m => m.id).filter((id): id is string => !!id);

      // Use AI summarization to generate the query
      const result = await client.summarizeMemory.create({
        smartMemoryLocation: location,
        sessionId,
        memoryIds,
        systemPrompt: `You are a GraphQL query generator. Based on the user's request and any available schema context, generate a valid GraphQL query.

User's request: "${naturalLanguage}"

Respond with ONLY a valid GraphQL query. Include:
1. The query/mutation keyword
2. Operation name (optional but recommended)
3. Any necessary variables as $variableName
4. Appropriate field selections

Example format:
query GetUsers($limit: Int) {
  users(limit: $limit) {
    id
    name
    email
  }
}

If you cannot generate a valid query, explain what information is missing.`,
      });

      // Extract the query from the response
      const responseText = result.summary || "";
      
      // Try to extract GraphQL from code blocks or use raw response
      const codeBlockMatch = responseText.match(/```(?:graphql)?\s*([\s\S]*?)```/);
      const query = codeBlockMatch ? codeBlockMatch[1].trim() : responseText.trim();

      return {
        query,
        explanation: codeBlockMatch ? responseText.replace(/```[\s\S]*?```/, "").trim() : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query generation failed";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  /**
   * Get query suggestions based on natural language
   */
  const suggestQueries = useCallback(async (
    naturalLanguage: string
  ): Promise<QuerySuggestion[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { client, location } = await getClient();

      // Search semantic memory for relevant operations
      const searchResult = await client.query.semanticMemory.search({
        smartMemoryLocation: location,
        needle: naturalLanguage,
      });

      const results = searchResult.documentSearchResponse?.results || [];
      
      // Parse results into suggestions
      const suggestions: QuerySuggestion[] = [];
      for (const r of results.slice(0, 5)) {
        try {
          const doc = JSON.parse(r.text || "{}");
          if (doc.docType === "operation") {
            suggestions.push({
              name: doc.name || "Unknown",
              description: doc.description || doc.signature || "",
              type: doc.kind === "mutation" ? "mutation" : "query",
            });
          }
        } catch {
          // Not a JSON doc, skip
        }
      }

      return suggestions;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get suggestions";
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  /**
   * Explain what a GraphQL query does
   */
  const explainQuery = useCallback(async (query: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const { client, location } = await getClient();

      const session = await client.startSession.create({
        smartMemoryLocation: location,
      });

      const sessionId = session.sessionId || `session-${Date.now()}`;

      await client.putMemory.create({
        smartMemoryLocation: location,
        sessionId,
        content: `GraphQL query to explain:\n${query}`,
        timeline: "query-explanation",
      });

      const memories = await client.getMemory.retrieve({
        smartMemoryLocation: location,
        sessionId,
        nMostRecent: 5,
      });

      const memoryIds = (memories.memories || []).map(m => m.id).filter((id): id is string => !!id);

      const result = await client.summarizeMemory.create({
        smartMemoryLocation: location,
        sessionId,
        memoryIds,
        systemPrompt: `You are a GraphQL expert. Explain what this query does in simple terms:

1. What operation type is it (query/mutation/subscription)?
2. What data does it fetch or modify?
3. What are the arguments/variables?
4. What fields are being selected?

Be concise but thorough.`,
      });

      return result.summary || "Unable to explain query.";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to explain query";
      setError(message);
      return message;
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  /**
   * Store schema in semantic memory for future queries
   */
  const storeSchema = useCallback(async (
    schemaJson: string,
    endpoint: string
  ): Promise<boolean> => {
    try {
      const { client, location } = await getClient();

      await client.putSemanticMemory.create({
        smartMemoryLocation: location,
        document: JSON.stringify({
          docType: "schema",
          endpoint,
          schema: schemaJson,
          storedAt: Date.now(),
        }),
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to store schema";
      setError(message);
      return false;
    }
  }, [getClient]);

  /**
   * Check if Raindrop is configured
   */
  const checkConfigured = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await getRaindropSettings();
      return settings.enabled && Boolean(settings.apiKey);
    } catch {
      return false;
    }
  }, []);

  return {
    isLoading,
    error,
    generateQuery,
    suggestQueries,
    explainQuery,
    storeSchema,
    checkConfigured,
  };
}

// ============================================================================
// EVEN SIMPLER - STANDALONE FUNCTION
// ============================================================================

/**
 * Standalone function to generate a query without hooks
 * Use this for one-off calls outside React components
 */
export async function generateGraphQLQuery(
  naturalLanguage: string,
  schemaContext?: string
): Promise<GeneratedQuery | null> {
  const settings = await getRaindropSettings();
  
  if (!settings.enabled || !settings.apiKey) {
    throw new Error("Raindrop not configured");
  }

  const client = new Raindrop({ apiKey: settings.apiKey });
  const location = {
    smartMemory: {
      name: "graphql-memory",
      applicationName: "graphql-smartmemory", 
      version: "01kazjvbmqqdz4hkrn89zj2a5e",
    },
  };

  const session = await client.startSession.create({
    smartMemoryLocation: location,
  });

  const sessionId = session.sessionId || `session-${Date.now()}`;

  await client.putMemory.create({
    smartMemoryLocation: location,
    sessionId,
    content: `Generate GraphQL: "${naturalLanguage}"${schemaContext ? `\nSchema: ${schemaContext}` : ""}`,
    timeline: "queries",
  });

  const memories = await client.getMemory.retrieve({
    smartMemoryLocation: location,
    sessionId,
    nMostRecent: 5,
  });

  const memoryIds = (memories.memories || []).map(m => m.id).filter((id): id is string => !!id);

  const result = await client.summarizeMemory.create({
    smartMemoryLocation: location,
    sessionId,
    memoryIds,
    systemPrompt: `Generate a GraphQL query for: "${naturalLanguage}". Return ONLY the query, no explanation.`,
  });

  const text = result.summary || "";
  const match = text.match(/```(?:graphql)?\s*([\s\S]*?)```/);
  
  return {
    query: match ? match[1].trim() : text.trim(),
  };
}
