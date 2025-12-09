/**
 * AgentIndicator Component
 * Compact, elegant floating badge showing AI agent presence
 * Uses Headless UI Popover for proper positioning and accessibility
 * Designed to be non-intrusive while providing helpful status info
 */

import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Bot, ChevronDown, ChevronUp, Mic, Sparkles, Volume2 } from 'lucide-react';
import { forwardRef } from 'react';

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
 * Agent trigger button component
 * Must forward ref for Headless UI to work properly
 */
interface AgentTriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  isOpen?: boolean;
  displayName: string;
  statusText: string;
  agent: AgentInfo;
  isTranscribing: boolean;
}

const AgentTriggerButton = forwardRef<HTMLButtonElement, AgentTriggerButtonProps>(
  function AgentTriggerButton({ isActive, isOpen, displayName, statusText, agent, isTranscribing, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`
          flex items-center gap-2 px-3 py-1.5 
          bg-gradient-to-r from-purple-600/90 to-indigo-600/90 
          backdrop-blur-md rounded-full shadow-lg
          border border-white/10
          transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
          ${isActive ? 'ring-2 ring-purple-400/50 ring-offset-2 ring-offset-gray-900' : ''}
        `}
        aria-label={`AI Agent: ${displayName} - ${statusText}`}
        {...props}
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
        {isOpen ? (
          <ChevronUp className="w-3 h-3 text-white/70" />
        ) : (
          <ChevronDown className="w-3 h-3 text-white/70" />
        )}
      </button>
    );
  }
);

/**
 * AgentIndicator - A compact floating badge for AI agent presence
 * Uses Headless UI Popover for proper portal rendering and accessibility
 */
export function AgentIndicator({
  agent,
  isTranscribing = false,
  onToggleTranscript,
  isTranscriptOpen = false,
}: AgentIndicatorProps) {
  if (!agent) return null;

  const displayName = getAgentDisplayName(agent.name);
  const statusText = getStatusText(agent, isTranscribing);
  const isActive = agent.isSpeaking || agent.isListening || isTranscribing;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative \${className}`}
    >
      <Popover>
        {({ open }) => (
          <>
            <PopoverButton
              as={AgentTriggerButton}
              isActive={isActive}
              isOpen={open}
              displayName={displayName}
              statusText={statusText}
              agent={agent}
              isTranscribing={isTranscribing}
            />
            
            <PopoverPanel
              anchor={{ to: 'bottom', gap: 12 }}
              transition
              className="z-[99999] w-60 origin-top transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
            >
              <div className="bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 p-3">
                {/* Status indicator */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-700/50 rounded-lg mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200">AI Transcription</p>
                    <p className="text-[11px] text-gray-400">
                      {isTranscribing ? 'Active - capturing speech' : 'Ready to transcribe'}
                    </p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 \${isTranscribing ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                </div>

                {/* View Transcript Button */}
                {onToggleTranscript && (
                  <CloseButton
                    as="button"
                    onClick={onToggleTranscript}
                    className={`
                      w-full flex items-center justify-center gap-2 px-3 py-2.5 
                      text-xs font-medium rounded-lg transition-all duration-150
                      \${isTranscriptOpen 
                        ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }
                    `}
                  >
                    {isTranscriptOpen ? 'Hide Transcript' : 'View Transcript'}
                  </CloseButton>
                )}
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>
    </motion.div>
  );
}

/**
 * Compact inline version for tight spaces
 */
export function AgentIndicatorCompact({
  agent,
  isTranscribing = false,
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
        \${className}
      `}
      title={`AI Agent: \${agent.name}`}
    >
      <Bot className="w-3 h-3 text-white" />
      <span className="text-[10px] font-medium text-white">AI</span>
      {isActive && (
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
      )}
    </motion.div>
  );
}
