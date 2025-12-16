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
exports.WebhookProcessor = void 0;
const vscode = __importStar(require("vscode"));
class WebhookProcessor {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Process webhook - chat-first approach
     * Everything goes to Copilot Chat with formatted context
     */
    async processWebhook(payload) {
        this.outputChannel.appendLine(`Processing chat request`);
        try {
            // Validate prompt exists
            if (!payload.prompt || payload.prompt.trim() === "") {
                return {
                    success: false,
                    message: "No prompt provided",
                    error: "MISSING_PROMPT",
                };
            }
            // Open related files if specified
            if (payload.options?.openFiles && payload.context?.file) {
                await this.openFile(payload.context.file);
            }
            // Format the message for Copilot
            const formattedMessage = this.formatMessage(payload);
            // Log key info before opening chat
            this.outputChannel.appendLine(`[Chat Open] Opening Copilot Chat`);
            this.outputChannel.appendLine(`[Chat Open] Prompt: ${payload.prompt?.substring(0, 100)}${payload.prompt && payload.prompt.length > 100 ? "..." : ""}`);
            this.outputChannel.appendLine(`[Chat Open] Has context: ${!!payload.context}`);
            if (payload.context?.file) {
                this.outputChannel.appendLine(`[Chat Open] Context file: ${payload.context.file}`);
            }
            this.outputChannel.appendLine(`[Chat Open] Query length: ${formattedMessage.length} chars`);
            // Send to Copilot Chat
            await vscode.commands.executeCommand("workbench.action.chat.open", {
                query: formattedMessage,
            });
            this.outputChannel.appendLine(`[Chat Open] Successfully sent to Copilot Chat`);
            // Show notification if requested
            if (payload.options?.notify) {
                vscode.window.showInformationMessage("Sent to Copilot Chat");
            }
            return {
                success: true,
                message: "Sent to Copilot Chat",
                output: {
                    prompt: payload.prompt,
                    hasContext: !!payload.context,
                },
            };
        }
        catch (error) {
            this.outputChannel.appendLine(`Error: ${error}`);
            return {
                success: false,
                message: "Failed to send to Copilot",
                error: String(error),
            };
        }
    }
    /**
     * Format the message with context for Copilot
     */
    formatMessage(payload) {
        const parts = [];
        const ctx = payload.context;
        // Add context section if we have any
        if (ctx) {
            const contextLines = [];
            // Log/error message
            if (ctx.log) {
                contextLines.push(`**Log:**\n\`\`\`\n${ctx.log}\n\`\`\``);
            }
            // Stack trace
            if (ctx.stackTrace) {
                contextLines.push(`**Stack trace:**\n\`\`\`\n${ctx.stackTrace}\n\`\`\``);
            }
            // File reference
            if (ctx.file) {
                const lineRef = ctx.line ? `:${ctx.line}` : "";
                contextLines.push(`**File:** \`${ctx.file}${lineRef}\``);
            }
            // Add any other context fields
            const knownFields = ["log", "stackTrace", "file", "line", "source"];
            for (const [key, value] of Object.entries(ctx)) {
                if (!knownFields.includes(key) && value) {
                    contextLines.push(`**${key}:** ${JSON.stringify(value)}`);
                }
            }
            if (contextLines.length > 0) {
                parts.push("## Context\n" + contextLines.join("\n\n"));
            }
        }
        // Add the user's prompt
        parts.push("## Request\n" + payload.prompt);
        return parts.join("\n\n");
    }
    /**
     * Open a file in the editor
     */
    async openFile(filePath) {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder)
                return;
            const uri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, { preview: false });
        }
        catch (error) {
            this.outputChannel.appendLine(`Could not open file: ${filePath}`);
        }
    }
}
exports.WebhookProcessor = WebhookProcessor;
//# sourceMappingURL=webhookProcessor.js.map