/**
 * InCallMemoryPanel
 *
 * Elevated in-call memory panel with semantic search capabilities.
 * Features:
 * - Real-time semantic search with debouncing
 * - Speaker/timeline filtering
 * - View mode toggle (search vs add note)
 * - Rich memory cards with speaker parsing
 * - Quick search suggestions
 * - Smooth animations
 */

import { MemoryEntry, usePlaygroundMemory } from "@/hooks/usePlaygroundMemory";
import { useEnsureRoom } from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    Brain,
    Check,
    Clock,
    Copy,
    FileText,
    Filter,
    Loader2,
    MessageSquare,
    Mic,
    PenLine,
    PlugZap,
    Power,
    RefreshCw,
    Search,
    Send,
    Sparkles,
    User,
    X,
    Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

interface ParsedMemory extends MemoryEntry {
  speaker?: string;
  isTranscript?: boolean;
  displayContent: string;
}

type ViewMode = "search" | "add" | "summarize";

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_SEARCHES = [
  { label: "Recent", icon: Clock, query: "" },
  { label: "Questions", icon: MessageSquare, query: "question asked" },
  { label: "Decisions", icon: Check, query: "decided agreed" },
  { label: "Actions", icon: Zap, query: "will do action task" },
];

const SPEAKER_COLORS = [
  "text-blue-400 bg-blue-500/20 border-blue-500/30",
  "text-purple-400 bg-purple-500/20 border-purple-500/30",
  "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
  "text-amber-400 bg-amber-500/20 border-amber-500/30",
  "text-pink-400 bg-pink-500/20 border-pink-500/30",
  "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
];

// ============================================================================
// HELPERS
// ============================================================================

function parseRoomMetadata(metadataStr: string | undefined): RoomMetadata {
  if (!metadataStr) return {};
  try {
    return JSON.parse(metadataStr) as RoomMetadata;
  } catch {
    return {};
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatTime(date);
}

function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || searchTerm.length < 2) return text;

  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <mark
        key={i}
        className="bg-yellow-500/30 text-yellow-200 rounded px-0.5 font-medium"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function parseMemoryContent(entry: MemoryEntry): ParsedMemory {
  const content = entry.content;

  // Try to parse as JSON transcript
  try {
    const parsed = JSON.parse(content);
    if (parsed.participantName || parsed.speaker) {
      return {
        ...entry,
        speaker: parsed.participantName || parsed.speaker,
        isTranscript: true,
        displayContent: parsed.text || parsed.content || content,
      };
    }
  } catch {
    // Not JSON, continue with text parsing
  }

  // Check for speaker prefix pattern: "Name: content" or "[Name] content"
  const speakerMatch = content.match(/^(?:\[([^\]]+)\]|([^:]+):)\s*(.+)$/s);
  if (speakerMatch) {
    return {
      ...entry,
      speaker: speakerMatch[1] || speakerMatch[2],
      isTranscript: true,
      displayContent: speakerMatch[3],
    };
  }

  return {
    ...entry,
    isTranscript: false,
    displayContent: content,
  };
}

function getSpeakerColor(speaker: string, speakers: string[]): string {
  const index = speakers.indexOf(speaker);
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

function getSpeakerInitials(speaker: string): string {
  return speaker
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// MEMORY CARD COMPONENT
// ============================================================================

interface MemoryCardProps {
  memory: ParsedMemory;
  searchTerm: string;
  speakers: string[];
  onCopy: (text: string) => void;
  isNew?: boolean;
}

function MemoryCard({
  memory,
  searchTerm,
  speakers,
  onCopy,
  isNew,
}: MemoryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy(memory.displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [memory.displayContent, onCopy]);

  const speakerColor = memory.speaker
    ? getSpeakerColor(memory.speaker, speakers)
    : "";

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`group p-3 rounded-xl border transition-all duration-200 ${
        memory.isTranscript
          ? "bg-gradient-to-br from-gray-900/80 to-gray-800/40 border-gray-700/50 hover:border-gray-600/70"
          : "bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20 hover:border-primary/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {memory.speaker ? (
            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${speakerColor}`}
            >
              <span className="text-[10px] font-bold">
                {getSpeakerInitials(memory.speaker)}
              </span>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center flex-shrink-0">
              {memory.isTranscript ? (
                <Mic className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <PenLine className="w-3.5 h-3.5 text-primary/70" />
              )}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {memory.speaker && (
                <span className="text-xs font-medium text-gray-200 truncate">
                  {memory.speaker}
                </span>
              )}
              {!memory.speaker && (
                <span className="text-xs text-gray-400">
                  {memory.isTranscript ? "Transcript" : "Note"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(memory.timestamp)}</span>
              {memory.timeline && memory.timeline !== "default" && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="truncate max-w-[80px]">
                    {memory.timeline}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className={`p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
            copied
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 opacity-0 group-hover:opacity-100"
          }`}
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-200 leading-relaxed break-words pl-9">
        {highlightText(memory.displayContent, searchTerm)}
      </p>
    </motion.div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  type: "no-memories" | "no-results" | "searching";
  searchQuery?: string;
}

function EmptyState({ type }: EmptyStateProps) {
  if (type === "searching") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <motion.div
            className="absolute -inset-2 rounded-3xl border-2 border-primary/20"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <p className="text-sm text-gray-300 font-medium">Searching memories...</p>
        <p className="text-xs text-gray-500 mt-1">
          Finding relevant moments from your conversation
        </p>
      </div>
    );
  }

  if (type === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center mb-4">
          <Search className="w-7 h-7 text-gray-600" />
        </div>
        <p className="text-sm text-gray-300 font-medium">No matches found</p>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          Try different keywords or{" "}
          <span className="text-primary">clear the search</span> to see all
          memories
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-700/40 border border-gray-700/50 flex items-center justify-center">
          <Brain className="w-7 h-7 text-gray-500" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-3 h-3 text-primary" />
        </motion.div>
      </div>
      <p className="text-sm text-gray-300 font-medium">Memory is ready</p>
      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
        Transcripts and notes will appear here as your conversation progresses
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
  // Room context
  const room = useEnsureRoom();

  // Parse raindrop API key from room metadata
  const raindropApiKey = useMemo(() => {
    return parseRoomMetadata(room.metadata).raindropApiKey;
  }, [room.metadata]);

  // Hook
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
    summarizeMemory,
    clearError,
  } = usePlaygroundMemory();

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("search");
  const [inputContent, setInputContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState("");

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Derived state
  const canUseMemory = Boolean(raindropApiKey);

  // Parse memories to extract speakers
  const parsedMemories = useMemo(() => {
    return memories.map(parseMemoryContent);
  }, [memories]);

  // Extract unique speakers
  const speakers = useMemo(() => {
    const speakerSet = new Set<string>();
    parsedMemories.forEach((m) => {
      if (m.speaker) speakerSet.add(m.speaker);
    });
    return Array.from(speakerSet).sort();
  }, [parsedMemories]);

  // Filter by selected speaker
  const filteredMemories = useMemo(() => {
    if (!selectedSpeaker) return parsedMemories;
    return parsedMemories.filter((m) => m.speaker === selectedSpeaker);
  }, [parsedMemories, selectedSpeaker]);

  // Auto-search with debounce
  useEffect(() => {
    if (!isConnected) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      // Fetch all when query is empty
      getMemory({ nMostRecent: 100 });
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await searchMemory(searchQuery.trim(), { nMostRecent: 50 });
      setIsSearching(false);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isConnected, getMemory, searchMemory]);

  // Handlers
  const handleConnect = useCallback(async () => {
    if (isConnected || !canUseMemory || !raindropApiKey) return;
    await connect({ raindropApiKey });
    // Fetch initial memories
    await getMemory({ nMostRecent: 100 });
  }, [connect, isConnected, canUseMemory, raindropApiKey, getMemory]);

  const handlePutMemory = useCallback(async () => {
    if (!inputContent.trim()) return;
    await putMemory(inputContent.trim(), `conversation-${room.name}`);
    setInputContent("");
    // Refresh memories
    await getMemory({ nMostRecent: 100 });
    // Switch to search mode to see the new memory
    setViewMode("search");
  }, [inputContent, putMemory, room.name, getMemory]);

  const handleQuickSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setViewMode("search");
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setSearchQuery("");
    setSelectedSpeaker(null);
    await getMemory({ nMostRecent: 100 });
  }, [getMemory]);

  const handleSummarize = useCallback(async () => {
    if (memories.length === 0) return;
    
    setIsSummarizing(true);
    setSummary(null);
    
    const result = await summarizeMemory(
      undefined, // Use all current memories
      summaryPrompt.trim() || undefined
    );
    
    setSummary(result);
    setIsSummarizing(false);
  }, [memories, summarizeMemory, summaryPrompt]);

  const handleCopySummary = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // ignore
    }
  }, [summary]);

  if (!isOpen || !room?.name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex flex-col bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 ${className}`}
      style={{ width: "380px" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-blue-500/20 border border-primary/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              {isConnected && (
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-900"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-100">
                Call Memory
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isConnected ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    Live • {memories.length} memories
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">Disconnected</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isConnected && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Session info */}
        {isConnected && sessionId && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
            <span className="px-1.5 py-0.5 bg-gray-800/80 rounded font-mono truncate max-w-[120px]">
              {config?.name}
            </span>
            <span className="text-gray-600">•</span>
            <span className="truncate">Session: {sessionId.slice(0, 12)}...</span>
          </div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-b border-gray-700/50"
          >
            <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1 break-words">{error}</span>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-3.5 h-3.5" />
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
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-800/80 to-gray-700/40 border border-gray-700/50 flex items-center justify-center">
                <PlugZap className="w-9 h-9 text-gray-500" />
              </div>
              <motion.div
                className="absolute -inset-3 rounded-[28px] border border-gray-700/30"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h3 className="text-base font-semibold text-gray-200 mb-2">
              {canUseMemory ? "Connect to Memory" : "Memory Unavailable"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-[240px]">
              {canUseMemory
                ? "Store transcripts and notes, then search through your entire conversation with AI-powered semantic search"
                : "No Raindrop API key found in room metadata. Memory features require configuration."}
            </p>
            {canUseMemory && (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Connect Memory
              </button>
            )}
          </div>
        ) : (
          /* Connected View */
          <>
            {/* View Mode Toggle */}
            <div className="px-4 py-2 border-b border-gray-700/50 bg-gray-900/60">
              <div className="flex gap-1 p-1 bg-gray-800/60 rounded-lg">
                <button
                  onClick={() => setViewMode("search")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === "search"
                      ? "bg-gray-700/80 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Search
                </button>
                <button
                  onClick={() => {
                    setViewMode("add");
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === "add"
                      ? "bg-gray-700/80 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Note
                </button>
                <button
                  onClick={() => setViewMode("summarize")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === "summarize"
                      ? "bg-gradient-to-r from-purple-600/80 to-primary/80 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Summarize
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === "summarize" ? (
                /* Summarize View */
                <motion.div
                  key="summarize"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  {/* Summarize Controls */}
                  <div className="p-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-primary/20 border border-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-200">AI Summary</h3>
                        <p className="text-[10px] text-gray-500">
                          {memories.length} memories available
                        </p>
                      </div>
                    </div>
                    
                    <textarea
                      value={summaryPrompt}
                      onChange={(e) => setSummaryPrompt(e.target.value)}
                      placeholder="Optional: Add custom instructions (e.g., 'Focus on action items' or 'Summarize key decisions')"
                      className="w-full px-3 py-2.5 text-xs bg-gray-800/60 border border-gray-700/50 rounded-xl text-gray-200 placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                      rows={2}
                    />
                    
                    <button
                      onClick={handleSummarize}
                      disabled={isSummarizing || memories.length === 0}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating summary...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Summarize Conversation
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary Result */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {isSummarizing ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-primary/20 border border-purple-500/30 flex items-center justify-center mb-4">
                            <Brain className="w-7 h-7 text-purple-400 animate-pulse" />
                          </div>
                          <motion.div
                            className="absolute -inset-2 rounded-3xl border-2 border-purple-500/20"
                            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                        <p className="text-sm text-gray-300 font-medium">Analyzing conversation...</p>
                        <p className="text-xs text-gray-500 mt-1">
                          AI is processing {memories.length} memories
                        </p>
                      </div>
                    ) : summary ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Generated Summary
                          </span>
                          <button
                            onClick={handleCopySummary}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 transition-colors"
                            title="Copy summary"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-primary/5 border border-purple-500/20">
                          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                            {summary}
                          </p>
                        </div>
                        <button
                          onClick={handleSummarize}
                          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Regenerate
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="relative mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-700/40 border border-gray-700/50 flex items-center justify-center">
                            <FileText className="w-7 h-7 text-gray-500" />
                          </div>
                          <motion.div
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles className="w-3 h-3 text-purple-400" />
                          </motion.div>
                        </div>
                        <p className="text-sm text-gray-300 font-medium">No summary yet</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                          Click "Summarize Conversation" to generate an AI-powered summary of your call
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : viewMode === "add" ? (
                /* Add Note View */
                <motion.div
                  key="add"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  <div className="space-y-3">
                    <textarea
                      ref={inputRef}
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePutMemory();
                        }
                      }}
                      placeholder="Add a note to this conversation's memory..."
                      className="w-full px-4 py-3 text-sm bg-gray-800/60 border border-gray-700/50 rounded-xl text-gray-200 placeholder:text-gray-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      rows={4}
                    />
                    <button
                      onClick={handlePutMemory}
                      disabled={isLoading || !inputContent.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Save to Memory
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">
                      Press Enter to save, Shift+Enter for new line
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Search View */
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-700/50">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <Search className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your conversation..."
                        className="w-full pl-10 pr-20 py-2.5 text-sm bg-gray-800/60 border border-gray-700/50 rounded-xl text-gray-200 placeholder:text-gray-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            showFilters || selectedSpeaker
                              ? "bg-primary/20 text-primary"
                              : "hover:bg-gray-700 text-gray-400"
                          }`}
                        >
                          <Filter className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Searches */}
                    {!searchQuery && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {QUICK_SEARCHES.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handleQuickSearch(item.query)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
                          >
                            <item.icon className="w-3 h-3" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Speaker Filters */}
                    <AnimatePresence>
                      {(showFilters || selectedSpeaker) && speakers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 pt-2 border-t border-gray-800/50"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <User className="w-3 h-3 text-gray-500" />
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                              Filter by speaker
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setSelectedSpeaker(null)}
                              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                !selectedSpeaker
                                  ? "bg-primary/20 border-primary/30 text-primary"
                                  : "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-gray-600"
                              }`}
                            >
                              All
                            </button>
                            {speakers.map((speaker) => (
                              <button
                                key={speaker}
                                onClick={() =>
                                  setSelectedSpeaker(
                                    selectedSpeaker === speaker ? null : speaker
                                  )
                                }
                                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors truncate max-w-[120px] ${
                                  selectedSpeaker === speaker
                                    ? getSpeakerColor(speaker, speakers)
                                    : "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-gray-600"
                                }`}
                                title={speaker}
                              >
                                {speaker}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {/* Results header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-gray-400">
                        {searchQuery ? "Search Results" : "Recent Memories"}
                        <span className="text-gray-600 ml-1.5">
                          ({filteredMemories.length}
                          {selectedSpeaker && ` from ${selectedSpeaker}`})
                        </span>
                      </span>
                      {(isLoading || isSearching) && (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      )}
                    </div>

                    {/* Results list */}
                    {isSearching && searchQuery ? (
                      <EmptyState type="searching" />
                    ) : filteredMemories.length === 0 ? (
                      <EmptyState
                        type={searchQuery ? "no-results" : "no-memories"}
                        searchQuery={searchQuery}
                      />
                    ) : (
                      <div className="space-y-2">
                        {filteredMemories.map((memory, idx) => (
                          <MemoryCard
                            key={memory.id}
                            memory={memory}
                            searchTerm={searchQuery}
                            speakers={speakers}
                            onCopy={handleCopy}
                            isNew={idx === 0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-900/60 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                {memories.length} memories stored
              </span>
              <button
                onClick={disconnect}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
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
