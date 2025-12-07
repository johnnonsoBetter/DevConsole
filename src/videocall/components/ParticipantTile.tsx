/**
 * ParticipantTile Component
 * Individual participant video thumbnail card
 */

import { motion } from 'framer-motion';
import { Mic, MicOff, User } from 'lucide-react';
import type { Participant } from '../types';

interface ParticipantTileProps {
  participant: Participant;
  isActive?: boolean;
  onClick?: () => void;
}

export function ParticipantTile({
  participant,
  isActive = false,
  onClick,
}: ParticipantTileProps) {
  const { name, avatarUrl, isMuted, isCameraOn, isSpeaking } = participant;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative w-full aspect-video rounded-xl overflow-hidden
        bg-gray-800 cursor-pointer
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${isActive ? 'ring-2 ring-info ring-offset-2 ring-offset-gray-900' : ''}
        ${isSpeaking && !isActive ? 'ring-2 ring-success/60' : ''}
      `}
    >
      {/* Video or Avatar placeholder */}
      {isCameraOn && avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Participant name */}
      <div className="absolute bottom-2 left-2 right-8">
        <span className="text-caption2 font-medium text-white truncate block drop-shadow-md">
          {name}
        </span>
      </div>

      {/* Audio indicator badge */}
      <div className="absolute top-2 right-2">
        <div
          className={`
            w-6 h-6 rounded-full flex items-center justify-center
            ${isMuted ? 'bg-gray-700' : 'bg-info'}
          `}
        >
          {isMuted ? (
            <MicOff className="w-3 h-3 text-gray-400" />
          ) : (
            <Mic className="w-3 h-3 text-white" />
          )}
        </div>
      </div>
    </motion.button>
  );
}
