
/**
 * InsightsPanel Component
 * Analyzes the transcript to extract key insights using NLP
 * 
 * Features:
 * - Extracts questions using compromise.js NLP analysis
 * - Identifies decisions made with modal verb detection
 * - Finds action items and todos with verb phrase patterns
 * - Detects key topics discussed with noun phrase extraction
 * - Real-time filtering and search
 */
import { useTranscriptions } from '@livekit/components-react';
import nlp from 'compromise';
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

// ============================================================================
// NLP-POWERED INSIGHT DETECTION (using compromise.js)
// ============================================================================

/**
 * Detect if text is a question using NLP analysis
 * Uses compromise.js sentence analysis and question word detection
 */
function detectQuestion(text: string): boolean {
  const doc = nlp(text);
  
  // Check for question mark (punctuation-based)
  if (doc.has('@hasQuestionMark')) return true;
  
  // Check if sentence structure is a question
  if (doc.sentences().isQuestion().found) return true;
  
  // Check for question words at the start
  if (doc.has('^#QuestionWord')) return true;
  
  // Check for auxiliary/modal + subject patterns (inverted questions)
  // "Do you...", "Can we...", "Would you...", "Is this..."
  if (doc.has('^(do|does|did|is|are|was|were|can|could|would|should|will|have|has|may|might) #Noun')) return true;
  if (doc.has('^(do|does|did|is|are|was|were|can|could|would|should|will|have|has|may|might) #Pronoun')) return true;
  
  // Common question phrases
  if (doc.has('^(any thoughts|any ideas|what do you think|does anyone|how about)')) return true;
  
  return false;
}

/**
 * Detect if text contains a decision using NLP analysis
 * Looks for modal verbs with first-person plural and decision phrases
 */
function detectDecision(text: string): boolean {
  const doc = nlp(text);
  
  // "Let's" patterns - collaborative decisions
  if (doc.has("^let's")) return true;
  if (doc.has("let's #Verb")) return true;
  
  // "We will/should/are going to" - future commitment patterns
  if (doc.has('^we #Modal #Verb')) return true;
  if (doc.has('^we are going to #Verb')) return true;
  if (doc.has("^we're going to #Verb")) return true;
  if (doc.has('^we will #Verb')) return true;
  if (doc.has("^we'll #Verb")) return true;
  
  // Decision keywords
  if (doc.has('(decided|decision|agree|agreed|consensus|settled|finalized)')) return true;
  
  // "The plan is" type patterns
  if (doc.has('the (plan|decision|choice|approach) (is|was)')) return true;
  
  // "Go with" selection patterns
  if (doc.has("(let's|we'll|we will) go with")) return true;
  
  return false;
}

/**
 * Detect if text contains an action item using NLP analysis
 * Looks for future tense commitments, imperatives, and task language
 */
function detectAction(text: string): boolean {
  const doc = nlp(text);
  
  // First person future commitments: "I'll", "I will"
  if (doc.has("^i'll #Verb")) return true;
  if (doc.has('^i will #Verb')) return true;
  if (doc.has("^i'm going to #Verb")) return true;
  
  // "We need to" obligation patterns
  if (doc.has('(we|someone|somebody) (need|needs) to #Verb')) return true;
  if (doc.has('(we|i) (have|has) to #Verb')) return true;
  
  // Request patterns: "Can you", "Could you", "Would you"
  if (doc.has('^(can|could|would|will) (you|someone) #Verb')) return true;
  if (doc.has('^please #Verb')) return true;
  
  // Task keywords with verbs
  if (doc.has('(action item|todo|to-do|task|follow up|follow-up)')) return true;
  
  // Common action verbs in imperative or future context
  if (doc.has('#PresentTense (and|then) #Verb')) return true;
  
  // Deadline indicators
  if (doc.has('(by|before|until) (tomorrow|monday|tuesday|wednesday|thursday|friday|next week|end of|eod|eow)')) return true;
  if (doc.has('(deadline|due date|due by|asap|urgent|priority)')) return true;
  
  // Assignment patterns
  if (doc.has('#Person (will|should|can|needs to) #Verb')) return true;
  
  return false;
}

/**
 * Detect if text contains a key topic or summary using NLP analysis
 * Looks for topic markers, summary phrases, and key noun phrases
 */
function detectTopic(text: string): boolean {
  const doc = nlp(text);
  
  // Topic introduction phrases
  if (doc.has('^(regarding|about|concerning|speaking of|on the topic of|as for)')) return true;
  
  // Summary/conclusion phrases  
  if (doc.has('(in summary|to summarize|overall|essentially|basically|in short|the bottom line)')) return true;
  
  // Key point indicators
  if (doc.has('(the main point|key takeaway|important thing|key thing|main idea|core issue)')) return true;
  
  // Emphasis markers
  if (doc.has('(most importantly|the key is|what matters is|the crux is)')) return true;
  
  // "The X is..." definitional patterns (topic setting)
  if (doc.has('^the (issue|problem|challenge|question|topic|subject|focus|goal|objective) (is|here)')) return true;
  
  // Transitional topic markers
  if (doc.has('^(now|next|also|another thing|one more thing)')) return true;
  
  return false;
}

/**
 * Analyze text and return detected insight types using NLP
 * Returns array of insight types found in the text
 */
function analyzeTextForInsights(text: string): InsightType[] {
  const types: InsightType[] = [];
  
  // Run all detectors (order matters for priority)
  if (detectQuestion(text)) types.push('question');
  if (detectDecision(text)) types.push('decision');
  if (detectAction(text)) types.push('action');
  if (detectTopic(text)) types.push('topic');
  
  return types;
}

// ============================================================================
// INSIGHT EXTRACTION
// ============================================================================

/**
 * Extract insights from transcript segments using NLP analysis
 * Uses compromise.js for natural language understanding
 */
function extractInsights(segments: SimpleSegment[]): Insight[] {
  const insights: Insight[] = [];
  const seenIds = new Set<string>();
  
  for (const segment of segments) {
    // Process all segments with text (not just final ones)
    if (!segment.text.trim()) continue;
    
    const text = segment.text.trim();
    
    // Use NLP to analyze the text and detect insight types
    const detectedTypes = analyzeTextForInsights(text);
    
    // Create an insight for each detected type
    for (const type of detectedTypes) {
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
