/**
 * Notes Store
 * Manages note-taking state with persistence to chrome.storage
 */

import { create } from "zustand";
import { StorageService } from "../../core/storage";

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

interface NotesState {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  loadNotes: () => Promise<void>;
  createNote: (
    note: Omit<Note, "id" | "createdAt" | "updatedAt">
  ) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  selectNote: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  togglePinNote: (id: string) => Promise<void>;
}

const STORAGE_KEY = "devtools.notes";

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  searchQuery: "",
  isLoading: true,

  loadNotes: async () => {
    try {
      const stored = await StorageService.get<Note[]>(STORAGE_KEY);
      set({ notes: stored || [], isLoading: false });
    } catch (error) {
      console.error("Failed to load notes:", error);
      set({ isLoading: false });
    }
  },

  createNote: async (noteData) => {
    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const notes = [...get().notes, newNote];
    await StorageService.set(STORAGE_KEY, notes);
    set({ notes, selectedNoteId: newNote.id });
    return newNote;
  },

  updateNote: async (id, updates) => {
    const notes = get().notes.map((note) =>
      note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
    );
    await StorageService.set(STORAGE_KEY, notes);
    set({ notes });
  },

  deleteNote: async (id) => {
    const notes = get().notes.filter((note) => note.id !== id);
    await StorageService.set(STORAGE_KEY, notes);
    set({
      notes,
      selectedNoteId: get().selectedNoteId === id ? null : get().selectedNoteId,
    });
  },

  selectNote: (id) => {
    set({ selectedNoteId: id });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  togglePinNote: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (note) {
      await get().updateNote(id, { pinned: !note.pinned });
    }
  },
}));
