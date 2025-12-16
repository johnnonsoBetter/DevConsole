import * as vscode from "vscode";
import * as http from "http";
import { WebSocket, WebSocketServer } from "ws";

/**
 * Terminal session tracking
 */
interface TerminalSession {
  id: string;
  name: string;
  processId: number | undefined;
  createdAt: number;
  buffer: string[]; // Circular buffer for recent output
}

/**
 * Message types for WebSocket protocol
 */
interface ServerMessage {
  type:
    | "terminals"
    | "output"
    | "terminal_opened"
    | "terminal_closed"
    | "error"
    | "subscribed"
    | "unsubscribed";
  terminalId?: string;
  terminalName?: string;
  data?: string;
  terminals?: Array<{
    id: string;
    name: string;
    processId: number | undefined;
  }>;
  timestamp: number;
}

interface ClientMessage {
  type: "list" | "subscribe" | "unsubscribe" | "subscribe_all";
  terminalId?: string;
}

/**
 * WebSocket server for streaming terminal output
 */
export class TerminalStreamServer {
  private server?: http.Server;
  private wss?: WebSocketServer;
  private port: number;

  // Terminal tracking
  private terminals: Map<string, TerminalSession> = new Map();
  private terminalDisposables: Map<string, vscode.Disposable[]> = new Map();

  // Client subscriptions: clientId -> Set of terminalIds (or '*' for all)
  private subscriptions: Map<WebSocket, Set<string>> = new Map();

  // Buffer settings
  private readonly MAX_BUFFER_LINES = 100;

  // VS Code event disposables
  private disposables: vscode.Disposable[] = [];

  constructor(private outputChannel: vscode.OutputChannel) {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    this.port = config.get("terminalStreamPort", 9091);
  }

  /**
   * Start the WebSocket server and begin monitoring terminals
   */
  async start(): Promise<void> {
    if (this.wss) {
      this.outputChannel.appendLine("Terminal stream server already running");
      return;
    }

    return new Promise((resolve, reject) => {
      // Create HTTP server for WebSocket upgrade
      this.server = http.createServer((req, res) => {
        // Simple health check endpoint
        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ok",
              terminals: this.terminals.size,
              clients: this.subscriptions.size,
              timestamp: Date.now(),
            })
          );
          return;
        }

        res.writeHead(426, { "Content-Type": "text/plain" });
        res.end("Upgrade required - this is a WebSocket server");
      });

      // Create WebSocket server
      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on("connection", (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.wss.on("error", (error) => {
        this.outputChannel.appendLine(`WebSocket server error: ${error}`);
      });

      this.server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          this.outputChannel.appendLine(
            `Terminal stream port ${this.port} is already in use`
          );
          vscode.window.showErrorMessage(
            `Terminal stream port ${this.port} is in use. Change port in settings.`
          );
        }
        reject(error);
      });

      this.server.listen(this.port, () => {
        this.outputChannel.appendLine(
          `Terminal stream server listening on ws://localhost:${this.port}`
        );

        // Start monitoring existing terminals
        this.initializeTerminalMonitoring();

        resolve();
      });
    });
  }

  /**
   * Stop the WebSocket server and cleanup
   */
  async stop(): Promise<void> {
    // Cleanup terminal monitoring
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    this.terminalDisposables.forEach((disposables) => {
      disposables.forEach((d) => d.dispose());
    });
    this.terminalDisposables.clear();

    // Close all WebSocket connections
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        client.close(1000, "Server shutting down");
      });
      this.wss.close();
      this.wss = undefined;
    }

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.outputChannel.appendLine("Terminal stream server stopped");
          this.server = undefined;
          resolve();
        });
      });
    }
  }

  /**
   * Update configuration (called when settings change)
   */
  updateConfig(): void {
    const config = vscode.workspace.getConfiguration("webhookCopilot");
    const newPort = config.get("terminalStreamPort", 9091);

    if (newPort !== this.port && this.server) {
      this.outputChannel.appendLine(
        `Terminal stream port changed to ${newPort}, restart required`
      );
    }
  }

  /**
   * Initialize monitoring for all terminals
   */
  private initializeTerminalMonitoring(): void {
    // Track existing terminals
    vscode.window.terminals.forEach((terminal) => {
      this.trackTerminal(terminal);
    });

    // Listen for new terminals
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.outputChannel.appendLine(`Terminal opened: ${terminal.name}`);
        this.trackTerminal(terminal);
        this.broadcastTerminalOpened(terminal);
      })
    );

    // Listen for closed terminals
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        this.outputChannel.appendLine(`Terminal closed: ${terminal.name}`);
        this.untrackTerminal(terminal);
        this.broadcastTerminalClosed(terminal);
      })
    );

    // Listen for terminal data (proposed API - requires terminalDataWriteEvent)
    // This captures all output from terminal processes
    if (typeof vscode.window.onDidWriteTerminalData === "function") {
      this.disposables.push(
        vscode.window.onDidWriteTerminalData(
          (event: vscode.TerminalDataWriteEvent) => {
            this.handleTerminalData(event.terminal, event.data);
          }
        )
      );
      this.outputChannel.appendLine(
        "Terminal data streaming enabled (using proposed API)"
      );
    } else {
      this.outputChannel.appendLine(
        "Warning: onDidWriteTerminalData not available - terminal output streaming disabled"
      );
      this.outputChannel.appendLine(
        "Note: This requires VS Code Insiders or enabling proposed APIs"
      );
    }

    this.outputChannel.appendLine(
      `Monitoring ${vscode.window.terminals.length} existing terminal(s)`
    );
  }

  /**
   * Start tracking a terminal
   */
  private async trackTerminal(terminal: vscode.Terminal): Promise<void> {
    const id = this.getTerminalId(terminal);

    if (this.terminals.has(id)) {
      return; // Already tracking
    }

    const processId = await terminal.processId;
    const name = this.getTerminalName(terminal);

    const session: TerminalSession = {
      id,
      name,
      processId,
      createdAt: Date.now(),
      buffer: [],
    };

    this.terminals.set(id, session);
    this.outputChannel.appendLine(`Tracking terminal: ${name} (${id})`);
  }

  /**
   * Stop tracking a terminal
   */
  private untrackTerminal(terminal: vscode.Terminal): void {
    const id = this.getTerminalId(terminal);

    // Cleanup any disposables for this terminal
    const disposables = this.terminalDisposables.get(id);
    if (disposables) {
      disposables.forEach((d) => d.dispose());
      this.terminalDisposables.delete(id);
    }

    this.terminals.delete(id);

    // Remove from all subscriptions
    this.subscriptions.forEach((subs) => {
      subs.delete(id);
    });
  }

  /**
   * Handle incoming terminal data
   */
  private handleTerminalData(terminal: vscode.Terminal, data: string): void {
    const id = this.getTerminalId(terminal);
    const session = this.terminals.get(id);

    if (!session) {
      return;
    }

    // Add to buffer (split by lines, maintain max size)
    const lines = data.split(/\r?\n/);
    lines.forEach((line) => {
      if (line.length > 0) {
        session.buffer.push(line);
        if (session.buffer.length > this.MAX_BUFFER_LINES) {
          session.buffer.shift();
        }
      }
    });

    // Broadcast to subscribed clients
    this.broadcastTerminalOutput(id, terminal.name, data);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const clientIp = req.socket.remoteAddress;
    this.outputChannel.appendLine(`Client connected from ${clientIp}`);

    // Initialize subscription set for this client
    this.subscriptions.set(ws, new Set());

    // Handle incoming messages
    ws.on("message", (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        this.sendError(ws, `Invalid message format: ${error}`);
      }
    });

    // Handle disconnect
    ws.on("close", () => {
      this.outputChannel.appendLine(`Client disconnected from ${clientIp}`);
      this.subscriptions.delete(ws);
    });

    ws.on("error", (error) => {
      this.outputChannel.appendLine(`Client error: ${error}`);
      this.subscriptions.delete(ws);
    });

    // Send welcome message with available terminals
    this.sendTerminalList(ws);
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case "list":
        this.sendTerminalList(ws);
        break;

      case "subscribe":
        if (message.terminalId) {
          this.subscribeToTerminal(ws, message.terminalId);
        } else {
          this.sendError(ws, "terminalId required for subscribe");
        }
        break;

      case "subscribe_all":
        this.subscribeToAll(ws);
        break;

      case "unsubscribe":
        if (message.terminalId) {
          this.unsubscribeFromTerminal(ws, message.terminalId);
        } else {
          this.sendError(ws, "terminalId required for unsubscribe");
        }
        break;

      default:
        this.sendError(ws, `Unknown message type: ${(message as any).type}`);
    }
  }

  /**
   * Subscribe client to a specific terminal
   */
  private subscribeToTerminal(ws: WebSocket, terminalId: string): void {
    const subs = this.subscriptions.get(ws);
    if (!subs) return;

    const session = this.terminals.get(terminalId);
    if (!session) {
      this.sendError(ws, `Terminal not found: ${terminalId}`);
      return;
    }

    subs.add(terminalId);
    this.outputChannel.appendLine(
      `Client subscribed to terminal: ${terminalId}`
    );

    // Send confirmation
    this.send(ws, {
      type: "subscribed",
      terminalId,
      terminalName: session.name,
      timestamp: Date.now(),
    });

    // Send buffered output
    if (session.buffer.length > 0) {
      this.send(ws, {
        type: "output",
        terminalId,
        terminalName: session.name,
        data: session.buffer.join("\n"),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Subscribe client to all terminals (including future ones)
   */
  private subscribeToAll(ws: WebSocket): void {
    const subs = this.subscriptions.get(ws);
    if (!subs) return;

    // Use '*' to indicate subscription to all
    subs.add("*");
    this.outputChannel.appendLine("Client subscribed to all terminals");

    // Send confirmation
    this.send(ws, {
      type: "subscribed",
      terminalId: "*",
      data: "Subscribed to all terminals",
      timestamp: Date.now(),
    });

    // Send buffered output from all terminals
    this.terminals.forEach((session, id) => {
      if (session.buffer.length > 0) {
        this.send(ws, {
          type: "output",
          terminalId: id,
          terminalName: session.name,
          data: session.buffer.join("\n"),
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Unsubscribe client from a terminal
   */
  private unsubscribeFromTerminal(ws: WebSocket, terminalId: string): void {
    const subs = this.subscriptions.get(ws);
    if (!subs) return;

    subs.delete(terminalId);
    this.outputChannel.appendLine(
      `Client unsubscribed from terminal: ${terminalId}`
    );

    this.send(ws, {
      type: "unsubscribed",
      terminalId,
      timestamp: Date.now(),
    });
  }

  /**
   * Send list of available terminals to client
   */
  private sendTerminalList(ws: WebSocket): void {
    const terminals = Array.from(this.terminals.values()).map((session) => ({
      id: session.id,
      name: session.name,
      processId: session.processId,
    }));

    this.send(ws, {
      type: "terminals",
      terminals,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast terminal output to subscribed clients
   */
  private broadcastTerminalOutput(
    terminalId: string,
    terminalName: string,
    data: string
  ): void {
    const message: ServerMessage = {
      type: "output",
      terminalId,
      terminalName,
      data,
      timestamp: Date.now(),
    };

    this.subscriptions.forEach((subs, ws) => {
      // Send if subscribed to this terminal or all terminals
      if (subs.has(terminalId) || subs.has("*")) {
        this.send(ws, message);
      }
    });
  }

  /**
   * Broadcast terminal opened event
   */
  private broadcastTerminalOpened(terminal: vscode.Terminal): void {
    const id = this.getTerminalId(terminal);
    const name = this.getTerminalName(terminal);
    const message: ServerMessage = {
      type: "terminal_opened",
      terminalId: id,
      terminalName: name,
      timestamp: Date.now(),
    };

    this.broadcast(message);
  }

  /**
   * Broadcast terminal closed event
   */
  private broadcastTerminalClosed(terminal: vscode.Terminal): void {
    const id = this.getTerminalId(terminal);
    const name = this.getTerminalName(terminal);
    const message: ServerMessage = {
      type: "terminal_closed",
      terminalId: id,
      terminalName: name,
      timestamp: Date.now(),
    };

    this.broadcast(message);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: ServerMessage): void {
    if (!this.wss) return;

    const data = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, {
      type: "error",
      data: error,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate unique ID for a terminal
   * Uses index and name, with fallback for empty names
   */
  private getTerminalId(terminal: vscode.Terminal): string {
    const index = vscode.window.terminals.indexOf(terminal);
    const name = this.getTerminalName(terminal);
    return `terminal-${index}-${name.replace(/\s+/g, "-").toLowerCase()}`;
  }

  /**
   * Get terminal name with fallback for empty names
   */
  private getTerminalName(terminal: vscode.Terminal): string {
    // Use terminal.name if available
    if (terminal.name && terminal.name.trim().length > 0) {
      return terminal.name;
    }

    // Fallback: try to get shell name from creationOptions
    const options = terminal.creationOptions as
      | vscode.TerminalOptions
      | undefined;
    if (options?.name && options.name.trim().length > 0) {
      return options.name;
    }

    // Fallback: use shell path if available
    if (options?.shellPath) {
      const shellName = options.shellPath.split("/").pop() || "shell";
      return shellName;
    }

    // Final fallback: use index
    const index = vscode.window.terminals.indexOf(terminal);
    return `terminal-${index}`;
  }

  /**
   * Get current status
   */
  getStatus(): {
    running: boolean;
    port: number;
    terminals: number;
    clients: number;
  } {
    return {
      running: !!this.wss,
      port: this.port,
      terminals: this.terminals.size,
      clients: this.subscriptions.size,
    };
  }
}
