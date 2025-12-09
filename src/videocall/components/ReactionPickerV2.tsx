/**
 * ReactionPicker Component
 * Popover menu for selecting reactions during video calls
 * Uses Headless UI Popover for proper positioning and accessibility
 * Uses Lucide icons instead of emojis for consistent styling
 * Follows design guide: 8px grid, smooth animations, accessible
 */

import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { motion } from 'framer-motion';
import {
  Check,
  Flame,
  Heart,
  Laugh,
  type LucideIcon,
  PartyPopper,
  Smile,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';
import { forwardRef, useCallback } from 'react';
import type { ReactionType } from '../hooks/useReactionsChannel';

export interface ReactionOption {
  type: ReactionType;
  icon: LucideIcon;
  label: string;
  color: string;
}

// Available reactions with Lucide icons - vibrant colors matching the design
export const REACTIONS: ReactionOption[] = [
  { type: 'thumbs-up', icon: ThumbsUp, label: 'Thumbs up', color: 'text-blue-500' },
  { type: 'heart', icon: Heart, label: 'Heart', color: 'text-rose-400' },
  { type: 'party-popper', icon: PartyPopper, label: 'Celebrate', color: 'text-yellow-400' },
  { type: 'laugh', icon: Laugh, label: 'Laugh', color: 'text-amber-400' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { type: 'clap', icon: ThumbsUp, label: 'Clap', color: 'text-violet-400' },
  { type: 'sparkles', icon: Sparkles, label: 'Sparkles', color: 'text-cyan-400' },
  { type: 'check', icon: Check, label: 'Agree', color: 'text-emerald-400' },
];

interface ReactionPickerProps {
  onSelectReaction: (type: ReactionType) => void;
  className?: string;
}

/**
 * Trigger button component for the reaction picker
 * Must forward ref for Headless UI to work properly
 */
const ReactionTriggerButton = forwardRef<
  HTMLButtonElement,
  { isActive?: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ReactionTriggerButton({ isActive, className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`
        w-10 h-10 flex items-center justify-center rounded-full
        transition-all duration-200 hover:scale-105 active:scale-95
        ${isActive
          ? 'bg-primary text-white' 
          : 'bg-white/10 hover:bg-white/20 text-white'
        }
        ${className}
      `}
      {...props}
    >
      <Smile className="w-5 h-5" />
    </button>
  );
});

/**
 * ReactionPicker - Self-contained reaction picker with trigger button
 * Uses Headless UI Popover for proper portal rendering and accessibility
 */
export function ReactionPicker({
  onSelectReaction,
  className = '',
}: ReactionPickerProps) {
  return (
    <Popover className={`relative ${className}`}>
      {({ open }) => (
        <>
          <PopoverButton as={ReactionTriggerButton} isActive={open} aria-label="Send reaction" />
          
          <PopoverPanel
            anchor={{ to: 'top', gap: 12 }}
            transition
            className="z-[99999] origin-bottom transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-3">
              {/* Header */}
              <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-white/10">
                <span className="text-sm font-medium text-gray-300">
                  Send a reaction
                </span>
                <CloseButton
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close picker"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </CloseButton>
              </div>

              {/* Reaction grid - 2 rows of 4 */}
              <div 
                className="grid grid-cols-4 gap-2"
                role="listbox"
                aria-label="Available reactions"
              >
                {REACTIONS.map((reaction) => {
                  const Icon = reaction.icon;
                  return (
                    <CloseButton
                      key={reaction.type}
                      as={motion.button}
                      whileHover={{ scale: 1.2, y: -2 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => onSelectReaction(reaction.type)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
                      aria-label={reaction.label}
                      title={reaction.label}
                    >
                      <Icon 
                        className={`w-6 h-6 ${reaction.color} transition-transform group-hover:drop-shadow-lg`}
                        strokeWidth={2.5}
                      />
                    </CloseButton>
                  );
                })}
              </div>
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

/**
 * Legacy ReactionPicker component for backward compatibility
 * This version accepts isOpen and onClose props for external control
 */
interface ReactionPickerV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectReaction: (type: ReactionType) => void;
  className?: string;
}

export function ReactionPickerV2({
  isOpen,
  onClose,
  onSelectReaction,
  className = '',
}: ReactionPickerV2Props) {
  const handleReactionClick = useCallback((type: ReactionType) => {
    onSelectReaction(type);
    onClose();
  }, [onSelectReaction, onClose]);

  // For external control, we use a simple approach with Popover
  // The parent manages open state via isOpen prop
  if (!isOpen) return null;

  return (
    <div 
      className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[99999] ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        role="dialog"
        aria-label="Reaction picker"
      >
        <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-white/10">
            <span className="text-sm font-medium text-gray-300">
              Send a reaction
            </span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close picker"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Reaction grid - 2 rows of 4 */}
          <div 
            className="grid grid-cols-4 gap-2"
            role="listbox"
            aria-label="Available reactions"
          >
            {REACTIONS.map((reaction) => {
              const Icon = reaction.icon;
              return (
                <motion.button
                  key={reaction.type}
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleReactionClick(reaction.type)}
                  className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
                  role="option"
                  aria-label={reaction.label}
                  title={reaction.label}
                >
                  <Icon 
                    className={`w-6 h-6 ${reaction.color} transition-transform group-hover:drop-shadow-lg`}
                    strokeWidth={2.5}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Pointer arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-gray-800/95 border-b border-r border-white/10 rotate-45" />
      </motion.div>
    </div>
  );
}
