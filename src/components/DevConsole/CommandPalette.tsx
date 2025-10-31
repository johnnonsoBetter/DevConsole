import { motion, AnimatePresence } from "framer-motion";
import {
  Command,
  Trash2,
  Download,
  RotateCcw,
  Settings,
  Terminal,
  Database,
  Zap,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDevConsoleStore } from "../../utils/stores/devConsole";
import { cn } from "../../utils";

// ============================================================================
// COMMAND PALETTE
// Cmd+K style command palette for developer actions
// ============================================================================

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  keywords: string[];
  action: () => void;
  category: "data" | "view" | "export" | "settings";
}

export function DevConsoleCommandPalette() {
  const {
    commandPaletteOpen,
    toggleCommandPalette,
    clearAll,
    clearLogs,
    clearNetwork,
    clearState,
    clearPerformance,
    exportAll,
    setActiveTab,
    updateSettings,
    captureConsole,
    captureNetwork,
    captureState,
  } = useDevConsoleStore();

  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Define all available commands
  const commands: CommandAction[] = [
    {
      id: "clear-all",
      label: "Clear All Data",
      description: "Remove all logs, network requests, and state snapshots",
      icon: Trash2,
      keywords: ["clear", "delete", "remove", "clean", "all"],
      action: () => {
        clearAll();
        toggleCommandPalette();
      },
      category: "data",
    },
    {
      id: "clear-logs",
      label: "Clear Logs",
      description: "Remove all console logs",
      icon: Terminal,
      keywords: ["clear", "logs", "console"],
      action: () => {
        clearLogs();
        toggleCommandPalette();
      },
      category: "data",
    },
    {
      id: "clear-network",
      label: "Clear Network Requests",
      description: "Remove all network request history",
      icon: Zap,
      keywords: ["clear", "network", "requests", "api"],
      action: () => {
        clearNetwork();
        toggleCommandPalette();
      },
      category: "data",
    },
    {
      id: "export-all",
      label: "Export All Data",
      description: "Download all console data as JSON",
      icon: Download,
      keywords: ["export", "download", "save", "backup"],
      action: () => {
        const data = exportAll();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `devconsole-${Date.now()}.json`;
        a.click();
        toggleCommandPalette();
      },
      category: "export",
    },
    {
      id: "copy-logs",
      label: "Copy Logs to Clipboard",
      description: "Copy all logs as formatted JSON",
      icon: Download,
      keywords: ["copy", "clipboard", "logs"],
      action: () => {
        const data = exportAll();
        navigator.clipboard.writeText(data);
        alert("Logs copied to clipboard!");
        toggleCommandPalette();
      },
      category: "export",
    },
    {
      id: "view-logs",
      label: "View Logs",
      description: "Switch to logs panel",
      icon: Terminal,
      keywords: ["view", "show", "logs", "console"],
      action: () => {
        setActiveTab("logs");
        toggleCommandPalette();
      },
      category: "view",
    },
    {
      id: "view-network",
      label: "View Network",
      description: "Switch to network panel",
      icon: Zap,
      keywords: ["view", "show", "network", "api", "requests"],
      action: () => {
        setActiveTab("network");
        toggleCommandPalette();
      },
      category: "view",
    },
    {
      id: "view-state",
      label: "View State",
      description: "Switch to state panel",
      icon: Database,
      keywords: ["view", "show", "state", "store"],
      action: () => {
        setActiveTab("state");
        toggleCommandPalette();
      },
      category: "view",
    },
    {
      id: "toggle-console-capture",
      label: captureConsole ? "Disable Console Capture" : "Enable Console Capture",
      description: captureConsole
        ? "Stop capturing console logs"
        : "Start capturing console logs",
      icon: captureConsole ? EyeOff : Eye,
      keywords: ["toggle", "console", "capture", "logging"],
      action: () => {
        updateSettings({ captureConsole: !captureConsole });
        toggleCommandPalette();
      },
      category: "settings",
    },
    {
      id: "toggle-network-capture",
      label: captureNetwork ? "Disable Network Capture" : "Enable Network Capture",
      description: captureNetwork
        ? "Stop capturing network requests"
        : "Start capturing network requests",
      icon: captureNetwork ? EyeOff : Eye,
      keywords: ["toggle", "network", "capture", "requests"],
      action: () => {
        updateSettings({ captureNetwork: !captureNetwork });
        toggleCommandPalette();
      },
      category: "settings",
    },
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter((cmd) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.description.toLowerCase().includes(searchLower) ||
      cmd.keywords.some((kw) => kw.includes(searchLower))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  // Keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) cmd.action();
      } else if (e.key === "Escape") {
        toggleCommandPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, toggleCommandPalette]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const categoryLabels: Record<string, string> = {
    data: "Data Management",
    view: "View",
    export: "Export",
    settings: "Settings",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={toggleCommandPalette}
        className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
      >
        <motion.div
          initial={{ scale: 0.9, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Command className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
              ESC
            </kbd>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-auto">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50">
                  {categoryLabels[category]}
                </div>
                {cmds.map((cmd, index) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  const Icon = cmd.icon;

                  return (
                    <motion.button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                        isSelected
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent"
                      )}
                      whileHover={{ x: 4 }}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isSelected
                              ? "text-primary"
                              : "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          {cmd.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {cmd.description}
                        </p>
                      </div>
                      {isSelected && (
                        <kbd className="px-2 py-1 bg-primary/20 rounded text-xs font-mono text-primary">
                          ↵
                        </kbd>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                  ↵
                </kbd>
                Execute
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {filteredCommands.length} command{filteredCommands.length !== 1 ? "s" : ""}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
