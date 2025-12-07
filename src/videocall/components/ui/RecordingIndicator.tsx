/**
 * RecordingIndicator Component
 * Shows recording status with animated red dot and timer
 */

import { motion } from 'framer-motion';

interface RecordingIndicatorProps {
  time: string;
}

export function RecordingIndicator({ time }: RecordingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-full"
    >
      {/* Animated recording dot */}
      <motion.div
        animate={{
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-2.5 h-2.5 rounded-full bg-destructive"
      />
      <span className="font-mono text-caption2 text-white tabular-nums">
        {time}
      </span>
    </motion.div>
  );
}
