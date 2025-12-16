import * as vscode from "vscode";
import { WebhookProcessor, WebhookPayload } from "./webhookProcessor";
import { ResponseHandler } from "./responseHandler";

interface WebhookData {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  query: Record<string, any>;
}

export class WebhookMonitor {
  private pollTimer?: NodeJS.Timeout;
  private lastProcessedId?: string;
  private isEnabled: boolean = false;
  private serverUrl: string;
  private pollInterval: number;
  private processor: WebhookProcessor;
  private responseHandler: ResponseHandler;
  private processingMode: "notify" | "auto" | "manual";

  constructor(
    private context: vscode.ExtensionContext,
    private outputChannel: vscode.OutputChannel
  ) {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    this.serverUrl = config.get("serverUrl", "http://localhost:9090");
    this.pollInterval = config.get("pollInterval", 5000);
    this.processingMode = config.get("processingMode", "notify");

    this.processor = new WebhookProcessor(outputChannel);
    this.responseHandler = new ResponseHandler(outputChannel);
  }

  start() {
    if (this.isEnabled) {
      this.outputChannel.appendLine("Webhook monitor already running");
      return;
    }

    this.isEnabled = true;
    this.outputChannel.appendLine(
      `Starting webhook monitor (checking every ${this.pollInterval}ms)`
    );
    this.outputChannel.appendLine(`Server URL: ${this.serverUrl}`);

    this.pollTimer = setInterval(() => {
      this.checkForNewWebhooks();
    }, this.pollInterval);

    // Check immediately on start
    this.checkForNewWebhooks();
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.isEnabled = false;
    this.outputChannel.appendLine("Webhook monitor stopped");
  }

  private async checkForNewWebhooks() {
    try {
      const response = await fetch(`${this.serverUrl}/requests?limit=1`);

      if (!response.ok) {
        this.outputChannel.appendLine(
          `Error: Server returned ${response.status}`
        );
        return;
      }

      const data: any = await response.json();

      if (data.requests && data.requests.length > 0) {
        const latestRequest: WebhookData = data.requests[0];

        // Check if this is a new request we haven't processed
        if (this.lastProcessedId !== latestRequest.id) {
          this.outputChannel.appendLine(
            `New webhook detected: ${latestRequest.method} ${latestRequest.endpoint}`
          );
          this.lastProcessedId = latestRequest.id;

          // Trigger Copilot
          await this.triggerCopilot(latestRequest);
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error checking webhooks: ${error}`);
    }
  }

  private async triggerCopilot(webhook: WebhookData) {
    try {
      // Check if webhook body contains a structured action payload
      const isStructuredPayload =
        webhook.body && typeof webhook.body === "object" && webhook.body.action;

      if (isStructuredPayload && this.processingMode !== "notify") {
        // Process as structured webhook with action
        await this.processStructuredWebhook(webhook);
      } else {
        // Default: Show in Copilot Chat for user interaction
        await this.showInCopilotChat(webhook);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error triggering Copilot: ${error}`);
      vscode.window.showErrorMessage("Failed to process webhook");
    }
  }

  private async processStructuredWebhook(webhook: WebhookData) {
    this.outputChannel.appendLine("Processing structured webhook payload");

    const payload: WebhookPayload = webhook.body;

    // Process the webhook
    const result = await this.processor.processWebhook(payload);

    // Send response back to server
    await this.responseHandler.sendResponse(webhook.id, result);

    // Show notification based on result
    if (result.success) {
      vscode.window.showInformationMessage(
        `✅ Webhook processed: ${result.message}`
      );
    } else {
      vscode.window.showErrorMessage(`❌ Webhook failed: ${result.message}`);
    }
  }

  private async showInCopilotChat(webhook: WebhookData) {
    // Format the webhook data for Copilot
    const message = this.formatWebhookMessage(webhook);

    this.outputChannel.appendLine(
      `[Chat Open] Opening Copilot Chat for webhook`
    );
    this.outputChannel.appendLine(`[Chat Open] Webhook ID: ${webhook.id}`);
    this.outputChannel.appendLine(`[Chat Open] Method: ${webhook.method}`);
    this.outputChannel.appendLine(`[Chat Open] Endpoint: ${webhook.endpoint}`);
    this.outputChannel.appendLine(
      `[Chat Open] Timestamp: ${new Date(webhook.timestamp).toISOString()}`
    );
    this.outputChannel.appendLine(
      `[Chat Open] Query length: ${message.length} chars`
    );

    // Open Copilot Chat in editor tab with the webhook context
    await vscode.commands.executeCommand("workbench.action.chat.openEditor", {
      query: message,
    });

    // Show notification with option to focus the chat editor
    vscode.window
      .showInformationMessage(
        `New webhook: ${webhook.method} ${webhook.endpoint}`,
        "View in Chat"
      )
      .then((selection) => {
        if (selection === "View in Chat") {
          vscode.commands.executeCommand("workbench.action.chat.openEditor");
        }
      });
  }

  private formatWebhookMessage(webhook: WebhookData): string {
    const timestamp = new Date(webhook.timestamp).toISOString();

    let message = `🔔 New webhook received!\n\n`;
    message += `**Endpoint:** ${webhook.method} ${webhook.endpoint}\n`;
    message += `**Time:** ${timestamp}\n`;
    message += `**Request ID:** ${webhook.id}\n\n`;

    if (Object.keys(webhook.query).length > 0) {
      message += `**Query Parameters:**\n\`\`\`json\n${JSON.stringify(
        webhook.query,
        null,
        2
      )}\n\`\`\`\n\n`;
    }

    if (webhook.body && Object.keys(webhook.body).length > 0) {
      message += `**Request Body:**\n\`\`\`json\n${JSON.stringify(
        webhook.body,
        null,
        2
      )}\n\`\`\`\n\n`;
    }

    message += `Please analyze this webhook and suggest appropriate actions. `;
    message += `You can use the MCP tools to get more details or process this request.`;

    return message;
  }

  async checkNow() {
    this.outputChannel.appendLine("Manual check triggered");
    await this.checkForNewWebhooks();
  }

  updateConfig() {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    this.serverUrl = config.get("serverUrl", "http://localhost:9090");
    this.pollInterval = config.get("pollInterval", 5000);
    this.processingMode = config.get("processingMode", "notify");

    this.responseHandler.updateServerUrl(this.serverUrl);

    if (this.isEnabled) {
      this.stop();
      this.start();
    }
  }
}
