/**
 * Network Context Generator Service
 * Transforms network request data into various formats: Markdown, Text, JSON, YAML
 * Used for exporting network context for debugging, issue creation, or AI analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export interface NetworkData {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
  type?: string;
  graphql?: {
    operationName?: string;
    operation?: string;
    query?: string;
    variables?: Record<string, any>;
  };
}

export type ContextFormat = "markdown" | "text" | "json" | "yaml" | "copilot";

export interface GeneratedContext {
  format: ContextFormat;
  content: string;
  label: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusText(status?: number, error?: string): string {
  if (error) return `Error: ${error}`;
  if (!status) return "Pending";
  if (status >= 200 && status < 300) return `${status} OK`;
  if (status >= 300 && status < 400) return `${status} Redirect`;
  if (status >= 400 && status < 500) return `${status} Client Error`;
  if (status >= 500) return `${status} Server Error`;
  return String(status);
}

function formatDurationText(duration?: number): string {
  if (!duration) return "—";
  if (duration < 1000) return `${Math.round(duration)}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
}

function truncateBody(body: any, maxLength: number = 2000): string {
  if (!body) return "";
  const str = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "\n... (truncated)";
}

// ============================================================================
// FORMAT GENERATORS
// ============================================================================

/**
 * Generate Markdown formatted network context
 */
function generateMarkdown(request: NetworkData): string {
  const parts: string[] = [];

  // Header
  parts.push(`# Network Request Report`);
  parts.push("");
  parts.push(`**Method:** \`${request.method}\``);
  parts.push(`**Status:** ${getStatusText(request.status, request.error)}`);
  parts.push(`**Duration:** ${formatDurationText(request.duration)}`);
  parts.push(`**Timestamp:** ${new Date(request.timestamp).toISOString()}`);
  if (request.type) {
    parts.push(`**Type:** ${request.type}`);
  }
  parts.push("");

  // URL
  parts.push("## URL");
  parts.push("```");
  parts.push(request.url);
  parts.push("```");
  parts.push("");

  // GraphQL Info
  if (request.graphql) {
    parts.push("## GraphQL Operation");
    if (request.graphql.operationName) {
      parts.push(`**Operation Name:** ${request.graphql.operationName}`);
    }
    if (request.graphql.operation) {
      parts.push(`**Operation Type:** ${request.graphql.operation}`);
    }
    if (request.graphql.query) {
      parts.push("");
      parts.push("**Query:**");
      parts.push("```graphql");
      parts.push(request.graphql.query);
      parts.push("```");
    }
    if (request.graphql.variables) {
      parts.push("");
      parts.push("**Variables:**");
      parts.push("```json");
      parts.push(JSON.stringify(request.graphql.variables, null, 2));
      parts.push("```");
    }
    parts.push("");
  }

  // Error
  if (request.error) {
    parts.push("## ❌ Error");
    parts.push("```");
    parts.push(request.error);
    parts.push("```");
    parts.push("");
  }

  // Request Headers
  if (
    request.requestHeaders &&
    Object.keys(request.requestHeaders).length > 0
  ) {
    parts.push("## Request Headers");
    parts.push("```json");
    parts.push(JSON.stringify(request.requestHeaders, null, 2));
    parts.push("```");
    parts.push("");
  }

  // Request Body
  if (request.requestBody) {
    parts.push("## Request Body");
    parts.push("```json");
    parts.push(truncateBody(request.requestBody));
    parts.push("```");
    parts.push("");
  }

  // Response Headers
  if (
    request.responseHeaders &&
    Object.keys(request.responseHeaders).length > 0
  ) {
    parts.push("## Response Headers");
    parts.push("```json");
    parts.push(JSON.stringify(request.responseHeaders, null, 2));
    parts.push("```");
    parts.push("");
  }

  // Response Body
  if (request.responseBody) {
    parts.push("## Response Body");
    parts.push("```json");
    parts.push(truncateBody(request.responseBody));
    parts.push("```");
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Generate plain text formatted network context
 */
function generateText(request: NetworkData): string {
  const parts: string[] = [];
  const divider = "─".repeat(50);

  parts.push("NETWORK REQUEST REPORT");
  parts.push(divider);
  parts.push("");
  parts.push(`Method: ${request.method}`);
  parts.push(`Status: ${getStatusText(request.status, request.error)}`);
  parts.push(`Duration: ${formatDurationText(request.duration)}`);
  parts.push(`Timestamp: ${new Date(request.timestamp).toISOString()}`);
  if (request.type) {
    parts.push(`Type: ${request.type}`);
  }
  parts.push("");

  parts.push("URL:");
  parts.push(request.url);
  parts.push("");

  if (request.graphql) {
    parts.push("GRAPHQL OPERATION:");
    if (request.graphql.operationName) {
      parts.push(`  Operation Name: ${request.graphql.operationName}`);
    }
    if (request.graphql.operation) {
      parts.push(`  Operation Type: ${request.graphql.operation}`);
    }
    if (request.graphql.query) {
      parts.push("  Query:");
      request.graphql.query.split("\n").forEach((line) => {
        parts.push(`    ${line}`);
      });
    }
    parts.push("");
  }

  if (request.error) {
    parts.push("ERROR:");
    parts.push(request.error);
    parts.push("");
  }

  if (
    request.requestHeaders &&
    Object.keys(request.requestHeaders).length > 0
  ) {
    parts.push("REQUEST HEADERS:");
    Object.entries(request.requestHeaders).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
    parts.push("");
  }

  if (request.requestBody) {
    parts.push("REQUEST BODY:");
    parts.push(truncateBody(request.requestBody));
    parts.push("");
  }

  if (
    request.responseHeaders &&
    Object.keys(request.responseHeaders).length > 0
  ) {
    parts.push("RESPONSE HEADERS:");
    Object.entries(request.responseHeaders).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
    parts.push("");
  }

  if (request.responseBody) {
    parts.push("RESPONSE BODY:");
    parts.push(truncateBody(request.responseBody));
    parts.push("");
  }

  parts.push(divider);

  return parts.join("\n");
}

/**
 * Generate JSON formatted network context
 */
function generateJSON(request: NetworkData): string {
  const data = {
    report: {
      generatedAt: new Date().toISOString(),
      type: "network_request",
    },
    request: {
      method: request.method,
      url: request.url,
      status: request.status || null,
      statusText: getStatusText(request.status, request.error),
      duration: request.duration || null,
      durationText: formatDurationText(request.duration),
      timestamp: request.timestamp,
      timestampISO: new Date(request.timestamp).toISOString(),
      type: request.type || null,
      error: request.error || null,
      graphql: request.graphql || null,
      requestHeaders: request.requestHeaders || null,
      requestBody: request.requestBody || null,
      responseHeaders: request.responseHeaders || null,
      responseBody: request.responseBody || null,
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Generate YAML formatted network context
 */
function generateYAML(request: NetworkData): string {
  const parts: string[] = [];

  parts.push("# Network Request Report");
  parts.push("report:");
  parts.push(`  generatedAt: "${new Date().toISOString()}"`);
  parts.push("  type: network_request");
  parts.push("");
  parts.push("request:");
  parts.push(`  method: ${request.method}`);
  parts.push(`  url: "${request.url}"`);
  parts.push(`  status: ${request.status || "null"}`);
  parts.push(`  statusText: "${getStatusText(request.status, request.error)}"`);
  parts.push(`  duration: ${request.duration || "null"}`);
  parts.push(`  durationText: "${formatDurationText(request.duration)}"`);
  parts.push(`  timestamp: ${request.timestamp}`);
  parts.push(`  timestampISO: "${new Date(request.timestamp).toISOString()}"`);

  if (request.type) {
    parts.push(`  type: ${request.type}`);
  }

  if (request.error) {
    parts.push(`  error: "${request.error.replace(/"/g, '\\"')}"`);
  }

  if (request.graphql) {
    parts.push("  graphql:");
    if (request.graphql.operationName) {
      parts.push(`    operationName: "${request.graphql.operationName}"`);
    }
    if (request.graphql.operation) {
      parts.push(`    operation: "${request.graphql.operation}"`);
    }
    if (request.graphql.query) {
      parts.push("    query: |");
      request.graphql.query.split("\n").forEach((line) => {
        parts.push(`      ${line}`);
      });
    }
  }

  if (
    request.requestHeaders &&
    Object.keys(request.requestHeaders).length > 0
  ) {
    parts.push("  requestHeaders:");
    Object.entries(request.requestHeaders).forEach(([key, value]) => {
      parts.push(`    "${key}": "${value.replace(/"/g, '\\"')}"`);
    });
  }

  if (request.requestBody) {
    parts.push("  requestBody: |");
    truncateBody(request.requestBody)
      .split("\n")
      .forEach((line) => {
        parts.push(`    ${line}`);
      });
  }

  if (
    request.responseHeaders &&
    Object.keys(request.responseHeaders).length > 0
  ) {
    parts.push("  responseHeaders:");
    Object.entries(request.responseHeaders).forEach(([key, value]) => {
      parts.push(`    "${key}": "${value.replace(/"/g, '\\"')}"`);
    });
  }

  if (request.responseBody) {
    parts.push("  responseBody: |");
    truncateBody(request.responseBody)
      .split("\n")
      .forEach((line) => {
        parts.push(`    ${line}`);
      });
  }

  return parts.join("\n");
}

/**
 * Generate Copilot-optimized prompt format
 * Designed to be pasted directly into GitHub Copilot or other AI assistants
 */
function generateCopilotPrompt(request: NetworkData): string {
  const parts: string[] = [];
  const isError = request.error || (request.status && request.status >= 400);

  parts.push(
    isError
      ? "I need help debugging this failed network request. Please analyze and provide:"
      : "I need help understanding this network request. Please analyze and provide:"
  );
  parts.push("1. What this request is doing");
  parts.push("2. Any potential issues or optimizations");
  parts.push("3. Suggested improvements if applicable");
  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push(`**Method:** ${request.method}`);
  parts.push(`**Status:** ${getStatusText(request.status, request.error)}`);
  parts.push(`**Duration:** ${formatDurationText(request.duration)}`);
  parts.push("");
  parts.push("**URL:**");
  parts.push("```");
  parts.push(request.url);
  parts.push("```");

  if (request.error) {
    parts.push("");
    parts.push("**Error:**");
    parts.push("```");
    parts.push(request.error);
    parts.push("```");
  }

  if (request.graphql) {
    parts.push("");
    parts.push("**GraphQL Operation:**");
    if (request.graphql.operationName) {
      parts.push(`- Operation: ${request.graphql.operationName}`);
    }
    if (request.graphql.query) {
      parts.push("```graphql");
      parts.push(request.graphql.query);
      parts.push("```");
    }
  }

  if (request.requestBody) {
    parts.push("");
    parts.push("**Request Body:**");
    parts.push("```json");
    parts.push(truncateBody(request.requestBody, 1000));
    parts.push("```");
  }

  if (request.responseBody) {
    parts.push("");
    parts.push("**Response Body:**");
    parts.push("```json");
    parts.push(truncateBody(request.responseBody, 1000));
    parts.push("```");
  }

  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push(
    isError
      ? "Please help me understand why this request failed and how to fix it."
      : "Please help me understand this request and suggest any improvements."
  );

  return parts.join("\n");
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate network context in the specified format
 */
export function generateNetworkContext(
  request: NetworkData,
  format: ContextFormat
): GeneratedContext {
  let content: string;
  let label: string;

  switch (format) {
    case "markdown":
      content = generateMarkdown(request);
      label = "Markdown";
      break;
    case "text":
      content = generateText(request);
      label = "Plain Text";
      break;
    case "json":
      content = generateJSON(request);
      label = "JSON";
      break;
    case "yaml":
      content = generateYAML(request);
      label = "YAML";
      break;
    case "copilot":
      content = generateCopilotPrompt(request);
      label = "Copilot Prompt";
      break;
    default:
      content = generateText(request);
      label = "Plain Text";
  }

  return { format, content, label };
}

/**
 * Get all available format options
 */
export function getNetworkFormatOptions(): Array<{
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
 * Copy network context to clipboard
 */
export async function copyNetworkContext(
  request: NetworkData,
  format: ContextFormat
): Promise<boolean> {
  try {
    const { content } = generateNetworkContext(request, format);
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    // Fallback to textarea method
    try {
      const { content } = generateNetworkContext(request, format);
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
 * Download network context as a file
 */
export function downloadNetworkContext(
  request: NetworkData,
  format: ContextFormat
): void {
  const { content } = generateNetworkContext(request, format);

  const extensions: Record<ContextFormat, string> = {
    markdown: "md",
    text: "txt",
    json: "json",
    yaml: "yaml",
    copilot: "md",
  };

  const extension = extensions[format];
  const statusLabel = request.status ? `-${request.status}` : "";
  const filename = `network-${request.method.toLowerCase()}${statusLabel}-${Date.now()}.${extension}`;

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
