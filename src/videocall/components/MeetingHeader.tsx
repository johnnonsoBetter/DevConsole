/**
 * MeetingHeader Component
 * Displays meeting title and participant count overlay
 */

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface MeetingHeaderProps {
  title: string;
  participantCount: number;
}

export function MeetingHeader({ title, participantCount }: MeetingHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="absolute top-4 left-4 z-10"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-subhead font-semibold text-white drop-shadow-lg">
          {title}
        </h1>
        <div className="flex items-center gap-1.5 text-white/80">
          <Users className="w-3.5 h-3.5" />
          <span className="text-caption2 font-medium">
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
