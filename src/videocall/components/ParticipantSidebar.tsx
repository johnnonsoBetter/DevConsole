/**
 * ParticipantSidebar Component
 * Right sidebar with scrollable participant thumbnails
 */

import { AnimatePresence, motion } from 'framer-motion';
import type { Participant } from '../types';
import { ParticipantTile } from './ParticipantTile';

interface ParticipantSidebarProps {
  participants: Participant[];
  activeSpeakerId?: string;
  onSelectParticipant?: (participantId: string) => void;
  isOpen: boolean;
}

export function ParticipantSidebar({
  participants,
  activeSpeakerId,
  onSelectParticipant,
  isOpen,
}: ParticipantSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 20, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 'auto' }}
          exit={{ opacity: 0, x: 20, width: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 p-3 overflow-hidden"
        >
          <div className="flex flex-col gap-3 w-48 xl:w-56 overflow-y-auto max-h-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <ParticipantTile
                  participant={participant}
                  isActive={participant.id === activeSpeakerId}
                  onClick={() => onSelectParticipant?.(participant.id)}
                />
              </motion.div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
