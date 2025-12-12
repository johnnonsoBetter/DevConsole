/**
 * TranscriptPanel Component
 * Real-time transcription display panel for video calls
 * Uses the useTranscription hook for proper transcription management
 *
 * Enhanced with:
 * - Improved visual hierarchy with speaker avatars and colors
 * - Grouped consecutive messages from same speaker
 * - Timestamp formatting
 * - Search highlighting support
 *
 * @see https://docs.livekit.io/reference/components/react/hook/usetranscriptions/
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Copy,
  Download,
  FileText,
  Mic,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranscriptionManager, type TranscriptSegment } from '../hooks/useTranscription';

// ============================================================================
// TYPES
// ============================================================================

interface TranscriptPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Optional className for styling */
  className?: string;
  /** Optional search term to highlight */
  searchTerm?: string;
}

interface TranscriptSegmentItemProps {
  segment: TranscriptSegment;
  index: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  speakerColor: string;
  searchTerm?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Speaker colors for visual differentiation
const SPEAKER_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-teal-500',
];

const SPEAKER_TEXT_COLORS = [
  'text-blue-400',
  'text-emerald-400',
  'text-purple-400',
  'text-amber-400',
  'text-rose-400',
  'text-cyan-400',
  'text-pink-400',
  'text-teal-400',
];

// ============================================================================
// LOGGING UTILITY
// ============================================================================

const LOG_PREFIX = '[TranscriptPanel]';

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSpeakerInitials(speaker: string): string {
  const parts = speaker.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getSpeakerColorIndex(speaker: string): number {
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % SPEAKER_COLORS.length;
}

function highlightText(text: string, searchTerm: string | undefined): React.ReactNode {
  if (!searchTerm || searchTerm.length < 2) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return parts.map((part, i) => 
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <mark key={i} className="bg-yellow-500/40 text-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SpeakerAvatar({ speaker, colorClass }: { speaker: string; colorClass: string }) {
  const initials = getSpeakerInitials(speaker);
  
  return (
    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-lg`}>
      {initials}
    </div>
  );
}

function TranscriptSegmentItem({ 
  segment, 
  isFirstInGroup,
  isLastInGroup,
  speakerColor,
  searchTerm 
}: TranscriptSegmentItemProps) {
  const textColorClass = SPEAKER_TEXT_COLORS[getSpeakerColorIndex(segment.speaker)];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex gap-3 ${isFirstInGroup ? 'pt-3' : 'pt-0.5'} ${isLastInGroup ? 'pb-3' : 'pb-0.5'}`}
    >
      {/* Avatar column - only show on first message in group */}
      <div className="w-8 flex-shrink-0">
        {isFirstInGroup && (
          <SpeakerAvatar speaker={segment.speaker} colorClass={speakerColor} />
        )}
      </div>
      
      {/* Content column */}
      <div className="flex-1 min-w-0">
        {isFirstInGroup && (
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${textColorClass}`}>
              {segment.speaker}
            </span>
            <span className="text-[10px] text-gray-500">
              {formatTimestamp(segment.timestamp)}
            </span>
            {!segment.isFinal && (
              <span className="text-[10px] text-primary animate-pulse flex items-center gap-1">
                <Mic className="w-2.5 h-2.5" />
                speaking...
              </span>
            )}
          </div>
        )}
        <p className="text-sm text-gray-200 leading-relaxed break-words">
          {highlightText(segment.text, searchTerm)}
        </p>
      </div>
    </motion.div>
  );
}

function InterimTranscript({ 
  text, 
  speaker 
}: { 
  text: string; 
  speaker: string | null;
}) {
  const colorIndex = speaker ? getSpeakerColorIndex(speaker) : 0;
  const bgColor = SPEAKER_COLORS[colorIndex];
  const textColor = SPEAKER_TEXT_COLORS[colorIndex];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 py-2"
    >
      <div className="w-8 flex-shrink-0">
        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center animate-pulse shadow-lg`}>
          <Mic className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${textColor}`}>
            {speaker || 'Speaking'}
          </span>
          <span className="text-[10px] text-primary animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            transcribing...
          </span>
        </div>
        <p className="text-sm text-gray-400 italic">
          {text}
          <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse align-middle" />
        </p>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-gray-500" />
      </div>
      <h3 className="text-sm font-medium text-gray-300 mb-1">
        No transcripts yet
      </h3>
      <p className="text-xs text-gray-500 max-w-[200px]">
        Transcripts will appear here when participants speak during the call.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TranscriptPanel({
  isOpen,
  onClose,
  className = '',
  searchTerm,
}: TranscriptPanelProps) {
  // Use the useTranscriptionManager hook for all transcription management
  const {
    segments,
    latestSegment,
    clearTranscript,
    hasTranscription,
  } = useTranscriptionManager({
    maxSegments: 100,
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Filter segments when search term is provided
  const displaySegments = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return segments;
    return segments.filter((seg) => 
      seg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seg.speaker.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [segments, searchTerm]);
  
  // Track last logged segment count to avoid duplicate logs
  const lastLoggedCountRef = useRef(0);
  
  // Log when transcription state changes (only when count actually changes)
  useEffect(() => {
    if (segments.length > 0 && segments.length !== lastLoggedCountRef.current) {
      lastLoggedCountRef.current = segments.length;
      log('📜 Segments updated:', {
        total: segments.length,
        latest: segments[segments.length - 1],
      });
    }
  }, [segments]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, latestSegment, autoScroll]);
  
  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);
  
  // Export as text helper
  const exportAsText = useCallback((): string => {
    return segments
      .filter((seg) => seg.isFinal)
      .map((seg) => `${seg.speaker}: ${seg.text}`)
      .join('\n');
  }, [segments]);
  
  // Export as JSON helper
  const exportAsJSON = useCallback((): string => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        segments: segments
          .filter((seg) => seg.isFinal)
          .map((seg) => ({
            speaker: seg.speaker,
            text: seg.text,
          })),
      },
      null,
      2
    );
  }, [segments]);
  
  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      const text = exportAsText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [exportAsText]);
  
  // Download as file
  const handleDownload = useCallback((format: 'txt' | 'json') => {
    const content = format === 'txt' ? exportAsText() : exportAsJSON();
    const mimeType = format === 'txt' ? 'text/plain' : 'application/json';
    const filename = `transcript-${new Date().toISOString().slice(0, 10)}.${format}`;
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowExportMenu(false);
  }, [exportAsText, exportAsJSON]);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
    }
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex flex-col bg-gray-900 border-l border-gray-700/50 ${className}`}
      style={{ width: '320px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-gray-200">Transcript</h2>
          {hasTranscription && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 rounded text-xs text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Export menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
              title="Export transcript"
              disabled={segments.length === 0}
            >
              <Download className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden"
                >
                  <button
                    onClick={() => handleDownload('txt')}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 w-full text-left text-sm text-gray-200"
                  >
                    <FileText className="w-4 h-4" />
                    Download as TXT
                  </button>
                  <button
                    onClick={() => handleDownload('json')}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 w-full text-left text-sm text-gray-200"
                  >
                    <FileText className="w-4 h-4" />
                    Download as JSON
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
            title={copied ? 'Copied!' : 'Copy transcript'}
            disabled={segments.length === 0}
          >
            <Copy className={`w-4 h-4 ${copied ? 'text-success' : ''}`} />
          </button>
          
          {/* Clear button */}
          <button
            onClick={clearTranscript}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
            title="Clear transcript"
            disabled={segments.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
            title="Close transcript panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Segments - Enhanced with grouping */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3"
      >
        {displaySegments.length === 0 ? (
          searchTerm ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-300 mb-1">
                No matches found
              </h3>
              <p className="text-xs text-gray-500 max-w-[200px]">
                No transcripts match "{searchTerm}"
              </p>
            </div>
          ) : (
            <EmptyState />
          )
        ) : (
          <div className="divide-y divide-gray-800/50">
            <AnimatePresence mode="popLayout">
              {displaySegments.map((segment, index) => {
                const prevSpeaker = index > 0 ? displaySegments[index - 1].speaker : null;
                const nextSpeaker = index < displaySegments.length - 1 ? displaySegments[index + 1].speaker : null;
                const isFirstInGroup = segment.speaker !== prevSpeaker;
                const isLastInGroup = segment.speaker !== nextSpeaker;
                const colorIndex = getSpeakerColorIndex(segment.speaker);
                
                return (
                  <TranscriptSegmentItem 
                    key={segment.id} 
                    segment={segment} 
                    index={index}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    speakerColor={SPEAKER_COLORS[colorIndex]}
                    searchTerm={searchTerm}
                  />
                );
              })}
            </AnimatePresence>
            
            {/* Latest segment indicator */}
            <AnimatePresence>
              {latestSegment && !latestSegment.isFinal && (
                <InterimTranscript text={latestSegment.text} speaker={latestSegment.speaker} />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Scroll to bottom indicator */}
      <AnimatePresence>
        {!autoScroll && displaySegments.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 bg-primary rounded-full text-xs font-medium text-white shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            New messages
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
