import html2canvas from "html2canvas";
import { useDevConsoleStore } from "../../utils/stores/devConsole";
import type { LogEntry, NetworkRequest } from "../../utils/stores/devConsole";

// ============================================================================
// CONTEXT PACKER
// Captures screenshot + app context for bug reports
// ============================================================================

export interface ContextPack {
  timestamp: string;
  screenshot: string; // base64 data URL
  route: string;
  lastEvents: LogEntry[];
  networkSnapshot: NetworkRequest[];
  storeSnapshot: Record<string, any>;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
}

/**
 * Redact sensitive data from store snapshot
 */
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "apiKey",
    "secret",
    "authorization",
    "creditCard",
    "ssn",
  ];

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Capture screenshot of the current page
 */
async function captureScreenshot(): Promise<string> {
  try {
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: 0.5, // Reduce size for performance
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    return "";
  }
}

/**
 * Get current route information
 */
function getCurrentRoute(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

/**
 * Get store snapshots (safely)
 */
function getStoreSnapshot(): Record<string, any> {
  try {
    // Try to get common Zustand stores
    const stores: Record<string, any> = {};

    // DevConsole store (always available)
    const devConsole = useDevConsoleStore.getState();
    stores.devConsole = {
      isOpen: devConsole.isOpen,
      activeTab: devConsole.activeTab,
      logCount: devConsole.logs.length,
      networkCount: devConsole.networkRequests.length,
      errorCount: devConsole.unreadErrorCount,
    };

    // Attempt to get other stores
    try {
      const appStore = (window as any).__APP_STORE__;
      if (appStore) {
        stores.app = redactSensitiveData(appStore.getState());
      }
    } catch { }

    try {
      const userStore = (window as any).__USER_STORE__;
      if (userStore) {
        stores.user = redactSensitiveData(userStore.getState());
      }
    } catch { }

    return stores;
  } catch (error) {
    console.error("Failed to capture store snapshot:", error);
    return {};
  }
}

/**
 * Create a context pack for bug reporting
 */
export async function createContextPack(options?: {
  includeScreenshot?: boolean;
  eventCount?: number;
  networkCount?: number;
}): Promise<ContextPack> {
  const {
    includeScreenshot = true,
    eventCount = 20,
    networkCount = 10,
  } = options || {};

  const devConsole = useDevConsoleStore.getState();
  const logs = devConsole.logs;
  const networkRequests = devConsole.networkRequests;

  // Get last N events (prioritize errors and warnings)
  const lastEvents = logs
    .slice(-100)
    .filter((log) => log.level === "error" || log.level === "warn" || log.level === "info")
    .slice(-eventCount);

  // Get recent network requests (prioritize errors)
  const networkSnapshot = networkRequests
    .slice(-50)
    .filter((req) => req.status >= 400 || req.duration > 5000)
    .concat(networkRequests.slice(-networkCount))
    .slice(-networkCount);

  const contextPack: ContextPack = {
    timestamp: new Date().toISOString(),
    screenshot: includeScreenshot ? await captureScreenshot() : "",
    route: getCurrentRoute(),
    lastEvents,
    networkSnapshot,
    storeSnapshot: getStoreSnapshot(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };

  return contextPack;
}

/**
 * Export context pack as JSON file
 */
export function exportContextPack(contextPack: ContextPack) {
  const filename = `context-pack-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  const blob = new Blob([JSON.stringify(contextPack, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy context pack to clipboard (without screenshot for size)
 */
export async function copyContextPackToClipboard(contextPack: ContextPack) {
  const packWithoutScreenshot = {
    ...contextPack,
    screenshot: contextPack.screenshot ? "[Screenshot captured]" : "[No screenshot]",
  };

  const markdown = generateMarkdownReport(packWithoutScreenshot);

  try {
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Generate markdown report from context pack
 */
function generateMarkdownReport(contextPack: Partial<ContextPack>): string {
  const { timestamp, route, lastEvents, networkSnapshot, storeSnapshot, userAgent, viewport } =
    contextPack;

  let markdown = `# Bug Report Context\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Route:** ${route}\n`;
  markdown += `**User Agent:** ${userAgent}\n`;
  markdown += `**Viewport:** ${viewport?.width}x${viewport?.height}\n\n`;

  // Recent Events
  markdown += `## Recent Events (${lastEvents?.length || 0})\n\n`;
  if (lastEvents && lastEvents.length > 0) {
    markdown += `| Time | Level | Message |\n`;
    markdown += `|------|-------|----------|\n`;
    lastEvents.forEach((event) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const message = event.message.slice(0, 100);
      markdown += `| ${time} | ${event.level.toUpperCase()} | ${message} |\n`;
    });
  } else {
    markdown += `_No recent events_\n`;
  }
  markdown += `\n`;

  // Network Snapshot
  markdown += `## Network Activity (${networkSnapshot?.length || 0})\n\n`;
  if (networkSnapshot && networkSnapshot.length > 0) {
    markdown += `| Method | URL | Status | Duration |\n`;
    markdown += `|--------|-----|--------|----------|\n`;
    networkSnapshot.forEach((req) => {
      const url = req.url.slice(0, 50);
      markdown += `| ${req.method} | ${url} | ${req.status || "pending"} | ${req.duration}ms |\n`;
    });
  } else {
    markdown += `_No network activity_\n`;
  }
  markdown += `\n`;

  // Store Snapshot
  markdown += `## Store Snapshot\n\n`;
  markdown += `\`\`\`json\n${JSON.stringify(storeSnapshot, null, 2)}\n\`\`\`\n`;

  return markdown;
}

/**
 * Generate shareable link (placeholder - requires backend)
 */
export async function generateShareableLink(contextPack: ContextPack): Promise<string> {
  // This would POST to your backend API to store the context pack
  // and return a shareable URL
  // For now, return a placeholder
  console.warn("Shareable link generation requires backend implementation");
  return `https://linkvybe.com/debug/${Date.now()}`;
}

/**
 * Generate GitHub-ready issue markdown
 */
export function generateGitHubIssueMarkdown(contextPack: Partial<ContextPack>, options?: {
  title?: string;
  description?: string;
}): { title: string; body: string } {
  const { timestamp, route, lastEvents, networkSnapshot, userAgent, viewport } = contextPack;

  const title = options?.title || `Bug Report: Issue on ${route || 'Unknown Route'}`;

  let body = `## Description\n\n`;
  body += options?.description || '_An issue was detected in the application._\n\n';

  body += `## Environment\n\n`;
  body += `- **Timestamp:** ${timestamp}\n`;
  body += `- **Route:** \`${route}\`\n`;
  body += `- **User Agent:** ${userAgent}\n`;
  body += `- **Viewport:** ${viewport?.width}x${viewport?.height}\n\n`;

  // Recent Errors
  const errors = lastEvents?.filter(e => e.level === 'error') || [];
  if (errors.length > 0) {
    body += `## Recent Errors (${errors.length})\n\n`;
    errors.slice(-5).forEach((error, idx) => {
      const time = new Date(error.timestamp).toLocaleTimeString();
      body += `<details>\n<summary>${idx + 1}. ${error.message.slice(0, 80)}... (${time})</summary>\n\n`;
      body += `\`\`\`\n${error.message}\n`;
      if (error.stack) {
        body += `\n${error.stack}\n`;
      }
      body += `\`\`\`\n\n</details>\n\n`;
    });
  }

  // Failed Network Requests
  const failedRequests = networkSnapshot?.filter(r => r.status >= 400) || [];
  if (failedRequests.length > 0) {
    body += `## Failed Network Requests (${failedRequests.length})\n\n`;
    body += `| Method | Endpoint | Status | Duration |\n`;
    body += `|--------|----------|--------|----------|\n`;
    failedRequests.forEach((req) => {
      const endpoint = new URL(req.url, window.location.origin).pathname;
      body += `| \`${req.method}\` | \`${endpoint}\` | ${req.status} | ${req.duration}ms |\n`;
    });
    body += `\n`;
  }

  // Console Logs (last 10 events)
  if (lastEvents && lastEvents.length > 0) {
    body += `<details>\n<summary>Recent Console Logs (${lastEvents.length})</summary>\n\n`;
    body += `| Time | Level | Message |\n`;
    body += `|------|-------|----------|\n`;
    lastEvents.slice(-10).forEach((event) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const message = event.message.slice(0, 100).replace(/\|/g, '\\|');
      body += `| ${time} | \`${event.level}\` | ${message} |\n`;
    });
    body += `\n</details>\n\n`;
  }

  body += `---\n`;
  body += `_Auto-generated by LinkVybe DevConsole_\n`;

  return { title, body };
}
