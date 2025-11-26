/**
 * GraphQL Query Generator
 *
 * Uses Raindrop SmartMemory's built-in AI capabilities to generate GraphQL queries
 * from natural language. Leverages:
 * - Semantic search to find relevant schema context
 * - Memory summarization for context-aware generation
 * - Procedural memory for query templates and prompts
 *
 * This integrates with the existing Raindrop settings used elsewhere in DevConsole.
 */

import { getRaindropSettings } from "../../hooks/useRaindropSettings";
import type { RaindropSettings } from "../ai/types";
import {
  GraphQLSmartMemory,
  createGraphQLSmartMemory,
  type GraphQLMemoryConfig,
} from "./smartMemory";

// ============================================================================
// CONFIGURATION
// ============================================================================

/** SmartMemory name specifically for GraphQL operations */
const GRAPHQL_MEMORY_NAME = "graphql-schema-memory";

/** Default prompts for query generation */
const DEFAULT_PROMPTS = {
  QUERY_GENERATOR: `You are a GraphQL query generator expert. Given:
1. A user's natural language request
2. Relevant schema context (types, fields, operations)
3. Recent exploration history

Generate a valid, well-structured GraphQL query that fulfills the user's request.

Guidelines:
- Use the exact type and field names from the schema
- Include all required arguments with placeholder values like $variableName
- Select useful fields based on the return type (not just __typename)
- Add appropriate fragments for repeated type selections
- Include variable definitions when using $variables

Format your response as:
\`\`\`graphql
[Your generated query here]
\`\`\`

If you cannot generate a valid query, explain what's missing or unclear.`,

  SCHEMA_CONTEXT: `You are analyzing a GraphQL schema to find relevant context for query generation.
Summarize the following schema elements focusing on:
1. Available operations (queries/mutations) that might match the user's intent
2. Key types and their relationships
3. Required and optional arguments
4. Return types and their fields

Be concise but include all relevant details for query generation.`,
};

// ============================================================================
// TYPES
// ============================================================================

export interface QueryGeneratorConfig {
  /** Use existing Raindrop settings (default: true) */
  useGlobalSettings?: boolean;
  /** Override Raindrop settings */
  raindropSettings?: RaindropSettings;
  /** SmartMemory name for GraphQL (default: "graphql-schema-memory") */
  memoryName?: string;
}

export interface GenerateQueryRequest {
  /** Natural language description of desired query */
  naturalLanguage: string;
  /** Current schema context (optional, will search if not provided) */
  schema?: ProcessedSchema;
  /** Specific operation type to focus on */
  operationType?: "query" | "mutation" | "subscription";
  /** Include recent exploration context */
  includeContext?: boolean;
  /** Maximum schema elements to include as context */
  maxContextItems?: number;
}

export interface GeneratedQuery {
  /** The generated GraphQL query string */
  query: string;
  /** Explanation of what the query does */
  explanation: string;
  /** Variables needed for the query */
  variables?: Record<string, unknown>;
  /** Confidence level (if available) */
  confidence?: "high" | "medium" | "low";
  /** Related operations found in schema */
  relatedOperations?: string[];
  /** Source context used for generation */
  sourceContext?: string;
}

export interface QuerySuggestion {
  /** Operation name */
  name: string;
  /** Operation type */
  type: "query" | "mutation" | "subscription";
  /** Human-readable description */
  description: string;
  /** Relevance score */
  score: number;
  /** Preview of the operation signature */
  signature: string;
}

// ============================================================================
// QUERY GENERATOR CLASS
// ============================================================================

export class GraphQLQueryGenerator {
  private memory: GraphQLSmartMemory | null = null;
  private config: QueryGeneratorConfig;
  private initialized = false;

  constructor(config: QueryGeneratorConfig = {}) {
    this.config = {
      useGlobalSettings: true,
      memoryName: GRAPHQL_MEMORY_NAME,
      ...config,
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the generator with Raindrop SmartMemory
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.memory) return true;

    try {
      // Get Raindrop settings
      const settings = this.config.useGlobalSettings
        ? await getRaindropSettings()
        : this.config.raindropSettings;

      if (!settings?.enabled || !settings?.apiKey) {
        console.warn("[QueryGenerator] Raindrop not configured");
        return false;
      }

      // Create GraphQL-specific SmartMemory config
      const memoryConfig: GraphQLMemoryConfig = {
        apiKey: settings.apiKey,
        memoryName: this.config.memoryName ?? GRAPHQL_MEMORY_NAME,
        applicationName: settings.applicationName ?? "devconsole",
        version: settings.version ?? "1",
      };

      this.memory = createGraphQLSmartMemory(memoryConfig);

      // Test connection
      const { ok, error } = await this.memory.testConnection();
      if (!ok) {
        console.error("[QueryGenerator] SmartMemory connection failed:", error);
        return false;
      }

      // Initialize default prompts if not present
      await this.memory.initializeDefaultPrompts();

      // Start a session for context tracking
      await this.memory.startSession();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("[QueryGenerator] Initialization failed:", error);
      return false;
    }
  }

  /**
   * Check if generator is ready
   */
  isReady(): boolean {
    return this.initialized && this.memory !== null;
  }

  // ==========================================================================
  // QUERY GENERATION
  // ==========================================================================

  /**
   * Generate a GraphQL query from natural language
   * Uses SmartMemory's AI summarization for context-aware generation
   */
  async generateQuery(request: GenerateQueryRequest): Promise<GeneratedQuery> {
    if (!this.memory) {
      throw new Error(
        "QueryGenerator not initialized. Call initialize() first."
      );
    }

    const {
      naturalLanguage,
      schema,
      operationType,
      includeContext = true,
      maxContextItems = 10,
    } = request;

    // Record the user's intent
    await this.memory.recordQueryIntent(naturalLanguage);

    // Step 1: Gather schema context
    let schemaContext = "";
    const relatedOperations: string[] = [];

    if (schema) {
      // Use provided schema to find relevant operations
      schemaContext = this.buildSchemaContext(
        schema,
        naturalLanguage,
        operationType,
        maxContextItems
      );

      // Collect related operation names
      const query = naturalLanguage.toLowerCase();
      schema.queries.forEach((q) => {
        if (this.matchesIntent(q.name, q.description, query)) {
          relatedOperations.push(`query.${q.name}`);
        }
      });
      schema.mutations.forEach((m) => {
        if (this.matchesIntent(m.name, m.description, query)) {
          relatedOperations.push(`mutation.${m.name}`);
        }
      });
    } else {
      // Search semantic memory for relevant schema info
      const searchResults = await this.memory.search(naturalLanguage);
      if (searchResults.length > 0) {
        schemaContext = searchResults
          .slice(0, maxContextItems)
          .map((r) => r.text)
          .join("\n\n");
      }
    }

    // Step 2: Build exploration context (if enabled)
    let explorationContext = "";
    if (includeContext) {
      explorationContext = await this.memory.buildContextPrompt();
    }

    // Step 3: Get query templates that might help
    const templates = await this.memory.searchTemplates(naturalLanguage);
    const templateContext =
      templates.length > 0
        ? `\n\n## Similar Query Templates:\n${templates.map((t) => `- ${t.name}: ${t.description}`).join("\n")}`
        : "";

    // Step 4: Combine all context
    const fullContext = this.buildFullContext({
      userIntent: naturalLanguage,
      operationType,
      schemaContext,
      explorationContext,
      templateContext,
    });

    // Step 5: Use AI summarization to generate the query
    // We store the context as memories, then summarize with a query-generation prompt
    const contextMemoryId = await this.memory.putMemory(fullContext, {
      timeline: "query-generation",
      key: `generation-${Date.now()}`,
    });

    if (!contextMemoryId) {
      throw new Error("Failed to store generation context");
    }

    // Get the query generator prompt
    let systemPrompt = await this.memory.getPrompt("query-generator");
    if (!systemPrompt) {
      systemPrompt = DEFAULT_PROMPTS.QUERY_GENERATOR;
    }

    // Summarize with query generation focus
    const result = await this.memory.summarizeMemories([contextMemoryId], {
      systemPrompt: `${systemPrompt}\n\nUser Request: "${naturalLanguage}"\n\nGenerate the GraphQL query now.`,
    });

    if (!result?.summary) {
      // Fallback: construct a basic query suggestion
      return this.buildFallbackQuery(
        naturalLanguage,
        schema,
        relatedOperations
      );
    }

    // Parse the generated query from the summary
    const generated = this.parseGeneratedQuery(result.summary, naturalLanguage);

    // Record successful generation
    await this.memory.recordQueryIntent(naturalLanguage, {
      generatedQuery: generated.query,
      successful: true,
    });

    return {
      ...generated,
      relatedOperations,
      sourceContext: fullContext,
    };
  }

  /**
   * Get query suggestions based on natural language
   * Returns matching operations from the schema
   */
  async suggestQueries(
    naturalLanguage: string,
    schema: ProcessedSchema,
    limit = 5
  ): Promise<QuerySuggestion[]> {
    const query = naturalLanguage.toLowerCase();
    const suggestions: QuerySuggestion[] = [];

    // Score and collect queries
    for (const q of schema.queries) {
      const score = this.calculateRelevanceScore(q.name, q.description, query);
      if (score > 0) {
        suggestions.push({
          name: q.name,
          type: "query",
          description: q.description ?? `Query: ${q.name}`,
          score,
          signature: `${q.name}(${q.arguments.map((a) => `${a.name}: ${a.typeName}`).join(", ")}): ${q.returnType}`,
        });
      }
    }

    // Score and collect mutations
    for (const m of schema.mutations) {
      const score = this.calculateRelevanceScore(m.name, m.description, query);
      if (score > 0) {
        suggestions.push({
          name: m.name,
          type: "mutation",
          description: m.description ?? `Mutation: ${m.name}`,
          score,
          signature: `${m.name}(${m.arguments.map((a) => `${a.name}: ${a.typeName}`).join(", ")}): ${m.returnType}`,
        });
      }
    }

    // Score and collect subscriptions
    for (const s of schema.subscriptions) {
      const score = this.calculateRelevanceScore(s.name, s.description, query);
      if (score > 0) {
        suggestions.push({
          name: s.name,
          type: "subscription",
          description: s.description ?? `Subscription: ${s.name}`,
          score,
          signature: `${s.name}(${s.arguments.map((a) => `${a.name}: ${a.typeName}`).join(", ")}): ${s.returnType}`,
        });
      }
    }

    // Sort by score and limit
    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Explain an existing GraphQL query
   */
  async explainQuery(query: string): Promise<string> {
    if (!this.memory) {
      return "QueryGenerator not initialized.";
    }

    const memoryId = await this.memory.putMemory(
      `GraphQL Query to explain:\n\`\`\`graphql\n${query}\n\`\`\``,
      { timeline: "query-explanation" }
    );

    if (!memoryId) {
      return "Failed to process query.";
    }

    const prompt = await this.memory.getPrompt("schema-explainer");
    const result = await this.memory.summarizeMemories([memoryId], {
      systemPrompt:
        prompt ??
        `Explain this GraphQL query in simple terms. Describe what data it fetches, 
         what arguments it uses, and what the response structure will look like.`,
    });

    return result?.summary ?? "Unable to explain query.";
  }

  /**
   * Optimize an existing GraphQL query
   */
  async optimizeQuery(
    query: string,
    schema?: ProcessedSchema
  ): Promise<GeneratedQuery> {
    if (!this.memory) {
      throw new Error("QueryGenerator not initialized.");
    }

    let context = `GraphQL Query to optimize:\n\`\`\`graphql\n${query}\n\`\`\``;

    if (schema) {
      context += `\n\nAvailable schema context:\n${this.buildSchemaContext(schema, query, undefined, 5)}`;
    }

    const memoryId = await this.memory.putMemory(context, {
      timeline: "query-optimization",
    });

    if (!memoryId) {
      throw new Error("Failed to store optimization context");
    }

    const prompt = await this.memory.getPrompt("query-optimizer");
    const result = await this.memory.summarizeMemories([memoryId], {
      systemPrompt: prompt ?? DEFAULT_PROMPTS.QUERY_GENERATOR,
    });

    return this.parseGeneratedQuery(
      result?.summary ?? query,
      "Optimized query"
    );
  }

  // ==========================================================================
  // TEMPLATE MANAGEMENT
  // ==========================================================================

  /**
   * Save a query as a reusable template
   */
  async saveQueryTemplate(
    name: string,
    query: string,
    description: string,
    variables?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.memory) return false;

    return this.memory.saveTemplate({
      name,
      query,
      description,
      variables: variables ? JSON.stringify(variables) : undefined,
      createdAt: Date.now(),
    });
  }

  /**
   * Get saved query templates
   */
  async getTemplates(): Promise<
    Array<{
      name: string;
      query: string;
      description: string;
    }>
  > {
    if (!this.memory) return [];
    return this.memory.listTemplates();
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * End the current session and cleanup
   */
  async cleanup(): Promise<void> {
    if (this.memory) {
      await this.memory.cleanup(true);
    }
    this.initialized = false;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private buildSchemaContext(
    schema: ProcessedSchema,
    intent: string,
    operationType?: "query" | "mutation" | "subscription",
    maxItems = 10
  ): string {
    const query = intent.toLowerCase();
    const parts: string[] = [];

    // Find relevant queries
    if (!operationType || operationType === "query") {
      const relevantQueries = schema.queries
        .filter((q) => this.matchesIntent(q.name, q.description, query))
        .slice(0, maxItems);

      if (relevantQueries.length > 0) {
        parts.push("## Available Queries:");
        for (const q of relevantQueries) {
          const args = q.arguments
            .map((a) => `${a.name}: ${a.typeName}${a.isNonNull ? "!" : ""}`)
            .join(", ");
          parts.push(`- ${q.name}(${args}): ${q.returnType}`);
          if (q.description) parts.push(`  Description: ${q.description}`);
        }
      }
    }

    // Find relevant mutations
    if (!operationType || operationType === "mutation") {
      const relevantMutations = schema.mutations
        .filter((m) => this.matchesIntent(m.name, m.description, query))
        .slice(0, maxItems);

      if (relevantMutations.length > 0) {
        parts.push("\n## Available Mutations:");
        for (const m of relevantMutations) {
          const args = m.arguments
            .map((a) => `${a.name}: ${a.typeName}${a.isNonNull ? "!" : ""}`)
            .join(", ");
          parts.push(`- ${m.name}(${args}): ${m.returnType}`);
          if (m.description) parts.push(`  Description: ${m.description}`);
        }
      }
    }

    // Find relevant types
    const relevantTypes = schema.objects
      .filter((t) => this.matchesIntent(t.name, t.description, query))
      .slice(0, 5);

    if (relevantTypes.length > 0) {
      parts.push("\n## Relevant Types:");
      for (const t of relevantTypes) {
        const fields = t.fields
          .slice(0, 5)
          .map((f) => `${f.name}: ${f.typeName}`)
          .join(", ");
        parts.push(
          `- ${t.name}: { ${fields}${t.fields.length > 5 ? ", ..." : ""} }`
        );
      }
    }

    return parts.join("\n");
  }

  private buildFullContext(params: {
    userIntent: string;
    operationType?: string;
    schemaContext: string;
    explorationContext: string;
    templateContext: string;
  }): string {
    const {
      userIntent,
      operationType,
      schemaContext,
      explorationContext,
      templateContext,
    } = params;

    let context = `# GraphQL Query Generation Request\n\n`;
    context += `## User Intent\n"${userIntent}"\n`;

    if (operationType) {
      context += `\nOperation Type: ${operationType}\n`;
    }

    if (schemaContext) {
      context += `\n${schemaContext}\n`;
    }

    if (explorationContext && explorationContext !== "No context available.") {
      context += `\n## User's Recent Activity\n${explorationContext}\n`;
    }

    if (templateContext) {
      context += templateContext;
    }

    return context;
  }

  private matchesIntent(
    name: string,
    description: string | null | undefined,
    query: string
  ): boolean {
    const nameMatch =
      name.toLowerCase().includes(query) ||
      query.split(" ").some((word) => name.toLowerCase().includes(word));
    const descMatch =
      description?.toLowerCase().includes(query) ||
      query
        .split(" ")
        .some((word) => description?.toLowerCase().includes(word));
    return nameMatch || descMatch;
  }

  private calculateRelevanceScore(
    name: string,
    description: string | null | undefined,
    query: string
  ): number {
    let score = 0;
    const words = query.split(/\s+/).filter((w) => w.length > 2);
    const nameLower = name.toLowerCase();
    const descLower = description?.toLowerCase() ?? "";

    // Exact match in name
    if (nameLower.includes(query)) score += 10;

    // Word matches in name
    words.forEach((word) => {
      if (nameLower.includes(word)) score += 3;
    });

    // Word matches in description
    words.forEach((word) => {
      if (descLower.includes(word)) score += 1;
    });

    return score;
  }

  private parseGeneratedQuery(
    response: string,
    originalIntent: string
  ): GeneratedQuery {
    // Try to extract GraphQL query from markdown code block
    const codeBlockMatch = response.match(/```graphql\n?([\s\S]*?)```/);
    const query = codeBlockMatch?.[1]?.trim() ?? "";

    // Extract explanation (everything outside code blocks)
    const explanation =
      response.replace(/```graphql[\s\S]*?```/g, "").trim() ||
      `Generated query for: ${originalIntent}`;

    // Try to detect confidence based on response content
    let confidence: "high" | "medium" | "low" = "medium";
    if (query && !query.includes("TODO") && !query.includes("PLACEHOLDER")) {
      confidence = "high";
    } else if (!query) {
      confidence = "low";
    }

    return {
      query,
      explanation,
      confidence,
    };
  }

  private buildFallbackQuery(
    intent: string,
    schema?: ProcessedSchema,
    relatedOperations?: string[]
  ): GeneratedQuery {
    // Build a basic query suggestion based on intent matching
    if (!schema || relatedOperations?.length === 0) {
      return {
        query: "",
        explanation: `Could not generate query for: "${intent}". Please ensure the schema is loaded and try with more specific terms.`,
        confidence: "low",
        relatedOperations,
      };
    }

    // Find the best matching operation
    const firstOp = relatedOperations?.[0];
    if (firstOp) {
      const [type, name] = firstOp.split(".");
      const ops = type === "mutation" ? schema.mutations : schema.queries;
      const op = ops.find((o) => o.name === name);

      if (op) {
        const args = op.arguments
          .map((a) => `$${a.name}: ${a.typeName}`)
          .join(", ");
        const argUsage = op.arguments
          .map((a) => `${a.name}: $${a.name}`)
          .join(", ");

        const query = `${type} ${name}${args ? `(${args})` : ""} {
  ${name}${argUsage ? `(${argUsage})` : ""} {
    __typename
    # Add fields here
  }
}`;

        return {
          query,
          explanation: `Basic template for ${type} "${name}". Please add the specific fields you need.`,
          confidence: "low",
          relatedOperations,
        };
      }
    }

    return {
      query: "",
      explanation: `Could not generate query. Related operations found: ${relatedOperations?.join(", ")}`,
      confidence: "low",
      relatedOperations,
    };
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let generatorInstance: GraphQLQueryGenerator | null = null;

/**
 * Get or create the query generator singleton
 */
export async function getQueryGenerator(
  config?: QueryGeneratorConfig
): Promise<GraphQLQueryGenerator> {
  if (!generatorInstance) {
    generatorInstance = new GraphQLQueryGenerator(config);
  }

  if (!generatorInstance.isReady()) {
    await generatorInstance.initialize();
  }

  return generatorInstance;
}

/**
 * Create a new query generator instance
 */
export function createQueryGenerator(
  config?: QueryGeneratorConfig
): GraphQLQueryGenerator {
  return new GraphQLQueryGenerator(config);
}

/**
 * Check if query generator can be used (Raindrop configured)
 */
export async function isQueryGeneratorAvailable(): Promise<boolean> {
  try {
    const settings = await getRaindropSettings();
    return !!(settings?.enabled && settings?.apiKey);
  } catch {
    return false;
  }
}
