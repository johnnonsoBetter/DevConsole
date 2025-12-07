/**
 * FloatingReactions Component
 * Animated floating emoji reactions that appear in the video call
 * Creates a fun, engaging visual feedback when reactions are sent
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  participantName?: string;
  x: number; // 0-100 percentage across container
}

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
  onReactionComplete: (id: string) => void;
}

export function FloatingReactions({
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
          <FloatingEmoji
            key={reaction.id}
            reaction={reaction}
            onComplete={() => onReactionComplete(reaction.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface FloatingEmojiProps {
  reaction: FloatingReaction;
  onComplete: () => void;
}

function FloatingEmoji({ reaction, onComplete }: FloatingEmojiProps) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Remove after animation completes
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (isComplete) return null;

  // Random horizontal drift for natural feel
  const drift = (Math.random() - 0.5) * 40;

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: '100%', 
        x: `${reaction.x}%`,
        scale: 0.5,
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        y: ['100%', '60%', '30%', '-20%'],
        x: `${reaction.x + drift}%`,
        scale: [0.5, 1.2, 1, 0.8],
      }}
      transition={{ 
        duration: 3,
        ease: 'easeOut',
        times: [0, 0.2, 0.7, 1],
      }}
      className="absolute bottom-0 flex flex-col items-center"
      aria-hidden="true"
    >
      {/* Emoji */}
      <motion.span 
        className="text-4xl drop-shadow-lg"
        animate={{ 
          rotate: [0, -10, 10, -5, 5, 0],
        }}
        transition={{ 
          duration: 1.5,
          repeat: 1,
          ease: 'easeInOut',
        }}
      >
        {reaction.emoji}
      </motion.span>
      
      {/* Participant name badge */}
      {reaction.participantName && (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-caption2 text-white whitespace-nowrap"
        >
          {reaction.participantName}
        </motion.span>
      )}
    </motion.div>
  );
}

/**
 * Hook to manage floating reactions state
 */
export function useFloatingReactions() {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  const addReaction = (emoji: string, participantName?: string) => {
    const newReaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      emoji,
      participantName,
      x: 20 + Math.random() * 60, // Random position 20-80%
    };
    
    setReactions((prev) => [...prev, newReaction]);
  };

  const removeReaction = (id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    reactions,
    addReaction,
    removeReaction,
  };
}
