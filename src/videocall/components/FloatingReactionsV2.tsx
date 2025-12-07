/**
 * FloatingReactionsV2 Component
 * Animated floating reactions using Lucide icons
 * Synced across participants via LiveKit data channel
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
    Check,
    Flame,
    Heart,
    Laugh,
    type LucideIcon,
    PartyPopper,
    Sparkles,
    ThumbsUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FloatingReaction, ReactionType } from '../hooks/useReactionsChannel';

// Map reaction types to Lucide icons and colors
const REACTION_CONFIG: Record<ReactionType, { icon: LucideIcon; color: string; bgColor: string }> = {
  'thumbs-up': { icon: ThumbsUp, color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  'heart': { icon: Heart, color: 'text-red-400', bgColor: 'bg-red-400/20' },
  'party-popper': { icon: PartyPopper, color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  'laugh': { icon: Laugh, color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  'fire': { icon: Flame, color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  'clap': { icon: ThumbsUp, color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  'sparkles': { icon: Sparkles, color: 'text-cyan-400', bgColor: 'bg-cyan-400/20' },
  'check': { icon: Check, color: 'text-green-400', bgColor: 'bg-green-400/20' },
};

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
  onReactionComplete: (id: string) => void;
}

export function FloatingReactionsV2({
  reactions,
  onReactionComplete,
}: FloatingReactionsProps) {
  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none z-20"
      aria-live="polite"
      aria-label="Reactions"
    >
      <AnimatePresence>
        {reactions.map((reaction) => (
          <FloatingIcon
            key={reaction.id}
            reaction={reaction}
            onComplete={() => onReactionComplete(reaction.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface FloatingIconProps {
  reaction: FloatingReaction;
  onComplete: () => void;
}

function FloatingIcon({ reaction, onComplete }: FloatingIconProps) {
  const [isComplete, setIsComplete] = useState(false);
  const config = REACTION_CONFIG[reaction.reaction];
  const Icon = config?.icon || ThumbsUp;

  useEffect(() => {
    // Remove after animation completes
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (isComplete) return null;

  // Random horizontal drift for natural feel
  const drift = (Math.random() - 0.5) * 30;
  const rotation = (Math.random() - 0.5) * 30;

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: '100%', 
        x: `${reaction.x}%`,
        scale: 0.3,
        rotate: 0,
      }}
      animate={{ 
        opacity: [0, 1, 1, 1, 0],
        y: ['100%', '50%', '25%', '0%', '-20%'],
        x: `${reaction.x + drift}%`,
        scale: [0.3, 1.2, 1, 1, 0.8],
        rotate: [0, rotation, -rotation / 2, rotation / 4, 0],
      }}
      transition={{ 
        duration: 3.5,
        ease: 'easeOut',
        times: [0, 0.15, 0.4, 0.75, 1],
      }}
      className="absolute bottom-0 flex flex-col items-center gap-1"
      aria-hidden="true"
    >
      {/* Icon with background */}
      <motion.div
        className={`w-12 h-12 rounded-full ${config?.bgColor || 'bg-white/20'} backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10`}
        animate={{ 
          scale: [1, 1.1, 1, 1.05, 1],
        }}
        transition={{ 
          duration: 0.6,
          repeat: 2,
          ease: 'easeInOut',
        }}
      >
        <Icon className={`w-6 h-6 ${config?.color || 'text-white'} drop-shadow-md`} />
      </motion.div>
      
      {/* Participant name badge */}
      {reaction.participantName && (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-caption2 text-white whitespace-nowrap max-w-[100px] truncate"
        >
          {reaction.participantName}
        </motion.span>
      )}
    </motion.div>
  );
}

export { REACTION_CONFIG };
