/**
 * CallMemorySearchPanel
 *
 * In-call "Smart Search" for transcripts:
 * - Instant local keyword search (current LiveKit transcript stream)
 * - SmartMemory semantic search (same session used for storage)
 * - One-click AI summaries for "key points / actions / decisions / questions"
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Copy,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { WorkingMemoryEntry } from "../hooks/useCallMemoryV2";
import { useTranscriptionManager, type TranscriptSegment } from "../hooks/useTranscription";

// ============================================================================
// TYPES
// ============================================================================

type InsightMode = "key-points" | "action-items" | "decisions" | "questions";

interface CallMemorySearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;

  // SmartMemory session + ops (from useCallMemoryV2)
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

function buildInsightPrompt(mode: InsightMode): string {
  switch (mode) {
    case "action-items":
      return `You are a meeting copilot. From these transcript snippets, extract ONLY action items.\n\nRules:\n- Use bullet points.\n- Include owner if implied (e.g. "Alice to...").\n- Include urgency/deadline if mentioned.\n- Keep it concise.`;
    case "decisions":
      return `You are a meeting copilot. From these transcript snippets, extract ONLY decisions that were made.\n\nRules:\n- Use bullet points.\n- Include context in 1 short clause.\n- Keep it concise.`;
    case "questions":
      return `You are a meeting copilot. From these transcript snippets, extract ONLY open questions.\n\nRules:\n- Use bullet points.\n- Prefer unanswered questions.\n- Keep it concise.`;
    case "key-points":
    default:
      return `You are a meeting copilot. Summarize the key points from these transcript snippets.\n\nReturn:\n- 5–8 bullets max\n- then a short section "Key Terms" with 5–10 comma-separated terms`;
  }
}

function computeTopKeywords(segments: TranscriptSegment[], max = 10): string[] {
  const stop = new Set([
    "about",
    "after",
    "also",
    "because",
    "before",
    "being",
    "can",
    "could",
    "did",
    "does",
    "doing",
    "done",
    "from",
    "have",
    "just",
    "like",
    "make",
    "maybe",
    "more",
    "need",
    "really",
    "should",
    "some",
    "that",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "want",
    "were",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "yeah",
    "your",
    "you're",
    "youre",
  ]);

  const counts = new Map<string, number>();
  const text = segments
    .filter((s) => s.isFinal)
    .map((s) => s.text)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  for (const word of text.split(/\s+/)) {
    const w = word.trim();
    if (w.length < 4) continue;
    if (stop.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CallMemorySearchPanel({
  isOpen,
  onClose,
  className = "",
  canUseMemory,
  memoryState,
  sessionId,
  memoryError,
  clearMemoryError,
  searchMemories,
  getMemories,
  summarizeMemories,
}: CallMemorySearchPanelProps) {
  const { segments, finalSegments } = useTranscriptionManager({ maxSegments: 250 });

  const [query, setQuery] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<string | null>(null);

  const [smartResults, setSmartResults] = useState<WorkingMemoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeInsightMode, setActiveInsightMode] = useState<InsightMode | null>(null);

  const requestIdRef = useRef(0);

  const speakers = useMemo(() => {
    const list = [...new Set(finalSegments.map((s) => s.speaker))];
    return list.sort((a, b) => a.localeCompare(b));
  }, [finalSegments]);

  const topKeywords = useMemo(() => computeTopKeywords(segments, 10), [segments]);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    return finalSegments.filter((s) => {
      if (speakerFilter && s.speaker !== speakerFilter) return false;
      return (
        s.text.toLowerCase().includes(q) ||
        s.speaker.toLowerCase().includes(q)
      );
    });
  }, [finalSegments, query, speakerFilter]);

  useEffect(() => {
    if (!canUseMemory) {
      setSmartResults([]);
      setIsSearching(false);
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setSmartResults([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);

    const handle = setTimeout(() => {
      void searchMemories(q, { nMostRecent: 30 })
        .then((results) => {
          if (requestId !== requestIdRef.current) return;

          const filtered = speakerFilter
            ? results.filter((r) => (r.agent ?? "") === speakerFilter)
            : results;

          setSmartResults(filtered);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => clearTimeout(handle);
  }, [canUseMemory, query, searchMemories, speakerFilter]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const runInsight = useCallback(
    async (mode: InsightMode) => {
      setIsSummarizing(true);
      setActiveInsightMode(mode);
      setSummary(null);

      try {
        const recent = await getMemories({ nMostRecent: 70 });
        const ids = recent.map((m) => m.id).filter(Boolean);
        if (ids.length === 0) {
          setSummary("No transcript stored yet — try again after a few turns.");
          return;
        }
        const prompt = buildInsightPrompt(mode);
        const out = await summarizeMemories(ids, prompt);
        setSummary(out ?? "No summary available yet.");
      } finally {
        setIsSummarizing(false);
      }
    },
    [getMemories, summarizeMemories]
  );

  const summarizeHits = useCallback(async () => {
    setIsSummarizing(true);
    setActiveInsightMode(null);
    setSummary(null);

    try {
      const ids = smartResults.map((r) => r.id).filter(Boolean);
      const out = await summarizeMemories(
        ids,
        `You are a meeting copilot. Summarize the most relevant moments from these search hits.\n\nReturn:\n- "Most Relevant" (5 bullets)\n- "Action Items" (bullets)\n- "Decisions" (bullets)\n- "Open Questions" (bullets)\n- "Names / Systems / Keywords" (comma-separated)`
      );
      setSummary(out ?? "No summary available yet.");
    } finally {
      setIsSummarizing(false);
    }
  }, [smartResults, summarizeMemories]);

  const memoryStateLabel = useMemo(() => {
    if (!canUseMemory) return "No memory";
    if (memoryState === "connected") return "Memory active";
    if (memoryState === "connecting") return "Starting…";
    if (memoryState === "error") return "Memory error";
    return "Idle";
  }, [canUseMemory, memoryState]);

  if (!isOpen) return null;

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
                Smart Search
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
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
          title="Close smart search"
        >
          <X className="w-4 h-4" />
        </button>
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
            placeholder='Search: "rate limit", "who owns this", "errors", ...'
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

        {/* Keyword chips */}
        {topKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-gray-500 self-center mr-1">
              Hot:
            </span>
            {topKeywords.slice(0, 8).map((kw) => (
              <button
                key={kw}
                onClick={() => setQuery(kw)}
                className="px-2 py-1 rounded-full text-[11px] bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:border-gray-600 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        )}

        {/* Instant insights */}
        {canUseMemory && (
          <div className="p-3 rounded-xl border border-gray-700/50 bg-gray-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-gray-200">
                Instant insights (so far)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => runInsight("key-points")}
                disabled={isSummarizing}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-200 disabled:opacity-50"
              >
                <Brain className="w-4 h-4 text-primary" />
                Key points
              </button>
              <button
                onClick={() => runInsight("action-items")}
                disabled={isSummarizing}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-200 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Action items
              </button>
              <button
                onClick={() => runInsight("decisions")}
                disabled={isSummarizing}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-200 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-emerald-300" />
                Decisions
              </button>
              <button
                onClick={() => runInsight("questions")}
                disabled={isSummarizing}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-200 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-blue-300" />
                Questions
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {/* Local */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-gray-300">
                Local matches
                {query.trim().length >= 2 ? (
                  <span className="text-gray-500 ml-1">
                    ({localMatches.length})
                  </span>
                ) : null}
              </p>
            </div>
            {query.trim().length >= 2 && localMatches.length === 0 ? (
              <p className="text-xs text-gray-500">No keyword matches yet.</p>
            ) : (
              <div className="space-y-2">
                {localMatches.slice(0, 8).map((seg) => (
                  <div
                    key={seg.id}
                    className="p-2 rounded-lg border border-gray-800 bg-gray-900/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-300 truncate">
                          {seg.speaker}
                          <span className="text-gray-600 ml-2">
                            {formatTime(seg.timestamp)}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(`${seg.speaker}: ${seg.text}`)}
                        className="p-1 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-200 mt-1 break-words">
                      {highlightText(seg.text, query)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SmartMemory */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-gray-300 flex items-center gap-2">
                SmartMemory matches
                {isSearching && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    searching…
                  </span>
                )}
                {query.trim().length >= 2 && !isSearching ? (
                  <span className="text-gray-500">({smartResults.length})</span>
                ) : null}
              </p>
              {canUseMemory && smartResults.length > 0 && (
                <button
                  onClick={summarizeHits}
                  disabled={isSummarizing}
                  className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/25 transition-colors text-[11px] text-primary disabled:opacity-50"
                  title="Summarize SmartMemory hits"
                >
                  {isSummarizing ? "Summarizing…" : "Summarize hits"}
                </button>
              )}
            </div>

            {!canUseMemory ? (
              <p className="text-xs text-gray-500">
                Memory is not enabled for this room.
              </p>
            ) : query.trim().length >= 2 && smartResults.length === 0 && !isSearching ? (
              <p className="text-xs text-gray-500">
                No semantic matches yet (try different wording).
              </p>
            ) : (
              <div className="space-y-2">
                {smartResults.slice(0, 8).map((m) => (
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

        {/* Summary */}
        <AnimatePresence>
          {(isSummarizing || summary) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="p-3 rounded-xl border border-gray-700/50 bg-gray-800/40"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isSummarizing ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-primary" />
                  )}
                  <p className="text-xs font-medium text-gray-200 truncate">
                    {isSummarizing
                      ? "Generating…"
                      : activeInsightMode
                        ? `Insight: ${activeInsightMode.replace("-", " ")}`
                        : "Summary"}
                  </p>
                </div>
                {summary && (
                  <button
                    onClick={() => void handleCopy(summary)}
                    className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-200"
                    title="Copy summary"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isSummarizing && !summary ? (
                <p className="text-xs text-gray-400">
                  Thinking through the conversation so far…
                </p>
              ) : summary ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summary}
                  </ReactMarkdown>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
