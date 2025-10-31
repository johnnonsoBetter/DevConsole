import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Lightbulb,
  Code,
  Activity,
  Globe,
  Layers,
  Terminal,
  Check,
} from "lucide-react";
import { useDevConsoleStore } from "../../utils/stores/devConsole";
import {
  analyzeError,
  parseStackTrace,
  groupStackFrames,
  captureEnvironmentSnapshot,
  generateErrorReport,
  generateVSCodeUri,
  type ErrorInsight,
  type ParsedStackFrame,
  type EnvironmentSnapshot,
} from "./errorAnalyzer";
import { cn } from "../../utils";
import { humanizeTime } from "../../utils/timeUtils";

// ============================================================================
// ERROR BOUNDARY
// Catches React render errors and displays them in DevConsole
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  insight: ErrorInsight | null;
  environment: EnvironmentSnapshot | null;
  stackFrames: ParsedStackFrame[];
}

export class DevConsoleErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      insight: null,
      environment: null,
      stackFrames: [],
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Analyze error
    const insight = analyzeError(error);
    const environment = captureEnvironmentSnapshot();
    const stackFrames = parseStackTrace(error.stack || "");

    // Log to DevConsole
    const store = useDevConsoleStore.getState();

    store.addLog({
      level: "error",
      message: `React Error: ${error.message}`,
      args: [error, errorInfo],
      stack: errorInfo.componentStack || error.stack,
      metadata: {
        type: "react-error",
        componentStack: errorInfo.componentStack,
        insight,
        environment,
      },
    });

    // Open console automatically on error
    if (!store.isOpen) {
      store.setOpen(true);
      store.setActiveTab("logs");
    }

    this.setState({
      error,
      errorInfo,
      insight,
      environment,
      stackFrames,
    });

    // Also log to native console
    console.error("React Error Boundary caught an error:", error, errorInfo);
    console.info("Error Insight:", insight);
    console.info("Environment:", environment);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      insight: null,
      environment: null,
      stackFrames: [],
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Enhanced error UI
      return (
        <EnhancedErrorUI
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          insight={this.state.insight!}
          environment={this.state.environment!}
          stackFrames={this.state.stackFrames}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// ENHANCED ERROR UI COMPONENT
// ============================================================================

interface EnhancedErrorUIProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  insight: ErrorInsight;
  environment: EnvironmentSnapshot;
  stackFrames: ParsedStackFrame[];
  onReset: () => void;
}

function EnhancedErrorUI({
  error,
  errorInfo,
  insight,
  environment,
  stackFrames,
  onReset,
}: EnhancedErrorUIProps) {
  const [activeTab, setActiveTab] = useState<"stack" | "component" | "environment" | "logs">("stack");
  const [stackExpanded, setStackExpanded] = useState(true);
  const [componentStackExpanded, setComponentStackExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  // Ensure we have default insight if null
  const safeInsight: ErrorInsight = insight || {
    category: "Unknown Error",
    title: "An error occurred",
    description: error.message,
    suggestions: ["Check the error details below", "Review the stack trace"],
    severity: "high",
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        onReset();
      } else if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        handleCopyReport();
      } else if (e.key === "e" && !e.metaKey && !e.ctrlKey) {
        setStackExpanded((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReset]);

  const handleCopyReport = () => {
    const report = generateErrorReport(error, errorInfo, environment, safeInsight);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const report = generateErrorReport(error, errorInfo, environment, safeInsight);
    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupedFrames = groupStackFrames(stackFrames);
  const userCodeFrames = stackFrames.filter((f) => f.isUserCode);
  const firstUserFrame = userCodeFrames[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-destructive/20 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent px-6 py-5 border-b border-destructive/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-semibold text-destructive">
                    Application Error
                  </h1>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    safeInsight.severity === "critical" && "bg-destructive text-white",
                    safeInsight.severity === "high" && "bg-warning text-white",
                    safeInsight.severity === "medium" && "bg-info/80 text-white",
                    safeInsight.severity === "low" && "bg-gray-400 text-white"
                  )}>
                    {safeInsight.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {error.name}: {error.message}
                </p>
                {firstUserFrame && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    📍 {firstUserFrame.file}:{firstUserFrame.line}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy Report (c)"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <button
                onClick={handleDownloadReport}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Download Report"
              >
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Insight Banner */}
        <div className="bg-gradient-to-r from-info/10 to-transparent px-6 py-4 border-b border-info/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-info mb-1">
                💡 {safeInsight.title}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {safeInsight.description}
              </p>
              <div className="space-y-1">
                {safeInsight.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-info">→</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          {[
            { id: "stack" as const, label: "Stack Trace", icon: Code },
            { id: "component" as const, label: "Component Tree", icon: Layers },
            { id: "environment" as const, label: "Environment", icon: Globe },
            { id: "logs" as const, label: "Recent Logs", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[500px] overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "stack" && (
                <StackTraceView
                  frames={groupedFrames}
                  error={error}
                  expanded={stackExpanded}
                  onToggle={() => setStackExpanded(!stackExpanded)}
                />
              )}
              {activeTab === "component" && errorInfo?.componentStack && (
                <ComponentStackView
                  componentStack={errorInfo.componentStack}
                  expanded={componentStackExpanded}
                  onToggle={() => setComponentStackExpanded(!componentStackExpanded)}
                />
              )}
              {activeTab === "environment" && (
                <EnvironmentView environment={environment} />
              )}
              {activeTab === "logs" && (
                <RecentLogsView />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Render (r)
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Page
              </button>
              {firstUserFrame && (
                <a
                  href={generateVSCodeUri(firstUserFrame.fullPath, firstUserFrame.line || undefined, firstUserFrame.column || undefined)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Editor
                </a>
              )}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border text-xs">r</kbd> retry •
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border text-xs ml-1">c</kbd> copy •
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border text-xs ml-1">e</kbd> expand
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// STACK TRACE VIEW
// ============================================================================

interface StackTraceViewProps {
  frames: Array<ParsedStackFrame | ParsedStackFrame[]>;
  error: Error;
  expanded: boolean;
  onToggle: () => void;
}

function StackTraceView({ frames, error, expanded, onToggle }: StackTraceViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Stack Trace (Your code highlighted)
        </h3>
        <button
          onClick={onToggle}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {frames.map((item, index) => {
            if (Array.isArray(item)) {
              // React internals group
              return (
                <details key={`group-${index}`} className="group">
                  <summary className="cursor-pointer px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400 font-mono hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    ↳ React internals ({item.length} frames)
                  </summary>
                  <div className="mt-2 ml-4 space-y-1">
                    {item.map((frame, i) => (
                      <StackFrame key={i} frame={frame} />
                    ))}
                  </div>
                </details>
              );
            } else {
              return <StackFrame key={index} frame={item} highlighted={item.isUserCode} />;
            }
          })}
        </div>
      )}
    </div>
  );
}

function StackFrame({ frame, highlighted }: { frame: ParsedStackFrame; highlighted?: boolean }) {
  const handleClick = () => {
    if (frame.isUserCode && frame.fullPath) {
      window.location.href = generateVSCodeUri(frame.fullPath, frame.line || undefined, frame.column || undefined);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-3 py-2 rounded-lg font-mono text-xs transition-colors",
        highlighted
          ? "bg-primary/10 border border-primary/20 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-primary/20"
          : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
        frame.isUserCode && "font-semibold"
      )}
    >
      <div className="flex items-start gap-2">
        {highlighted && <span className="text-primary">📍</span>}
        <div className="flex-1">
          {frame.functionName && (
            <div className="text-gray-700 dark:text-gray-300 mb-0.5">
              at {frame.functionName}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={highlighted ? "text-primary" : ""}>
              {frame.file}
              {frame.line && `:${frame.line}`}
              {frame.column && `:${frame.column}`}
            </span>
            {frame.isUserCode && (
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                YOUR CODE
              </span>
            )}
          </div>
        </div>
        {frame.isUserCode && (
          <ExternalLink className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT STACK VIEW
// ============================================================================

interface ComponentStackViewProps {
  componentStack: string;
  expanded: boolean;
  onToggle: () => void;
}

function ComponentStackView({ componentStack, expanded, onToggle }: ComponentStackViewProps) {
  const components = componentStack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at ") || line.startsWith("in "))
    .map((line) => {
      const match = line.match(/(?:at|in)\s+(.+?)(?:\s+\(|$)/);
      return match ? match[1] : line;
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Component Tree (Render Path)
        </h3>
        <button
          onClick={onToggle}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {components.map((component, index) => (
            <div
              key={index}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300"
              style={{ marginLeft: `${index * 12}px` }}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{component}</span>
                <span className="text-gray-400 dark:text-gray-500">
                  (depth: {index + 1})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENVIRONMENT VIEW
// ============================================================================

function EnvironmentView({ environment }: { environment: EnvironmentSnapshot }) {
  const rows = [
    { label: "React Version", value: environment.reactVersion, icon: Activity },
    { label: "Node Environment", value: environment.nodeEnv, icon: Terminal },
    { label: "Current Route", value: environment.route, icon: Globe },
    { label: "Browser", value: environment.browser, icon: Globe },
    { label: "Platform", value: environment.platform, icon: Terminal },
    { label: "Timestamp", value: new Date(environment.timestamp).toLocaleString(), icon: Activity },
    ...(environment.buildHash ? [{ label: "Build Hash", value: environment.buildHash, icon: Code }] : []),
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Environment Snapshot
      </h3>
      <div className="space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {row.label}
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// RECENT LOGS VIEW
// ============================================================================

function RecentLogsView() {
  const logs = useDevConsoleStore((state) => state.logs.slice(-20));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Last 20 Console Entries
      </h3>
      <div className="space-y-2 max-h-96 overflow-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No recent logs
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "px-3 py-2 rounded-lg text-xs border",
                log.level === "error" && "bg-destructive/10 border-destructive/20 text-destructive",
                log.level === "warn" && "bg-warning/10 border-warning/20 text-warning",
                log.level === "info" && "bg-info/10 border-info/20 text-info",
                (log.level === "log" || log.level === "debug") &&
                "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className="font-mono text-[10px] text-gray-500 dark:text-gray-400"
                  title={new Date(log.timestamp).toLocaleString()}
                >
                  {humanizeTime(log.timestamp)}
                </span>
                <span className="flex-1 font-mono">{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

