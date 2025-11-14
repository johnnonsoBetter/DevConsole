/**
 * Log Explainer Service
 * AI-powered explanation of console logs, errors, and warnings
 */

import type { AISettings } from "../types";
import { createAIClient } from "./aiClient";

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

export interface LogExplanation {
  summary: string;
  explanation: string;
  possibleCauses?: string[];
  suggestedFixes?: string[];
  severity?: "low" | "medium" | "high" | "critical";
  relatedDocs?: Array<{ title: string; url: string }>;
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
  private parseExplanation(text: string): LogExplanation {
    // Try to extract structured sections from markdown
    const sections: Record<string, string> = {};
    let currentSection = "summary";
    let currentContent: string[] = [];

    const lines = text.split("\n");

    for (const line of lines) {
      const headerMatch = line.match(/^#+\s*\*?\*?([^*]+)\*?\*?/i);
      if (headerMatch) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        // Start new section
        currentSection = headerMatch[1].toLowerCase().replace(/[^a-z]/g, "");
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save final section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join("\n").trim();
    }

    // Extract structured data
    const summary =
      sections["summary"] ||
      sections["what"] ||
      text.split("\n")[0] ||
      "Log analyzed";

    const explanation =
      sections["explanation"] ||
      sections["details"] ||
      sections["technical"] ||
      text;

    // Parse lists
    const possibleCauses = this.extractList(
      sections["possiblecauses"] ||
        sections["causes"] ||
        sections["reasons"] ||
        ""
    );

    const suggestedFixes = this.extractList(
      sections["suggestedfixes"] ||
        sections["fixes"] ||
        sections["solutions"] ||
        sections["recommendations"] ||
        ""
    );

    // Extract severity
    const severityText = (
      sections["severity"] ||
      sections["severityassessment"] ||
      ""
    ).toLowerCase();
    let severity: LogExplanation["severity"] = "medium";
    if (severityText.includes("critical")) severity = "critical";
    else if (severityText.includes("high")) severity = "high";
    else if (severityText.includes("low")) severity = "low";

    return {
      summary: summary.substring(0, 200), // Limit summary length
      explanation,
      possibleCauses: possibleCauses.length > 0 ? possibleCauses : undefined,
      suggestedFixes: suggestedFixes.length > 0 ? suggestedFixes : undefined,
      severity,
    };
  }

  /**
   * Extract bulleted/numbered list from text
   */
  private extractList(text: string): string[] {
    if (!text) return [];

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines
      .filter((line) => {
        // Match bullets (-, *, •) or numbers (1., 2.)
        return /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line);
      })
      .map((line) => {
        // Remove bullet/number prefix
        return line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "");
      });
  }
}

/**
 * Create log explainer from settings
 */
export function createLogExplainer(settings: AISettings): LogExplainer {
  return new LogExplainer(settings);
}
