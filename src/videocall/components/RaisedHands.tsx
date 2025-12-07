/**
 * RaisedHands Component
 * Shows a list of participants who have raised their hands
 * Displayed as a compact overlay in the video call
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Hand, X } from 'lucide-react';
import { useCallback, useState } from 'react';

export interface RaisedHand {
  participantId: string;
  participantName: string;
  raisedAt: number;
  isLocal?: boolean;
}

interface RaisedHandsProps {
  hands: RaisedHand[];
  onLowerHand?: (participantId: string) => void;
  localParticipantId?: string;
  className?: string;
}

export function RaisedHands({
  hands,
  onLowerHand,
  localParticipantId,
  className = '',
}: RaisedHandsProps) {
  // Sort by raised time, oldest first
  const sortedHands = [...hands].sort((a, b) => a.raisedAt - b.raisedAt);

  if (sortedHands.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`absolute top-4 right-4 z-30 ${className}`}
    >
      <div className="bg-gray-800/95 backdrop-blur-md rounded-xl shadow-apple-lg border border-white/10 overflow-hidden min-w-[180px]">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-warning/10">
          <motion.div
            animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
          >
            <Hand className="w-4 h-4 text-warning" />
          </motion.div>
          <span className="text-caption font-medium text-warning">
            Raised Hands ({sortedHands.length})
          </span>
        </div>

        {/* List */}
        <div 
          className="max-h-[200px] overflow-y-auto"
          role="list"
          aria-label="Participants with raised hands"
        >
          <AnimatePresence mode="popLayout">
            {sortedHands.map((hand, index) => (
              <RaisedHandItem
                key={hand.participantId}
                hand={hand}
                index={index}
                isLocal={hand.participantId === localParticipantId}
                onLower={onLowerHand}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface RaisedHandItemProps {
  hand: RaisedHand;
  index: number;
  isLocal: boolean;
  onLower?: (participantId: string) => void;
}

function RaisedHandItem({ hand, index, isLocal, onLower }: RaisedHandItemProps) {
  const handleLower = useCallback(() => {
    onLower?.(hand.participantId);
  }, [onLower, hand.participantId]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors group"
      role="listitem"
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Queue position */}
        <span className="w-5 h-5 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
          <span className="text-caption2 font-semibold text-warning">
            {index + 1}
          </span>
        </span>
        
        {/* Name */}
        <span className="text-body text-white truncate">
          {hand.participantName}
        </span>
        
        {isLocal && (
          <span className="text-caption2 text-gray-400">(You)</span>
        )}
      </div>

      {/* Lower hand button - only for local user */}
      {isLocal && onLower && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLower}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Lower your hand"
          title="Lower hand"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Hook to manage raised hands state
 */
export function useRaisedHands(localParticipantId?: string) {
  const [hands, setHands] = useState<RaisedHand[]>([]);

  const raiseHand = useCallback((participantId: string, participantName: string, isLocal = false) => {
    setHands((prev) => {
      // Don't add if already raised
      if (prev.some((h) => h.participantId === participantId)) {
        return prev;
      }
      return [...prev, {
        participantId,
        participantName,
        raisedAt: Date.now(),
        isLocal,
      }];
    });
  }, []);

  const lowerHand = useCallback((participantId: string) => {
    setHands((prev) => prev.filter((h) => h.participantId !== participantId));
  }, []);

  const toggleHand = useCallback((participantId: string, participantName: string) => {
    setHands((prev) => {
      const existing = prev.find((h) => h.participantId === participantId);
      if (existing) {
        return prev.filter((h) => h.participantId !== participantId);
      }
      return [...prev, {
        participantId,
        participantName,
        raisedAt: Date.now(),
        isLocal: participantId === localParticipantId,
      }];
    });
  }, [localParticipantId]);

  const isHandRaised = useCallback((participantId: string) => {
    return hands.some((h) => h.participantId === participantId);
  }, [hands]);

  return {
    hands,
    raiseHand,
    lowerHand,
    toggleHand,
    isHandRaised,
  };
}