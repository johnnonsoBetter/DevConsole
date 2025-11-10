/**
 * useGitHubIssueGenerator
 *
 * React hook that uses Chrome's Prompt API to improve and enhance
 * GitHub issue content (title and body).
 *
 * Features:
 * - Improves issue titles for clarity
 * - Enhances issue descriptions
 * - Formats markdown properly
 * - Suggests labels based on content
 * - Uses optional context (logs, stack traces) to generate better issues
 */

import { useCallback, useState } from "react";
import { usePromptModel } from "./usePromptModel";

export interface GitHubIssueInput {
  title?: string;
  body?: string;
  context?: string; // Optional context like log messages, stack traces, etc.
}

export interface GeneratedIssue {
  title: string;
  body: string;
  labels?: string[];
}

const GITHUB_ISSUE_SYSTEM_PROMPT = `You are an expert at creating clear, actionable GitHub issues.

Your task is to improve or generate GitHub issues based on the provided information.

**If title is provided:**
- Improve it to be concise (max 80 characters), descriptive, and action-oriented
- Example: "API timeout error" → "Fix API timeout when creating campaigns"

**If body is provided:**
- Enhance it with proper structure and markdown formatting
- Preserve existing technical details

**If context is provided (logs, errors, stack traces):**
- Extract the key issue from the context
- Generate a clear title describing the problem
- Format the body to include:
  1. **Description**: What the issue is about
  2. **Error Details**: Extract error messages in code blocks
  3. **Stack Trace**: Format stack traces in code blocks (if present)
  4. **Steps to Reproduce**: Infer from context if possible
  5. **Expected vs Actual Behavior**
  6. **Technical Context**: File names, line numbers, relevant details

**Formatting Rules:**
- Use GitHub Flavored Markdown
- Wrap code/errors in \`\`\` code blocks with language identifier
- Use **bold** for emphasis
- Use \`inline code\` for file names, variables, functions
- Use bullet points (-) for lists
- Use numbered lists (1. 2. 3.) for sequential steps

Format your response as JSON:
{
  "title": "Brief, descriptive title (max 80 chars)",
  "body": "Full markdown-formatted issue body",
  "labels": ["bug", "needs-triage"]
}

**Important:**
- Remove sensitive information (API keys, tokens, passwords, URLs with credentials)
- Be concise but thorough
- Focus on actionable information
- Suggest appropriate labels (bug, enhancement, documentation, performance, etc.)`;

export function useGitHubIssueGenerator() {
  const {
    availability,
    isAvailable,
    isDownloading,
    downloadProgress,
    error: promptError,
    createSession,
  } = usePromptModel();

  const [generating, setGenerating] = useState(false);
  const [generatedIssue, setGeneratedIssue] = useState<GeneratedIssue | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate or improve a GitHub issue from the provided input
   */
  const generateIssue = useCallback(
    async (input: GitHubIssueInput): Promise<GeneratedIssue | null> => {
      if (!isAvailable && availability !== "downloadable") {
        setError("AI features are not available in this browser");
        return null;
      }

      setGenerating(true);
      setError(null);
      setGeneratedIssue(null);

      try {
        // Create a session with the GitHub issue system prompt
        const session = await createSession(GITHUB_ISSUE_SYSTEM_PROMPT);

        // Build the user prompt with the provided input
        const userPrompt = buildUserPrompt(input);

        // Generate the issue
        const response = await session.prompt(userPrompt);

        // Parse the JSON response
        let issue: GeneratedIssue;
        try {
          // Try to extract JSON from markdown code blocks if present
          const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : response;
          issue = JSON.parse(jsonString);
        } catch (parseError) {
          console.warn("Failed to parse JSON response, using fallback format", parseError);
          // Fallback: use the input or create defaults
          issue = {
            title: input.title || "Issue from DevConsole",
            body: input.body || response,
            labels: ["needs-triage"],
          };
        }

        setGeneratedIssue(issue);
        session.destroy?.();
        return issue;
      } catch (err) {
        console.error("Failed to generate GitHub issue:", err);
        const message = err instanceof Error ? err.message : "Failed to generate issue";
        setError(message);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [isAvailable, availability, createSession]
  );

  /**
   * Clear the generated issue and error state
   */
  const clearIssue = useCallback(() => {
    setGeneratedIssue(null);
    setError(null);
  }, []);

  return {
    // State
    generating,
    generatedIssue,
    error: error || promptError,

    // Prompt API state
    availability,
    isAvailable,
    isDownloading,
    downloadProgress,

    // Actions
    generateIssue,
    clearIssue,
  };
}

/**
 * Build a user prompt from the issue input
 */
function buildUserPrompt(input: GitHubIssueInput): string {
  const parts: string[] = [];

  // Add title if provided
  if (input.title) {
    parts.push(`## Current Title\n${input.title}`);
  }

  // Add body if provided
  if (input.body) {
    parts.push(`## Current Body\n${input.body}`);
  }

  // Add context if provided (logs, stack traces, error messages)
  if (input.context) {
    parts.push(`## Context (Logs/Errors/Stack Traces)\n${input.context}`);
  }

  // If nothing provided, return default
  if (parts.length === 0) {
    return "Generate a GitHub issue template for a general bug report.";
  }

  // Determine the instruction based on what's provided
  let instruction = "";
  
  if (input.context && !input.title && !input.body) {
    // Only context provided - generate from scratch
    instruction = "Analyze the following context (logs, errors, stack traces) and generate a comprehensive GitHub issue:";
  } else if (input.title && input.body && input.context) {
    // All provided - enhance everything
    instruction = "Improve the following GitHub issue using the additional context provided:";
  } else if (input.title && input.body) {
    // Title and body only - improve both
    instruction = "Improve the following GitHub issue title and body:";
  } else if (input.title && input.context) {
    // Title and context - improve title and generate body from context
    instruction = "Improve the title and generate a comprehensive body from the context:";
  } else if (input.body && input.context) {
    // Body and context - generate title and enhance body
    instruction = "Generate a title and enhance the body using the context:";
  } else if (input.title) {
    // Title only - improve and generate body
    instruction = "Improve the following GitHub issue title and generate a comprehensive body:";
  } else if (input.body) {
    // Body only - generate title and improve body
    instruction = "Generate a title and improve the following GitHub issue body:";
  }

  return `${instruction}\n\n${parts.join("\n\n")}`;
}
