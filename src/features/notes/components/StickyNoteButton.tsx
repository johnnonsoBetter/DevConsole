/**
 * StickyNoteButton Component
 * Floating action button to create/manage sticky notes
 * Positioned near the "Create Issue" button in the global header
 */

import { StickyNote as StickyNoteIcon } from 'lucide-react';
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
  // Use store state instead of local state for synchronization
  const notes = useNotesStore((s) => s.notes);
  const activeNoteIds = useNotesStore((s) => s.activeNoteIds);
  const openStickyNote = useNotesStore((s) => s.openStickyNote);
  const closeStickyNote = useNotesStore((s) => s.closeStickyNote);

  // Create new sticky note
  const handleCreateNote = () => {
    // Generate a temporary ID for new note
    const tempId = `temp-${Date.now()}`;
    // Add to store's active notes list
    openStickyNote(tempId);
  };

  // Close sticky note
  const handleCloseNote = (id: string) => {
    // Remove from store's active notes list
    closeStickyNote(id);
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
        {activeNoteIds.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-yellow-600 text-white text-xs font-semibold rounded-full">
            {activeNoteIds.length}
          </span>
        )}
      </button>

      {/* Render active sticky notes */}
      {activeNoteIds.map((noteId, index) => {
        // Find existing note or undefined for temp notes
        const existingNote = notes.find((n) => n.id === noteId);

        return (
          <StickyNote
            key={noteId}
            noteId={noteId}
            note={existingNote}
            onClose={() => handleCloseNote(noteId)}
            initialPosition={getInitialPosition(index)}
          />
        );
      })}
    </>
  );
}
