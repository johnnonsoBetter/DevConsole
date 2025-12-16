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
exports.ManagedTerminalManager = exports.ManagedPseudoterminal = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const pty = __importStar(require("node-pty"));
/**
 * Managed Pseudoterminal using node-pty for full PTY support
 */
class ManagedPseudoterminal {
    constructor(id, name, onOutput, onStateChange, outputChannel, shellPath, cwd, env) {
        this.id = id;
        this.name = name;
        this.onOutput = onOutput;
        this.onStateChange = onStateChange;
        this.outputChannel = outputChannel;
        this.shellPath = shellPath;
        this.cwd = cwd;
        this.env = env;
        this.writeEmitter = new vscode.EventEmitter();
        this.closeEmitter = new vscode.EventEmitter();
        this.onDidWrite = this.writeEmitter.event;
        this.onDidClose = this.closeEmitter.event;
        this.outputBuffer = [];
        this.maxBufferLines = 100;
    }
    open(initialDimensions) {
        // Determine shell to use
        const defaultShell = this.getDefaultShell();
        const shellToUse = this.shellPath || defaultShell;
        const cols = initialDimensions?.columns || 80;
        const rows = initialDimensions?.rows || 24;
        this.outputChannel.appendLine(`[ManagedTerminal] Starting shell: ${shellToUse}`);
        this.outputChannel.appendLine(`[ManagedTerminal] Working directory: ${this.cwd || os.homedir()}`);
        this.outputChannel.appendLine(`[ManagedTerminal] Dimensions: ${cols}x${rows}`);
        try {
            // Spawn PTY process using node-pty
            this.ptyProcess = pty.spawn(shellToUse, [], {
                name: "xterm-256color",
                cols,
                rows,
                cwd: this.cwd || os.homedir(),
                env: { ...process.env, ...this.env },
            });
            this.outputChannel.appendLine(`[ManagedTerminal] PTY process started with PID: ${this.ptyProcess.pid}`);
            // Capture output from PTY
            this.ptyProcess.onData((data) => {
                this.handleOutput(data);
                this.writeEmitter.fire(data);
            });
            // Handle PTY exit
            this.ptyProcess.onExit(({ exitCode, signal }) => {
                this.outputChannel.appendLine(`[ManagedTerminal] PTY exited with code: ${exitCode}, signal: ${signal}`);
                this.onStateChange({
                    terminalId: this.id,
                    terminalName: this.name,
                    state: "closed",
                    exitCode: exitCode,
                    timestamp: Date.now(),
                });
                this.closeEmitter.fire(exitCode);
            });
            // Notify that terminal is open
            this.onStateChange({
                terminalId: this.id,
                terminalName: this.name,
                state: "opened",
                timestamp: Date.now(),
            });
            this.outputChannel.appendLine(`[ManagedTerminal] Terminal opened: ${this.name} (${this.id})`);
        }
        catch (error) {
            this.outputChannel.appendLine(`[ManagedTerminal] Failed to spawn PTY: ${error}`);
            this.writeEmitter.fire(`\r\nFailed to start terminal: ${error}\r\n`);
            this.closeEmitter.fire(1);
        }
    }
    handleInput(data) {
        if (this.ptyProcess) {
            this.ptyProcess.write(data);
        }
    }
    close() {
        this.outputChannel.appendLine(`[ManagedTerminal] Closing terminal: ${this.name}`);
        if (this.ptyProcess) {
            this.ptyProcess.kill();
            this.ptyProcess = undefined;
        }
    }
    setDimensions(dimensions) {
        if (this.ptyProcess) {
            this.ptyProcess.resize(dimensions.columns, dimensions.rows);
        }
    }
    /**
     * Handle output - buffer and emit event
     */
    handleOutput(output) {
        // Add to buffer
        const lines = output.split(/\r?\n/);
        lines.forEach((line) => {
            if (line.length > 0) {
                this.outputBuffer.push(line);
                if (this.outputBuffer.length > this.maxBufferLines) {
                    this.outputBuffer.shift();
                }
            }
        });
        // Emit output event
        this.onOutput({
            terminalId: this.id,
            terminalName: this.name,
            data: output,
            timestamp: Date.now(),
        });
    }
    /**
     * Get buffered output history
     */
    getOutputHistory() {
        return [...this.outputBuffer];
    }
    /**
     * Get the default shell for the current platform
     */
    getDefaultShell() {
        if (process.platform === "win32") {
            return process.env.COMSPEC || "cmd.exe";
        }
        return process.env.SHELL || "/bin/zsh";
    }
    /**
     * Check if terminal is still running
     */
    isRunning() {
        return this.ptyProcess !== undefined;
    }
}
exports.ManagedPseudoterminal = ManagedPseudoterminal;
/**
 * Manager for creating and tracking managed terminals
 */
class ManagedTerminalManager {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.terminals = new Map();
        this.vscodeTerminals = new Map();
        this.terminalCounter = 0;
        // Event emitters for external listeners
        this.outputEmitter = new vscode.EventEmitter();
        this.stateEmitter = new vscode.EventEmitter();
        this.onOutput = this.outputEmitter.event;
        this.onStateChange = this.stateEmitter.event;
    }
    /**
     * Create a new managed terminal
     */
    createTerminal(options) {
        const id = `managed-${++this.terminalCounter}`;
        const name = options?.name || `Terminal ${this.terminalCounter}`;
        this.outputChannel.appendLine(`[ManagedTerminalManager] Creating terminal: ${name} (${id})`);
        const pty = new ManagedPseudoterminal(id, name, (event) => this.outputEmitter.fire(event), (event) => {
            this.stateEmitter.fire(event);
            if (event.state === "closed") {
                this.terminals.delete(id);
                this.vscodeTerminals.delete(id);
            }
        }, this.outputChannel, options?.shellPath, options?.cwd, options?.env);
        const terminal = vscode.window.createTerminal({
            name,
            pty,
        });
        this.terminals.set(id, pty);
        this.vscodeTerminals.set(id, terminal);
        if (options?.show !== false) {
            terminal.show();
        }
        return { terminal, id };
    }
    /**
     * Get terminal by ID
     */
    getTerminal(id) {
        return this.vscodeTerminals.get(id);
    }
    /**
     * Get terminal output history
     */
    getOutputHistory(id) {
        const pty = this.terminals.get(id);
        return pty?.getOutputHistory() || [];
    }
    /**
     * List all managed terminals
     */
    listTerminals() {
        const list = [];
        this.terminals.forEach((pty, id) => {
            list.push({
                id,
                name: pty.name,
                running: pty.isRunning(),
            });
        });
        return list;
    }
    /**
     * Close a terminal by ID
     */
    closeTerminal(id) {
        const terminal = this.vscodeTerminals.get(id);
        if (terminal) {
            terminal.dispose();
            return true;
        }
        return false;
    }
    /**
     * Close all managed terminals
     */
    closeAll() {
        this.vscodeTerminals.forEach((terminal) => {
            terminal.dispose();
        });
        this.terminals.clear();
        this.vscodeTerminals.clear();
    }
    /**
     * Dispose the manager
     */
    dispose() {
        this.closeAll();
        this.outputEmitter.dispose();
        this.stateEmitter.dispose();
    }
}
exports.ManagedTerminalManager = ManagedTerminalManager;
//# sourceMappingURL=managedTerminal.js.map