/**
 * MemoryPlaygroundPanel Component
 * Interactive playground for testing SmartMemory operations:
 * - Working Memory: Session-scoped entries with semantic search
 * - Semantic Memory: Persistent knowledge documents with vector search
 */

import {
  AlertCircle,
  BookOpen,
  Brain,
  Clock,
  Database,
  FileJson,
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
import { usePlaygroundMemory, type MemoryEntry } from "../../../hooks/usePlaygroundMemory";

// ============================================================================
// TYPES
// ============================================================================

interface SemanticSearchResult {
  text: string;
  score: number;
  source?: string;
}

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
// SEMANTIC RESULT COMPONENT
// ============================================================================

interface SemanticResultCardProps {
  result: SemanticSearchResult;
  index: number;
}

function SemanticResultCard({ result, index }: SemanticResultCardProps) {
  const scorePercent = Math.round(result.score * 100);
  const scoreColor = scorePercent >= 70 
    ? "text-green-600 dark:text-green-400" 
    : scorePercent >= 40 
      ? "text-yellow-600 dark:text-yellow-400" 
      : "text-gray-500";

  return (
    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 transition-all hover:border-blue-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Result #{index + 1}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-mono ${scoreColor}`}>
          Score: {scorePercent}%
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
        {result.text}
      </p>
      {result.source && (
        <div className="mt-2 text-xs font-mono text-gray-400 truncate">
          Source: {result.source}
        </div>
      )}
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
    // Semantic Memory
    putSemanticMemory,
    searchSemanticMemory,
  } = usePlaygroundMemory();

  const [inputContent, setInputContent] = useState("");
  const [inputTimeline, setInputTimeline] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<"put" | "search" | "semantic-put" | "semantic-search">("put");
  
  // Semantic memory state
  const [semanticDoc, setSemanticDoc] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  
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

  // Handle storing semantic memory document
  const handlePutSemanticMemory = async () => {
    if (!semanticDoc.title.trim() || !semanticDoc.content.trim()) return;

    const document = {
      title: semanticDoc.title.trim(),
      content: semanticDoc.content.trim(),
      tags: semanticDoc.tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    const objectId = await putSemanticMemory(document);
    if (objectId) {
      // Clear form on success
      setSemanticDoc({ title: "", content: "", tags: "" });
      console.log("Semantic memory stored with ID:", objectId);
    }
  };

  // Handle semantic memory search
  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) {
      setSemanticResults([]);
      return;
    }

    const results = await searchSemanticMemory(semanticQuery.trim());
    setSemanticResults(results);
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
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          {/* Working Memory Group */}
          <div className="flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-gray-700">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-gray-500 mr-1">Working:</span>
            <button
              onClick={() => setActiveMode("put")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMode === "put"
                  ? "bg-purple-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Send className="w-3 h-3 inline mr-1" />
              Put
            </button>
            <button
              onClick={() => setActiveMode("search")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMode === "search"
                  ? "bg-purple-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Search className="w-3 h-3 inline mr-1" />
              Search
            </button>
          </div>
          
          {/* Semantic Memory Group */}
          <div className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-gray-500 mr-1">Semantic:</span>
            <button
              onClick={() => setActiveMode("semantic-put")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMode === "semantic-put"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <FileJson className="w-3 h-3 inline mr-1" />
              Store Doc
            </button>
            <button
              onClick={() => setActiveMode("semantic-search")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMode === "semantic-search"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <BookOpen className="w-3 h-3 inline mr-1" />
              Search Docs
            </button>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        {activeMode === "put" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Working Memory — Session-scoped entries
              </span>
            </div>
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
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
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
        ) : activeMode === "search" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Working Memory — Semantic search within current session
              </span>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Natural Language Search (semantic/vector)
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'find discussions about GraphQL' or 'what did we say about auth?'"
                  disabled={!isConnected || isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!isConnected || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>
          </div>
        ) : activeMode === "semantic-put" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Semantic Memory — Store persistent knowledge documents (JSON)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={semanticDoc.title}
                  onChange={(e) => setSemanticDoc(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. API Best Practices"
                  disabled={!isConnected || isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={semanticDoc.tags}
                  onChange={(e) => setSemanticDoc(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g. api, security, validation"
                  disabled={!isConnected || isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Content
              </label>
              <textarea
                value={semanticDoc.content}
                onChange={(e) => setSemanticDoc(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the knowledge content... This will be embedded for semantic search."
                disabled={!isConnected || isLoading}
                className="w-full h-24 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handlePutSemanticMemory}
                disabled={!isConnected || isLoading || !semanticDoc.title.trim() || !semanticDoc.content.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileJson className="w-4 h-4" />
                )}
                Store Document
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Semantic Memory — Search knowledge base across all sessions
              </span>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Knowledge Search (vector/embedding-based)
                </label>
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="e.g. 'how to validate API input' or 'authentication patterns'"
                  disabled={!isConnected || isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                />
              </div>
              <button
                onClick={handleSemanticSearch}
                disabled={!isConnected || isLoading || !semanticQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                Search Knowledge
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Results Header */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {activeMode === "semantic-search" ? (
              <>
                <Database className="w-4 h-4 inline mr-1.5 text-blue-500" />
                Semantic Results ({semanticResults.length})
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 inline mr-1.5 text-purple-500" />
                Working Memories ({memories.length})
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            {activeMode !== "semantic-search" && (
              <button
                onClick={handleRefresh}
                disabled={!isConnected || isLoading}
                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50 transition-colors"
                title="Refresh memories"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (activeMode === "semantic-search") {
                  setSemanticResults([]);
                } else {
                  clearMemories();
                }
              }}
              disabled={activeMode === "semantic-search" ? semanticResults.length === 0 : memories.length === 0}
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
          ) : activeMode === "semantic-search" ? (
            semanticResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Database className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No Semantic Results</p>
                <p className="text-xs text-gray-400 mt-1 text-center max-w-xs">
                  Search your knowledge base to find stored documents by meaning.
                  <br />
                  First store some documents using "Store Doc".
                </p>
              </div>
            ) : (
              semanticResults.map((result, index) => (
                <SemanticResultCard key={index} result={result} index={index} />
              ))
            )
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
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-purple-500" />
                Working: {memories.length} entries
              </span>
              {semanticResults.length > 0 && (
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3 text-blue-500" />
                  Semantic: {semanticResults.length} results
                </span>
              )}
            </div>
            <span className="font-mono">
              {activeMode.startsWith("semantic") ? "Knowledge Base" : "Session Active"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
