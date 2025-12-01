// ============================================================================
// ERROR ANALYZER
// Intelligent error pattern detection and contextual insights
// ============================================================================

export interface ErrorInsight {
  category: string;
  title: string;
  description: string;
  suggestions: string[];
  severity: "critical" | "high" | "medium" | "low";
  docsUrl?: string;
}

export interface ParsedStackFrame {
  file: string;
  line: number | null;
  column: number | null;
  functionName: string | null;
  isUserCode: boolean;
  isNodeModules: boolean;
  fullPath: string;
}

export interface EnvironmentSnapshot {
  reactVersion: string;
  route: string;
  browser: string;
  platform: string;
  timestamp: number;
  buildHash?: string;
}

/**
 * Analyze error and provide contextual insights
 */
export function analyzeError(error: Error): ErrorInsight {
  const message = error.message.toLowerCase();
  const name = error.name;

  // ReferenceError patterns
  if (name === "ReferenceError" || message.includes("is not defined")) {
    const match = error.message.match(/(\w+) is not defined/);
    const variable = match?.[1] || "variable";

    return {
      category: "ReferenceError",
      title: "Missing Variable or Import",
      description: `The variable or component '${variable}' is being used but hasn't been declared or imported.`,
      suggestions: [
        `Check if '${variable}' is imported at the top of the file`,
        `Verify the export statement in the source module`,
        `Look for typos in the variable name`,
        `Ensure the dependency is installed (check package.json)`,
      ],
      severity: "high",
      docsUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined",
    };
  }

  // TypeError patterns
  if (name === "TypeError") {
    if (
      message.includes("cannot read propert") ||
      message.includes("cannot read properties of")
    ) {
      return {
        category: "TypeError",
        title: "Null/Undefined Property Access",
        description: "Attempting to access a property on null or undefined.",
        suggestions: [
          "Add optional chaining: obj?.property",
          "Add null checks before accessing properties",
          "Ensure data is loaded before rendering",
          "Use default values or fallbacks",
        ],
        severity: "high",
        docsUrl:
          "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_access_property",
      };
    }

    if (message.includes("is not a function")) {
      return {
        category: "TypeError",
        title: "Not a Function",
        description: "Attempting to call something that isn't a function.",
        suggestions: [
          "Check if the function is properly exported/imported",
          "Verify the function name spelling",
          "Ensure you're not calling a value instead of a function",
          "Check if the module exports the function correctly",
        ],
        severity: "high",
      };
    }
  }

  // Syntax Error
  if (name === "SyntaxError") {
    return {
      category: "SyntaxError",
      title: "Invalid JavaScript Syntax",
      description: "The code contains syntax errors that prevent parsing.",
      suggestions: [
        "Check for missing brackets, parentheses, or braces",
        "Look for trailing commas in older JavaScript environments",
        "Verify JSX syntax is correct",
        "Run your linter (ESLint) to catch syntax issues",
      ],
      severity: "critical",
    };
  }

  // Network/API errors
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("request")
  ) {
    return {
      category: "NetworkError",
      title: "Network Request Failed",
      description: "An API call or network request failed.",
      suggestions: [
        "Check your internet connection",
        "Verify the API endpoint URL is correct",
        "Check CORS settings if calling external APIs",
        "Review network tab in DevConsole",
      ],
      severity: "medium",
    };
  }

  // Default fallback
  return {
    category: "UnknownError",
    title: "Unexpected Error",
    description: error.message || "An unexpected error occurred.",
    suggestions: [
      "Check the stack trace for the source of the error",
      "Review recent code changes",
      "Check browser console for additional errors",
      "Try clearing cache and reloading",
    ],
    severity: "medium",
  };
}

/**
 * Parse stack trace into structured frames
 */
/**
 * Convert URL path to absolute file system path
 */
async function urlToAbsolutePath(urlPath: string): Promise<string> {
  // Remove protocol and domain
  let path = urlPath.replace(/^https?:\/\/[^/]+/, "");

  // Remove query params and hash
  path = path.split("?")[0].split("#")[0];

  // Extract workspace root from the URL path itself
  // Look for patterns like: /@fs/Users/chinonsojohn/Devconsole/Devconsole/web/...
  const fsMatch = path.match(/\/@fs(\/[^?]+)/);
  if (fsMatch) {
    // Already has full absolute path
    return fsMatch[1].split("?")[0];
  }

  // For development URLs without @fs prefix, try to reconstruct the path
  // Assume the current file is in the workspace (we can detect this from window.location)
  const workspaceRoot = await getWorkspaceRoot();

  // If path starts with /src, it's a web file
  if (path.startsWith("/src/")) {
    return `${workspaceRoot}/web${path}`;
  }

  // If path starts with /components, /pages, /layouts etc, add /web/src
  if (path.match(/^\/(components|pages|layouts|lib|hooks|utils)/)) {
    return `${workspaceRoot}/web/src${path}`;
  }

  // Otherwise assume it's relative to web/src
  return `${workspaceRoot}/web/src${path.startsWith("/") ? path : "/" + path}`;
}

/**
 * Get workspace root from browser context
 * This is a best-effort approach since we don't have access to process.cwd() in the browser
 */
async function getWorkspaceRoot(): Promise<string> {
  // Try to extract from error stack traces that might contain @fs paths
  try {
    const error = new Error();
    const stack = error.stack || "";
    const fsMatch = stack.match(/\/@fs(\/[^/]+\/[^/]+\/[^/]+\/[^/]+)/);
    if (fsMatch) {
      // Extract something like /Users/chinonsojohn/Devconsole/Devconsole
      return fsMatch[1];
    }
  } catch (e) {
    // Ignore
  }

  // Fallback: Allow user to configure via chrome.storage
  try {
    const result = await chrome.storage.local.get("devConsole:workspaceRoot");
    if (result["devConsole:workspaceRoot"]) {
      return result["devConsole:workspaceRoot"];
    }
  } catch (e) {
    // Ignore
  }

  // Ultimate fallback - user will need to configure this
  // For now, return empty string and rely on @fs paths
  return "";
}

export async function parseStackTrace(
  stack: string
): Promise<ParsedStackFrame[]> {
  if (!stack) return [];

  const frames: ParsedStackFrame[] = [];
  const lines = stack.split("\n");

  for (const line of lines) {
    // Skip the error message line
    if (!line.trim().startsWith("at ")) continue;

    const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
    if (!match) continue;

    const [, functionName, fullPath, lineStr, columnStr] = match;
    const file = fullPath.split("/").pop() || fullPath;
    const isNodeModules = fullPath.includes("node_modules");
    const isUserCode =
      !isNodeModules && !fullPath.includes("vite") && !fullPath.includes("@fs");

    // Convert URL to absolute file path
    const absolutePath = await urlToAbsolutePath(fullPath);

    frames.push({
      file,
      line: lineStr ? parseInt(lineStr, 10) : null,
      column: columnStr ? parseInt(columnStr, 10) : null,
      functionName: functionName?.trim() || null,
      isUserCode,
      isNodeModules,
      fullPath: absolutePath,
    });
  }

  return frames;
}

/**
 * Group consecutive React internal frames
 */
export function groupStackFrames(
  frames: ParsedStackFrame[]
): Array<ParsedStackFrame | ParsedStackFrame[]> {
  const grouped: Array<ParsedStackFrame | ParsedStackFrame[]> = [];
  let reactInternals: ParsedStackFrame[] = [];

  for (const frame of frames) {
    const isReactInternal =
      frame.file.includes("react-dom") ||
      frame.file.includes("react-refresh") ||
      frame.file.includes("scheduler");

    if (isReactInternal) {
      reactInternals.push(frame);
    } else {
      if (reactInternals.length > 0) {
        grouped.push(reactInternals);
        reactInternals = [];
      }
      grouped.push(frame);
    }
  }

  if (reactInternals.length > 0) {
    grouped.push(reactInternals);
  }

  return grouped;
}

/**
 * Capture environment snapshot
 */
export function captureEnvironmentSnapshot(): EnvironmentSnapshot {
  const react = (window as any).React;
  const reactVersion = react?.version || "unknown";
  const route = window.location.pathname;
  const browser = getBrowserInfo();
  const platform = navigator.platform;

  return {
    reactVersion,
    route,
    browser,
    platform,
    timestamp: Date.now(),
    buildHash: import.meta.env.VITE_GIT_HASH || undefined,
  };
}

/**
 * Get browser information
 */
function getBrowserInfo(): string {
  const ua = navigator.userAgent;

  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match?.[1] || "unknown"}`;
  }
  if (ua.includes("Firefox")) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match?.[1] || "unknown"}`;
  }
  if (ua.includes("Safari") && !ua.includes("Chrome")) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match?.[1] || "unknown"}`;
  }
  if (ua.includes("Edg")) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge ${match?.[1] || "unknown"}`;
  }

  return "Unknown";
}

/**
 * Generate VS Code URI for opening files
 */
export async function generateVSCodeUri(
  filePath: string,
  line?: number,
  column?: number
): Promise<string> {
  // Ensure we have an absolute path
  let absolutePath = filePath;

  // If it's a URL, convert it first
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    absolutePath = await urlToAbsolutePath(filePath);
  }

  // Build vscode:// URI
  let uri = `vscode://file${absolutePath}`;

  if (line) {
    uri += `:${line}`;
    if (column) {
      uri += `:${column}`;
    }
  }

  return uri;
}

/**
 * Generate shareable error report
 */
export function generateErrorReport(
  error: Error,
  errorInfo: React.ErrorInfo | null,
  env: EnvironmentSnapshot,
  insight: ErrorInsight
): string {
  const report = {
    timestamp: new Date(env.timestamp).toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    componentStack: errorInfo?.componentStack,
    environment: env,
    insight: {
      category: insight.category,
      title: insight.title,
      description: insight.description,
      suggestions: insight.suggestions,
    },
  };

  return JSON.stringify(report, null, 2);
}
