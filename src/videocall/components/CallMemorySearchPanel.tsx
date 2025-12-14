/**
 * CallMemorySearchPanel
 *
 * Simple search panel for working memory:
 * - Fetches all memories from working memory via getMemories
 * - Simple local text filtering on the results
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Loader2,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCallMemory, useCallMemoryV2 } from "../hooks";
import type { WorkingMemoryEntry } from "../hooks/useCallMemoryV2";

// ============================================================================
// TYPES
// ============================================================================

interface CallMemorySearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;

  // Memory session + ops (from useCallMemoryV2)
  canUseMemory: boolean;
  memoryState: "disconnected" | "connecting" | "connected" | "error";
  sessionId: string | null;
  memoryError: string | null;
  clearMemoryError: () => void;
  searchMemories: (
    terms: string,
    options?: { nMostRecent?: number; timeline?: string }
  ) => Promise<WorkingMemoryEntry[]>;
  getMemories: (options?: { nMostRecent?: number; timeline?: string }) => Promise<WorkingMemoryEntry[]>;
  summarizeMemories: (memoryIds: string[], systemPrompt?: string) => Promise<string | null>;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(timestampOrIso: number | string): string {
  const date =
    typeof timestampOrIso === "number"
      ? new Date(timestampOrIso)
      : new Date(timestampOrIso);
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
// COMPONENT
// ============================================================================

export function CallMemorySearchPanel({
  onClose,
  className = "",
  
  clearMemoryError,
}: CallMemorySearchPanelProps) {
  const [query, setQuery] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<string | null>(null);
  const [memories, setMemories] = useState<WorkingMemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const {canUseMemory, error: memoryError, sessionId,} = useCallMemory()
  const {getMemories, state: memoryState,searchMemories} = useCallMemoryV2()
  // Fetch all memories from working memory
  const fetchMemories = useCallback(async () => {
    if (!canUseMemory) return;
    
    setIsLoading(true);
    try {
      const results = await getMemories({ nMostRecent: 100 });
      setMemories(results);
    } catch (err) {
      console.error('[CallMemorySearchPanel] Failed to fetch memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [canUseMemory, getMemories]);


  // Get unique speakers from memories
  const speakers = useMemo(() => {
    const list = [...new Set(memories.map((m) => m.agent).filter(Boolean))] as string[];
    return list.sort((a, b) => a.localeCompare(b));
  }, [memories]);

  // Simple local text filtering
  const filteredMemories = memories
    
  
    
useEffect(() => {
    const handleSearchMemories = async () => {  
      if (canUseMemory && query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchMemories(query, { nMostRecent: 100 });
          setMemories(results);
        } catch (err) {
          console.error('[CallMemorySearchPanel] Failed to search memories:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If query is less than 2 characters, fetch all memories
        await fetchMemories();
      }
    }

    handleSearchMemories();
  }, [query, canUseMemory, searchMemories, fetchMemories]);



  useEffect(() => {
    const handleFetchMemories = async () => { 
      if (canUseMemory) {
        await fetchMemories();
      }
    }

    handleFetchMemories();
  }, [canUseMemory, fetchMemories]);


  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const memoryStateLabel = useMemo(() => {
    if (!canUseMemory) return "No memory";
    if (memoryState === "connected") return "Memory active";
    if (memoryState === "connecting") return "Starting…";
    if (memoryState === "error") return "Memory error";
    return "Idle";
  }, [canUseMemory, memoryState]);


  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex flex-col bg-gray-900 border-l border-gray-700/50 ${className}`}
      style={{ width: "380px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Search className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-200 truncate">
                Memory Search
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  memoryState === "connected"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : memoryState === "connecting"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                      : memoryState === "error"
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-gray-700 bg-gray-800/60 text-gray-400"
                }`}
              >
                {memoryStateLabel}
              </span>
            </div>
            {sessionId && (
              <p className="text-[10px] text-gray-500 truncate">
                Session: {sessionId}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchMemories}
            disabled={isLoading || !canUseMemory}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 disabled:opacity-50"
            title="Refresh memories"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Error */}
        <AnimatePresence>
          {memoryError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-xs flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-medium">Memory error</p>
                <p className="text-red-200/80 break-words">{memoryError}</p>
              </div>
              <button
                onClick={clearMemoryError}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-[10px] text-red-100"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search input */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter memories..."
            className="w-full pl-10 pr-10 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-700 transition-colors"
              title="Clear"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Speaker filter */}
        {speakers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSpeakerFilter(null)}
              className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                !speakerFilter
                  ? "bg-primary/20 border-primary/30 text-primary"
                  : "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-gray-600"
              }`}
            >
              All
            </button>
            {speakers.slice(0, 8).map((speaker) => (
              <button
                key={speaker}
                onClick={() => setSpeakerFilter(speakerFilter === speaker ? null : speaker)}
                className={`px-2 py-1 rounded-full text-[11px] border transition-colors max-w-[160px] truncate ${
                  speakerFilter === speaker
                    ? "bg-primary/20 border-primary/30 text-primary"
                    : "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-gray-600"
                }`}
                title={speaker}
              >
                {speaker}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-300">
              Memories
              <span className="text-gray-500 ml-1">
                ({filteredMemories.length} of {memories.length})
              </span>
            </p>
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                loading…
              </span>
            )}
          </div>

          {!canUseMemory ? (
            <p className="text-xs text-gray-500">
              Memory is not enabled for this room.
            </p>
          ) : memories.length === 0 && !isLoading ? (
            <p className="text-xs text-gray-500">
              No memories stored yet.
            </p>
          ) : filteredMemories.length === 0 && query.trim().length >= 2 ? (
            <p className="text-xs text-gray-500">
              No matches found for "{query}".
            </p>
          ) : (
            <div className="space-y-2">
              {filteredMemories.map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded-lg border border-gray-800 bg-gray-900/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-300 truncate">
                        {m.agent || "Transcript"}
                        <span className="text-gray-600 ml-2">
                          {formatTime(m.at)}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(m.content)}
                      className="p-1 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-200 mt-1 break-words">
                    {highlightText(m.content, query)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
