/**
 * ParticipantToast Component
 * Toast notifications for participant join/leave events
 */

import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, LogOut, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface ParticipantEvent {
  id: string;
  type: 'joined' | 'left';
  participantName: string;
  timestamp: number;
}

interface ParticipantToastProps {
  events: ParticipantEvent[];
  onDismiss: (id: string) => void;
  autoHideDuration?: number;
}

export function ParticipantToast({
  events,
  onDismiss,
  autoHideDuration = 4000,
}: ParticipantToastProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="log"
      aria-live="polite"
      aria-label="Participant notifications"
    >
      <AnimatePresence mode="popLayout">
        {events.slice(0, 3).map((event) => (
          <ToastItem
            key={event.id}
            event={event}
            onDismiss={onDismiss}
            autoHideDuration={autoHideDuration}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  event: ParticipantEvent;
  onDismiss: (id: string) => void;
  autoHideDuration: number;
}

function ToastItem({ event, onDismiss, autoHideDuration }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(event.id);
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [event.id, onDismiss, autoHideDuration]);

  const Icon = event.type === 'joined' ? LogIn : LogOut;
  const bgColor = event.type === 'joined' ? 'bg-success/20' : 'bg-gray-700/80';
  const iconColor = event.type === 'joined' ? 'text-success' : 'text-gray-400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-gray-800/95 backdrop-blur-md rounded-xl shadow-apple-lg border border-white/10 min-w-[200px]"
      role="status"
      aria-atomic="true"
    >
      {/* Avatar/Icon */}
      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
        <User className="w-4 h-4 text-gray-300" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-white truncate">
          {event.participantName}
        </p>
        <p className="text-caption2 text-gray-400 flex items-center gap-1">
          <Icon className={`w-3 h-3 ${iconColor}`} aria-hidden="true" />
          {event.type === 'joined' ? 'joined the call' : 'left the call'}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Hook to manage participant events
 */
export function useParticipantEvents() {
  const [events, setEvents] = useState<ParticipantEvent[]>([]);

  const addEvent = useCallback((type: 'joined' | 'left', participantName: string) => {
    const event: ParticipantEvent = {
      id: `${type}-${participantName}-${Date.now()}`,
      type,
      participantName,
      timestamp: Date.now(),
    };

    setEvents((prev) => [event, ...prev]);
  }, []);

  const dismissEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    addEvent,
    dismissEvent,
    clearAll,
  };
}
