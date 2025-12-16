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
exports.TerminalStreamServer = void 0;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const ws_1 = require("ws");
/**
 * WebSocket server for streaming terminal output
 */
class TerminalStreamServer {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        // Terminal tracking
        this.terminals = new Map();
        this.terminalDisposables = new Map();
        // Client subscriptions: clientId -> Set of terminalIds (or '*' for all)
        this.subscriptions = new Map();
        // Buffer settings
        this.MAX_BUFFER_LINES = 100;
        // VS Code event disposables
        this.disposables = [];
        const config = vscode.workspace.getConfiguration("webhookCopilot");
        this.port = config.get("terminalStreamPort", 9091);
    }
    /**
     * Start the WebSocket server and begin monitoring terminals
     */
    async start() {
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
                    res.end(JSON.stringify({
                        status: "ok",
                        terminals: this.terminals.size,
                        clients: this.subscriptions.size,
                        timestamp: Date.now(),
                    }));
                    return;
                }
                res.writeHead(426, { "Content-Type": "text/plain" });
                res.end("Upgrade required - this is a WebSocket server");
            });
            // Create WebSocket server
            this.wss = new ws_1.WebSocketServer({ server: this.server });
            this.wss.on("connection", (ws, req) => {
                this.handleConnection(ws, req);
            });
            this.wss.on("error", (error) => {
                this.outputChannel.appendLine(`WebSocket server error: ${error}`);
            });
            this.server.on("error", (error) => {
                if (error.code === "EADDRINUSE") {
                    this.outputChannel.appendLine(`Terminal stream port ${this.port} is already in use`);
                    vscode.window.showErrorMessage(`Terminal stream port ${this.port} is in use. Change port in settings.`);
                }
                reject(error);
            });
            this.server.listen(this.port, () => {
                this.outputChannel.appendLine(`Terminal stream server listening on ws://localhost:${this.port}`);
                // Start monitoring existing terminals
                this.initializeTerminalMonitoring();
                resolve();
            });
        });
    }
    /**
     * Stop the WebSocket server and cleanup
     */
    async stop() {
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
                this.server.close(() => {
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
    updateConfig() {
        const config = vscode.workspace.getConfiguration("webhookCopilot");
        const newPort = config.get("terminalStreamPort", 9091);
        if (newPort !== this.port && this.server) {
            this.outputChannel.appendLine(`Terminal stream port changed to ${newPort}, restart required`);
        }
    }
    /**
     * Initialize monitoring for all terminals
     */
    initializeTerminalMonitoring() {
        // Track existing terminals
        vscode.window.terminals.forEach((terminal) => {
            this.trackTerminal(terminal);
        });
        // Listen for new terminals
        this.disposables.push(vscode.window.onDidOpenTerminal((terminal) => {
            this.outputChannel.appendLine(`Terminal opened: ${terminal.name}`);
            this.trackTerminal(terminal);
            this.broadcastTerminalOpened(terminal);
        }));
        // Listen for closed terminals
        this.disposables.push(vscode.window.onDidCloseTerminal((terminal) => {
            this.outputChannel.appendLine(`Terminal closed: ${terminal.name}`);
            this.untrackTerminal(terminal);
            this.broadcastTerminalClosed(terminal);
        }));
        // Listen for terminal data (proposed API - requires terminalDataWriteEvent)
        // This captures all output from terminal processes
        if (typeof vscode.window.onDidWriteTerminalData === "function") {
            this.disposables.push(vscode.window.onDidWriteTerminalData((event) => {
                this.handleTerminalData(event.terminal, event.data);
            }));
            this.outputChannel.appendLine("Terminal data streaming enabled (using proposed API)");
        }
        else {
            this.outputChannel.appendLine("Warning: onDidWriteTerminalData not available - terminal output streaming disabled");
            this.outputChannel.appendLine("Note: This requires VS Code Insiders or enabling proposed APIs");
        }
        this.outputChannel.appendLine(`Monitoring ${vscode.window.terminals.length} existing terminal(s)`);
    }
    /**
     * Start tracking a terminal
     */
    async trackTerminal(terminal) {
        const id = this.getTerminalId(terminal);
        if (this.terminals.has(id)) {
            return; // Already tracking
        }
        const processId = await terminal.processId;
        const name = this.getTerminalName(terminal);
        const session = {
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
    untrackTerminal(terminal) {
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
    handleTerminalData(terminal, data) {
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
    handleConnection(ws, req) {
        const clientIp = req.socket.remoteAddress;
        this.outputChannel.appendLine(`Client connected from ${clientIp}`);
        // Initialize subscription set for this client
        this.subscriptions.set(ws, new Set());
        // Handle incoming messages
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(ws, message);
            }
            catch (error) {
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
    handleClientMessage(ws, message) {
        switch (message.type) {
            case "list":
                this.sendTerminalList(ws);
                break;
            case "subscribe":
                if (message.terminalId) {
                    this.subscribeToTerminal(ws, message.terminalId);
                }
                else {
                    this.sendError(ws, "terminalId required for subscribe");
                }
                break;
            case "subscribe_all":
                this.subscribeToAll(ws);
                break;
            case "unsubscribe":
                if (message.terminalId) {
                    this.unsubscribeFromTerminal(ws, message.terminalId);
                }
                else {
                    this.sendError(ws, "terminalId required for unsubscribe");
                }
                break;
            default:
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }
    /**
     * Subscribe client to a specific terminal
     */
    subscribeToTerminal(ws, terminalId) {
        const subs = this.subscriptions.get(ws);
        if (!subs)
            return;
        const session = this.terminals.get(terminalId);
        if (!session) {
            this.sendError(ws, `Terminal not found: ${terminalId}`);
            return;
        }
        subs.add(terminalId);
        this.outputChannel.appendLine(`Client subscribed to terminal: ${terminalId}`);
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
    subscribeToAll(ws) {
        const subs = this.subscriptions.get(ws);
        if (!subs)
            return;
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
    unsubscribeFromTerminal(ws, terminalId) {
        const subs = this.subscriptions.get(ws);
        if (!subs)
            return;
        subs.delete(terminalId);
        this.outputChannel.appendLine(`Client unsubscribed from terminal: ${terminalId}`);
        this.send(ws, {
            type: "unsubscribed",
            terminalId,
            timestamp: Date.now(),
        });
    }
    /**
     * Send list of available terminals to client
     */
    sendTerminalList(ws) {
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
    broadcastTerminalOutput(terminalId, terminalName, data) {
        const message = {
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
    broadcastTerminalOpened(terminal) {
        const id = this.getTerminalId(terminal);
        const name = this.getTerminalName(terminal);
        const message = {
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
    broadcastTerminalClosed(terminal) {
        const id = this.getTerminalId(terminal);
        const name = this.getTerminalName(terminal);
        const message = {
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
    broadcast(message) {
        if (!this.wss)
            return;
        const data = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
    /**
     * Send message to specific client
     */
    send(ws, message) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    /**
     * Send error message to client
     */
    sendError(ws, error) {
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
    getTerminalId(terminal) {
        const index = vscode.window.terminals.indexOf(terminal);
        const name = this.getTerminalName(terminal);
        return `terminal-${index}-${name.replace(/\s+/g, "-").toLowerCase()}`;
    }
    /**
     * Get terminal name with fallback for empty names
     */
    getTerminalName(terminal) {
        // Use terminal.name if available
        if (terminal.name && terminal.name.trim().length > 0) {
            return terminal.name;
        }
        // Fallback: try to get shell name from creationOptions
        const options = terminal.creationOptions;
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
    getStatus() {
        return {
            running: !!this.wss,
            port: this.port,
            terminals: this.terminals.size,
            clients: this.subscriptions.size,
        };
    }
}
exports.TerminalStreamServer = TerminalStreamServer;
//# sourceMappingURL=terminalStreamServer.js.map