/**
 * InsightsPanel Component
 * Analyzes the transcript to extract key insights
 * 
 * Features:
 * - Extracts questions from the conversation
 * - Identifies decisions made
 * - Finds action items and todos
 * - Detects key topics discussed
 * - Real-time filtering and search
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  HelpCircle,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranscriptions } from '@livekit/components-react';

// ============================================================================
// TYPES
// ============================================================================

interface InsightsPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Optional className for styling */
  className?: string;
}

type InsightType = 'question' | 'decision' | 'action' | 'topic';

interface Insight {
  id: string;
  type: InsightType;
  content: string;
  speaker: string;
  timestamp: number;
  /** The full segment text this was extracted from */
  context: string;
}

/** Simplified segment for insight extraction */
interface SimpleSegment {
  id: string;
  text: string;
  speaker: string;
  timestamp: number;
}

interface InsightCategory {
  id: InsightType | 'all';
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INSIGHT_CATEGORIES: InsightCategory[] = [
  {
    id: 'all',
    label: 'All',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-gray-300',
    bgColor: 'bg-gray-700/50',
    borderColor: 'border-gray-600',
  },
  {
    id: 'question',
    label: 'Questions',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'decision',
    label: 'Decisions',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'action',
    label: 'Action Items',
    icon: <ListTodo className="w-4 h-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'topic',
    label: 'Key Topics',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

// Patterns to detect different insight types
const INSIGHT_PATTERNS = {
  question: [
    /\?$/,                           // Ends with question mark
    /^(what|who|where|when|why|how|can|could|would|should|is|are|do|does|did|will|have|has)/i,
    /^(any thoughts|any ideas|what do you think|does anyone)/i,
  ],
  decision: [
    /^(let's|we'll|we will|we should|we're going to|we are going to|decided to|decision is|agreed to)/i,
    /(let's go with|we'll do|we decided|the plan is|we're doing)/i,
    /(final decision|agreed upon|consensus is|settled on)/i,
  ],
  action: [
    /^(i'll|i will|we need to|someone needs to|action item|todo|to do)/i,
    /(take care of|follow up|send|schedule|create|update|fix|implement|review)/i,
    /(by tomorrow|by end of|by next week|deadline|due date|asap)/i,
    /^(can you|could you|would you|please)/i,
  ],
  topic: [
    /^(regarding|about|concerning|speaking of|on the topic of)/i,
    /(the main point|key takeaway|important thing|bottom line)/i,
    /(in summary|to summarize|overall|essentially)/i,
  ],
};

// ============================================================================
// INSIGHT EXTRACTION
// ============================================================================

function extractInsights(segments: SimpleSegment[]): Insight[] {
  const insights: Insight[] = [];
  const seenIds = new Set<string>();
  
  for (const segment of segments) {
    // Process all segments with text (not just final ones)
    if (!segment.text.trim()) continue;
    
    const text = segment.text.trim();
    
    // Check each insight type
    for (const [type, patterns] of Object.entries(INSIGHT_PATTERNS) as [InsightType, RegExp[]][]) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const id = `${segment.id}-${type}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            insights.push({
              id,
              type,
              content: text,
              speaker: segment.speaker,
              timestamp: segment.timestamp,
              context: text,
            });
          }
          break; // Only match once per type per segment
        }
      }
    }
  }
  
  // Sort by timestamp (newest first)
  return insights.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SearchInput({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <Search className="w-4 h-4 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter insights..."
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

function CategoryChip({
  category,
  count,
  isSelected,
  onClick,
}: {
  category: InsightCategory;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isSelected
          ? `${category.bgColor} ${category.color} border ${category.borderColor}`
          : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:border-gray-600'
      }`}
    >
      <span className={isSelected ? category.color : 'text-gray-500'}>{category.icon}</span>
      <span>{category.label}</span>
      {count > 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            isSelected ? 'bg-white/10' : 'bg-gray-700'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function InsightCard({
  insight,
  searchTerm,
  onCopy,
}: {
  insight: Insight;
  searchTerm: string;
  onCopy: (text: string) => void;
}) {
  const category = INSIGHT_CATEGORIES.find((c) => c.id === insight.type) || INSIGHT_CATEGORIES[0];
  
  // Highlight search term in content
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    
    try {
      const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`p-3 rounded-lg border ${category.bgColor} ${category.borderColor} hover:border-opacity-50 transition-all group`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${category.bgColor} flex items-center justify-center`}>
          <span className={category.color}>{category.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-primary font-medium">
              {insight.speaker}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${category.bgColor} ${category.color}`}>
              {category.label}
            </span>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">
            {highlightText(insight.content)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {new Date(insight.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
        <button
          onClick={() => onCopy(insight.content)}
          className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700/50 transition-all"
          title="Copy to clipboard"
        >
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ selectedCategory, hasTranscript }: { selectedCategory: InsightCategory['id']; hasTranscript: boolean }) {
  if (!hasTranscript) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <MessageSquare className="w-7 h-7 text-gray-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-300 mb-1">
          Waiting for conversation
        </h3>
        <p className="text-xs text-gray-500 max-w-[220px]">
          Insights will appear here as the conversation progresses. Start speaking to see questions, decisions, and action items.
        </p>
      </div>
    );
  }

  const category = INSIGHT_CATEGORIES.find((c) => c.id === selectedCategory);
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4">
        <Brain className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-sm font-medium text-gray-300 mb-1">
        No {selectedCategory === 'all' ? 'insights' : category?.label.toLowerCase()} found
      </h3>
      <p className="text-xs text-gray-500 max-w-[220px]">
        {selectedCategory === 'question' && 'Try asking questions during the call to see them captured here.'}
        {selectedCategory === 'decision' && 'Decisions like "let\'s go with..." or "we\'ll do..." will appear here.'}
        {selectedCategory === 'action' && 'Action items and todos mentioned in the conversation will be captured.'}
        {selectedCategory === 'topic' && 'Key topics and summaries from the discussion will show here.'}
        {selectedCategory === 'all' && 'Keep talking! Insights will be extracted as the conversation continues.'}
      </p>
    </div>
  );
}

function QuickStats({ insights }: { insights: Insight[] }) {
  const counts = useMemo(() => {
    const c = { question: 0, decision: 0, action: 0, topic: 0 };
    for (const insight of insights) {
      c[insight.type]++;
    }
    return c;
  }, [insights]);

  return (
    <div className="grid grid-cols-4 gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/30">
      <div className="text-center">
        <div className="text-lg font-semibold text-blue-400">{counts.question}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Questions</div>
      </div>
      <div className="text-center border-l border-gray-700/50">
        <div className="text-lg font-semibold text-emerald-400">{counts.decision}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Decisions</div>
      </div>
      <div className="text-center border-l border-gray-700/50">
        <div className="text-lg font-semibold text-amber-400">{counts.action}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Actions</div>
      </div>
      <div className="text-center border-l border-gray-700/50">
        <div className="text-lg font-semibold text-purple-400">{counts.topic}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Topics</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsPanel({
  isOpen,
  onClose,
  className = '',
}: InsightsPanelProps) {
  // Use LiveKit's useTranscriptions hook directly for real-time access
  const transcriptions = useTranscriptions();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory['id']>('all');
  const [copied, setCopied] = useState(false);

  // Transform raw LiveKit transcriptions to simple segments
  // Deduplicate by segment_id to get latest version of each segment
  const segments = useMemo(() => {
    const segmentMap = new Map<string, SimpleSegment>();
    
    for (const t of transcriptions) {
      // Use segment_id for deduplication (same segment gets updated as transcription progresses)
      const segmentId = t.streamInfo?.attributes?.['lk.segment_id'] || t.streamInfo?.id || `seg-${transcriptions.indexOf(t)}`;
      const speaker = t.participantInfo?.identity || 'Unknown';
      const text = t.text || '';
      const timestamp = t.streamInfo?.timestamp 
        ? new Date(t.streamInfo.timestamp).getTime() 
        : Date.now();
      
      // Always use the latest version (map will overwrite)
      segmentMap.set(segmentId, {
        id: segmentId,
        text,
        speaker,
        timestamp,
      });
    }
    
    // Convert to array and sort by timestamp
    return Array.from(segmentMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [transcriptions]);

  // Extract insights from transcript segments
  const insights = useMemo(() => extractInsights(segments), [segments]);

  // Count insights by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: insights.length };
    for (const insight of insights) {
      counts[insight.type] = (counts[insight.type] || 0) + 1;
    }
    return counts;
  }, [insights]);

  // Filter insights by category and search term
  const filteredInsights = useMemo(() => {
    let filtered = insights;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((i) => i.type === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.content.toLowerCase().includes(term) ||
          i.speaker.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [insights, selectedCategory, searchTerm]);

  // Copy to clipboard
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex flex-col bg-gray-900 border-l border-gray-700/50 ${className}`}
      style={{ width: '380px' }}
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
              {insights.length} insights from {segments.length} segments
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
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        {/* Quick Stats */}
        {insights.length > 0 && (
          <QuickStats insights={insights} />
        )}

        {/* Search input */}
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={handleClearSearch}
        />

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          {INSIGHT_CATEGORIES.map((category) => (
            <CategoryChip
              key={category.id}
              category={category}
              count={categoryCounts[category.id] || 0}
              isSelected={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            />
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredInsights.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  searchTerm={searchTerm}
                onCopy={handleCopy}
              />
            ))}
          </AnimatePresence>
        ) : (
          <EmptyState 
            selectedCategory={selectedCategory} 
            hasTranscript={segments.length > 0}
          />
        )}
      </div>        {/* Footer status */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/50 text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live analysis
          </div>
          {copied && (
            <span className="text-emerald-400">Copied!</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
