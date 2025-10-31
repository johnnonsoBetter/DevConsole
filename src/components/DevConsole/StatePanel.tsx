import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  GitBranch,
  Clock,
} from "lucide-react";
import { useState, useMemo, useCallback, memo } from "react";
import { useDevConsoleStore } from "../../utils/stores/devConsole";
import { cn } from "src/utils";
import {
  getTrackedStores,
  getStoreState,
  trackStore,
  untrackStore,
} from "../../lib/devConsole/stateTracker";

// ============================================================================
// STATE PANEL
// Displays Zustand store snapshots with diffs
// ============================================================================

export function StatePanel() {
  const { stateSnapshots, clearState } = useDevConsoleStore();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Memoize tracked stores to prevent re-renders
  const trackedStores = useMemo(() => getTrackedStores(), [stateSnapshots.length]);

  // Group snapshots by store - memoized with proper dependencies
  const snapshotsByStore = useMemo(() => {
    const grouped: Record<string, typeof stateSnapshots> = {};

    stateSnapshots.forEach((snapshot) => {
      if (!grouped[snapshot.storeName]) {
        grouped[snapshot.storeName] = [];
      }
      grouped[snapshot.storeName].push(snapshot);
    });

    return grouped;
  }, [stateSnapshots]);

  // Memoize selected store snapshots
  const selectedStoreSnapshots = useMemo(
    () => (selectedStore ? snapshotsByStore[selectedStore] || [] : []),
    [selectedStore, snapshotsByStore]
  );

  // Memoize selected snapshot
  const selectedSnapshot = useMemo(
    () => (selectedSnapshotId ? stateSnapshots.find((s) => s.id === selectedSnapshotId) : null),
    [selectedSnapshotId, stateSnapshots]
  );

  // Memoize handlers to prevent re-renders
  const handleStoreSelect = useCallback((storeName: string) => {
    setSelectedStore(storeName);
    setSelectedSnapshotId(null);
  }, []);

  const handleSnapshotSelect = useCallback((snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
  }, []);

  const handleClearState = useCallback(() => {
    clearState();
    setSelectedStore(null);
    setSelectedSnapshotId(null);
  }, [clearState]);

  return (
    <div className="h-full flex">
      {/* Store List */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Stores ({trackedStores.length})
          </h3>
        </div>

        <div className="flex-1 overflow-auto">
          {trackedStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Database className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No stores tracked
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Stores auto-tracked on initialization
              </p>
            </div>
          ) : (
            trackedStores.map((storeName) => {
              const count = snapshotsByStore[storeName]?.length || 0;
              const isSelected = selectedStore === storeName;

              return (
                <button
                  key={storeName}
                  onClick={() => handleStoreSelect(storeName)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors",
                    isSelected
                      ? "bg-primary/5 border-l-4 border-l-primary"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isSelected
                        ? "bg-primary/20 text-primary"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected
                          ? "text-primary"
                          : "text-gray-900 dark:text-gray-100"
                      )}
                    >
                      {storeName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {count} snapshot{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Snapshot Timeline */}
      {selectedStore && (
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Timeline ({selectedStoreSnapshots.length})
            </h3>
            <button
              onClick={handleClearState}
              className="text-gray-600 dark:text-gray-400 hover:text-destructive dark:hover:text-destructive transition-colors"
              title="Clear Snapshots"
            >
              <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedStoreSnapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No snapshots yet
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {selectedStoreSnapshots.map((snapshot, index) => {
                  const isSelected = selectedSnapshotId === snapshot.id;
                  const isFirst = index === 0;
                  const isLast = index === selectedStoreSnapshots.length - 1;

                  return (
                    <motion.button
                      key={snapshot.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleSnapshotSelect(snapshot.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all relative",
                        isSelected
                          ? "bg-primary/10 ring-2 ring-primary/20"
                          : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      {/* Timeline Connector */}
                      {!isLast && (
                        <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-200 dark:bg-gray-700" />
                      )}

                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10",
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          )}
                        >
                          {snapshot.action === "INIT" ? (
                            <GitBranch className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {snapshot.action && (
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-semibold",
                                  snapshot.action === "INIT"
                                    ? "bg-success/20 text-success"
                                    : "bg-info/20 text-info"
                                )}
                              >
                                {snapshot.action}
                              </span>
                            )}
                            {isFirst && (
                              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-semibold">
                                Latest
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(snapshot.timestamp).toLocaleTimeString()}
                          </p>

                          {snapshot.diff && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                              {Object.keys(snapshot.diff).length} field
                              {Object.keys(snapshot.diff).length !== 1 ? "s" : ""}{" "}
                              changed
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Snapshot Details */}
      {selectedSnapshot ? (
        <SnapshotDetails snapshot={selectedSnapshot} />
      ) : selectedStore ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a snapshot to view details
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Database className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a store to view snapshots
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SNAPSHOT DETAILS
// ============================================================================

function SnapshotDetails({ snapshot }: { snapshot: any }) {
  const [viewMode, setViewMode] = useState<"state" | "diff">("diff");

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Snapshot Details
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("diff")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              viewMode === "diff"
                ? "bg-primary text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            disabled={!snapshot.diff}
          >
            Diff
          </button>
          <button
            onClick={() => setViewMode("state")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              viewMode === "state"
                ? "bg-primary text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Full State
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {viewMode === "diff" && snapshot.diff ? (
          <DiffViewer diff={snapshot.diff} />
        ) : viewMode === "diff" && !snapshot.diff ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No changes in this snapshot
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              This is the initial state
            </p>
          </div>
        ) : (
          <JSONTree data={snapshot.state} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DIFF VIEWER
// ============================================================================

function DiffViewer({ diff }: { diff: any }) {
  return (
    <div className="space-y-2">
      {Object.entries(diff).map(([key, value]: [string, any]) => (
        <DiffEntry key={key} path={key} value={value} />
      ))}
    </div>
  );
}

const DiffEntry = memo(function DiffEntry({ path, value }: { path: string; value: any }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasNested = value && typeof value === "object" && !value.from && !value.to;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => hasNested && setIsExpanded(!isExpanded)}
      >
        {hasNested && (
          <div className="flex-shrink-0 mt-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {path}
          </p>

          {!hasNested && (
            <div className="mt-2 space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-destructive">-</span>
                <code className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded font-mono flex-1">
                  {JSON.stringify(value.from, null, 2)}
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-success">+</span>
                <code className="text-xs text-success bg-success/10 px-2 py-1 rounded font-mono flex-1">
                  {JSON.stringify(value.to, null, 2)}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasNested && isExpanded && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
          {Object.entries(value).map(([nestedKey, nestedValue]: [string, any]) => (
            <DiffEntry
              key={nestedKey}
              path={`${path}.${nestedKey}`}
              value={nestedValue}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// JSON TREE
// ============================================================================

const JSONTree = memo(function JSONTree({ data, depth = 0 }: { data: any; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  if (data === null) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (data === undefined) {
    return <span className="text-gray-400 italic">undefined</span>;
  }

  if (typeof data === "boolean") {
    return <span className="text-warning">{String(data)}</span>;
  }

  if (typeof data === "number") {
    return <span className="text-info">{data}</span>;
  }

  if (typeof data === "string") {
    return <span className="text-success">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }

    return (
      <div className="font-mono text-sm">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 px-1 rounded"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronRight className="w-3 h-3 inline" />}
          {" "}
          <span className="text-gray-500">[{data.length}]</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
            {data.map((item, index) => (
              <div key={`array-item-${depth}-${index}`} className="my-1">
                <span className="text-gray-400">{index}: </span>
                <JSONTree data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="text-gray-500">{"{}"}</span>;
    }

    return (
      <div className="font-mono text-sm">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 px-1 rounded"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronRight className="w-3 h-3 inline" />}
          {" "}
          <span className="text-gray-500">{"{"}{keys.length}{"}"}</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
            {keys.map((key) => (
              <div key={key} className="my-1">
                <span className="text-purple-600 dark:text-purple-400">{key}: </span>
                <JSONTree data={data[key]} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
});
