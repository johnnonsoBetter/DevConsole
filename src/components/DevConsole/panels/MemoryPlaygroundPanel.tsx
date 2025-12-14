/**
 * MemoryPlaygroundPanel Component
 * Interactive playground for testing SmartMemory working memory operations
 */

import {
    AlertCircle,
    Brain,
    Clock,
    Loader2,
    PlugZap,
    Power,
    Search,
    Send,
    Settings2,
    Trash2,
    Zap
} from "lucide-react";
import { useState } from "react";
import { usePlaygroundMemory, type MemoryEntry, type SmartMemoryConfig } from "../../../hooks/usePlaygroundMemory";

// ============================================================================
// MEMORY ENTRY COMPONENT
// ============================================================================

interface MemoryEntryCardProps {
  entry: MemoryEntry;
}

function MemoryEntryCard({ entry }: MemoryEntryCardProps) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-primary/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {entry.timeline || "default"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {entry.timestamp.toLocaleTimeString()}
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
        {entry.content}
      </p>
      <div className="mt-2 text-xs font-mono text-gray-400 truncate">
        ID: {entry.id}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

export function MemoryPlaygroundPanel() {
  const {
    isConnected,
    isLoading,
    error,
    sessionId,
    memories,
    config: activeConfig,
    connect,
    disconnect,
    putMemory,
    getMemory,
    searchMemory,
    clearMemories,
    clearError,
  } = usePlaygroundMemory();

  const [inputContent, setInputContent] = useState("");
  const [inputTimeline, setInputTimeline] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<"put" | "search">("put");
  
  // Configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [configName, setConfigName] = useState("");
  const [configAppName, setConfigAppName] = useState("");
  const [configVersion, setConfigVersion] = useState("");

  // Handle connect with custom config
  const handleConnect = async () => {
    
    await connect();
  };

  // Handle putting memory
  const handlePutMemory = async () => {
    if (!inputContent.trim()) return;

    await putMemory(inputContent.trim(), inputTimeline.trim() || undefined);
    setInputContent("");
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If no search query, get all recent memories
      await getMemory({ nMostRecent: 50 });
    } else {
      await searchMemory(searchQuery.trim());
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    await getMemory({ nMostRecent: 50 });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Memory Playground
              </h2>
              <p className="text-xs text-muted-foreground">
                Test SmartMemory working memory
              </p>
            </div>
          </div>

          {/* Connection Status & Controls */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  Connected
                </div>
                <button
                  onClick={disconnect}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Disconnect"
                >
                  <Power className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className={`p-2 rounded-lg transition-colors ${
                    showConfig 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-500 hover:text-primary hover:bg-primary/10"
                  }`}
                  title="Configure SmartMemory"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlugZap className="w-4 h-4" />
                  )}
                  Connect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Configuration Panel (collapsible) */}
        {!isConnected && showConfig && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SmartMemory Configuration
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Memory Name
                </label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="playground-memory"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  value={configAppName}
                  onChange={(e) => setConfigAppName(e.target.value)}
                  placeholder="memory-playground"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={configVersion}
                  onChange={(e) => setConfigVersion(e.target.value)}
                  placeholder="v1"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to use defaults from Raindrop settings
            </p>
          </div>
        )}

        {/* Active Config Display (when connected) */}
        {isConnected && activeConfig && (
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              {activeConfig.applicationName}
            </span>
            <span>/</span>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              {activeConfig.name}
            </span>
            <span className="text-gray-400">@</span>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              {activeConfig.version}
            </span>
          </div>
        )}

        {/* Session Info */}
        {sessionId && (
          <div className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400">
            Session: {sessionId}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex gap-2">
        <button
          onClick={() => setActiveMode("put")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeMode === "put"
              ? "bg-primary text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Send className="w-4 h-4 inline mr-1.5" />
          Put Memory
        </button>
        <button
          onClick={() => setActiveMode("search")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeMode === "search"
              ? "bg-primary text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Search className="w-4 h-4 inline mr-1.5" />
          Search Memory
        </button>
      </div>

      {/* Input Section */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        {activeMode === "put" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Content to Store
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Enter text content to store in working memory..."
                disabled={!isConnected || isLoading}
                className="w-full h-24 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Timeline (optional)
                </label>
                <input
                  type="text"
                  value={inputTimeline}
                  onChange={(e) => setInputTimeline(e.target.value)}
                  placeholder="default"
                  disabled={!isConnected || isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={handlePutMemory}
                disabled={!isConnected || isLoading || !inputContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Store
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Search Query (semantic search)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search terms or leave empty to get all..."
                disabled={!isConnected || isLoading}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!isConnected || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Results Header */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Memories ({memories.length})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={!isConnected || isLoading}
              className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50 transition-colors"
              title="Refresh memories"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={clearMemories}
              disabled={memories.length === 0}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
              title="Clear display"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <PlugZap className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Not Connected</p>
              <p className="text-xs text-gray-400 mt-1">
                Connect to start using the memory playground
              </p>
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Brain className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No Memories Yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Put some content or search to see results
              </p>
            </div>
          ) : (
            memories.map((entry) => (
              <MemoryEntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      {isConnected && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Working Memory Session Active</span>
            <span className="font-mono">{memories.length} entries loaded</span>
          </div>
        </div>
      )}
    </div>
  );
}
