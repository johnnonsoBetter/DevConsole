/**
 * Memory-Enhanced Log Explainer
 * Extends LogExplainer with Raindrop SmartMemory for persistent context
 *
 * Features:
 * - Remembers past error patterns and their solutions
 * - Retrieves relevant context from episodic memory
 * - Uses semantic search to find similar past issues
 * - Stores successful explanations for future reference
 */

import type { AISettings, RaindropSettings } from "../types";
import { createAIClient } from "./aiClient";
import {
  createRaindropClient,
  isRaindropEnabled,
  type EpisodicMemoryEntry,
  type MemoryEntry,
  type RaindropClient,
} from "./raindropClient";

// ============================================================================
// TYPES
// ============================================================================

export interface LogData {
  level: string;
  message: string;
  args?: any[];
  stack?: string;
  source?: {
    file: string;
    line: number;
  };
  timestamp: number;
}

export interface MemoryEnhancedExplanation {
  summary: string;
  explanation: string;
  possibleCauses?: string[];
  suggestedFixes?: string[];
  severity: "low" | "medium" | "high" | "critical";
  technicalDetails?: string;
  userFriendlyExplanation?: string;
  // Memory-enhanced fields
  relatedPastIssues?: PastIssue[];
  memoryContext?: string;
  wasRemembered?: boolean;
}

export interface PastIssue {
  sessionId: string;
  summary: string;
  relevanceScore: number;
  timestamp: string;
}

interface MemoryContext {
  recentMemories: MemoryEntry[];
  episodicMatches: EpisodicMemoryEntry[];
  semanticContext: string[];
}

// ============================================================================
// MEMORY-ENHANCED LOG EXPLAINER
// ============================================================================

export class MemoryEnhancedLogExplainer {
  private aiClient;
  private raindropClient: RaindropClient | null = null;
  private raindropEnabled: boolean;
  private currentSessionId: string | null = null;

  constructor(aiSettings: AISettings, raindropSettings?: RaindropSettings) {
    this.aiClient = createAIClient(aiSettings);
    this.raindropEnabled = isRaindropEnabled(raindropSettings);

    if (this.raindropEnabled && raindropSettings) {
      this.raindropClient = createRaindropClient(raindropSettings);
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Initialize a debugging session
   * Call this when the user starts a debugging session
   */
  async initializeSession(): Promise<string | null> {
    if (!this.raindropClient) return null;

    try {
      const { sessionId } = await this.raindropClient.startSession();
      this.currentSessionId = sessionId;

      // Store session start in working memory
      await this.raindropClient.putMemory(
        sessionId,
        `Debugging session started at ${new Date().toISOString()}`,
        { timeline: "session-events", key: "session-start" }
      );

      console.log("📝 Raindrop session initialized:", sessionId);
      return sessionId;
    } catch (error) {
      console.error("Failed to initialize Raindrop session:", error);
      return null;
    }
  }

  /**
   * End the current debugging session
   * Flushes working memory to episodic storage
   */
  async endSession(): Promise<void> {
    if (!this.raindropClient || !this.currentSessionId) return;

    try {
      await this.raindropClient.endSession(this.currentSessionId, true);
      console.log(
        "📝 Raindrop session ended and flushed:",
        this.currentSessionId
      );
      this.currentSessionId = null;
    } catch (error) {
      console.error("Failed to end Raindrop session:", error);
    }
  }

  // ============================================================================
  // ENHANCED EXPLANATION
  // ============================================================================

  /**
   * Generate a memory-enhanced explanation for a log entry
   */
  async explainLog(log: LogData): Promise<MemoryEnhancedExplanation> {
    // Gather memory context if available
    const memoryContext = await this.gatherMemoryContext(log);

    // Build enhanced prompt with memory context
    const prompt = this.buildEnhancedPrompt(log, memoryContext);
    const systemPrompt = this.getEnhancedSystemPrompt(memoryContext);

    try {
      const result = await this.aiClient.generateText({
        prompt,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 2000,
      });

      const explanation = this.parseExplanation(result.text);

      // Store this explanation in memory for future reference
      await this.storeExplanationInMemory(log, explanation);

      // Enrich with memory context
      return {
        ...explanation,
        relatedPastIssues: this.formatPastIssues(
          memoryContext?.episodicMatches
        ),
        memoryContext: memoryContext
          ? this.formatMemoryContext(memoryContext)
          : undefined,
        wasRemembered: (memoryContext?.episodicMatches?.length || 0) > 0,
      };
    } catch (error) {
      console.error("Failed to explain log:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate explanation"
      );
    }
  }

  /**
   * Stream explanation with memory enhancement
   */
  async *streamExplanation(log: LogData): AsyncGenerator<string> {
    // Gather memory context first
    const memoryContext = await this.gatherMemoryContext(log);

    // If we have relevant past context, yield it first
    if (memoryContext && memoryContext.episodicMatches.length > 0) {
      yield "🧠 **Memory Context Found**\n\n";
      yield `_Found ${memoryContext.episodicMatches.length} related past issue(s)_\n\n`;
      yield "---\n\n";
    }

    const prompt = this.buildEnhancedPrompt(log, memoryContext);
    const systemPrompt = this.getEnhancedSystemPrompt(memoryContext);

    try {
      let fullText = "";
      for await (const chunk of this.aiClient.streamText({
        prompt,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 2000,
      })) {
        fullText += chunk;
        yield chunk;
      }

      // Store the explanation asynchronously (don't block streaming)
      this.storeExplanationInMemory(log, {
        summary: fullText.split("\n")[0] || "Log explanation",
        explanation: fullText,
        severity: "medium",
      }).catch((err) => console.error("Failed to store explanation:", err));
    } catch (error) {
      console.error("Failed to stream explanation:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to stream explanation"
      );
    }
  }

  // ============================================================================
  // MEMORY OPERATIONS
  // ============================================================================

  /**
   * Gather relevant context from all memory types
   */
  private async gatherMemoryContext(
    log: LogData
  ): Promise<MemoryContext | null> {
    if (!this.raindropClient) return null;

    const searchTerms = this.buildSearchTerms(log);

    try {
      const [episodicResults, semanticResults, recentMemories] =
        await Promise.all([
          // Search episodic memory for similar past sessions
          this.raindropClient.searchEpisodicMemory(searchTerms, {
            nMostRecent: 5,
          }),
          // Search semantic memory for relevant knowledge
          this.raindropClient.searchSemanticMemory(searchTerms),
          // Get recent working memory if session active
          this.currentSessionId
            ? this.raindropClient.getMemory(this.currentSessionId, {
                nMostRecent: 10,
              })
            : Promise.resolve({ memories: [] }),
        ]);

      return {
        recentMemories: recentMemories.memories,
        episodicMatches: episodicResults.entries.filter((e) => e.score > 0.5),
        semanticContext: semanticResults.results.map((r) => r.text),
      };
    } catch (error) {
      console.error("Failed to gather memory context:", error);
      return null;
    }
  }

  /**
   * Store explanation in memory for future retrieval
   */
  private async storeExplanationInMemory(
    log: LogData,
    explanation: Pick<
      MemoryEnhancedExplanation,
      "summary" | "explanation" | "severity"
    >
  ): Promise<void> {
    if (!this.raindropClient || !this.currentSessionId) return;

    try {
      // Create a structured memory entry
      const memoryContent = JSON.stringify({
        logLevel: log.level,
        logMessage: log.message.substring(0, 200),
        errorType: this.extractErrorType(log),
        summary: explanation.summary,
        severity: explanation.severity,
        timestamp: new Date().toISOString(),
        source: log.source,
      });

      await this.raindropClient.putMemory(
        this.currentSessionId,
        memoryContent,
        {
          timeline: "log-explanations",
          key: `${log.level}-${this.hashString(log.message)}`,
          agent: "log-explainer",
        }
      );
    } catch (error) {
      console.error("Failed to store explanation in memory:", error);
    }
  }

  /**
   * Index project documentation for RAG
   */
  async indexDocumentation(
    docs: Array<{ title: string; content: string }>
  ): Promise<void> {
    if (!this.raindropClient) {
      console.warn("Raindrop not enabled - cannot index documentation");
      return;
    }

    for (const doc of docs) {
      try {
        const document = JSON.stringify({
          title: doc.title,
          content: doc.content,
          type: "documentation",
          indexedAt: new Date().toISOString(),
        });

        await this.raindropClient.putSemanticMemory(document);
        console.log(`📚 Indexed document: ${doc.title}`);
      } catch (error) {
        console.error(`Failed to index ${doc.title}:`, error);
      }
    }
  }

  /**
   * Store a procedure/template for reuse
   */
  async storeProcedure(key: string, template: string): Promise<void> {
    if (!this.raindropClient) return;

    try {
      await this.raindropClient.putProcedure(key, template);
      console.log(`📋 Stored procedure: ${key}`);
    } catch (error) {
      console.error(`Failed to store procedure ${key}:`, error);
    }
  }

  // ============================================================================
  // PROMPT BUILDING
  // ============================================================================

  /**
   * Build search terms from log data
   */
  private buildSearchTerms(log: LogData): string {
    const terms: string[] = [];

    // Add error type if present
    const errorType = this.extractErrorType(log);
    if (errorType) terms.push(errorType);

    // Add key parts of the message
    terms.push(log.message.substring(0, 100));

    // Add file path if available
    if (log.source?.file) {
      terms.push(log.source.file.split("/").pop() || "");
    }

    return terms.join(" ");
  }

  /**
   * Build enhanced prompt with memory context
   */
  private buildEnhancedPrompt(
    log: LogData,
    memoryContext: MemoryContext | null
  ): string {
    const parts: string[] = [];

    // Add memory context if available
    if (memoryContext) {
      if (memoryContext.episodicMatches.length > 0) {
        parts.push("## Relevant Past Issues\n");
        memoryContext.episodicMatches.slice(0, 3).forEach((match, i) => {
          parts.push(
            `${i + 1}. ${match.summary} (relevance: ${(match.score * 100).toFixed(0)}%)`
          );
        });
        parts.push("\n");
      }

      if (memoryContext.semanticContext.length > 0) {
        parts.push("## Related Documentation\n");
        memoryContext.semanticContext.slice(0, 2).forEach((ctx) => {
          parts.push(`- ${ctx.substring(0, 200)}...`);
        });
        parts.push("\n");
      }

      if (memoryContext.recentMemories.length > 0) {
        parts.push("## Recent Session Context\n");
        parts.push(
          `_${memoryContext.recentMemories.length} recent debugging activities in this session_\n`
        );
      }
    }

    // Add the current log
    parts.push("## Current Log Entry\n");
    parts.push(`**Level:** ${log.level.toUpperCase()}`);
    parts.push(`**Message:** ${log.message}`);

    if (log.args && log.args.length > 0) {
      parts.push("\n**Arguments:**");
      log.args.forEach((arg, i) => {
        const argStr =
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
        parts.push(`  [${i}]: ${argStr}`);
      });
    }

    if (log.stack) {
      parts.push("\n**Stack Trace:**");
      parts.push(log.stack);
    }

    if (log.source) {
      parts.push(`\n**Source:** ${log.source.file}:${log.source.line}`);
    }

    parts.push("\n---\n");
    parts.push(
      "Please analyze this log entry, considering any relevant past context provided above."
    );

    return parts.join("\n");
  }

  /**
   * Get enhanced system prompt with memory awareness
   */
  private getEnhancedSystemPrompt(memoryContext: MemoryContext | null): string {
    const basePrompt = `You are an expert software engineer and debugging assistant with access to historical context. Your role is to analyze console logs and provide clear, actionable explanations.

For each log, provide:

1. **Summary** (1-2 sentences): What happened in simple terms
2. **Explanation**: Detailed technical explanation
3. **Possible Causes** (if applicable): List of potential reasons
4. **Suggested Fixes** (if applicable): Concrete steps to resolve
5. **Severity Assessment**: Rate as low, medium, high, or critical

Format your response in clean markdown with proper sections.`;

    if (memoryContext && memoryContext.episodicMatches.length > 0) {
      return (
        basePrompt +
        `

IMPORTANT: You have been provided with relevant past issues from the user's debugging history. Use this context to:
- Reference similar past issues if they're directly relevant
- Suggest solutions that worked before for similar problems
- Note patterns if this type of error has occurred repeatedly
- Be more specific in your suggestions based on what has worked in the past`
      );
    }

    return basePrompt;
  }

  // ============================================================================
  // PARSING & UTILITIES
  // ============================================================================

  private parseExplanation(text: string): MemoryEnhancedExplanation {
    // Reuse the parsing logic from original LogExplainer
    return {
      summary:
        this.extractSection(text, "summary") ||
        text.split("\n")[0] ||
        "Analysis complete",
      explanation: text,
      possibleCauses: this.extractList(text, "causes"),
      suggestedFixes: this.extractList(text, "fixes"),
      severity: this.extractSeverity(text),
    };
  }

  private extractSection(text: string, section: string): string | undefined {
    const patterns = [
      new RegExp(`##?\\s*${section}[:\\s]*([^#]+)`, "i"),
      new RegExp(`\\*\\*${section}\\*\\*[:\\s]*([^*]+)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return undefined;
  }

  private extractList(text: string, section: string): string[] | undefined {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) return undefined;

    const items = sectionText
      .split("\n")
      .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((line) => line.length > 0);

    return items.length > 0 ? items : undefined;
  }

  private extractSeverity(
    text: string
  ): "low" | "medium" | "high" | "critical" {
    const lower = text.toLowerCase();
    if (lower.includes("critical") || lower.includes("severe"))
      return "critical";
    if (lower.includes("high") || lower.includes("major")) return "high";
    if (lower.includes("low") || lower.includes("minor")) return "low";
    return "medium";
  }

  private extractErrorType(log: LogData): string | null {
    const errorMatch = log.message.match(/^(\w+Error):/);
    if (errorMatch) return errorMatch[1];

    if (log.stack) {
      const stackMatch = log.stack.match(/^(\w+Error):/);
      if (stackMatch) return stackMatch[1];
    }

    return null;
  }

  private formatPastIssues(
    episodicMatches?: EpisodicMemoryEntry[]
  ): PastIssue[] | undefined {
    if (!episodicMatches || episodicMatches.length === 0) return undefined;

    return episodicMatches.map((match) => ({
      sessionId: match.sessionId,
      summary: match.summary,
      relevanceScore: match.score,
      timestamp: match.createdAt,
    }));
  }

  private formatMemoryContext(context: MemoryContext): string {
    const parts: string[] = [];

    if (context.episodicMatches.length > 0) {
      parts.push(
        `Found ${context.episodicMatches.length} similar past issue(s)`
      );
    }
    if (context.semanticContext.length > 0) {
      parts.push(
        `${context.semanticContext.length} relevant documentation section(s)`
      );
    }
    if (context.recentMemories.length > 0) {
      parts.push(
        `${context.recentMemories.length} items in current session context`
      );
    }

    return parts.join(" • ");
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  // ============================================================================
  // STATUS
  // ============================================================================

  /**
   * Get current memory status
   */
  getMemoryStatus(): {
    enabled: boolean;
    sessionActive: boolean;
    sessionId: string | null;
  } {
    return {
      enabled: this.raindropEnabled,
      sessionActive: this.currentSessionId !== null,
      sessionId: this.currentSessionId,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a memory-enhanced log explainer
 */
export function createMemoryEnhancedLogExplainer(
  aiSettings: AISettings,
  raindropSettings?: RaindropSettings
): MemoryEnhancedLogExplainer {
  return new MemoryEnhancedLogExplainer(aiSettings, raindropSettings);
}
