"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookMonitor = void 0;
const vscode = __importStar(require("vscode"));
const webhookProcessor_1 = require("./webhookProcessor");
const responseHandler_1 = require("./responseHandler");
class WebhookMonitor {
    constructor(context, outputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.isEnabled = false;
        const config = vscode.workspace.getConfiguration("webhookCopilot");
        this.serverUrl = config.get("serverUrl", "http://localhost:9090");
        this.pollInterval = config.get("pollInterval", 5000);
        this.processingMode = config.get("processingMode", "notify");
        this.processor = new webhookProcessor_1.WebhookProcessor(outputChannel);
        this.responseHandler = new responseHandler_1.ResponseHandler(outputChannel);
    }
    start() {
        if (this.isEnabled) {
            this.outputChannel.appendLine("Webhook monitor already running");
            return;
        }
        this.isEnabled = true;
        this.outputChannel.appendLine(`Starting webhook monitor (checking every ${this.pollInterval}ms)`);
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
    async checkForNewWebhooks() {
        try {
            const response = await fetch(`${this.serverUrl}/requests?limit=1`);
            if (!response.ok) {
                this.outputChannel.appendLine(`Error: Server returned ${response.status}`);
                return;
            }
            const data = await response.json();
            if (data.requests && data.requests.length > 0) {
                const latestRequest = data.requests[0];
                // Check if this is a new request we haven't processed
                if (this.lastProcessedId !== latestRequest.id) {
                    this.outputChannel.appendLine(`New webhook detected: ${latestRequest.method} ${latestRequest.endpoint}`);
                    this.lastProcessedId = latestRequest.id;
                    // Trigger Copilot
                    await this.triggerCopilot(latestRequest);
                }
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`Error checking webhooks: ${error}`);
        }
    }
    async triggerCopilot(webhook) {
        try {
            // Check if webhook body contains a structured action payload
            const isStructuredPayload = webhook.body && typeof webhook.body === "object" && webhook.body.action;
            if (isStructuredPayload && this.processingMode !== "notify") {
                // Process as structured webhook with action
                await this.processStructuredWebhook(webhook);
            }
            else {
                // Default: Show in Copilot Chat for user interaction
                await this.showInCopilotChat(webhook);
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`Error triggering Copilot: ${error}`);
            vscode.window.showErrorMessage("Failed to process webhook");
        }
    }
    async processStructuredWebhook(webhook) {
        this.outputChannel.appendLine("Processing structured webhook payload");
        const payload = webhook.body;
        // Process the webhook
        const result = await this.processor.processWebhook(payload);
        // Send response back to server
        await this.responseHandler.sendResponse(webhook.id, result);
        // Show notification based on result
        if (result.success) {
            vscode.window.showInformationMessage(`✅ Webhook processed: ${result.message}`);
        }
        else {
            vscode.window.showErrorMessage(`❌ Webhook failed: ${result.message}`);
        }
    }
    async showInCopilotChat(webhook) {
        // Format the webhook data for Copilot
        const message = this.formatWebhookMessage(webhook);
        this.outputChannel.appendLine(`[Chat Open] Opening Copilot Chat for webhook`);
        this.outputChannel.appendLine(`[Chat Open] Webhook ID: ${webhook.id}`);
        this.outputChannel.appendLine(`[Chat Open] Method: ${webhook.method}`);
        this.outputChannel.appendLine(`[Chat Open] Endpoint: ${webhook.endpoint}`);
        this.outputChannel.appendLine(`[Chat Open] Timestamp: ${new Date(webhook.timestamp).toISOString()}`);
        this.outputChannel.appendLine(`[Chat Open] Query length: ${message.length} chars`);
        // Open Copilot Chat in editor tab with the webhook context
        await vscode.commands.executeCommand("workbench.action.chat.openEditor", {
            query: message,
        });
        // Show notification with option to focus the chat editor
        vscode.window
            .showInformationMessage(`New webhook: ${webhook.method} ${webhook.endpoint}`, "View in Chat")
            .then((selection) => {
            if (selection === "View in Chat") {
                vscode.commands.executeCommand("workbench.action.chat.openEditor");
            }
        });
    }
    formatWebhookMessage(webhook) {
        const timestamp = new Date(webhook.timestamp).toISOString();
        let message = `🔔 New webhook received!\n\n`;
        message += `**Endpoint:** ${webhook.method} ${webhook.endpoint}\n`;
        message += `**Time:** ${timestamp}\n`;
        message += `**Request ID:** ${webhook.id}\n\n`;
        if (Object.keys(webhook.query).length > 0) {
            message += `**Query Parameters:**\n\`\`\`json\n${JSON.stringify(webhook.query, null, 2)}\n\`\`\`\n\n`;
        }
        if (webhook.body && Object.keys(webhook.body).length > 0) {
            message += `**Request Body:**\n\`\`\`json\n${JSON.stringify(webhook.body, null, 2)}\n\`\`\`\n\n`;
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
exports.WebhookMonitor = WebhookMonitor;
//# sourceMappingURL=webhookMonitor.js.map