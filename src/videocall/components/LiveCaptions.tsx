/**
 * LiveCaptions Component
 * Elegant, auto-fading caption overlay for real-time transcription
 * Appears at the bottom of the video view like TV subtitles
 */

import { useLocalParticipant, useTranscriptions } from '@livekit/components-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

interface LiveCaptionsProps {
  /** Whether captions are enabled */
  enabled?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Get a friendly speaker name
 */
function getSpeakerName(identity: string | undefined, isLocal: boolean): string {
  if (!identity) return 'Someone';
  
  // If it's the local participant
  if (isLocal) {
    return 'You';
  }
  
  // If it's an agent ID, return a friendly name
  if (identity.startsWith('agent-')) {
    return 'AI';
  }
  
  // Truncate long names
  if (identity.length > 15) {
    return identity.slice(0, 12) + '...';
  }
  
  return identity;
}

/**
 * LiveCaptions - Subtitle-style transcription overlay
 */
export function LiveCaptions({
  enabled = true,
  className = '',
}: LiveCaptionsProps) {
  // Use LiveKit's transcription hook - no filters to get ALL transcriptions
  const transcriptions = useTranscriptions();
  
  // Get local participant to identify local transcriptions
  const { localParticipant } = useLocalParticipant();
  const localIdentity = localParticipant?.identity;

  // Get the current/latest transcription for live display
  const currentCaption = useMemo(() => {
    if (!transcriptions.length) return null;
    
    const latest = transcriptions[transcriptions.length - 1];
    if (!latest?.text?.trim()) return null;

    const identity = latest.participantInfo?.identity;
    const isLocal = localIdentity ? identity === localIdentity : false;
    const isAgent = identity?.startsWith('agent-') || false;

    return {
      speaker: getSpeakerName(identity, isLocal),
      text: latest.text.trim(),
      isAgent,
      isLocal,
    };
  }, [transcriptions, localIdentity]);

  if (!enabled || !currentCaption) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-x-0 bottom-16 flex justify-center px-4 pointer-events-none ${className}`}
      role="region"
      aria-label="Live captions"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCaption.text.slice(0, 20)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="max-w-[85%] md:max-w-[70%] lg:max-w-[60%]"
        >
          <div 
            className={`
              px-4 py-2.5 rounded-xl
              bg-black/75 backdrop-blur-sm
              border border-white/5
              shadow-lg
            `}
          >
            {/* Speaker badge */}
            <div className="flex items-start gap-2">
              {currentCaption.isAgent && (
                <span className="shrink-0 px-1.5 py-0.5 bg-purple-600/80 rounded text-[10px] font-medium text-white mt-0.5">
                  AI
                </span>
              )}
              <div className="flex-1 min-w-0">
                {!currentCaption.isAgent && (
                  <span className="text-[11px] font-medium text-gray-400 block mb-0.5">
                    {currentCaption.speaker}
                  </span>
                )}
                <p className="text-sm md:text-base text-white leading-relaxed">
                  {currentCaption.text}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact caption pill for minimal UI
 */
export function LiveCaptionPill({
  enabled = true,
  className = '',
}: Omit<LiveCaptionsProps, 'maxLines'>) {
  const transcriptions = useTranscriptions();

  const currentText = useMemo(() => {
    if (!transcriptions.length) return null;
    const latest = transcriptions[transcriptions.length - 1];
    return latest?.text?.trim() || null;
  }, [transcriptions]);

  if (!enabled || !currentText) {
    return null;
  }

  // Truncate long text
  const displayText = currentText.length > 60 
    ? currentText.slice(0, 57) + '...' 
    : currentText;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        px-3 py-1.5 rounded-full
        bg-black/60 backdrop-blur-sm
        text-xs text-white
        max-w-[200px] truncate
        ${className}
      `}
    >
      {displayText}
    </motion.div>
  );
}
