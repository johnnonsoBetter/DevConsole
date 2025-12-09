/**
 * TranscriptPanel Component
 * Real-time transcription display panel for video calls
 * Uses the useTranscription hook for proper transcription management
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
import { useCallback, useEffect, useRef, useState } from 'react';
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
}

interface TranscriptSegmentItemProps {
  segment: TranscriptSegment;
  index: number;
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================

const LOG_PREFIX = '[TranscriptPanel]';

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TranscriptSegmentItem({ segment }: TranscriptSegmentItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-1 py-2 px-3 rounded-lg bg-gray-800/50 mr-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-300">
          {segment.speaker}
        </span>
        {!segment.isFinal && (
          <span className="text-[10px] text-gray-500 italic">typing...</span>
        )}
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">
        {segment.text}
      </p>
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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 py-2 px-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
    >
      <div className="flex items-center gap-1.5">
        <Mic className="w-3 h-3 text-primary animate-pulse" />
        <span className="text-xs text-gray-400">
          {speaker || 'Speaking'}:
        </span>
      </div>
      <p className="text-sm text-gray-400 italic flex-1">
        {text}
        <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />
      </p>
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
  
  // Log when transcription state changes
  useEffect(() => {
    if (segments.length > 0) {
      log('Segments updated:', {
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
      
      {/* Segments */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {segments.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {segments.map((segment, index) => (
                <TranscriptSegmentItem key={segment.id} segment={segment} index={index} />
              ))}
            </AnimatePresence>
            
            {/* Latest segment indicator */}
            <AnimatePresence>
              {latestSegment && !latestSegment.isFinal && (
                <InterimTranscript text={latestSegment.text} speaker={latestSegment.speaker} />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      
      {/* Scroll to bottom indicator */}
      <AnimatePresence>
        {!autoScroll && segments.length > 0 && (
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
