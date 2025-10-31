import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  Terminal,
  Network,
  Database,
  Activity,
  Wrench,
  X,
  Minimize2,
  Maximize2,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  Search,
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Zap,
  Globe,
  Layers,
  ExternalLink,
  Sparkles,
  Github,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDevConsoleStore, useDevConsoleLogs, useDevConsoleNetwork } from "../../utils/stores/devConsole";
import type { LogLevel, ConsoleTab } from "../../utils/stores/devConsole";
import { cn } from "src/utils";
// import { StatePanel } from "./StatePanel"; // Removed for now
import { MethodChip, StatusChip, DurationChip, CacheChip, RetryChip, GraphQLChip, LogLevelChip } from "./Chips";
import { DurationSparkline } from "./Sparkline";
import {
  createContextPack,
  exportContextPack,
  copyContextPackToClipboard,
} from "../../lib/devConsole/contextPacker";
import { GraphQLExplorer } from "./GraphQLExplorer";
import { humanizeTime, formatTimestamp } from "../../utils/timeUtils";
import { generateVSCodeUri } from "../../lib/devConsole/errorAnalyzer";
import { AutoFillerPanel } from "./AutoFillerPanel";
import { GitHubIssueSlideout } from "./GitHubIssueSlideout";
import { AIPanel } from "./AIPanel";
import {
  AIActionButton,
  AIInsightPanel,
  AIUnsupportedNotice,
  AIFirstUsePrompt,
  AIPowerBadge,
  AIDownloadProgress,
  CopyAIPromptButton
} from "./AI";
import { useAI } from "../../hooks/useAI";

// ============================================================================
// TYPES
// ============================================================================

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

// ============================================================================
// MAIN DEVELOPER CONSOLE COMPONENT
// ============================================================================

export interface DevConsolePanelProps {
  githubConfig?: GitHubConfig;
}

export function DevConsolePanel({ githubConfig }: DevConsolePanelProps = {}) {
  const {
    isOpen,
    position,
    size,
    activeTab,
    unreadErrorCount,
    toggleConsole,
    setActiveTab,
    setPosition,
    clearAll,
    exportAll,
    setSize,
  } = useDevConsoleStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showGitHubIssueSlideout, setShowGitHubIssueSlideout] = useState(false);
  const dragControls = useDragControls();
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // AI Hook - for header badge only (individual panels manage their own AI state)
  const { availability: aiAvailability, downloadProgress: aiDownloadProgress } = useAI({ autoCheck: true });

  // Handle resize with mouse events
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = size.height;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = resizeStartHeight.current + deltaY;

      // Constrain between 200px and 80vh
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.8;
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

      setSize({ ...size, height: clampedHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, size, setSize]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        toggleConsole();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, toggleConsole]);

  if (!isOpen) return null;

  const tabs: Array<{ id: ConsoleTab; label: string; icon: any }> = [
    { id: "logs", label: "Logs", icon: Terminal },
    { id: "network", label: "Network", icon: Network },
    { id: "graphql", label: "GraphQL", icon: Zap },
    { id: "ai", label: "AI APIs", icon: Sparkles },
    { id: "autofiller", label: "Auto-Filler", icon: Wrench },
    { id: "tools", label: "Tools", icon: Activity },
  ];

  return (
    <>
      {/* GitHub Issue Slideout - Available from any tab */}
      <GitHubIssueSlideout
        isOpen={showGitHubIssueSlideout}
        onClose={() => setShowGitHubIssueSlideout(false)}
        selectedLog={null}
        githubConfig={githubConfig}
      />

      <AnimatePresence>
        {position === "bottom" && !isMinimized ? (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-[9999] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border shadow-2xl",
              "rounded-t-2xl overflow-hidden flex flex-col",
              "bottom-0 left-0 right-0"
            )}
            style={{
              height: size.height,
            }}
          >
            {/* Resize Handle */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-50",
                "hover:bg-primary/20 active:bg-primary/30 transition-colors",
                "group",
                isResizing && "bg-primary/30"
              )}
              onMouseDown={handleResizeStart}
            >
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-primary transition-colors" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-secondary/5">
              {/* Left: Title & Badge */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Developer Console
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {process.env.NODE_ENV} • {new Date().toLocaleTimeString()}
                  </p>
                </div>

                {/* AI Power Badge */}
                <AIPowerBadge status={aiAvailability} progress={aiDownloadProgress} />

                {unreadErrorCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 bg-destructive text-white text-xs font-semibold rounded-full"
                  >
                    {unreadErrorCount} errors
                  </motion.div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const data = exportAll();
                    const blob = new Blob([data], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `devconsole-${Date.now()}.json`;
                    a.click();
                    // Clean up blob URL to prevent memory leak
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Export All"
                >
                  <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={clearAll}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                <button
                  onClick={toggleConsole}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            {!isMinimized && (
              <>
                <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {/* Tab Buttons */}
                  <div className="flex items-center gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            isActive
                              ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                              : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                          {isActive && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute inset-0 bg-white dark:bg-gray-900 rounded-lg -z-10 shadow-sm"
                              transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Create Issue Button */}
                  {githubConfig?.username && githubConfig?.repo && githubConfig?.token && (
                    <button
                      onClick={() => setShowGitHubIssueSlideout(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-success hover:bg-success/90 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      title="Create GitHub Issue"
                    >
                      <Github className="w-4 h-4" />
                      <span>Create Issue</span>
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      {activeTab === "logs" && <LogsPanel githubConfig={githubConfig} />}
                      {activeTab === "network" && <NetworkPanel />}
                      {activeTab === "graphql" && <GraphQLExplorer />}
                      {activeTab === "ai" && <AIPanel />}
                      {activeTab === "autofiller" && <AutoFillerPanel />}
                      {activeTab === "tools" && <ToolsPanel />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-[9999] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border shadow-2xl",
              "rounded-t-2xl overflow-hidden flex flex-col bottom-0 left-0 right-0"
            )}
            style={{ height: 48 }}
          >
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-gray-500">DevConsole (minimized)</p>
              <button onClick={() => setIsMinimized(false)} className="text-sm text-primary">
                Restore
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// LOGS PANEL - Priority Columns First
// ============================================================================

interface LogsPanelProps {
  githubConfig?: GitHubConfig;
}

function LogsPanel({ githubConfig }: LogsPanelProps) {
  const logs = useDevConsoleLogs();
  const { filter, setFilter, clearLogs, setActiveTab } = useDevConsoleStore();
  const [search, setSearch] = useState(filter.search);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [showGitHubIssue, setShowGitHubIssue] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // AI Hook - handles all AI state and functionality
  const {
    availability: aiAvailability,
    isLoading: isGeneratingAI,
    error: aiError,
    summary: aiSummary,
    downloadProgress,
    browserSupport,
    analyzeLog,
    activateAI,
    reset: resetAI
  } = useAI({ autoCheck: true });

  // Handle AI Analysis
  const handleAIAnalyze = async () => {
    if (!selectedLog) return;

    await analyzeLog(
      selectedLog.message,
      selectedLog.level,
      selectedLog.stack,
      `Log context and metadata`
    );
  };

  // Handle AI Activation (first-time use)
  const handleActivateAI = async () => {
    await activateAI();
    // After activation, analyze the current log
    if (selectedLog) {
      await analyzeLog(
        selectedLog.message,
        selectedLog.level,
        selectedLog.stack,
        `Log context and metadata`
      );
    }
  };

  // Reset AI state when selected log changes
  useEffect(() => {
    resetAI();
  }, [selectedLog?.id, resetAI]);

  const levelIcons: Record<LogLevel, { icon: any; color: string }> = {
    log: { icon: Info, color: "text-gray-500" },
    info: { icon: Info, color: "text-info" },
    warn: { icon: AlertTriangle, color: "text-warning" },
    error: { icon: XCircle, color: "text-destructive" },
    debug: { icon: Bug, color: "text-purple-500" },
    ui: { icon: Layers, color: "text-primary" },
    db: { icon: Database, color: "text-success" },
    api: { icon: Globe, color: "text-secondary" },
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ search });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setFilter]);

  // Handle horizontal resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = detailPanelWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const deltaX = resizeStartX.current - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;

      // Constrain between 30% and 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setDetailPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-full flex">
      {/* GitHub Issue Slideout */}
      <GitHubIssueSlideout
        isOpen={showGitHubIssue}
        onClose={() => setShowGitHubIssue(false)}
        selectedLog={selectedLog}
        githubConfig={githubConfig}
      />

      {/* Logs Table */}
      <div
        className="flex flex-col border-r border-gray-200 dark:border-gray-800"
        style={{ width: selectedLog ? `${100 - detailPanelWidth}%` : '100%' }}
      >
        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1">
            {(["log", "info", "warn", "error"] as LogLevel[]).map((level) => {
              const isActive = filter.levels.includes(level);
              const { icon: Icon, color } = levelIcons[level];
              return (
                <button
                  key={level}
                  onClick={() => {
                    const newLevels = isActive
                      ? filter.levels.filter((l) => l !== level)
                      : [...filter.levels, level];
                    setFilter({ levels: newLevels });
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    isActive
                      ? "bg-gray-200 dark:bg-gray-700"
                      : "bg-gray-50 dark:bg-gray-800 opacity-50 hover:opacity-100"
                  )}
                  title={level}
                >
                  <Icon className={cn("w-4 h-4", isActive && color)} />
                </button>
              );
            })}
          </div>
          <button
            onClick={clearLogs}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Terminal className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No logs to display
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-20">Level</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Message</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-32">Time</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-32">Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={cn(
                      "border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
                      selectedLog?.id === log.id && "bg-primary/5"
                    )}
                  >
                    {/* Level - Critical state first */}
                    <td className="px-4 py-3">
                      <LogLevelChip level={log.level} />
                    </td>

                    {/* Message - Primary decision-making info */}
                    <td className="px-4 py-3 max-w-2xl">
                      <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs">
                        {log.message}
                      </div>
                      {log.args.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          +{log.args.length} arg{log.args.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </td>

                    {/* Time - Context */}
                    <td className="px-4 py-3">
                      <span
                        className="text-xs text-gray-500 dark:text-gray-400 font-mono"
                        title={new Date(log.timestamp).toLocaleString()}
                      >
                        {humanizeTime(log.timestamp)}
                      </span>
                    </td>

                    {/* Source - Secondary info */}
                    <td className="px-4 py-3">
                      {log.source && (
                        <span className="text-xs text-gray-400 font-mono">
                          {log.source.file}:{log.source.line}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Details - Right Panel */}
      {selectedLog && (
        <>
          {/* Resize Handle */}
          <div
            className={cn(
              "w-1 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors relative group",
              isResizing && "bg-primary/50"
            )}
            onMouseDown={handleResizeStart}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-primary transition-colors" />
          </div>

          <div
            className="flex flex-col"
            style={{ width: `${detailPanelWidth}%` }}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Log Details</h3>
              <div className="flex items-center gap-2">
                {/* Copy AI Prompt Button */}
                {selectedLog && (
                  <CopyAIPromptButton log={selectedLog} size="sm" />
                )}

                {/* AI Analyze Button */}
                {aiAvailability !== 'unavailable' && (
                  <AIActionButton
                    onClick={handleAIAnalyze}
                    loading={isGeneratingAI}
                    disabled={!selectedLog}
                    label="AI Analyze"
                    loadingLabel="Analyzing..."
                    variant="primary"
                    size="sm"
                  />
                )}

                {/* GitHub Issue Button - Always show for any selected log */}
                <button
                  onClick={() => setShowGitHubIssue(true)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5",
                    selectedLog?.level === "error" || selectedLog?.level === "warn"
                      ? "bg-success/10 hover:bg-success/20 text-success border-success/20"
                      : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                  )}
                  title="Create GitHub Issue"
                >
                  <Github className="w-3.5 h-3.5" />
                  Create Issue
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {/* AI Insights Section - Show first if available */}
                {!browserSupport.isSupported ? (
                  <AIUnsupportedNotice
                    reason={browserSupport.reason || 'AI features not available'}
                    browserName={browserSupport.browserName}
                  />
                ) : aiAvailability === 'downloading' && downloadProgress > 0 && downloadProgress < 100 ? (
                  <AIDownloadProgress progress={downloadProgress} modelName="Gemini Nano" />
                ) : aiAvailability === 'downloadable' && !aiSummary ? (
                  <AIFirstUsePrompt
                    onActivate={handleActivateAI}
                    loading={isGeneratingAI}
                  />
                ) : aiSummary || isGeneratingAI || aiError ? (
                  <AIInsightPanel
                    summary={aiSummary || ''}
                    loading={isGeneratingAI}
                    error={aiError}
                    title="🤖 AI Log Analysis"
                  />
                ) : null}

                {/* Message */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Message
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {selectedLog.message}
                    </p>
                  </div>
                </div>

                {/* Arguments */}
                {selectedLog.args.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Arguments ({selectedLog.args.length})
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-auto">
                        {JSON.stringify(selectedLog.args, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Stack Trace */}
                {selectedLog.stack && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Stack Trace
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <ClickableStackTrace stack={selectedLog.stack} />
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Metadata
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Timestamp:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-mono">
                        {new Date(selectedLog.timestamp).toISOString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Level:</span>
                      <LogLevelChip level={selectedLog.level} />
                    </div>
                    {selectedLog.source && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">File:</span>
                          <span className="text-gray-900 dark:text-gray-100 font-mono">
                            {selectedLog.source.file}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Line:</span>
                          <span className="text-gray-900 dark:text-gray-100 font-mono">
                            {selectedLog.source.line}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// NETWORK PANEL - Priority Columns First
// ============================================================================

function NetworkPanel() {
  const requests = useDevConsoleNetwork();
  const { clearNetwork } = useDevConsoleStore();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Group requests by endpoint for sparkline data
  const endpointStats = requests.reduce((acc, req) => {
    const endpoint = new URL(req.url, window.location.origin).pathname;
    if (!acc[endpoint]) {
      acc[endpoint] = [];
    }
    acc[endpoint].push(req.duration || 0);
    return acc;
  }, {} as Record<string, number[]>);

  // Handle horizontal resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = detailPanelWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const deltaX = resizeStartX.current - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;

      // Constrain between 30% and 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setDetailPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-full flex">
      {/* Request Table */}
      <div
        className="flex flex-col border-r border-gray-200 dark:border-gray-800"
        style={{ width: selectedRequest ? `${100 - detailPanelWidth}%` : '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Network ({requests.length})
          </h3>
          <button
            onClick={clearNetwork}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Clear Network"
          >
            <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Network className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No network requests
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-24">Method</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-32">Status</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">URL</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-28">Duration</th>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-20">Trend</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const endpoint = new URL(req.url, window.location.origin).pathname;
                  const trendData = endpointStats[endpoint]?.slice(-20) || [];

                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={cn(
                        "border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
                        selectedRequest?.id === req.id && "bg-primary/5"
                      )}
                    >
                      {/* Method - Left aligned, decision-making priority */}
                      <td className="px-4 py-3">
                        <MethodChip method={req.method} />
                      </td>

                      {/* Status - Critical info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusChip status={req.status} />
                          {req.type === "graphql" && (
                            <GraphQLChip operation={(req as any).graphql?.operation || "query"} />
                          )}
                        </div>
                      </td>

                      {/* URL - Main identifier */}
                      <td className="px-4 py-3 max-w-md">
                        <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs">
                          {endpoint}
                        </div>
                        <div
                          className="text-xs text-gray-400 mt-0.5"
                          title={new Date(req.timestamp).toLocaleString()}
                        >
                          {humanizeTime(req.timestamp)}
                        </div>
                      </td>

                      {/* Duration - Performance indicator */}
                      <td className="px-4 py-3">
                        <DurationChip duration={req.duration || 0} threshold={500} />
                      </td>

                      {/* Trend - Sparkline for last 20 requests */}
                      <td className="px-4 py-3">
                        {trendData.length > 1 ? (
                          <DurationSparkline data={trendData} width={60} height={20} threshold={500} />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Request Details - Right Panel */}
      {selectedRequest && (
        <>
          {/* Resize Handle */}
          <div
            className={cn(
              "w-1 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors relative group",
              isResizing && "bg-primary/50"
            )}
            onMouseDown={handleResizeStart}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-primary transition-colors" />
          </div>

          <div
            className="flex flex-col"
            style={{ width: `${detailPanelWidth}%` }}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NetworkRequestDetails request={selectedRequest} />
          </div>
        </>
      )}
    </div>
  );
}

function NetworkRequestDetails({ request }: { request: any }) {
  const [activeSection, setActiveSection] = useState<"headers" | "body" | "response">(
    "response"
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        {(["headers", "body", "response"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors",
              activeSection === section
                ? "bg-primary text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            {section}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300">
          {activeSection === "headers" &&
            JSON.stringify(request.responseHeaders || {}, null, 2)}
          {activeSection === "body" &&
            JSON.stringify(request.requestBody || {}, null, 2)}
          {activeSection === "response" &&
            JSON.stringify(request.responseBody || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// TOOLS PANEL
// ============================================================================

function ToolsPanel() {
  const { clearAll, exportAll } = useDevConsoleStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateContextPack = async () => {
    setIsGenerating(true);
    try {
      const pack = await createContextPack({
        includeScreenshot: true,
        eventCount: 20,
        networkCount: 10,
      });

      // Copy markdown to clipboard
      const copied = await copyContextPackToClipboard(pack);

      if (copied) {
        alert("📋 Context pack copied to clipboard!\n\nPaste into your issue tracker.");
      } else {
        // Fallback: download as file
        exportContextPack(pack);
        alert("📦 Context pack downloaded!\n\nAttach to your issue tracker.");
      }
    } catch (error) {
      console.error("Failed to create context pack:", error);
      alert("❌ Failed to create context pack. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Developer Tools
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Context Pack - Featured Tool */}
        <button
          onClick={handleCreateContextPack}
          disabled={isGenerating}
          className="col-span-2 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 rounded-xl transition-all border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {isGenerating ? "Capturing Context..." : "Export Context Pack"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Screenshot + route + last 20 events + network → clipboard
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={clearAll}
          className="p-4 bg-destructive/10 hover:bg-destructive/20 rounded-xl transition-colors border border-destructive/20"
        >
          <Trash2 className="w-6 h-6 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">Clear All Data</p>
        </button>

        <button
          onClick={() => {
            const data = exportAll();
            navigator.clipboard.writeText(data);
            alert("Logs copied to clipboard!");
          }}
          className="p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20"
        >
          <Download className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm font-medium text-primary">Export Logs</p>
        </button>
      </div>

      <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          <strong>💡 Tip:</strong> To create a GitHub issue, navigate to the <strong>Logs</strong> tab,
          select an error or warning, and click <strong>"Create Issue"</strong> in the details panel.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE STACK TRACE COMPONENT
// ============================================================================

interface ClickableStackTraceProps {
  stack: string;
}

function ClickableStackTrace({ stack }: ClickableStackTraceProps) {
  const lines = stack.split('\n');

  const parseStackLine = (line: string) => {
    // Match: at functionName (http://localhost:8912/path/to/file.ts:line:col)
    const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
    if (!match) return null;

    const [, functionName, filePath, lineNum, colNum] = match;
    return {
      functionName: functionName?.trim() || 'anonymous',
      filePath,
      line: parseInt(lineNum, 10),
      column: parseInt(colNum, 10),
      isUserCode: !filePath.includes('node_modules') &&
        !filePath.includes('vite') &&
        !filePath.includes('@fs')
    };
  };

  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const parsed = parseStackLine(line);

        if (!parsed) {
          return (
            <div key={index} className="text-xs font-mono text-gray-700 dark:text-gray-300">
              {line}
            </div>
          );
        }

        const fileName = parsed.filePath.split('/').pop()?.split('?')[0] || parsed.filePath;
        const isClickable = parsed.isUserCode;

        return (
          <div
            key={index}
            className={cn(
              "text-xs font-mono flex items-start gap-2 py-0.5",
              isClickable && "hover:bg-primary/5 rounded px-1 -mx-1"
            )}
          >
            <span className="text-gray-500 dark:text-gray-400">at</span>
            <span className="text-gray-700 dark:text-gray-300">{parsed.functionName}</span>
            {isClickable ? (
              <a
                href={generateVSCodeUri(parsed.filePath, parsed.line, parsed.column)}
                className="flex items-center gap-1 text-primary hover:underline cursor-pointer group"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = generateVSCodeUri(parsed.filePath, parsed.line, parsed.column);
                }}
              >
                <span>{fileName}:{parsed.line}:{parsed.column}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                {fileName}:{parsed.line}:{parsed.column}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
