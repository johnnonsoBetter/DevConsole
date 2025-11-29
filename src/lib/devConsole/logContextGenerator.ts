/**
 * Log Context Generator Service
 * Transforms log data into various formats: Markdown, Text, JSON, YAML
 * Used for exporting log context for debugging, issue creation, or AI analysis
 */

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
  context?: string;
}

export type ContextFormat = "markdown" | "text" | "json" | "yaml" | "copilot";

export interface GeneratedContext {
  format: ContextFormat;
  content: string;
  label: string;
}

// ============================================================================
// FORMAT GENERATORS
// ============================================================================

/**
 * Generate Markdown formatted log context
 */
function generateMarkdown(log: LogData): string {
  const parts: string[] = [];

  // Header
  parts.push(`# Console Log Report`);
  parts.push("");
  parts.push(`**Level:** \`${log.level.toUpperCase()}\``);
  parts.push(`**Timestamp:** ${new Date(log.timestamp).toISOString()}`);
  if (log.context) {
    parts.push(`**Context:** ${log.context}`);
  }
  parts.push("");

  // Message
  parts.push("## Message");
  parts.push("```");
  parts.push(log.message);
  parts.push("```");
  parts.push("");

  // Arguments
  if (log.args && log.args.length > 0) {
    parts.push("## Arguments");
    parts.push("```json");
    parts.push(JSON.stringify(log.args, null, 2));
    parts.push("```");
    parts.push("");
  }

  // Stack Trace
  if (log.stack) {
    parts.push("## Stack Trace");
    parts.push("```");
    parts.push(log.stack);
    parts.push("```");
    parts.push("");
  }

  // Source Location
  if (log.source) {
    parts.push("## Source Location");
    parts.push(`- **File:** \`${log.source.file}\``);
    parts.push(`- **Line:** ${log.source.line}`);
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Generate plain text formatted log context
 */
function generateText(log: LogData): string {
  const parts: string[] = [];
  const divider = "─".repeat(50);

  parts.push("CONSOLE LOG REPORT");
  parts.push(divider);
  parts.push("");
  parts.push(`Level: ${log.level.toUpperCase()}`);
  parts.push(`Timestamp: ${new Date(log.timestamp).toISOString()}`);
  if (log.context) {
    parts.push(`Context: ${log.context}`);
  }
  parts.push("");

  parts.push("MESSAGE:");
  parts.push(log.message);
  parts.push("");

  if (log.args && log.args.length > 0) {
    parts.push("ARGUMENTS:");
    log.args.forEach((arg, i) => {
      const argStr =
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
      parts.push(`  [${i}]: ${argStr}`);
    });
    parts.push("");
  }

  if (log.stack) {
    parts.push("STACK TRACE:");
    parts.push(log.stack);
    parts.push("");
  }

  if (log.source) {
    parts.push("SOURCE:");
    parts.push(`  File: ${log.source.file}`);
    parts.push(`  Line: ${log.source.line}`);
    parts.push("");
  }

  parts.push(divider);

  return parts.join("\n");
}

/**
 * Generate JSON formatted log context
 */
function generateJSON(log: LogData): string {
  const data = {
    report: {
      generatedAt: new Date().toISOString(),
      type: "console_log",
    },
    log: {
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
      timestampISO: new Date(log.timestamp).toISOString(),
      context: log.context || null,
      arguments: log.args || [],
      stackTrace: log.stack || null,
      source: log.source || null,
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Generate YAML formatted log context
 */
function generateYAML(log: LogData): string {
  const parts: string[] = [];

  parts.push("# Console Log Report");
  parts.push("report:");
  parts.push(`  generatedAt: "${new Date().toISOString()}"`);
  parts.push("  type: console_log");
  parts.push("");
  parts.push("log:");
  parts.push(`  level: ${log.level}`);
  parts.push(`  message: |`);
  log.message.split("\n").forEach((line) => {
    parts.push(`    ${line}`);
  });
  parts.push(`  timestamp: ${log.timestamp}`);
  parts.push(`  timestampISO: "${new Date(log.timestamp).toISOString()}"`);

  if (log.context) {
    parts.push(`  context: ${log.context}`);
  }

  if (log.args && log.args.length > 0) {
    parts.push("  arguments:");
    log.args.forEach((arg, i) => {
      if (typeof arg === "object") {
        parts.push(`    - # arg[${i}]`);
        const lines = JSON.stringify(arg, null, 2).split("\n");
        lines.forEach((line) => parts.push(`      ${line}`));
      } else {
        parts.push(`    - "${String(arg).replace(/"/g, '\\"')}"`);
      }
    });
  }

  if (log.stack) {
    parts.push("  stackTrace: |");
    log.stack.split("\n").forEach((line) => {
      parts.push(`    ${line}`);
    });
  }

  if (log.source) {
    parts.push("  source:");
    parts.push(`    file: "${log.source.file}"`);
    parts.push(`    line: ${log.source.line}`);
  }

  return parts.join("\n");
}

/**
 * Generate Copilot-optimized prompt format
 * Designed to be pasted directly into GitHub Copilot or other AI assistants
 */
function generateCopilotPrompt(log: LogData): string {
  const parts: string[] = [];

  parts.push(
    "I need help debugging this console log/error. Please analyze and provide:"
  );
  parts.push("1. What is likely causing this issue");
  parts.push("2. Step-by-step debugging approach");
  parts.push("3. Suggested code fix if applicable");
  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push(`**Log Level:** ${log.level.toUpperCase()}`);
  parts.push("");
  parts.push("**Message:**");
  parts.push("```");
  parts.push(log.message);
  parts.push("```");

  if (log.args && log.args.length > 0) {
    parts.push("");
    parts.push("**Arguments:**");
    parts.push("```json");
    parts.push(JSON.stringify(log.args, null, 2));
    parts.push("```");
  }

  if (log.stack) {
    parts.push("");
    parts.push("**Stack Trace:**");
    parts.push("```");
    parts.push(log.stack);
    parts.push("```");
  }

  if (log.source) {
    parts.push("");
    parts.push(`**Source:** \`${log.source.file}:${log.source.line}\``);
  }

  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push("Please help me understand and fix this issue.");

  return parts.join("\n");
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate log context in the specified format
 */
export function generateLogContext(
  log: LogData,
  format: ContextFormat
): GeneratedContext {
  let content: string;
  let label: string;

  switch (format) {
    case "markdown":
      content = generateMarkdown(log);
      label = "Markdown";
      break;
    case "text":
      content = generateText(log);
      label = "Plain Text";
      break;
    case "json":
      content = generateJSON(log);
      label = "JSON";
      break;
    case "yaml":
      content = generateYAML(log);
      label = "YAML";
      break;
    case "copilot":
      content = generateCopilotPrompt(log);
      label = "Copilot Prompt";
      break;
    default:
      content = generateText(log);
      label = "Plain Text";
  }

  return { format, content, label };
}

/**
 * Get all available format options
 */
export function getFormatOptions(): Array<{
  value: ContextFormat;
  label: string;
  description: string;
}> {
  return [
    {
      value: "markdown",
      label: "Markdown",
      description: "GitHub-ready markdown format",
    },
    { value: "text", label: "Plain Text", description: "Simple text format" },
    { value: "json", label: "JSON", description: "Structured JSON data" },
    { value: "yaml", label: "YAML", description: "Human-readable YAML format" },
    {
      value: "copilot",
      label: "AI Prompt",
      description: "Optimized for AI assistants",
    },
  ];
}

/**
 * Copy log context to clipboard
 */
export async function copyLogContext(
  log: LogData,
  format: ContextFormat
): Promise<boolean> {
  try {
    const { content } = generateLogContext(log, format);
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    // Fallback to textarea method
    try {
      const { content } = generateLogContext(log, format);
      const textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error("Fallback copy also failed:", fallbackError);
      return false;
    }
  }
}

/**
 * Download log context as a file
 */
export function downloadLogContext(log: LogData, format: ContextFormat): void {
  const { content } = generateLogContext(log, format);

  const extensions: Record<ContextFormat, string> = {
    markdown: "md",
    text: "txt",
    json: "json",
    yaml: "yaml",
    copilot: "md",
  };

  const extension = extensions[format];
  const filename = `log-${log.level}-${Date.now()}.${extension}`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
