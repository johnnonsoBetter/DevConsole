/**
 * AgentIndicator Component
 * Compact, elegant floating badge showing AI agent presence
 * Designed to be non-intrusive while providing helpful status info
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronDown, ChevronUp, Mic, Sparkles, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface AgentInfo {
  id: string;
  name: string;
  isListening?: boolean;
  isSpeaking?: boolean;
  status?: 'idle' | 'listening' | 'processing' | 'speaking';
}

interface AgentIndicatorProps {
  /** Agent information */
  agent: AgentInfo | null;
  /** Whether transcription is active */
  isTranscribing?: boolean;
  /** Click handler to toggle transcript panel */
  onToggleTranscript?: () => void;
  /** Whether transcript panel is open */
  isTranscriptOpen?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Get a friendly display name for the agent
 */
function getAgentDisplayName(name: string): string {
  // If it's a long agent ID, show a friendly name
  if (name.startsWith('agent-') && name.length > 20) {
    return 'AI Assistant';
  }
  return name;
}

/**
 * Get status text for the agent
 */
function getStatusText(agent: AgentInfo, isTranscribing: boolean): string {
  if (agent.status === 'speaking' || agent.isSpeaking) {
    return 'Speaking';
  }
  if (agent.status === 'processing') {
    return 'Processing';
  }
  if (agent.status === 'listening' || agent.isListening || isTranscribing) {
    return 'Listening';
  }
  return 'Ready';
}

/**
 * AgentIndicator - A compact floating badge for AI agent presence
 */
export function AgentIndicator({
  agent,
  isTranscribing = false,
  onToggleTranscript,
  isTranscriptOpen = false,
  className = '',
}: AgentIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (!agent) return null;

  const displayName = getAgentDisplayName(agent.name);
  const statusText = getStatusText(agent, isTranscribing);
  const isActive = agent.isSpeaking || agent.isListening || isTranscribing;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative flex flex-col items-center ${className}`}
    >
      {/* Main badge */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center gap-2 px-3 py-1.5 
          bg-gradient-to-r from-purple-600/90 to-indigo-600/90 
          backdrop-blur-md rounded-full shadow-lg
          border border-white/10
          transition-all duration-200
          ${isActive ? 'ring-2 ring-purple-400/50 ring-offset-2 ring-offset-gray-900' : ''}
        `}
        aria-label={`AI Agent: ${displayName} - ${statusText}`}
        aria-expanded={isExpanded}
      >
        {/* Animated icon based on status */}
        <div className="relative">
          {agent.isSpeaking ? (
            <Volume2 className="w-4 h-4 text-white animate-pulse" />
          ) : isTranscribing || agent.isListening ? (
            <Mic className="w-4 h-4 text-white animate-pulse" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
          {/* Active indicator dot */}
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Agent name and status */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white">{displayName}</span>
          <span className="text-[10px] text-white/70">• {statusText}</span>
        </div>

        {/* Expand indicator */}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-white/70" />
        ) : (
          <ChevronDown className="w-3 h-3 text-white/70" />
        )}
      </motion.button>

      {/* Expanded panel - absolutely positioned to prevent layout shift */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50"
          >
            {/* Arrow pointer */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800/95 border-t border-l border-white/10 rotate-45" />
            
            <div className="flex flex-col gap-1.5 p-2.5 bg-gray-800/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl min-w-[200px]">
              {/* Status indicator */}
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-700/50 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-gray-200">AI Transcription</p>
                  <p className="text-[10px] text-gray-400">
                    {isTranscribing ? 'Active - capturing speech' : 'Ready to transcribe'}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              </div>

              {/* View Transcript Button */}
              {onToggleTranscript && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTranscript();
                    setIsExpanded(false);
                  }}
                  className={`
                    flex items-center justify-center gap-1.5 px-3 py-2 
                    text-xs font-medium rounded-lg transition-all duration-150
                    ${isTranscriptOpen 
                      ? 'bg-purple-600 text-white hover:bg-purple-500' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  {isTranscriptOpen ? 'Hide Transcript' : 'View Transcript'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Compact inline version for tight spaces
 */
export function AgentIndicatorCompact({
  agent,
  isTranscribing = false,
  className = '',
}: Omit<AgentIndicatorProps, 'onToggleTranscript' | 'isTranscriptOpen'>) {
  if (!agent) return null;

  const isActive = agent.isSpeaking || agent.isListening || isTranscribing;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-1.5 px-2 py-1 
        bg-purple-600/80 backdrop-blur-sm rounded-full
        ${className}
      `}
      title={`AI Agent: ${agent.name}`}
    >
      <Bot className="w-3 h-3 text-white" />
      <span className="text-[10px] font-medium text-white">AI</span>
      {isActive && (
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
      )}
    </motion.div>
  );
}
