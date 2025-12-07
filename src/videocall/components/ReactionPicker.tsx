/**
 * ReactionPicker Component
 * Popover menu for selecting emoji reactions during video calls
 * Follows design guide: 8px grid, smooth animations, accessible
 */

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

export interface Reaction {
  emoji: string;
  label: string;
  key: string;
}

// Available reactions
export const REACTIONS: Reaction[] = [
  { emoji: '👍', label: 'Thumbs up', key: 'thumbsup' },
  { emoji: '👏', label: 'Clap', key: 'clap' },
  { emoji: '❤️', label: 'Heart', key: 'heart' },
  { emoji: '😂', label: 'Laugh', key: 'laugh' },
  { emoji: '😮', label: 'Surprised', key: 'surprised' },
  { emoji: '🎉', label: 'Celebrate', key: 'celebrate' },
  { emoji: '🔥', label: 'Fire', key: 'fire' },
  { emoji: '💯', label: 'Perfect', key: 'perfect' },
];

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReaction: (reaction: Reaction) => void;
  className?: string;
}

export function ReactionPicker({
  isOpen,
  onClose,
  onSelectReaction,
  className = '',
}: ReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close on open click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const handleReactionClick = useCallback((reaction: Reaction) => {
    onSelectReaction(reaction);
    onClose();
  }, [onSelectReaction, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 ${className}`}
          role="dialog"
          aria-label="Reaction picker"
        >
          <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-apple-lg border border-white/10 p-2">
            {/* Header */}
            <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-white/5">
              <span className="text-caption2 font-medium text-gray-400">
                Send a reaction
              </span>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close picker"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Reaction grid */}
            <div 
              className="grid grid-cols-4 gap-1"
              role="listbox"
              aria-label="Available reactions"
            >
              {REACTIONS.map((reaction) => (
                <motion.button
                  key={reaction.key}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReactionClick(reaction)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  role="option"
                  aria-label={reaction.label}
                  title={reaction.label}
                >
                  <span className="text-xl" role="img" aria-hidden="true">
                    {reaction.emoji}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Pointer arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-800/95 border-b border-r border-white/10 rotate-45" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
