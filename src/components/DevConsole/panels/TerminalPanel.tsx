/**
 * Terminal Stream Panel
 * Real-time terminal output viewer for VS Code terminals
 * Connects via WebSocket to the Terminal Stream API
 */

import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Clipboard,
    Eye,
    EyeOff,
    Loader2,
    Monitor,
    Play,
    Plus,
    Settings,
    Square,
    Terminal,
    Trash2,
    Wifi,
    WifiOff,
    Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../../utils";
import {
    TerminalOutputLine,
    useTerminalStreamStore,
} from "../../../utils/stores/terminalStream";

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_COLORS = {
  connected: "text-green-500",
  connecting: "text-blue-500",
  disconnected: "text-gray-400",
  error: "text-red-500",
} as const;

const STATUS_BG_COLORS = {
  connected: "bg-green-500/10 border-green-500/30",
  connecting: "bg-blue-500/10 border-blue-500/30",
  disconnected: "bg-gray-500/10 border-gray-500/30",
  error: "bg-red-500/10 border-red-500/30",
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${time}.${ms}`;
}

/**
 * Parse ANSI codes and convert to styled spans
 * Basic implementation for common color codes
 */
function parseAnsi(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // eslint-disable-next-line no-control-regex
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentStyles: string[] = [];
  let match;
  let keyCounter = 0;

  const styleMap: Record<string, string> = {
    "0": "", // Reset
    "1": "font-bold",
    "2": "opacity-60",
    "3": "italic",
    "4": "underline",
    "30": "text-gray-900 dark:text-gray-100",
    "31": "text-red-500",
    "32": "text-green-500",
    "33": "text-yellow-500",
    "34": "text-blue-500",
    "35": "text-purple-500",
    "36": "text-cyan-500",
    "37": "text-white",
    "90": "text-gray-500",
    "91": "text-red-400",
    "92": "text-green-400",
    "93": "text-yellow-400",
    "94": "text-blue-400",
    "95": "text-purple-400",
    "96": "text-cyan-400",
    "97": "text-gray-100",
  };

  while ((match = regex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push(
          <span key={keyCounter++} className={currentStyles.join(" ")}>
            {textBefore}
          </span>
        );
      }
    }

    // Process escape sequence
    const codes = match[1].split(";");
    codes.forEach((code) => {
      if (code === "0" || code === "") {
        currentStyles = [];
      } else if (styleMap[code]) {
        currentStyles.push(styleMap[code]);
      }
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) {
      parts.push(
        <span key={keyCounter++} className={currentStyles.join(" ")}>
          {remaining}
        </span>
      );
    }
  }

  return parts.length > 0 ? parts : [text];
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Connection status indicator
 */
const ConnectionStatus = memo(function ConnectionStatus() {
  const { connectionStatus, lastError, connect, disconnect } =
    useTerminalStreamStore();

  const StatusIcon =
    connectionStatus === "connected"
      ? Wifi
      : connectionStatus === "connecting"
        ? Loader2
        : WifiOff;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium",
          STATUS_BG_COLORS[connectionStatus]
        )}
      >
        <StatusIcon
          className={cn(
            "w-3.5 h-3.5",
            STATUS_COLORS[connectionStatus],
            connectionStatus === "connecting" && "animate-spin"
          )}
        />
        <span className={STATUS_COLORS[connectionStatus]}>
          {connectionStatus === "connected"
            ? "Connected"
            : connectionStatus === "connecting"
              ? "Connecting..."
              : connectionStatus === "error"
                ? "Error"
                : "Disconnected"}
        </span>
      </div>

      {lastError && (
        <div
          className="text-xs text-red-500 truncate max-w-[200px]"
          title={lastError}
        >
          {lastError}
        </div>
      )}

      {connectionStatus === "disconnected" || connectionStatus === "error" ? (
        <button
          onClick={connect}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title="Connect"
        >
          <Play className="w-4 h-4" />
        </button>
      ) : connectionStatus === "connected" ? (
        <button
          onClick={disconnect}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title="Disconnect"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
});

/**
 * Terminal selector dropdown with create terminal option
 */
const TerminalSelector = memo(function TerminalSelector() {
  const { terminals, activeTerminalId, setActiveTerminal, terminalStates, isSubscribedToAll, lastMessageTime, connectionStatus, createTerminal } =
    useTerminalStreamStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);
  const activeState = activeTerminalId ? terminalStates[activeTerminalId] : null;
  const activeLineCount = activeState?.outputLines.length || 0;
  const isActiveManaged = activeState?.isManaged || false;
  
  // Check if we received a message recently (within last 5 seconds)
  const isLive = lastMessageTime && (Date.now() - lastMessageTime) < 5000;

  const handleCreateTerminal = useCallback(() => {
    setIsCreating(true);
    createTerminal({ terminalName: `DevConsole Terminal ${terminals.filter(t => terminalStates[t.id]?.isManaged).length + 1}` });
    setTimeout(() => setIsCreating(false), 2000);
    setIsOpen(false);
  }, [createTerminal, terminals, terminalStates]);

  if (connectionStatus !== "connected") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm">
        <Terminal className="w-4 h-4" />
        <span>Not connected</span>
      </div>
    );
  }

  if (terminals.length === 0) {
    return (
      <button
        onClick={handleCreateTerminal}
        disabled={isCreating}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50"
      >
        {isCreating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        <span>Create Terminal</span>
      </button>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {/* Subscription status indicator */}
      {isSubscribedToAll && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isLive ? "bg-green-500 animate-pulse" : "bg-green-500/50"
          )} />
          <span className="text-green-600 dark:text-green-400">Live</span>
        </div>
      )}
      
      {/* Managed terminal badge */}
      {isActiveManaged && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs">
          <Zap className="w-3 h-3 text-purple-500" />
          <span className="text-purple-600 dark:text-purple-400">Managed</span>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
      >
        <Terminal className="w-4 h-4" />
        <span className="truncate max-w-[150px]">
          {activeTerminal?.name || "Select terminal"}
        </span>
        {activeLineCount > 0 && (
          <span className="text-xs text-gray-400">({activeLineCount})</span>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden"
            >
              {/* Header with create button */}
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {isSubscribedToAll ? "📡 Streaming all terminals" : "Select a terminal"}
                </div>
                <button
                  onClick={handleCreateTerminal}
                  disabled={isCreating}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  New
                </button>
              </div>
              
              {/* Terminal list */}
              <div className="max-h-64 overflow-y-auto">
                {terminals.map((terminal) => {
                  const state = terminalStates[terminal.id];
                  const lineCount = state?.outputLines.length || 0;
                  const isActive = activeTerminalId === terminal.id;
                  const isManaged = state?.isManaged || terminal.id.startsWith("managed-");

                return (
                  <button
                    key={terminal.id}
                    onClick={() => {
                      setActiveTerminal(terminal.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isManaged 
                        ? "bg-gradient-to-br from-purple-500 to-blue-600 text-white"
                        : isActive 
                          ? "bg-primary text-white" 
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      {isManaged ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Terminal className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-medium truncate flex items-center gap-1.5",
                        isActive ? "text-primary" : "text-gray-900 dark:text-gray-100"
                      )}>
                        {terminal.name}
                        {isManaged && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-normal">
                            managed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {terminal.id}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end">
                      <span className={cn(
                        "text-xs font-medium",
                        lineCount > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"
                      )}>
                        {lineCount} lines
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-primary">viewing</span>
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Terminal output line component
 */
const OutputLine = memo(function OutputLine({
  line,
  showTimestamp,
}: {
  line: TerminalOutputLine;
  showTimestamp: boolean;
}) {
  return (
    <div className="flex font-mono text-xs leading-relaxed hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {showTimestamp && (
        <span className="flex-shrink-0 w-24 text-gray-400 dark:text-gray-500 select-none pr-2 border-r border-gray-200 dark:border-gray-700 mr-2">
          {formatTimestamp(line.timestamp)}
        </span>
      )}
      <pre className="flex-1 whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">
        {parseAnsi(line.data)}
      </pre>
    </div>
  );
});

/**
 * Terminal output viewer
 */
const TerminalOutput = memo(function TerminalOutput() {
  const { activeTerminalId, terminalStates } =
    useTerminalStreamStore();
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  const outputLines = activeTerminalId
    ? terminalStates[activeTerminalId]?.outputLines || []
    : [];

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines.length, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!outputRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  if (!activeTerminalId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            No Terminal Selected
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect to VS Code and select a terminal to view output
          </p>
        </div>
      </div>
    );
  }

  if (outputLines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Waiting for Output
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Terminal output will appear here in real-time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Output toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{outputLines.length} lines</span>
          {!autoScroll && (
            <span className="text-amber-500">(scroll paused)</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showTimestamps
                ? "bg-primary/10 text-primary"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            )}
            title={showTimestamps ? "Hide timestamps" : "Show timestamps"}
          >
            {showTimestamps ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => {
              setAutoScroll(true);
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            }}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              autoScroll
                ? "bg-primary/10 text-primary"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            )}
            title="Auto-scroll"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output content */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-3 bg-gray-900 text-gray-100"
      >
        {outputLines.map((line) => (
          <OutputLine
            key={line.id}
            line={line}
            showTimestamp={showTimestamps}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Settings panel
 */
const SettingsPanel = memo(function SettingsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    maxLinesPerTerminal,
    setMaxLinesPerTerminal,
    stripAnsiCodes,
    setStripAnsiCodes,
    autoSubscribeOnConnect,
    setAutoSubscribeOnConnect,
    autoConnectOnMount,
    setAutoConnectOnMount,
  } = useTerminalStreamStore();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 overflow-y-auto"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Terminal Stream Settings
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Max lines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Lines Per Terminal
            </label>
            <input
              type="number"
              value={maxLinesPerTerminal}
              onChange={(e) =>
                setMaxLinesPerTerminal(
                  Math.max(100, parseInt(e.target.value) || 1000)
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              min={100}
              max={10000}
            />
            <p className="text-xs text-gray-500 mt-1">
              Older lines will be removed when limit is reached
            </p>
          </div>

          {/* Strip ANSI codes */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Strip ANSI Codes
              </label>
              <p className="text-xs text-gray-500">
                Remove color and formatting codes
              </p>
            </div>
            <button
              onClick={() => setStripAnsiCodes(!stripAnsiCodes)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors",
                stripAnsiCodes ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow transition-transform",
                  stripAnsiCodes ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Auto subscribe */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-Subscribe
              </label>
              <p className="text-xs text-gray-500">
                Subscribe to all terminals on connect
              </p>
            </div>
            <button
              onClick={() =>
                setAutoSubscribeOnConnect(!autoSubscribeOnConnect)
              }
              className={cn(
                "w-11 h-6 rounded-full transition-colors",
                autoSubscribeOnConnect
                  ? "bg-primary"
                  : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow transition-transform",
                  autoSubscribeOnConnect ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Auto connect */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-Connect
              </label>
              <p className="text-xs text-gray-500">
                Connect automatically when panel opens
              </p>
            </div>
            <button
              onClick={() => setAutoConnectOnMount(!autoConnectOnMount)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors",
                autoConnectOnMount
                  ? "bg-primary"
                  : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow transition-transform",
                  autoConnectOnMount ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TerminalPanel() {
  const {
    connectionStatus,
    connect,
    terminals,
    activeTerminalId,
    clearTerminalOutput,
    totalMessagesReceived,
    autoConnectOnMount,
    createTerminal,
  } = useTerminalStreamStore();

  const [showSettings, setShowSettings] = useState(false);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnectOnMount && connectionStatus === "disconnected") {
      connect();
    }
  }, [autoConnectOnMount, connectionStatus, connect]);

  // Handle create terminal
  const handleCreateTerminal = useCallback(() => {
    setIsCreatingTerminal(true);
    createTerminal({ terminalName: `DevConsole Terminal` });
    setNotification({ type: "info", message: "Creating terminal..." });
    setTimeout(() => {
      setIsCreatingTerminal(false);
      setNotification(null);
    }, 2000);
  }, [createTerminal]);

  // Copy terminal output to clipboard
  const handleCopyOutput = useCallback(async () => {
    const store = useTerminalStreamStore.getState();
    const output = store.getActiveTerminalOutput();

    if (output.length === 0) {
      setNotification({ type: "info", message: "No output to copy" });
      return;
    }

    const text = output.map((line) => line.data).join("");

    try {
      await navigator.clipboard.writeText(text);
      setNotification({ type: "success", message: "Output copied!" });
    } catch {
      setNotification({ type: "error", message: "Failed to copy" });
    }

    setTimeout(() => setNotification(null), 2000);
  }, []);

  // Clear current terminal
  const handleClear = useCallback(() => {
    if (activeTerminalId) {
      clearTerminalOutput(activeTerminalId);
      setNotification({ type: "info", message: "Terminal cleared" });
      setTimeout(() => setNotification(null), 2000);
    }
  }, [activeTerminalId, clearTerminalOutput]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Terminal Stream
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {terminals.length} terminal{terminals.length !== 1 ? "s" : ""} •{" "}
                {totalMessagesReceived} messages
              </p>
            </div>
          </div>

          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-2">
          <TerminalSelector />

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

          <button
            onClick={handleCopyOutput}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="Copy output"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <button
            onClick={handleClear}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium",
              notification.type === "success" &&
                "bg-green-500 text-white",
              notification.type === "error" && "bg-red-500 text-white",
              notification.type === "info" &&
                "bg-blue-500 text-white"
            )}
          >
            {notification.type === "success" && (
              <CheckCircle className="w-4 h-4" />
            )}
            {notification.type === "error" && (
              <AlertCircle className="w-4 h-4" />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection prompt */}
      {connectionStatus === "disconnected" && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <Terminal className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Connect to VS Code
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Stream real-time terminal output from VS Code to view commands,
              build logs, and more directly in DevConsole.
            </p>

            <button
              onClick={connect}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-600 hover:to-blue-700 transition-colors shadow-lg shadow-blue-500/25"
            >
              <Wifi className="w-5 h-5" />
              Connect to Terminal Stream
            </button>

            <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-left">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Prerequisites
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Webhook Copilot extension installed in VS Code</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Terminal Stream enabled (port 9091)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>VS Code running with workspace open</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Connected but no terminals - show create terminal prompt */}
      {connectionStatus === "connected" && terminals.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Create a Managed Terminal
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a managed terminal to get <strong>guaranteed output streaming</strong>. 
              This bypasses VS Code's proposed API limitations for reliable real-time output.
            </p>

            <button
              onClick={handleCreateTerminal}
              disabled={isCreatingTerminal}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white font-medium hover:from-purple-600 hover:to-blue-700 transition-colors shadow-lg shadow-purple-500/25 disabled:opacity-50"
            >
              {isCreatingTerminal ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              Create Terminal
            </button>

            <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-left">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                What are Managed Terminals?
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Full output capture guaranteed</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Auto-subscribed on creation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Real-time streaming via WebSocket</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Connected with terminals - show terminal output */}
      {connectionStatus === "connected" && terminals.length > 0 && <TerminalOutput />}

      {/* Connecting state */}
      {connectionStatus === "connecting" && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-cyan-500 animate-spin" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connecting...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Establishing connection to Terminal Stream server
            </p>
          </div>
        </div>
      )}

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
