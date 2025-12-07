/**
 * MainVideoView Component
 * Primary speaker video display area
 */

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { Participant } from '../types';

interface MainVideoViewProps {
  participant?: Participant;
  isLocal?: boolean;
}

export function MainVideoView({ participant, isLocal = false }: MainVideoViewProps) {
  if (!participant) {
    return (
      <div className="relative flex-1 flex items-center justify-center bg-gray-900 rounded-2xl overflow-hidden">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <User className="w-12 h-12 text-gray-600" />
          </div>
          <p className="text-muted-foreground text-body">
            Waiting for participants...
          </p>
        </div>
      </div>
    );
  }

  const { name, avatarUrl, isCameraOn } = participant;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative flex-1 bg-gray-900 rounded-2xl overflow-hidden"
    >
      {/* Video or avatar placeholder */}
      {isCameraOn && avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-16 h-16 text-gray-500" />
          </div>
        </div>
      )}

      {/* Gradient overlay for name label */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Participant name label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-4 left-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-white drop-shadow-lg">
            {name}
          </span>
          {isLocal && (
            <span className="px-2 py-0.5 text-caption2 font-medium text-white/70 bg-white/10 rounded-full">
              You
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
