/**
 * Notes Store
 * Pure state management for notes (no async operations)
 * Use NotesService for business logic and persistence
 */

import { produce } from "immer";
import { create } from "zustand";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown format
  createdAt: number;
  updatedAt: number;
  tags: string[];
  pinned: boolean;
  color?: string; // Optional color for visual organization
}

export interface NotesFilter {
  search: string;
  tags?: string[];
  pinned?: boolean;
  color?: string;
}

// ============================================================================
// NOTES STORE
// ============================================================================

interface NotesState {
  // Data Collections
  notes: Note[];

  // UI State
  selectedNoteId: string | null;
  isLoading: boolean;
  activeNoteIds: string[]; // IDs of currently visible sticky notes

  // Filters & Search
  filter: NotesFilter;

  // Synchronous State Actions (Pure)
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  clearNotes: () => void;

  // UI Control
  selectNote: (id: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Filtering
  setFilter: (filter: Partial<NotesFilter>) => void;
  resetFilter: () => void;

  // Active Sticky Notes Management
  openStickyNote: (id: string) => void;
  closeStickyNote: (id: string) => void;
  toggleStickyNote: (id: string) => void;
}

const DEFAULT_FILTER: NotesFilter = {
  search: "",
};

export const useNotesStore = create<NotesState>((set) => ({
  // Initial State
  notes: [],
  selectedNoteId: null,
  isLoading: true,
  activeNoteIds: [],
  filter: { ...DEFAULT_FILTER },

  // Synchronous State Setters (Pure Functions)
  setNotes: (notes) => {
    set(
      produce((draft) => {
        draft.notes = notes;
      })
    );
  },

  addNote: (note) => {
    set(
      produce((draft) => {
        draft.notes.push(note);
      })
    );
  },

  updateNote: (id, updates) => {
    set(
      produce((draft) => {
        const note = draft.notes.find((n: Note) => n.id === id);
        if (note) {
          Object.assign(note, updates);
        }
      })
    );
  },

  deleteNote: (id) => {
    set(
      produce((draft) => {
        draft.notes = draft.notes.filter((note: Note) => note.id !== id);
        if (draft.selectedNoteId === id) {
          draft.selectedNoteId = null;
        }
      })
    );
  },

  clearNotes: () => {
    set(
      produce((draft) => {
        draft.notes = [];
        draft.selectedNoteId = null;
        draft.filter = { ...DEFAULT_FILTER };
      })
    );
  },

  // UI Control
  selectNote: (id) => {
    set(
      produce((draft) => {
        draft.selectedNoteId = id;
      })
    );
  },

  setLoading: (loading) => {
    set(
      produce((draft) => {
        draft.isLoading = loading;
      })
    );
  },

  // Filtering
  setFilter: (filter) => {
    set(
      produce((draft) => {
        draft.filter = { ...draft.filter, ...filter };
      })
    );
  },

  resetFilter: () => {
    set(
      produce((draft) => {
        draft.filter = { ...DEFAULT_FILTER };
      })
    );
  },

  // Active Sticky Notes Management
  openStickyNote: (id) => {
    set(
      produce((draft) => {
        if (!draft.activeNoteIds.includes(id)) {
          draft.activeNoteIds.push(id);
        }
      })
    );
  },

  closeStickyNote: (id) => {
    set(
      produce((draft) => {
        draft.activeNoteIds = draft.activeNoteIds.filter(
          (noteId: string) => noteId !== id
        );
      })
    );
  },

  toggleStickyNote: (id) => {
    set(
      produce((draft) => {
        if (draft.activeNoteIds.includes(id)) {
          draft.activeNoteIds = draft.activeNoteIds.filter(
            (noteId: string) => noteId !== id
          );
        } else {
          draft.activeNoteIds.push(id);
        }
      })
    );
  },
}));
