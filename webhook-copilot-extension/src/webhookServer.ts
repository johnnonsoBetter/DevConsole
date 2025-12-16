import * as vscode from "vscode";
import * as http from "http";
import {
  WebhookProcessor,
  WebhookPayload,
  ProcessingResult,
} from "./webhookProcessor";
import { WebhookChatParticipant } from "./webhookChatParticipant";

interface WebhookRequest {
  id: string;
  timestamp: number;
  payload: WebhookPayload;
  headers: http.IncomingHttpHeaders;
}

interface TrackedAction {
  requestId: string;
  status: "pending" | "queued" | "processing" | "completed" | "failed";
  action: string;
  task?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  queuePosition?: number;
  result?: ProcessingResult;
}

export class WebhookServer {
  private server?: http.Server;
  private port: number;
  private processor: WebhookProcessor;
  private actions: Map<string, TrackedAction> = new Map();
  private chatParticipant?: WebhookChatParticipant;

  // Task queue for sequential processing
  private taskQueue: WebhookRequest[] = [];
  private isProcessing: boolean = false;
  private currentTaskId?: string;

  constructor(
    private outputChannel: vscode.OutputChannel,
    chatParticipant?: WebhookChatParticipant
  ) {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    this.port = config.get("serverPort", 9090);
    this.processor = new WebhookProcessor(outputChannel);
    this.chatParticipant = chatParticipant;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.outputChannel.appendLine("Webhook server already running");
        resolve();
        return;
      }

      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      this.server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          this.outputChannel.appendLine(`Port ${this.port} is already in use`);
          vscode.window.showErrorMessage(
            `Webhook server port ${this.port} is in use. Change port in settings.`
          );
        } else {
          this.outputChannel.appendLine(`Server error: ${error.message}`);
        }
        reject(error);
      });

      this.server.listen(this.port, () => {
        this.outputChannel.appendLine(
          `Webhook server listening on http://localhost:${this.port}`
        );
        vscode.window.showInformationMessage(
          `Webhook server started on port ${this.port}`
        );
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.outputChannel.appendLine("Webhook server stopped");
        this.server = undefined;
        resolve();
      });
    });
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key"
    );

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://localhost:${this.port}`);

    // Don't log status polling requests (they can be frequent)
    const isStatusCheck = url.pathname.match(/^\/webhook\/[^/]+\/status$/);
    if (!isStatusCheck) {
      this.outputChannel.appendLine(`${req.method} ${url.pathname}`);
    }

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const hasWorkspace = workspaceFolders && workspaceFolders.length > 0;
      const chatState = this.chatParticipant?.getState();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: hasWorkspace ? "ok" : "degraded",
          timestamp: Date.now(),
          version: "1.0.0",
          workspace: {
            ready: hasWorkspace,
            folders: hasWorkspace
              ? workspaceFolders.map((f) => ({
                  name: f.name,
                  path: f.uri.fsPath,
                }))
              : [],
            message: hasWorkspace
              ? `${workspaceFolders.length} workspace folder(s) open`
              : "No workspace folder open - webhooks will be rejected",
          },
          chat: chatState
            ? {
                busy: chatState.isBusy,
                currentRequestId: chatState.currentRequestId,
                lastActivity: chatState.lastActivity,
              }
            : { busy: false },
        })
      );
      return;
    }

    // Test endpoint - echo back the request
    if (url.pathname === "/test" && req.method === "POST") {
      await this.handleTestRequest(req, res);
      return;
    }

    // Main webhook endpoint
    if (url.pathname === "/webhook" && req.method === "POST") {
      await this.handleWebhook(req, res);
      return;
    }

    // Webhook status endpoint: GET /webhook/:requestId/status
    const statusMatch = url.pathname.match(/^\/webhook\/([^/]+)\/status$/);
    if (statusMatch && req.method === "GET") {
      const requestId = statusMatch[1];
      await this.handleStatusCheck(requestId, res);
      return;
    }

    // Queue status endpoint: GET /queue
    if (url.pathname === "/queue" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          ...this.getQueueStatus(),
        })
      );
      return;
    }

    // Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Not found",
        availableEndpoints: [
          {
            path: "/webhook",
            method: "POST",
            description: "Main webhook endpoint",
          },
          { path: "/health", method: "GET", description: "Health check" },
          {
            path: "/queue",
            method: "GET",
            description: "Get current task queue status",
          },
          {
            path: "/webhook/:requestId/status",
            method: "GET",
            description: "Get status of a specific webhook request",
          },
          {
            path: "/test",
            method: "POST",
            description: "Test connection (echoes request)",
          },
        ],
      })
    );
  }

  private async handleTestRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      // Read request body
      const body = await this.readBody(req);
      let payload;

      try {
        payload = JSON.parse(body);
      } catch {
        payload = { raw: body };
      }

      const testId = this.generateId();

      this.outputChannel.appendLine(`Test request received [${testId}]`);
      this.outputChannel.appendLine(`Headers: ${JSON.stringify(req.headers)}`);
      this.outputChannel.appendLine(`Body: ${body}`);

      // Echo back the request with connection info
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          testId,
          message: "Connection active - webhook server is working!",
          received: {
            timestamp: Date.now(),
            method: req.method,
            url: req.url,
            headers: req.headers,
            payload,
          },
          server: {
            port: this.port,
            status: "active",
            version: "1.0.0",
          },
        })
      );

      // Show notification in VS Code
      vscode.window.showInformationMessage(
        `✅ Test request received! (ID: ${testId})`
      );
    } catch (error) {
      this.outputChannel.appendLine(`Error handling test request: ${error}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: "Internal server error",
          message: String(error),
        })
      );
    }
  }

  private async handleWebhook(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      // Pre-flight check: ensure workspace is ready
      const workspaceCheck = this.checkWorkspaceReady();
      if (!workspaceCheck.ready) {
        this.outputChannel.appendLine(
          "Webhook rejected: No workspace folder open"
        );
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify(workspaceCheck.error));

        // Also show notification to user in VS Code
        vscode.window
          .showWarningMessage(
            "Webhook received but no workspace is open. Open a folder to process webhooks.",
            "Open Folder"
          )
          .then((choice) => {
            if (choice === "Open Folder") {
              vscode.commands.executeCommand(
                "workbench.action.files.openFolder"
              );
            }
          });

        return;
      }

      // Read request body
      const body = await this.readBody(req);
      const payload: WebhookPayload = JSON.parse(body);

      // Validate payload - now we just need a prompt
      if (!payload.prompt || payload.prompt.trim() === "") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            error: "MISSING_PROMPT",
            message: "Missing required field: prompt",
          })
        );
        return;
      }

      // Generate request ID
      const requestId = this.generateId();
      const webhookRequest: WebhookRequest = {
        id: requestId,
        timestamp: Date.now(),
        payload,
        headers: req.headers,
      };

      // Determine queue position
      const queuePosition = this.taskQueue.length;
      const isQueued = this.isProcessing || queuePosition > 0;

      // Track this action
      this.actions.set(requestId, {
        requestId,
        status: isQueued ? "queued" : "pending",
        action: "chat",
        task: payload.prompt.substring(0, 100), // First 100 chars as preview
        createdAt: Date.now(),
        queuePosition: isQueued ? queuePosition + 1 : 0,
      });

      // Add to queue
      this.taskQueue.push(webhookRequest);

      this.outputChannel.appendLine(
        `Webhook ${requestId}: chat - ${
          isQueued
            ? `queued at position ${queuePosition + 1}`
            : "processing immediately"
        }`
      );

      // Respond with queue status
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          requestId,
          status: isQueued ? "queued" : "processing",
          message: isQueued
            ? `Webhook queued at position ${
                queuePosition + 1
              }. Another task is currently processing.`
            : "Webhook received and processing",
          queue: {
            position: isQueued ? queuePosition + 1 : 0,
            total: this.taskQueue.length,
            currentTask: this.currentTaskId,
            isProcessing: this.isProcessing,
          },
        })
      );

      // Start processing queue if not already running
      this.processQueue();
    } catch (error) {
      this.outputChannel.appendLine(`Error handling webhook: ${error}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: "Internal server error",
          message: String(error),
        })
      );
    }
  }

  /**
   * Process the task queue sequentially
   */
  private async processQueue(): Promise<void> {
    // Don't start if already processing
    if (this.isProcessing) {
      return;
    }

    // Get next task from queue
    const webhookRequest = this.taskQueue.shift();
    if (!webhookRequest) {
      return; // Queue is empty
    }

    this.isProcessing = true;
    this.currentTaskId = webhookRequest.id;

    // Update queue positions for remaining items
    this.updateQueuePositions();

    const action = this.actions.get(webhookRequest.id);
    if (action) {
      action.status = "processing";
      action.startedAt = Date.now();
      action.queuePosition = 0;
    }

    this.outputChannel.appendLine(
      `Processing webhook: chat [${webhookRequest.id}] (${this.taskQueue.length} remaining in queue)`
    );

    try {
      let result: ProcessingResult;

      // If the payload has images and we have a chat participant, use it for multimodal processing
      if (
        webhookRequest.payload.images &&
        webhookRequest.payload.images.length > 0 &&
        this.chatParticipant
      ) {
        this.outputChannel.appendLine(
          `Webhook has ${webhookRequest.payload.images.length} image(s), using chat participant for multimodal processing`
        );

        // Use the chat participant for image processing
        const chatResult = await this.chatParticipant.processWebhookRequest(
          webhookRequest.id,
          {
            prompt: webhookRequest.payload.prompt,
            images: webhookRequest.payload.images,
            context: webhookRequest.payload.context,
          }
        );

        result = {
          success: chatResult.success ?? false,
          message: chatResult.message ?? "Processed with images",
          output: chatResult.metadata,
        };
      } else {
        // Use the standard processor for text-only requests
        result = await this.processor.processWebhook(webhookRequest.payload);
      }

      // Update tracked action
      if (action) {
        action.status = result.success ? "completed" : "failed";
        action.completedAt = Date.now();
        action.result = result;
      }

      this.outputChannel.appendLine(
        `Webhook ${webhookRequest.id} completed: ${
          result.success ? "SUCCESS" : "FAILED"
        }`
      );

      if (result.success) {
        this.outputChannel.appendLine(`Result: ${result.message}`);
      } else {
        this.outputChannel.appendLine(`Error: ${result.error}`);
      }
    } catch (error) {
      // Update tracked action on error
      if (action) {
        action.status = "failed";
        action.completedAt = Date.now();
        action.result = {
          success: false,
          message: "Processing failed",
          error: String(error),
        };
      }
      this.outputChannel.appendLine(`Error processing webhook: ${error}`);
    } finally {
      // Mark processing complete and process next item
      this.isProcessing = false;
      this.currentTaskId = undefined;

      // Process next item in queue after a small delay
      // This gives Copilot Chat time to settle
      if (this.taskQueue.length > 0) {
        this.outputChannel.appendLine(
          `Queue has ${this.taskQueue.length} more task(s). Processing next in 2 seconds...`
        );
        setTimeout(() => this.processQueue(), 2000);
      }
    }
  }

  /**
   * Update queue positions for all waiting tasks
   */
  private updateQueuePositions(): void {
    this.taskQueue.forEach((request, index) => {
      const action = this.actions.get(request.id);
      if (action) {
        action.queuePosition = index + 1;
      }
    });
  }

  /**
   * Get current queue status
   */
  private getQueueStatus(): object {
    return {
      isProcessing: this.isProcessing,
      currentTask: this.currentTaskId,
      queueLength: this.taskQueue.length,
      queuedTasks: this.taskQueue.map((r, i) => ({
        requestId: r.id,
        action: "chat",
        position: i + 1,
      })),
    };
  }

  private async handleStatusCheck(
    requestId: string,
    res: http.ServerResponse
  ): Promise<void> {
    const action = this.actions.get(requestId);

    if (!action) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: "NOT_FOUND",
          message: `No action found with requestId: ${requestId}`,
          stop_polling: true, // Tell client to stop polling this ID
        })
      );
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        requestId: action.requestId,
        status: action.status,
        action: action.action,
        task: action.task,
        createdAt: action.createdAt,
        startedAt: action.startedAt,
        completedAt: action.completedAt,
        queuePosition: action.queuePosition,
        duration: action.completedAt
          ? action.completedAt - action.createdAt
          : undefined,
        result: action.result,
        queue: this.getQueueStatus(),
      })
    );
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        resolve(body);
      });

      req.on("error", (error) => {
        reject(error);
      });
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  updateConfig(): void {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    const newPort = config.get("serverPort", 9090);

    if (newPort !== this.port && this.server) {
      this.outputChannel.appendLine(
        `Port changed from ${this.port} to ${newPort}, restarting server...`
      );
      this.port = newPort;
      this.stop().then(() => this.start());
    }
  }

  isRunning(): boolean {
    return this.server !== undefined;
  }

  /**
   * Check if VS Code has a workspace ready for processing webhooks
   */
  private checkWorkspaceReady(): { ready: boolean; error?: object } {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      return {
        ready: false,
        error: {
          success: false,
          error: "NO_WORKSPACE",
          message:
            "No workspace folder is open in VS Code. Please open a project folder first.",
          action_required: "open_workspace",
          suggestions: [
            "Open VS Code with a folder: code /path/to/project",
            "Use File > Open Folder in VS Code",
            "Drag a folder onto the VS Code window",
          ],
        },
      };
    }

    return { ready: true };
  }
}
