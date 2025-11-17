/**
 * StickyNoteButton Component
 * Floating action button to create/manage sticky notes
 * Positioned near the "Create Issue" button in the global header
 */

import { StickyNote as StickyNoteIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../utils';
import { useNotesStore } from '../stores/notes';
import { StickyNote } from './StickyNote';

// ============================================================================
// TYPES
// ============================================================================

interface StickyNoteButtonProps {
  className?: string;
}

// ============================================================================
// STICKY NOTE BUTTON COMPONENT
// ============================================================================

export function StickyNoteButton({ className }: StickyNoteButtonProps) {
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const notes = useNotesStore((s) => s.notes);

  // Create new sticky note
  const handleCreateNote = () => {
    // Generate a temporary ID for new note
    const tempId = `temp-${Date.now()}`;
    setActiveNotes((prev) => [...prev, tempId]);
  };

  // Close sticky note
  const handleCloseNote = (id: string) => {
    setActiveNotes((prev) => prev.filter((noteId) => noteId !== id));
  };

  // Calculate position for new notes (cascade effect)
  const getInitialPosition = (index: number) => ({
    x: 120 + index * 30,
    y: 120 + index * 30,
  });

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleCreateNote}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-apple-sm shrink-0',
          'bg-yellow-400 hover:bg-yellow-500 text-gray-900',
          'hover:scale-105 active:scale-95',
          className
        )}
        title="Create Sticky Note"
        aria-label="Create a new sticky note"
      >
        <StickyNoteIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Sticky Note</span>
      </button>

      {/* Render active sticky notes */}
      {activeNotes.map((noteId, index) => {
        // Find existing note or create new
        const existingNote = notes.find((n) => n.id === noteId);

        return (
          <StickyNote
            key={noteId}
            note={existingNote}
            onClose={() => handleCloseNote(noteId)}
            initialPosition={getInitialPosition(index)}
          />
        );
      })}
    </>
  );
}
