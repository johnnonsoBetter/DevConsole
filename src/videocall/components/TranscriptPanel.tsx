/**
 * TranscriptPanel Component
 * Real-time transcription display panel for video calls
 * Uses LiveKit's useTranscriptions hook directly
 *
 * @see https://docs.livekit.io/reference/components/react/hook/usetranscriptions/
 */

import { useTranscriptions } from '@livekit/components-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Room } from 'livekit-client';
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
  /** Optional room instance - uses context if not provided */
  room?: Room;
  /** Optional participant identities to filter transcriptions */
  participantIdentities?: string[];
  /** Optional track SIDs to filter transcriptions */
  trackSids?: string[];
}

interface TranscriptMessage {
  id: string;
  participantIdentity: string;
  participantName: string;
  text: string;
  timestamp: number;
}

interface TranscriptMessageItemProps {
  message: TranscriptMessage;
  showTimestamp?: boolean;
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================

const LOG_PREFIX = '[TranscriptPanel]';

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]) {
  console.warn(LOG_PREFIX, ...args);
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TranscriptMessageItem({ message, showTimestamp = true }: TranscriptMessageItemProps) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-1 py-2 px-3 rounded-lg bg-gray-800/50 mr-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-300">
          {message.participantName}
        </span>
        {showTimestamp && (
          <span className="text-xs text-gray-500">{time}</span>
        )}
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">
        {message.text}
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
  room,
  participantIdentities,
  trackSids,
}: TranscriptPanelProps) {
  // Use LiveKit's useTranscriptions hook directly
  // Returns TextStreamData[] from @livekit/components-core
  // Pass optional filtering options
  const transcriptions = useTranscriptions({
    room,
    participantIdentities,
    trackSids,
  });

  // Log hook options on mount
  useEffect(() => {
    log('Hook initialized with options:', {
      hasRoom: !!room,
      participantIdentities,
      trackSids,
    });
  }, [room, participantIdentities, trackSids]);

  // Track cleared state
  const [clearedIndex, setClearedIndex] = useState(0);
  
  // Keep a stable reference to accumulated messages
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const lastProcessedLength = useRef(0);

  // Log transcriptions when they change
  useEffect(() => {
    if (transcriptions.length > 0) {
      log('Transcriptions updated:', {
        total: transcriptions.length,
        latest: transcriptions[transcriptions.length - 1],
      });
    }
  }, [transcriptions]);

  // Build messages from transcriptions
  const messages: TranscriptMessage[] = useMemo(() => {
    // Only process new transcriptions
    const startIndex = Math.max(lastProcessedLength.current, clearedIndex);
    const newTranscriptions = transcriptions.slice(startIndex);
    
    if (newTranscriptions.length === 0) {
      return messagesRef.current;
    }
    
    log('Processing new transcriptions:', {
      startIndex,
      count: newTranscriptions.length,
    });
    
    // Process new transcriptions into messages
    newTranscriptions.forEach((t, idx) => {
      const identity = t.participantInfo?.identity || 'unknown';
      const text = t.text?.trim() || '';
      
      if (!text) {
        logWarn('Empty transcription text, skipping');
        return;
      }
      
      const lastMessage = messagesRef.current[messagesRef.current.length - 1];
      
      // Merge if same speaker
      if (lastMessage && lastMessage.participantIdentity === identity) {
        lastMessage.text += ' ' + text;
        log('Merged text with previous message:', { identity, text });
      } else {
        const newMessage: TranscriptMessage = {
          id: `msg-${startIndex + idx}-${Date.now()}`,
          participantIdentity: identity,
          participantName: identity,
          text,
          timestamp: Date.now(),
        };
        messagesRef.current.push(newMessage);
        log('Added new message:', newMessage);
      }
    });
    
    lastProcessedLength.current = transcriptions.length;
    
    return [...messagesRef.current];
  }, [transcriptions, clearedIndex]);

  // Derived state
  const isActive = transcriptions.length > clearedIndex;
  const lastTranscription = transcriptions[transcriptions.length - 1];
  const interimText = lastTranscription?.text || null;
  const currentSpeaker = lastTranscription?.participantInfo?.identity || null;

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    log('Clearing transcripts');
    setClearedIndex(transcriptions.length);
    messagesRef.current = [];
    lastProcessedLength.current = transcriptions.length;
  }, [transcriptions.length]);

  // Export as text
  const exportAsText = useCallback((): string => {
    log('Exporting as text, message count:', messages.length);
    return messages
      .map((msg) => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        return `[${time}] ${msg.participantName}: ${msg.text}`;
      })
      .join('\n');
  }, [messages]);

  // Export as JSON
  const exportAsJSON = useCallback((): string => {
    log('Exporting as JSON, message count:', messages.length);
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        messages: messages.map((msg) => ({
          participant: msg.participantName,
          text: msg.text,
          timestamp: new Date(msg.timestamp).toISOString(),
        })),
      },
      null,
      2
    );
  }, [messages]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimText, autoScroll]);
  
  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);
  
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
          {isActive && (
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
              disabled={messages.length === 0}
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
            disabled={messages.length === 0}
          >
            <Copy className={`w-4 h-4 ${copied ? 'text-success' : ''}`} />
          </button>
          
          {/* Clear button */}
          <button
            onClick={clearTranscripts}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
            title="Clear transcript"
            disabled={messages.length === 0}
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
      
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {messages.length === 0 && !interimText ? (
          <EmptyState />
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <TranscriptMessageItem key={message.id} message={message} />
              ))}
            </AnimatePresence>
            
            {/* Interim text */}
            <AnimatePresence>
              {interimText && (
                <InterimTranscript text={interimText} speaker={currentSpeaker} />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      
      {/* Scroll to bottom indicator */}
      <AnimatePresence>
        {!autoScroll && messages.length > 0 && (
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
