/**
 * InsightsPanel Component
 * In-call searchable insights panel for video calls
 * 
 * Features:
 * - Real-time search through transcript memory
 * - Shows related context from the conversation
 * - Displays tagged moments (decisions, action items, questions)
 * - AI-powered insights suggestions
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCallMemory } from '../hooks';
import type { TranscriptBatchContent, TranscriptTurn } from '../lib/callMemoryTypes';

// Type for individual turn content (new immediate storage format)
interface TurnMemoryContent {
  type: 'transcript_turn';
  roomId: string;
  timestamp: string;
  turn: TranscriptTurn;
}

// ============================================================================
// TYPES
// ============================================================================

interface InsightsPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback when search term changes (to sync with transcript panel) */
  onSearchTermChange?: (term: string) => void;
  /** Optional className for styling */
  className?: string;
}

interface SearchResult {
  id: string;
  type: 'transcript' | 'decision' | 'action' | 'question' | 'topic';
  content: string;
  speaker?: string;
  timestamp?: number;
  relevance: number;
}

interface InsightCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEBOUNCE_MS = 300;

const INSIGHT_CATEGORIES: Omit<InsightCategory, 'count'>[] = [
  {
    id: 'decisions',
    label: 'Decisions',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-400',
  },
  {
    id: 'action-items',
    label: 'Action Items',
    icon: <Tag className="w-4 h-4" />,
    color: 'text-amber-400',
  },
  {
    id: 'questions',
    label: 'Questions',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'text-blue-400',
  },
  {
    id: 'topics',
    label: 'Topics',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-purple-400',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SearchInput({
  value,
  onChange,
  onClear,
  isSearching,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isSearching: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {isSearching ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversation memory..."
        className="w-full pl-10 pr-10 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-700 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}
    </div>
  );
}

function SearchResultItem({ result }: { result: SearchResult }) {
  const iconByType = {
    transcript: <MessageSquare className="w-4 h-4" />,
    decision: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    action: <Tag className="w-4 h-4 text-amber-400" />,
    question: <HelpCircle className="w-4 h-4 text-blue-400" />,
    topic: <Lightbulb className="w-4 h-4 text-purple-400" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:border-gray-600/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
          {iconByType[result.type]}
        </div>
        <div className="flex-1 min-w-0">
          {result.speaker && (
            <span className="text-xs text-primary font-medium">
              {result.speaker}
            </span>
          )}
          <p className="text-sm text-gray-200 line-clamp-3 leading-relaxed">
            {result.content}
          </p>
          {result.timestamp && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {new Date(result.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
      </div>
    </motion.div>
  );
}

function CategoryChip({
  category,
  isSelected,
  onClick,
}: {
  category: InsightCategory;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isSelected
          ? 'bg-primary/20 text-primary border border-primary/30'
          : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:border-gray-600'
      }`}
    >
      <span className={category.color}>{category.icon}</span>
      <span>{category.label}</span>
      {category.count > 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            isSelected ? 'bg-primary/30' : 'bg-gray-700'
          }`}
        >
          {category.count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4">
        <Brain className="w-7 h-7 text-primary" />
      </div>
      {searchTerm ? (
        <>
          <h3 className="text-sm font-medium text-gray-300 mb-1">
            No results found
          </h3>
          <p className="text-xs text-gray-500 max-w-[220px]">
            No memories match "{searchTerm}". Try a different search term or
            wait for more conversation to be captured.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-sm font-medium text-gray-300 mb-1">
            Search your conversation
          </h3>
          <p className="text-xs text-gray-500 max-w-[220px]">
            Search through the call's memory to find specific topics, decisions,
            or discussions from earlier in the conversation.
          </p>
        </>
      )}
    </div>
  );
}

function MemoryNotAvailable() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-gray-500" />
      </div>
      <h3 className="text-sm font-medium text-gray-300 mb-1">
        Memory not configured
      </h3>
      <p className="text-xs text-gray-500 max-w-[220px]">
        The call creator needs to enable Raindrop memory for this room to use
        in-call search and insights.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsPanel({
  isOpen,
  onClose,
  onSearchTermChange,
  className = '',
}: InsightsPanelProps) {
  // Direct access to call memory for search functionality
  const { canUseMemory, state, searchSession, syncStats } = useCallMemory();
  const isActive = state === 'connected';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      onSearchTermChange?.(searchTerm);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearchTermChange]);

  // Perform search when debounced term changes
  useEffect(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!isActive) {
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await searchSession(debouncedSearchTerm);

        // Parse results and convert to SearchResult format
        // Handles both new individual turn format AND legacy batch format
        const parsedResults: SearchResult[] = results
          .map((content, index) => {
            try {
              const parsed = JSON.parse(content);

              // NEW: Handle individual turn format (immediate storage)
              if (parsed.type === 'transcript_turn' && parsed.turn) {
                const turnContent = parsed as TurnMemoryContent;
                const turn = turnContent.turn;
                
                // Check if matches search term
                if (
                  turn.text.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                  turn.participantName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                ) {
                  return [{
                    id: `turn-${index}`,
                    type: 'transcript' as const,
                    content: turn.text,
                    speaker: turn.participantName,
                    timestamp: turn.timestamp,
                    relevance: 1,
                  }];
                }
                return [];
              }

              // LEGACY: Handle batch format
              if (parsed.type === 'transcript_batch' && parsed.batch) {
                const batchContent = parsed as TranscriptBatchContent;
                return batchContent.batch
                  .filter(
                    (turn) =>
                      turn.text
                        .toLowerCase()
                        .includes(debouncedSearchTerm.toLowerCase()) ||
                      turn.participantName
                        .toLowerCase()
                        .includes(debouncedSearchTerm.toLowerCase())
                  )
                  .map((turn, turnIndex) => ({
                    id: `${index}-${turnIndex}`,
                    type: 'transcript' as const,
                    content: turn.text,
                    speaker: turn.participantName,
                    timestamp: turn.timestamp,
                    relevance: 1,
                  }));
              }

              // Handle other memory types
              return [
                {
                  id: `result-${index}`,
                  type: 'transcript' as const,
                  content: content.slice(0, 200),
                  relevance: 0.5,
                },
              ];
            } catch {
              // If parsing fails, show as raw result
              return [
                {
                  id: `raw-${index}`,
                  type: 'transcript' as const,
                  content: content.slice(0, 200),
                  relevance: 0.3,
                },
              ];
            }
          })
          .flat()
          .sort((a, b) => b.relevance - a.relevance);

        setSearchResults(parsedResults);
      } catch (err) {
        console.error('[InsightsPanel] Search error:', err);
        setSearchError(
          err instanceof Error ? err.message : 'Search failed'
        );
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm, isActive, searchSession]);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    onSearchTermChange?.('');
  }, [onSearchTermChange]);

  // Toggle category filter
  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  // Category counts (placeholder - would come from actual tagged memories)
  const categoriesWithCounts: InsightCategory[] = useMemo(() => {
    return INSIGHT_CATEGORIES.map((cat) => ({
      ...cat,
      count: 0, // TODO: Get actual counts from tagged memories
    }));
  }, []);

  // Filtered results by category
  const filteredResults = useMemo(() => {
    if (!selectedCategory) return searchResults;
    return searchResults.filter(
      (r) =>
        r.type === selectedCategory ||
        (selectedCategory === 'action-items' && r.type === 'action') ||
        (selectedCategory === 'decisions' && r.type === 'decision')
    );
  }, [searchResults, selectedCategory]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex flex-col bg-gray-900 border-l border-gray-700/50 ${className}`}
      style={{ width: '360px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-200">Call Insights</h2>
            <p className="text-[10px] text-gray-500">
              {syncStats.turnsStored} turns captured
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
          title="Close insights panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {!canUseMemory ? (
        <MemoryNotAvailable />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
          {/* Search input */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={handleClear}
            isSearching={isSearching}
          />

          {/* Category filters */}
          <div className="flex flex-wrap gap-1.5">
            {categoriesWithCounts.map((category) => (
              <CategoryChip
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onClick={() => handleCategoryClick(category.id)}
              />
            ))}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {searchError ? (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {searchError}
              </div>
            ) : filteredResults.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredResults.map((result) => (
                  <SearchResultItem key={result.id} result={result} />
                ))}
              </AnimatePresence>
            ) : (
              <EmptyState searchTerm={debouncedSearchTerm} />
            )}
          </div>

          {/* Memory status footer */}
          {isActive && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Memory active
              </div>
              <div>
                {syncStats.turnsStored} turns stored
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
