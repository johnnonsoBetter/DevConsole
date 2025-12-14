/**
 * InCallMemoryPanel
 * 
 * Simple in-call memory panel using usePlaygroundMemory hook.
 * Allows putting content into working memory and searching it.
 * Uses Raindrop API key from room metadata (video call context).
 */

import { MemoryEntry, usePlaygroundMemory } from "@/hooks/usePlaygroundMemory";
import { useEnsureRoom } from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    Brain,
    Clock,
    Copy,
    Loader2,
    PlugZap,
    Power,
    RefreshCw,
    Search,
    Send,
    X,
    Zap
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface InCallMemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  roomName?: string;
}

interface RoomMetadata {
  raindropApiKey?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseRoomMetadata(metadataStr: string | undefined): RoomMetadata {
  if (!metadataStr) {
    return {};
  }
  try {
    return JSON.parse(metadataStr) as RoomMetadata;
  } catch {
    return {};
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || searchTerm.length < 2) return text;

  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <mark
        key={i}
        className="bg-yellow-500/40 text-yellow-200 rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ============================================================================
// MEMORY ENTRY CARD
// ============================================================================

interface MemoryCardProps {
  entry: MemoryEntry;
  searchTerm: string;
  onCopy: (text: string) => void;
  
}

function MemoryCard({ entry, searchTerm, onCopy }: MemoryCardProps) {
  return (
    <div className="p-2.5 rounded-lg border border-gray-800 bg-gray-900/40 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Brain className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-[11px] text-gray-400 truncate">
            {entry.timeline || "default"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(entry.timestamp)}
          </span>
          <button
            onClick={() => onCopy(entry.content)}
            className="p-1 rounded hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300"
            title="Copy"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-200 break-words leading-relaxed">
        {highlightText(entry.content, searchTerm)}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InCallMemoryPanel({
  isOpen,
  onClose,
  className = "",
  
}: InCallMemoryPanelProps) {
  // Get room context to extract API key from metadata
  const room = useEnsureRoom();
  
  // Parse raindrop API key from room metadata (video call context)
  const raindropApiKey = useMemo(() => {
    return parseRoomMetadata(room.metadata).raindropApiKey;
  }, [room.metadata]);

  const {
    isConnected,
    isLoading,
    error,
    sessionId,
    memories,
    config,
    connect,
    disconnect,
    putMemory,
    getMemory,
    searchMemory,
    clearError,
  } = usePlaygroundMemory();

  // Local state
  const [inputContent, setInputContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Check if memory is available (has API key)
  const canUseMemory = Boolean(raindropApiKey);

  // Handle connect
  const handleConnect = useCallback(async () => {
    if (isConnected) return;
    if (!canUseMemory || !raindropApiKey) {
      console.warn("[InCallMemoryPanel] Cannot connect - no API key in room metadata");
      return;
    }
    await connect({ raindropApiKey });
  }, [connect, isConnected, canUseMemory, raindropApiKey]);

  // Handle put memory
  const handlePutMemory = useCallback(async () => {
    if (!inputContent.trim()) return;
    await putMemory(inputContent.trim(), `conversation-${room.name}`);
    setInputContent("");
  }, [inputContent, putMemory, room.name]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      await getMemory({ nMostRecent: 50 });
    } else {
      await searchMemory(searchQuery.trim());
    }
  }, [searchQuery, getMemory, searchMemory]);

  // Handle copy
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await getMemory({ nMostRecent: 50 });
  }, [getMemory]);

  if (!isOpen || !room?.name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex flex-col bg-gray-900 border-l border-gray-700/50 ${className}`}
      style={{ width: "360px" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-200">
                Call Memory
              </h2>
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-700 bg-gray-800/60 text-gray-500">
                    Disconnected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
          
            {isConnected && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>



        {/* Active config display */}
        {isConnected && room?.name && (
          <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-gray-500">
            <span className="px-1 py-0.5 bg-gray-800 rounded">{config?.applicationName}</span>
            <span>/</span>
            <span className="px-1 py-0.5 bg-gray-800 rounded">{config?.name}</span>
            <span className="text-gray-600">@</span>
            <span className="px-1 py-0.5 bg-gray-800 rounded truncate max-w-[80px]">{config?.version}</span>
          </div>
        )}

        {/* Session ID */}
        {sessionId && (
          <p className="mt-1 text-[10px] text-gray-600 truncate">
            Session: {sessionId}
          </p>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 border-b border-gray-700/50"
          >
            <div className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="flex-1 break-words">{error}</span>
              <button
                onClick={clearError}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!isConnected ? (
          /* Connect View */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center mb-4">
              <PlugZap className="w-7 h-7 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">
              {canUseMemory ? "Not Connected" : "Memory Unavailable"}
            </h3>
            <p className="text-xs text-gray-500 mb-4 max-w-[200px]">
              {canUseMemory 
                ? "Connect to start storing and searching call memories"
                : "No Raindrop API key in room metadata. Memory features require configuration."
              }
            </p>
            {canUseMemory && (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlugZap className="w-4 h-4" />
                )}
                Connect
              </button>
            )}
          </div>
        ) : (
          /* Connected View */
          <>
            {/* Put Memory Input */}
            <div className="p-3 border-b border-gray-700/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePutMemory()}
                  placeholder="Add note to memory..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-200 placeholder:text-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={handlePutMemory}
                  disabled={isLoading || !inputContent.trim()}
                  className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  title="Add to memory"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-gray-700/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search memories..."
                  className="w-full pl-9 pr-9 py-2 text-sm bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-200 placeholder:text-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      handleRefresh();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-700"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Memories List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-gray-400">
                  Memories ({memories.length})
                </span>
                {isLoading && (
                  <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />
                )}
              </div>

              {memories.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    {searchQuery ? "No matches found" : "No memories yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((entry) => (
                    <MemoryCard
                      key={entry.id}
                      entry={entry}
                      searchTerm={searchQuery}
                      onCopy={handleCopy}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-gray-700/50 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                {memories.length} memories
              </span>
              <button
                onClick={disconnect}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
              >
                <Power className="w-3 h-3" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
