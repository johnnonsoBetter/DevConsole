/**
 * Terminal Stream Service
 * WebSocket client for receiving real-time terminal output from VS Code
 * Connects to the Terminal Stream API running in the Webhook Copilot extension
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TerminalInfo {
  id: string;
  name: string;
  processId?: number;
  isManaged?: boolean; // true for managed terminals created via create_terminal
}

export interface CreateTerminalOptions {
  terminalName?: string;
  cwd?: string;
}

export interface TerminalOutput {
  terminalId: string;
  terminalName: string;
  data: string;
  timestamp: number;
}

export type TerminalStreamMessageType =
  | "terminals"
  | "output"
  | "terminal_opened"
  | "terminal_closed"
  | "terminal_created"
  | "subscribed"
  | "unsubscribed"
  | "error";

export interface TerminalStreamMessage {
  type: TerminalStreamMessageType;
  timestamp: number;
  terminals?: TerminalInfo[];
  terminalId?: string;
  terminalName?: string;
  data?: string;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface TerminalStreamEvents {
  onConnect: () => void;
  onDisconnect: (reason?: string) => void;
  onTerminals: (terminals: TerminalInfo[]) => void;
  onOutput: (output: TerminalOutput) => void;
  onTerminalOpened: (terminal: TerminalInfo) => void;
  onTerminalClosed: (terminalId: string, terminalName: string) => void;
  onTerminalCreated: (terminal: TerminalInfo) => void; // Managed terminal created
  onSubscribed: (terminalId: string) => void;
  onUnsubscribed: (terminalId: string) => void;
  onError: (error: string) => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TERMINAL_STREAM_URL = "ws://localhost:9091";
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const HEALTH_CHECK_URL = "http://localhost:9091/health";

// ============================================================================
// TERMINAL STREAM SERVICE
// ============================================================================

export class TerminalStreamService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Partial<TerminalStreamEvents> = {};
  private _connectionStatus: ConnectionStatus = "disconnected";
  private autoReconnect = true;
  private subscribedTerminals: Set<string> = new Set();
  private isSubscribedToAll = false;

  constructor(url: string = DEFAULT_TERMINAL_STREAM_URL) {
    this.url = url;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Connect to the Terminal Stream WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[TerminalStream] Already connected");
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log("[TerminalStream] Connection already in progress");
      return;
    }

    this.setConnectionStatus("connecting");
    console.log(`[TerminalStream] Connecting to ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error("[TerminalStream] Failed to create WebSocket:", error);
      this.setConnectionStatus("error");
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the Terminal Stream server
   */
  disconnect(): void {
    this.autoReconnect = false;
    this.clearReconnectTimer();

    if (this.ws) {
      console.log("[TerminalStream] Disconnecting...");
      this.ws.close(1000, "Client requested disconnect");
      this.ws = null;
    }

    this.subscribedTerminals.clear();
    this.isSubscribedToAll = false;
    this.setConnectionStatus("disconnected");
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  // ============================================================================
  // MESSAGE SENDING
  // ============================================================================

  /**
   * Request list of available terminals
   */
  listTerminals(): void {
    this.send({ type: "list" });
  }

  /**
   * Subscribe to a specific terminal's output
   */
  subscribe(terminalId: string): void {
    if (this.subscribedTerminals.has(terminalId)) {
      console.log(`[TerminalStream] Already subscribed to ${terminalId}`);
      return;
    }
    this.send({ type: "subscribe", terminalId });
  }

  /**
   * Subscribe to all terminals (including future ones)
   */
  subscribeAll(): void {
    if (this.isSubscribedToAll) {
      console.log("[TerminalStream] Already subscribed to all terminals");
      return;
    }
    console.log("[TerminalStream] Sending subscribe_all");
    this.send({ type: "subscribe_all" });
  }

  /**
   * Create a managed terminal with guaranteed output streaming
   * This is the recommended way to get reliable terminal output
   */
  createTerminal(options: CreateTerminalOptions = {}): void {
    console.log("[TerminalStream] Creating managed terminal:", options);
    this.send({
      type: "create_terminal",
      terminalName: options.terminalName || "DevConsole Terminal",
      cwd: options.cwd,
    });
  }

  /**
   * Send input to a terminal
   */
  sendInput(terminalId: string, data: string): void {
    this.send({
      type: "input",
      terminalId,
      data,
    });
  }

  /**
   * Unsubscribe from a specific terminal
   */
  unsubscribe(terminalId: string): void {
    this.send({ type: "unsubscribe", terminalId });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Register event handlers
   */
  on<K extends keyof TerminalStreamEvents>(
    event: K,
    handler: TerminalStreamEvents[K]
  ): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Remove an event handler
   */
  off<K extends keyof TerminalStreamEvents>(event: K): void {
    delete this.eventHandlers[event];
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Check if Terminal Stream server is running
   */
  async checkHealth(): Promise<{
    available: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(HEALTH_CHECK_URL, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          status: data.status || "ok",
        };
      }

      return {
        available: false,
        error: `Server responded with status ${response.status}`,
      };
    } catch (error) {
      return {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach Terminal Stream server",
      };
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Update the WebSocket URL
   */
  setUrl(url: string): void {
    const wasConnected = this.isConnected();
    if (wasConnected) {
      this.disconnect();
    }
    this.url = url;
    this.autoReconnect = true;
    if (wasConnected) {
      this.connect();
    }
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.url;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("[TerminalStream] Connected");
      this.reconnectAttempts = 0;
      this.setConnectionStatus("connected");
      this.eventHandlers.onConnect?.();
    };

    this.ws.onclose = (event) => {
      console.log(
        `[TerminalStream] Disconnected: ${event.code} ${event.reason}`
      );
      this.subscribedTerminals.clear();
      this.isSubscribedToAll = false;

      if (this._connectionStatus !== "disconnected") {
        this.setConnectionStatus("disconnected");
        this.eventHandlers.onDisconnect?.(event.reason || "Connection closed");
      }

      if (this.autoReconnect && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("[TerminalStream] WebSocket error:", error);
      this.setConnectionStatus("error");
      this.eventHandlers.onError?.("WebSocket connection error");
    };

    this.ws.onmessage = (event) => {
      try {
        const message: TerminalStreamMessage = JSON.parse(event.data);
        console.log("[TerminalStream] Received:", message.type, message);
        this.handleMessage(message);
      } catch (error) {
        console.error("[TerminalStream] Failed to parse message:", error);
      }
    };
  }

  private handleMessage(message: TerminalStreamMessage): void {
    switch (message.type) {
      case "terminals":
        if (message.terminals) {
          this.eventHandlers.onTerminals?.(message.terminals);
        }
        break;

      case "output":
        if (message.terminalId && message.data !== undefined) {
          this.eventHandlers.onOutput?.({
            terminalId: message.terminalId,
            terminalName: message.terminalName || "Unknown",
            data: message.data,
            timestamp: message.timestamp,
          });
        }
        break;

      case "terminal_opened":
        if (message.terminalId) {
          // Check if this is a managed terminal (ID starts with "managed-")
          const isManaged = message.terminalId.startsWith("managed-");
          if (isManaged) {
            this.subscribedTerminals.add(message.terminalId);
            this.eventHandlers.onTerminalCreated?.({
              id: message.terminalId,
              name: message.terminalName || "Managed Terminal",
              isManaged: true,
            });
          } else {
            this.eventHandlers.onTerminalOpened?.({
              id: message.terminalId,
              name: message.terminalName || "Unknown",
            });
          }
        }
        break;

      case "terminal_closed":
        if (message.terminalId) {
          this.subscribedTerminals.delete(message.terminalId);
          this.eventHandlers.onTerminalClosed?.(
            message.terminalId,
            message.terminalName || "Unknown"
          );
        }
        break;

      case "terminal_created":
        // Managed terminal created - auto-subscribed, output streaming immediately
        if (message.terminalId) {
          this.subscribedTerminals.add(message.terminalId);
          this.eventHandlers.onTerminalCreated?.({
            id: message.terminalId,
            name: message.terminalName || "Managed Terminal",
            isManaged: true,
          });
        }
        break;

      case "subscribed":
        if (message.terminalId) {
          if (message.terminalId === "*") {
            this.isSubscribedToAll = true;
          } else {
            this.subscribedTerminals.add(message.terminalId);
          }
          this.eventHandlers.onSubscribed?.(message.terminalId);
        }
        break;

      case "unsubscribed":
        if (message.terminalId) {
          this.subscribedTerminals.delete(message.terminalId);
          this.eventHandlers.onUnsubscribed?.(message.terminalId);
        }
        break;

      case "error":
        this.eventHandlers.onError?.(message.data || "Unknown error");
        break;

      default:
        console.warn("[TerminalStream] Unknown message type:", message.type);
    }
  }

  private send(data: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "[TerminalStream] Cannot send - not connected, readyState:",
        this.ws?.readyState
      );
      return;
    }

    try {
      console.log("[TerminalStream] Sending message:", data);
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error("[TerminalStream] Failed to send message:", error);
    }
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    this._connectionStatus = status;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log("[TerminalStream] Max reconnect attempts reached");
      return;
    }

    this.clearReconnectTimer();

    const delay = RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts);
    console.log(
      `[TerminalStream] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const terminalStream = new TerminalStreamService();

// Load saved Terminal Stream URL from storage on initialization
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get(["terminalStreamUrl"], (result) => {
    if (result.terminalStreamUrl) {
      terminalStream.setUrl(result.terminalStreamUrl);
    }
  });
}
