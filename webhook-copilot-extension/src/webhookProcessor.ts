import * as vscode from "vscode";

/**
 * Image attachment for webhook payload
 */
export interface WebhookImage {
  // Base64-encoded image data
  data: string;
  // MIME type (e.g., 'image/png', 'image/jpeg', 'image/gif', 'image/webp')
  mimeType: string;
  // Optional description for the image
  description?: string;
}

/**
 * Chat-first webhook payload
 * Simple: just a prompt with optional context
 */
export interface WebhookPayload {
  // The user's prompt/question for Copilot
  prompt: string;

  // Optional images to include with the request (for vision/multimodal)
  images?: WebhookImage[];

  // Optional context to include with the prompt
  context?: {
    // Log/error message
    log?: string;
    // Stack trace
    stackTrace?: string;
    // Related file path
    file?: string;
    // Line number
    line?: number;
    // Source of the request (logs-panel, sticky-notes, etc.)
    source?: string;
    // Any additional context
    [key: string]: any;
  };

  // Options
  options?: {
    // Open related files before sending to Copilot
    openFiles?: boolean;
    // Show notification
    notify?: boolean;
  };
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  output?: any;
  error?: string;
}

export class WebhookProcessor {
  constructor(private outputChannel: vscode.OutputChannel) {}

  /**
   * Process webhook - chat-first approach
   * Everything goes to Copilot Chat with formatted context
   */
  async processWebhook(payload: WebhookPayload): Promise<ProcessingResult> {
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
      this.outputChannel.appendLine(
        `[Chat Open] Prompt: ${payload.prompt?.substring(0, 100)}${
          payload.prompt && payload.prompt.length > 100 ? "..." : ""
        }`
      );
      this.outputChannel.appendLine(
        `[Chat Open] Has context: ${!!payload.context}`
      );
      if (payload.context?.file) {
        this.outputChannel.appendLine(
          `[Chat Open] Context file: ${payload.context.file}`
        );
      }
      this.outputChannel.appendLine(
        `[Chat Open] Query length: ${formattedMessage.length} chars`
      );

      // Send to Copilot Chat
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: formattedMessage,
      });

      this.outputChannel.appendLine(
        `[Chat Open] Successfully sent to Copilot Chat`
      );

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
    } catch (error) {
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
  private formatMessage(payload: WebhookPayload): string {
    const parts: string[] = [];
    const ctx = payload.context;

    // Add context section if we have any
    if (ctx) {
      const contextLines: string[] = [];

      // Log/error message
      if (ctx.log) {
        contextLines.push(`**Log:**\n\`\`\`\n${ctx.log}\n\`\`\``);
      }

      // Stack trace
      if (ctx.stackTrace) {
        contextLines.push(
          `**Stack trace:**\n\`\`\`\n${ctx.stackTrace}\n\`\`\``
        );
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
  private async openFile(filePath: string): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const uri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, { preview: false });
    } catch (error) {
      this.outputChannel.appendLine(`Could not open file: ${filePath}`);
    }
  }
}
