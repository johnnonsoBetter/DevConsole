/**
 * Log Explainer Service
 * AI-powered explanation of console logs, errors, and warnings
 */

import type { AISettings } from "../types";
import { createAIClient } from "./aiClient";

// ============================================================================
// TYPES
// ============================================================================

// Type definition for reference
interface LogExplanation {
  summary: string;
  explanation: string;
  possibleCauses?: string[];
  suggestedFixes?: string[];
  severity: "low" | "medium" | "high" | "critical";
  technicalDetails?: string; // For developers
  userFriendlyExplanation?: string; // For non-technical users
}
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

// ============================================================================
// LOG EXPLAINER SERVICE
// ============================================================================

export class LogExplainer {
  private client;

  constructor(settings: AISettings) {
    this.client = createAIClient(settings);
  }

  /**
   * Generate explanation for a log entry
   */
  async explainLog(log: LogData): Promise<LogExplanation> {
    const prompt = this.buildPrompt(log);
    const systemPrompt = this.getSystemPrompt();

    try {
      const result = await this.client.generateText({
        prompt,
        systemPrompt,
        temperature: 0.3, // Lower temperature for more consistent explanations
        maxTokens: 1500,
      });

      return this.parseExplanation(result.text);
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
   * Stream explanation for real-time display
   */
  async *streamExplanation(log: LogData): AsyncGenerator<string> {
    const prompt = this.buildPrompt(log);
    const systemPrompt = this.getSystemPrompt();

    try {
      for await (const chunk of this.client.streamText({
        prompt,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1500,
      })) {
        yield chunk;
      }
    } catch (error) {
      console.error("Failed to stream explanation:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to stream explanation"
      );
    }
  }

  /**
   * Build prompt for log explanation
   */
  private buildPrompt(log: LogData): string {
    const parts: string[] = [];

    // Log level and message
    parts.push(`Log Level: ${log.level.toUpperCase()}`);
    parts.push(`Message: ${log.message}`);

    // Add arguments if present
    if (log.args && log.args.length > 0) {
      parts.push(`\nArguments:`);
      log.args.forEach((arg, i) => {
        const argStr =
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
        parts.push(`  [${i}]: ${argStr}`);
      });
    }

    // Add stack trace for errors
    if (log.stack) {
      parts.push(`\nStack Trace:`);
      parts.push(log.stack);
    }

    // Add source location
    if (log.source) {
      parts.push(`\nSource: ${log.source.file}:${log.source.line}`);
    }

    // Add timestamp context
    const date = new Date(log.timestamp);
    parts.push(`\nTimestamp: ${date.toISOString()}`);

    parts.push(
      "\n---\n\nPlease analyze this console log and provide a clear, developer-friendly explanation."
    );

    return parts.join("\n");
  }

  /**
   * System prompt for consistent explanations
   */
  private getSystemPrompt(): string {
    return `You are an expert software engineer and debugging assistant. Your role is to analyze console logs and provide clear, actionable explanations.

For each log, provide:

1. **Summary** (1-2 sentences): What happened in simple terms
2. **Explanation**: Detailed technical explanation of what this log means
3. **Possible Causes** (if applicable): List of potential reasons this log appeared
4. **Suggested Fixes** (if applicable): Concrete steps to resolve or investigate further
5. **Severity Assessment**: Rate as low, medium, high, or critical

Format your response in clean markdown with proper sections. Be concise but thorough. Focus on actionable insights.

For errors and warnings:
- Identify the root cause when possible
- Suggest specific code fixes or debugging approaches
- Reference common patterns and best practices
- Include links to relevant documentation when helpful

For info and debug logs:
- Explain what the code is doing
- Highlight any unusual patterns or values
- Suggest if this is expected behavior or needs investigation

Keep your tone professional but friendly. Assume the reader is a skilled developer who needs quick, accurate insights.`;
  }

  /**
   * Parse AI response into structured explanation
   * Handles both structured and unstructured responses
   */
  /**
   * Parse AI response into structured explanation
   * Handles both structured and unstructured responses from AI models
   * Designed to work with responses of varying quality and structure
   */
  private parseExplanation(text: string): LogExplanation {
    // Input validation and normalization
    if (!text || text.trim().length === 0) {
      return this.createFallbackExplanation();
    }

    const normalizedText = text.trim();
    const sections = this.extractSections(normalizedText);

    return {
      summary: this.extractSummary(sections, normalizedText),
      explanation: this.extractExplanation(sections, normalizedText),
      possibleCauses: this.extractCauses(sections),
      suggestedFixes: this.extractFixes(sections),
      severity: this.extractSeverity(sections, normalizedText),
      technicalDetails: this.extractTechnicalDetails(sections), // New: for devs
      userFriendlyExplanation: this.extractUserFriendlyText(sections), // New: for non-technical
    };
  }

  /**
   * Extract sections from markdown-formatted text
   * Supports various header styles and formats
   */
  private extractSections(text: string): Map<string, string> {
    const sections = new Map<string, string>();
    const lines = text.split("\n");

    let currentSection = "summary";
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match various header formats:
      // # Header, ## Header, **Header**, Header:, ### Header ###
      const headerMatch = line.match(
        /^(?:#{1,6}\s*|\*{1,2})?\s*([^:#*\n]+?)(?:\*{1,2}|:)?\s*$/
      );

      // Check if this looks like a header (short line, possibly followed by content)
      const isLikelyHeader =
        headerMatch &&
        line.length < 100 &&
        (line.match(/^#+/) || line.match(/^\*\*/) || line.endsWith(":")) &&
        !line.match(/^\s*[-*]\s/) && // Not a list item
        !line.match(/^\d+\./); // Not a numbered list

      if (isLikelyHeader && headerMatch) {
        // Save previous section
        if (currentContent.length > 0) {
          const content = currentContent.join("\n").trim();
          if (content) {
            sections.set(currentSection, content);
          }
        }

        // Normalize section name
        currentSection = this.normalizeSectionName(headerMatch[1]);
        currentContent = [];
      } else if (line.trim()) {
        // Add non-empty lines to current section
        currentContent.push(line);
      } else if (currentContent.length > 0) {
        // Preserve single blank lines within sections
        currentContent.push("");
      }
    }

    // Save final section
    if (currentContent.length > 0) {
      const content = currentContent.join("\n").trim();
      if (content) {
        sections.set(currentSection, content);
      }
    }

    return sections;
  }

  /**
   * Normalize section names to standard keys
   * Handles various ways users might name sections
   */
  private normalizeSectionName(name: string): string {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "")
      .trim();

    // Map common variations to standard names
    const sectionMap: Record<string, string> = {
      // Summary variations
      summary: "summary",
      overview: "summary",
      tldr: "summary",
      brief: "summary",
      short: "summary",
      quick: "summary",

      // Explanation variations
      explanation: "explanation",
      details: "explanation",
      whatshappening: "explanation",
      description: "explanation",
      technical: "technical",
      technicaldetails: "technical",

      // Causes variations
      possiblecauses: "causes",
      causes: "causes",
      reasons: "causes",
      why: "causes",
      whythishappened: "causes",
      rootcause: "causes",

      // Fixes variations
      suggestedfixes: "fixes",
      fixes: "fixes",
      solutions: "fixes",
      recommendations: "fixes",
      howtoresolve: "fixes",
      nextsteps: "fixes",
      action: "fixes",
      actionitems: "fixes",

      // Severity variations
      severity: "severity",
      priority: "severity",
      impact: "severity",
      urgency: "severity",

      // User-friendly variations
      simpleexplanation: "userfriendly",
      nontechnical: "userfriendly",
      plainenglish: "userfriendly",
      easyexplanation: "userfriendly",
    };

    return sectionMap[normalized] || normalized;
  }

  /**
   * Extract summary with multiple fallback strategies
   */
  private extractSummary(
    sections: Map<string, string>,
    fullText: string
  ): string {
    // Try standard section names
    const summary =
      sections.get("summary") ||
      sections.get("overview") ||
      sections.get("brief");

    if (summary) {
      return this.cleanAndTruncate(summary, 200);
    }

    // Fallback: use first meaningful sentence
    const firstSentence = fullText
      .split(/[.!?]\s+/)
      .find((s) => s.trim().length > 20);

    if (firstSentence) {
      return this.cleanAndTruncate(firstSentence, 200);
    }

    // Last resort: truncate first paragraph
    const firstParagraph = fullText.split("\n\n")[0];
    return this.cleanAndTruncate(firstParagraph, 200);
  }

  /**
   * Extract detailed explanation
   */
  private extractExplanation(
    sections: Map<string, string>,
    fullText: string
  ): string {
    const explanation =
      sections.get("explanation") ||
      sections.get("details") ||
      sections.get("description");

    // If we have a dedicated explanation section, use it
    if (explanation && explanation.length > 50) {
      return explanation;
    }

    // Otherwise, use the full text (it's already an explanation)
    return fullText;
  }

  /**
   * Extract technical details section (for developers)
   */
  private extractTechnicalDetails(
    sections: Map<string, string>
  ): string | undefined {
    const technical =
      sections.get("technical") || sections.get("technicaldetails");
    return technical && technical.length > 0 ? technical : undefined;
  }

  /**
   * Extract user-friendly explanation (for non-technical users)
   */
  private extractUserFriendlyText(
    sections: Map<string, string>
  ): string | undefined {
    const friendly = sections.get("userfriendly") || sections.get("simple");
    return friendly && friendly.length > 0 ? friendly : undefined;
  }

  /**
   * Extract possible causes with improved list detection
   */
  private extractCauses(sections: Map<string, string>): string[] | undefined {
    const causesText = sections.get("causes") || sections.get("reasons") || "";

    if (!causesText) return undefined;

    const causes = this.extractList(causesText);
    return causes.length > 0 ? causes : undefined;
  }

  /**
   * Extract suggested fixes with improved list detection
   */
  private extractFixes(sections: Map<string, string>): string[] | undefined {
    const fixesText =
      sections.get("fixes") ||
      sections.get("solutions") ||
      sections.get("recommendations") ||
      "";

    if (!fixesText) return undefined;

    const fixes = this.extractList(fixesText);
    return fixes.length > 0 ? fixes : undefined;
  }

  /**
   * Extract severity with context-aware detection
   */
  private extractSeverity(
    sections: Map<string, string>,
    fullText: string
  ): LogExplanation["severity"] {
    // Check dedicated severity section first
    const severitySection = sections.get("severity") || "";
    const severityText = (severitySection + " " + fullText).toLowerCase();

    // Priority order: critical > high > low > medium (default)
    if (
      this.matchesSeverity(severityText, [
        "critical",
        "severe",
        "urgent",
        "emergency",
      ])
    ) {
      return "critical";
    }
    if (
      this.matchesSeverity(severityText, [
        "high",
        "major",
        "important",
        "serious",
      ])
    ) {
      return "high";
    }
    if (
      this.matchesSeverity(severityText, [
        "low",
        "minor",
        "trivial",
        "cosmetic",
      ])
    ) {
      return "low";
    }

    // Default to medium if no clear indicators
    return "medium";
  }

  /**
   * Check if text matches any severity keywords
   */
  private matchesSeverity(text: string, keywords: string[]): boolean {
    return keywords.some(
      (keyword) =>
        text.includes(keyword) ||
        text.includes(`${keyword} severity`) ||
        text.includes(`${keyword} priority`)
    );
  }

  /**
   * Clean text and truncate to max length
   */
  private cleanAndTruncate(text: string, maxLength: number): string {
    const cleaned = text
      .replace(/^[#*\s]+/, "") // Remove leading markdown
      .replace(/\*\*/g, "") // Remove bold markers
      .trim();

    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Truncate at word boundary
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    return lastSpace > maxLength * 0.8
      ? truncated.substring(0, lastSpace) + "..."
      : truncated + "...";
  }

  /**
   * Create fallback explanation when parsing fails
   */
  private createFallbackExplanation(): LogExplanation {
    return {
      summary: "Unable to analyze log",
      explanation:
        "No valid explanation could be extracted from the AI response.",
      severity: "medium",
    };
  }

  /**
   * Extract list items from text with improved detection
   * Handles: bullet points, numbered lists, dashed lists, and inline lists
   */

  private extractList(text: string): string[] {
    if (!text || text.trim().length === 0) return [];

    const items: string[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match various list formats:
      // - Item, * Item, • Item, 1. Item, 1) Item
      const listMatch = trimmed.match(/^(?:[-*•]|\d+[.):])\s+(.+)$/);

      if (listMatch) {
        const item = listMatch[1].trim();
        if (item.length > 0) {
          items.push(item);
        }
      } else if (items.length === 0 && trimmed.length > 10) {
        // If no list markers found, treat as a single item (paragraph format)
        // But only if we haven't found any items yet
        items.push(trimmed);
      }
    }

    // Fallback: if no list items found, try to split by common delimiters
    if (items.length === 0 && text.length > 0) {
      const splitItems = text
        .split(/[,;]\s+(?=[A-Z])/) // Split on comma/semicolon followed by capital
        .map((item) => item.trim())
        .filter((item) => item.length > 10);

      if (splitItems.length > 1) {
        return splitItems;
      }
    }

    return items;
  }
}

/**
 * Create log explainer from settings
 */
export function createLogExplainer(settings: AISettings): LogExplainer {
  return new LogExplainer(settings);
}
