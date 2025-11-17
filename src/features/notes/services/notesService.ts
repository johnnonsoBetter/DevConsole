/**
 * Notes Service
 * Handles business logic and persistence for notes
 * Acts as the interface between UI components and storage
 */

import { StorageService } from "../../../core/storage";
import { Note, useNotesStore } from "../stores/notes";

const STORAGE_KEY = "devtools.notes";

// ============================================================================
// NOTES SERVICE - Business Logic & Persistence Layer
// ============================================================================

export class NotesService {
  /**
   * Load notes from storage and update store
   */
  static async loadNotes(): Promise<void> {
    const { setNotes, setLoading } = useNotesStore.getState();

    setLoading(true);

    try {
      const stored = await StorageService.get<Note[]>(STORAGE_KEY);
      setNotes(stored || []);
    } catch (error) {
      console.error("Failed to load notes:", error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Create a new note
   */
  static async createNote(
    noteData: Omit<Note, "id" | "createdAt" | "updatedAt">
  ): Promise<Note> {
    const { notes, addNote, selectNote } = useNotesStore.getState();

    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update state immediately (optimistic update)
    addNote(newNote);
    selectNote(newNote.id);

    // Persist to storage
    const updatedNotes = [...notes, newNote];
    await StorageService.set(STORAGE_KEY, updatedNotes);

    return newNote;
  }

  /**
   * Update an existing note
   */
  static async updateNote(
    id: string,
    updates: Partial<Omit<Note, "id" | "createdAt">>
  ): Promise<void> {
    const { notes, updateNote } = useNotesStore.getState();

    // Find and update the note
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
    );

    // Update state immediately
    updateNote(id, { ...updates, updatedAt: Date.now() });

    // Persist to storage
    await StorageService.set(STORAGE_KEY, updatedNotes);
  }

  /**
   * Delete a note
   */
  static async deleteNote(id: string): Promise<void> {
    const { notes, deleteNote } = useNotesStore.getState();

    // Update state immediately
    deleteNote(id);

    // Persist to storage
    const updatedNotes = notes.filter((note) => note.id !== id);
    await StorageService.set(STORAGE_KEY, updatedNotes);
  }

  /**
   * Toggle pin status of a note
   */
  static async togglePinNote(id: string): Promise<void> {
    const { notes } = useNotesStore.getState();
    const note = notes.find((n) => n.id === id);

    if (note) {
      await this.updateNote(id, { pinned: !note.pinned });
    }
  }

  /**
   * Clear all notes
   */
  static async clearAllNotes(): Promise<void> {
    const { clearNotes } = useNotesStore.getState();

    // Update state immediately
    clearNotes();

    // Persist to storage
    await StorageService.set(STORAGE_KEY, []);
  }

  /**
   * Export notes as JSON
   */
  static exportNotes(): string {
    const { notes } = useNotesStore.getState();
    return JSON.stringify(notes, null, 2);
  }

  /**
   * Import notes from JSON
   */
  static async importNotes(jsonData: string): Promise<void> {
    try {
      const importedNotes = JSON.parse(jsonData) as Note[];

      // Validate notes structure
      if (!Array.isArray(importedNotes)) {
        throw new Error("Invalid notes format");
      }

      const { setNotes } = useNotesStore.getState();

      // Update state
      setNotes(importedNotes);

      // Persist to storage
      await StorageService.set(STORAGE_KEY, importedNotes);
    } catch (error) {
      console.error("Failed to import notes:", error);
      throw error;
    }
  }

  /**
   * Get filtered and sorted notes
   * (Business logic for filtering belongs in service layer)
   */
  static getFilteredNotes(): Note[] {
    const { notes, filter } = useNotesStore.getState();

    let filtered = notes;

    // Apply search filter
    if (filter.search) {
      const query = filter.search.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((note) =>
        filter.tags!.some((tag) => note.tags.includes(tag))
      );
    }

    // Apply pinned filter
    if (filter.pinned !== undefined) {
      filtered = filtered.filter((note) => note.pinned === filter.pinned);
    }

    // Apply color filter
    if (filter.color) {
      filtered = filtered.filter((note) => note.color === filter.color);
    }

    // Sort: pinned first, then by updated date
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }
}
