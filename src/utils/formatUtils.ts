/**
 * Formatting Utilities for DevConsole
 * Provides consistent formatting for durations, sizes, timestamps, and other data
 */

// ============================================================================
// DURATION FORMATTING
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 * - < 1ms: show microseconds
 * - < 1000ms: show milliseconds with 0-1 decimal places
 * - >= 1000ms: show seconds with 1-2 decimal places
 *
 * @example
 * formatDuration(0.523) // "523μs"
 * formatDuration(45.2) // "45ms"
 * formatDuration(1289.9) // "1.29s"
 * formatDuration(12345) // "12.35s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${Math.round(ms * 1000)}μs`;
  }

  if (ms < 1000) {
    // For sub-second durations, show 0 decimals if whole number, else 1 decimal
    return ms % 1 === 0 ? `${ms}ms` : `${ms.toFixed(1)}ms`;
  }

  const seconds = ms / 1000;
  // For durations over 1s, show up to 2 decimals, trim trailing zeros
  return `${parseFloat(seconds.toFixed(2))}s`;
}

/**
 * Get performance status based on duration
 * Used for color coding and status indicators
 */
export function getDurationStatus(
  ms: number,
  thresholds: { fast?: number; normal?: number; slow?: number } = {}
): "fast" | "normal" | "slow" | "critical" {
  const { fast = 100, normal = 500, slow = 1000 } = thresholds;

  if (ms < fast) return "fast";
  if (ms < normal) return "normal";
  if (ms < slow) return "slow";
  return "critical";
}

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Format bytes to human-readable size
 * @example
 * formatBytes(1234) // "1.2 KB"
 * formatBytes(1234567) // "1.2 MB"
 * formatBytes(1234567890) // "1.2 GB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);
  // Show 1 decimal place for values >= 10, 2 decimals for < 10
  const decimals = value >= 10 ? 1 : 2;

  return `${parseFloat(value.toFixed(decimals))} ${sizes[i]}`;
}

// ============================================================================
// URL FORMATTING
// ============================================================================

/**
 * Extract pathname from URL, removing domain and query params
 * Useful for displaying concise endpoint names
 *
 * @example
 * formatEndpoint("https://api.example.com/v1/users/123?token=abc")
 * // "/v1/users/123"
 */
export function formatEndpoint(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Get domain from URL
 * @example
 * getDomain("https://api.example.com/v1/users") // "api.example.com"
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

/**
 * Truncate URL intelligently - keep important parts
 * Shows start and end of URL with ellipsis in middle if too long
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;

  const endpoint = formatEndpoint(url);
  if (endpoint.length <= maxLength) return endpoint;

  // Show beginning and end
  const charsToShow = maxLength - 3; // Reserve 3 for "..."
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return `${endpoint.slice(0, frontChars)}...${endpoint.slice(-backChars)}`;
}

// ============================================================================
// SOURCE FILE FORMATTING
// ============================================================================

/**
 * Format source location (file:line:column) for display
 * Extracts just the filename and removes long paths
 *
 * @example
 * formatSource("chrome-extension://abc123/src/hook-logic.js", 42, 10)
 * // "hook-logic.js:42"
 */
export function formatSource(
  file?: string,
  line?: number,
  _column?: number
): string {
  if (!file) return "—";

  // Extract filename from path
  const filename = file.split("/").pop()?.split("?")[0] || file;

  // Build output
  const parts = [filename];
  if (line !== undefined) parts.push(String(line));

  return parts.join(":");
}

/**
 * Check if source is user code (not from node_modules or extension internals)
 */
export function isUserCode(file?: string): boolean {
  if (!file) return false;

  const excludedPatterns = [
    "node_modules",
    "chrome-extension://",
    "moz-extension://",
    "@fs",
    "vite",
    "webpack",
  ];

  return !excludedPatterns.some((pattern) => file.includes(pattern));
}

// ============================================================================
// STATUS CODE HELPERS
// ============================================================================

/**
 * Get HTTP status category
 */
export function getStatusCategory(
  status: number
):
  | "info"
  | "success"
  | "redirect"
  | "client-error"
  | "server-error"
  | "unknown" {
  if (status >= 100 && status < 200) return "info";
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client-error";
  if (status >= 500 && status < 600) return "server-error";
  return "unknown";
}

/**
 * Get icon for HTTP status
 */
export function getStatusIcon(status: number): string {
  const category = getStatusCategory(status);

  switch (category) {
    case "success":
      return "✓";
    case "redirect":
      return "↻";
    case "client-error":
      return "⚠";
    case "server-error":
      return "✕";
    default:
      return "•";
  }
}

// ============================================================================
// LOG LEVEL HELPERS
// ============================================================================

/**
 * Get icon for log level
 */
export function getLogLevelIcon(level: string): string {
  switch (level.toLowerCase()) {
    case "error":
      return "✕";
    case "warn":
      return "⚠";
    case "info":
      return "ℹ";
    case "debug":
      return "🐛";
    case "log":
      return "•";
    default:
      return "○";
  }
}

/**
 * Get emoji for log level (alternative to icons)
 */
export function getLogLevelEmoji(level: string): string {
  switch (level.toLowerCase()) {
    case "error":
      return "🔴";
    case "warn":
      return "⚠️";
    case "info":
      return "🔵";
    case "debug":
      return "🟣";
    case "log":
      return "⚪";
    default:
      return "⚫";
  }
}

// ============================================================================
// TIMESTAMP FORMATTING
// ============================================================================

/**
 * Format timestamp with options for display mode
 */
export function formatTimestamp(
  timestamp: number,
  mode: "relative" | "absolute" | "time" = "relative"
): string {
  switch (mode) {
    case "relative":
      return formatRelativeTime(timestamp);
    case "absolute":
      return new Date(timestamp).toLocaleString();
    case "time":
      return new Date(timestamp).toLocaleTimeString();
    default:
      return formatRelativeTime(timestamp);
  }
}

/**
 * Format request name like Chrome DevTools
 * Extracts meaningful name from URL (endpoint, filename, or query params)
 *
 * @example
 * formatRequestName("https://api.example.com/v1/users/settings") // "settings"
 * formatRequestName("https://cdn.com/page-hook-logic.js") // "page-hook-logic.js"
 * formatRequestName("https://api.com/graphql") // "graphql"
 * formatRequestName("https://api.com/check?rnd=123") // "check?rnd=123"
 */
export function formatRequestName(url: string): {
  name: string;
  hasQuery: boolean;
} {
  try {
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;
    const search = urlObj.search;

    // Extract the last segment of the path
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";

    // Check if it's a file (has extension)
    const isFile = /\.[a-zA-Z0-9]+$/.test(lastSegment);

    // If it's a file, show the filename
    if (isFile) {
      return { name: lastSegment, hasQuery: search.length > 0 };
    }

    // For API endpoints, show the last meaningful segment
    if (lastSegment) {
      // If there are query params, append them for tracking/analytics URLs
      if (search.length > 0 && search.length < 30) {
        return { name: lastSegment + search, hasQuery: true };
      }
      return { name: lastSegment, hasQuery: search.length > 0 };
    }

    // Fallback to full pathname if no meaningful segment
    return { name: pathname || "/", hasQuery: search.length > 0 };
  } catch {
    // If URL parsing fails, return the original URL
    return { name: url, hasQuery: false };
  }
}

/**
 * Format relative time (2s ago, 5m ago, etc.)
 * Same as humanizeTime but with more precision options
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  // For older items, show the date
  return new Date(timestamp).toLocaleDateString();
}

// ============================================================================
// DATA TYPE DETECTION
// ============================================================================

/**
 * Detect the type of data for proper display
 */
export function detectDataType(
  data: any
): "json" | "html" | "text" | "image" | "xml" | "binary" {
  if (data === null || data === undefined) return "text";

  if (typeof data === "object") return "json";

  if (typeof data !== "string") return "text";

  const trimmed = data.trim();

  if (trimmed.startsWith("<html") || trimmed.startsWith("<!DOCTYPE html"))
    return "html";
  if (trimmed.startsWith("<?xml")) return "xml";
  if (trimmed.startsWith("<svg")) return "image";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "text";
    }
  }

  return "text";
}

// ============================================================================
// PERFORMANCE HELPERS
// ============================================================================

/**
 * Calculate percentile from array of numbers
 * Useful for showing P50, P95, P99 latencies
 */
export function calculatePercentile(
  values: number[],
  percentile: number
): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

/**
 * Calculate average from array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Format performance stats for display
 */
export function formatPerfStats(values: number[]): {
  avg: string;
  p50: string;
  p95: string;
  p99: string;
  min: string;
  max: string;
} {
  if (values.length === 0) {
    return { avg: "—", p50: "—", p95: "—", p99: "—", min: "—", max: "—" };
  }

  const avg = calculateAverage(values);
  const p50 = calculatePercentile(values, 50);
  const p95 = calculatePercentile(values, 95);
  const p99 = calculatePercentile(values, 99);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    avg: formatDuration(avg),
    p50: formatDuration(p50),
    p95: formatDuration(p95),
    p99: formatDuration(p99),
    min: formatDuration(min),
    max: formatDuration(max),
  };
}
