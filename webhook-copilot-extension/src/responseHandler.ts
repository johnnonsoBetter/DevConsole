import * as vscode from "vscode";

export interface ProcessingResult {
  success: boolean;
  message: string;
  data?: any;
}

export class ResponseHandler {
  private serverUrl: string;

  constructor(private outputChannel: vscode.OutputChannel) {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    this.serverUrl = config.get("serverUrl", "http://localhost:9090");
  }

  async sendResponse(requestId: string, result: ProcessingResult) {
    try {
      this.outputChannel.appendLine(
        `Sending response for request ${requestId}`
      );

      const response = await fetch(
        `${this.serverUrl}/requests/${requestId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      this.outputChannel.appendLine(`Response sent successfully`);
    } catch (error) {
      this.outputChannel.appendLine(`Error sending response: ${error}`);
      throw error;
    }
  }

  updateServerUrl(url: string) {
    this.serverUrl = url;
  }
}
