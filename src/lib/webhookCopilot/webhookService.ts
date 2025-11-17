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
  question?: string;
  filePath?: string;
  content?: string;
  command?: string;
  query?: string;
  requireApproval?: boolean;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  data?: any;
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

      if (!response.ok) {
        throw new Error(
          `Webhook request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: true,
        message: "Webhook sent successfully",
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
  async copilotChat(question: string): Promise<WebhookResponse> {
    return this.sendWebhook({
      action: "copilot_chat",
      question,
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
   * Check if webhook server is available using health endpoint
   */
  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Use the health check endpoint
      const baseUrl = this.webhookUrl.replace(/\/webhook$/, "");
      const healthUrl = `${baseUrl}/health`;

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.status === "ok";
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get server health and info
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
