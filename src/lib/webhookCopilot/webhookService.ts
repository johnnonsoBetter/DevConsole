/**
 * Webhook Copilot Service
 * Sends requests to the Webhook Copilot extension for code automation
 * Enables sticky notes to trigger VS Code actions and Copilot tasks
 */

// ============================================================================
// TYPES
// ============================================================================

export type WebhookAction =
  | "execute_task"
  | "copilot_chat"
  | "create_file"
  | "modify_file"
  | "run_command"
  | "query_workspace";

export interface WebhookPayload {
  action: WebhookAction;
  task?: string;
  prompt?: string;
  filePath?: string;
  content?: string;
  command?: string;
  query?: string;
  requireApproval?: boolean;
  context?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
  requestId?: string;
  suggestions?: string[];
  actionRequired?: string;
  status?: "queued" | "processing";
  queue?: {
    position: number;
    length: number;
  };
}

export interface QueueStatus {
  isProcessing: boolean;
  queueLength: number;
  currentTaskId?: string;
  pendingTasks: string[];
}

export interface WorkspaceFolder {
  name: string;
  path: string;
}

export interface WorkspaceHealth {
  ready: boolean;
  folders: WorkspaceFolder[];
  message: string;
}

export interface ChatHealth {
  busy: boolean;
  currentRequestId: string | null;
  lastActivity: number;
}

export interface ServerHealth {
  status: "ok" | "degraded" | "offline";
  timestamp: number;
  version: string;
  port?: number;
  workspace?: WorkspaceHealth;
  chat?: ChatHealth;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_WEBHOOK_URL = "http://localhost:9090/webhook";
const REQUEST_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

export class WebhookCopilotService {
  private webhookUrl: string;

  constructor(webhookUrl: string = DEFAULT_WEBHOOK_URL) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send a webhook request to trigger Copilot action
   */
  async sendWebhook(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Handle 503 Service Unavailable (NO_WORKSPACE)
      if (response.status === 503) {
        return {
          success: false,
          error: data.error || "SERVICE_UNAVAILABLE",
          message: data.message || "VS Code service is unavailable",
          suggestions: data.suggestions,
          actionRequired: data.action_required,
        };
      }

      // Handle other non-OK responses
      if (!response.ok) {
        return {
          success: false,
          error: data.error || "REQUEST_FAILED",
          message:
            data.message ||
            `Request failed: ${response.status} ${response.statusText}`,
        };
      }

      return {
        success: true,
        message: data.message || "Webhook sent successfully",
        requestId: data.requestId,
        status: data.status,
        queue: data.queue,
        data,
      };
    } catch (error) {
      console.error("Webhook request error:", error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            message:
              "Request timed out. Make sure Webhook Copilot extension is running in VS Code.",
          };
        }

        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: "Unknown error occurred",
      };
    }
  }

  /**
   * Send a prompt to Copilot Chat (simplified API)
   * This is the recommended method for the chat-first approach
   */
  async sendPrompt(
    prompt: string,
    context?: {
      type?: "log" | "note" | "code" | "custom";
      log?: string;
      file?: string;
      line?: number;
      source?: string;
      [key: string]: unknown;
    }
  ): Promise<WebhookResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          context,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Handle 400 Bad Request (MISSING_PROMPT)
      if (response.status === 400) {
        return {
          success: false,
          error: data.error || "MISSING_PROMPT",
          message: data.message || "Prompt is required",
        };
      }

      // Handle 503 Service Unavailable (NO_WORKSPACE)
      if (response.status === 503) {
        return {
          success: false,
          error: data.error || "NO_WORKSPACE",
          message: data.message || "No workspace folder open in VS Code",
          suggestions: data.suggestions,
          actionRequired: data.action_required,
        };
      }

      // Handle other non-OK responses
      if (!response.ok) {
        return {
          success: false,
          error: data.error || "REQUEST_FAILED",
          message: data.message || `Request failed: ${response.status}`,
        };
      }

      return {
        success: true,
        message: data.message || "Sent to Copilot",
        requestId: data.requestId,
        status: data.status,
        queue: data.queue,
        data,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: "TIMEOUT",
            message: "Request timed out. Make sure VS Code is running.",
          };
        }
        return {
          success: false,
          error: "CONNECTION_ERROR",
          message: error.message,
        };
      }
      return {
        success: false,
        error: "UNKNOWN_ERROR",
        message: "Unknown error occurred",
      };
    }
  }

  /**
   * Execute a task with Copilot
   */
  async executeTask(
    task: string,
    requireApproval: boolean = true
  ): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "execute_task",
      task,
      requireApproval,
    });
  }

  /**
   * Ask Copilot a question
   */
  async copilotChat(prompt: string): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "copilot_chat",
      prompt,
    });
  }

  /**
   * Create a new file
   */
  async createFile(
    filePath: string,
    content: string
  ): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "create_file",
      filePath,
      content,
    });
  }

  /**
   * Modify an existing file
   */
  async modifyFile(
    filePath: string,
    content: string
  ): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "modify_file",
      filePath,
      content,
    });
  }

  /**
   * Run a VS Code command
   */
  async runCommand(command: string): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "run_command",
      command,
    });
  }

  /**
   * Query workspace for files
   */
  async queryWorkspace(query: string): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "query_workspace",
      query,
    });
  }

  /**
   * Check if webhook server is available and workspace is ready
   */
  async checkConnection(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      // Consider connected if server is reachable (even if workspace not ready)
      return health !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if workspace is ready for webhooks
   */
  async checkWorkspaceReady(): Promise<{
    connected: boolean;
    workspaceReady: boolean;
    chatBusy: boolean;
    health: ServerHealth | null;
  }> {
    try {
      const health = await this.getHealth();

      if (!health) {
        return {
          connected: false,
          workspaceReady: false,
          chatBusy: false,
          health: null,
        };
      }

      return {
        connected: true,
        workspaceReady: health.workspace?.ready ?? false,
        chatBusy: health.chat?.busy ?? false,
        health,
      };
    } catch {
      return {
        connected: false,
        workspaceReady: false,
        chatBusy: false,
        health: null,
      };
    }
  }

  /**
   * Get server health and workspace info
   */
  async getHealth(): Promise<ServerHealth | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const baseUrl = this.webhookUrl.replace(/\/webhook$/, "");
      const healthUrl = `${baseUrl}/health`;

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<QueueStatus | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const baseUrl = this.webhookUrl.replace(/\/webhook$/, "");
      const queueUrl = `${baseUrl}/queue`;

      const response = await fetch(queueUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if server is currently processing a task (queue-based)
   */
  async isServerBusy(): Promise<boolean> {
    const queueStatus = await this.getQueueStatus();
    return queueStatus?.isProcessing ?? false;
  }

  /**
   * Check if Copilot chat is currently busy (responding to a request)
   * This is the preferred method to check before sending new requests
   */
  async isChatBusy(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health?.chat?.busy ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Check if ready to send a new request (workspace ready AND chat not busy)
   * Includes stuck state detection - if busy for >60s, treats as not busy
   */
  async isReady(): Promise<{
    ready: boolean;
    workspaceReady: boolean;
    chatBusy: boolean;
    stuckDetected: boolean;
    reason?: string;
  }> {
    try {
      const health = await this.getHealth();

      if (!health) {
        return {
          ready: false,
          workspaceReady: false,
          chatBusy: false,
          stuckDetected: false,
          reason: "VS Code not connected",
        };
      }

      if (health.status !== "ok") {
        return {
          ready: false,
          workspaceReady: false,
          chatBusy: false,
          stuckDetected: false,
          reason: "VS Code not ready",
        };
      }

      const workspaceReady = health.workspace?.ready ?? false;
      let chatBusy = health.chat?.busy ?? false;
      let stuckDetected = false;

      // Stuck state detection: if busy but no activity for >60s, assume stuck
      if (chatBusy && health.chat?.lastActivity) {
        const stuckThreshold = 60000; // 60 seconds
        const timeSinceActivity = Date.now() - health.chat.lastActivity;

        if (timeSinceActivity > stuckThreshold) {
          console.warn(
            `[WebhookCopilot] Chat busy state appears stuck (${Math.round(timeSinceActivity / 1000)}s since last activity)`
          );
          chatBusy = false; // Treat as not busy
          stuckDetected = true;
        }
      }

      if (!workspaceReady) {
        return {
          ready: false,
          workspaceReady,
          chatBusy,
          stuckDetected,
          reason: "No workspace open in VS Code",
        };
      }

      if (chatBusy) {
        return {
          ready: false,
          workspaceReady,
          chatBusy,
          stuckDetected,
          reason: "Copilot is busy processing a request",
        };
      }

      return { ready: true, workspaceReady, chatBusy, stuckDetected };
    } catch {
      return {
        ready: false,
        workspaceReady: false,
        chatBusy: false,
        stuckDetected: false,
        reason: "Connection error",
      };
    }
  }

  /**
   * Get server health and info (deprecated - use getHealth instead)
   */
  async getServerHealth(): Promise<{
    status: string;
    timestamp: number;
    version: string;
    port?: number;
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const baseUrl = this.webhookUrl.replace(/\/webhook$/, "");
      const healthUrl = `${baseUrl}/health`;

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get status of a webhook request by requestId
   */
  async getRequestStatus(requestId: string): Promise<{
    requestId: string;
    status: "queued" | "pending" | "processing" | "completed" | "failed";
    queuePosition?: number;
    action?: string;
    task?: string;
    createdAt?: number;
    completedAt?: number;
    result?: {
      success: boolean;
      message?: string;
    };
    error?: string;
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const baseUrl = this.webhookUrl.replace(/\/webhook$/, "");
      const statusUrl = `${baseUrl}/webhook/${requestId}/status`;

      const response = await fetch(statusUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 404) {
        // Return a special status indicating the request was not found
        // This can happen when the extension was restarted
        return {
          requestId,
          status: "failed" as const,
          error: "Request not found - extension may have been restarted",
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Poll for request completion with timeout
   */
  async pollForCompletion(
    requestId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onStatusChange?: (status: string, queuePosition?: number) => void;
    } = {}
  ): Promise<{
    completed: boolean;
    status: string;
    queuePosition?: number;
    result?: { success: boolean; message?: string };
    error?: string;
  }> {
    const { maxAttempts = 30, intervalMs = 2000, onStatusChange } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await this.getRequestStatus(requestId);

      if (!statusResponse) {
        return {
          completed: false,
          status: "unknown",
          error: "Failed to get status",
        };
      }

      onStatusChange?.(statusResponse.status, statusResponse.queuePosition);

      if (statusResponse.status === "completed") {
        return {
          completed: true,
          status: "completed",
          result: statusResponse.result,
        };
      }

      if (statusResponse.status === "failed") {
        return {
          completed: true,
          status: "failed",
          error: statusResponse.error,
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return { completed: false, status: "timeout", error: "Polling timed out" };
  }

  /**
   * Test connection using test endpoint
   */
  async testConnection(): Promise<{
    success: boolean;
    testId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const baseUrl = this.webhookUrl.replace(/\/webhook$/, "");
      const testUrl = `${baseUrl}/test`;

      const response = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Connection test from DevConsole",
          client: "DevConsole Extension",
          timestamp: Date.now(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      return {
        success: false,
        error: `Server responded with status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Update webhook URL
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }

  /**
   * Get current webhook URL
   */
  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const webhookCopilot = new WebhookCopilotService();

// Load saved webhook URL from storage on initialization
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get(["webhookCopilotUrl"], (result) => {
    if (result.webhookCopilotUrl) {
      webhookCopilot.setWebhookUrl(result.webhookCopilotUrl);
    }
  });
}
