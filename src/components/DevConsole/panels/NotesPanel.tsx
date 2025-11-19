/**
 * NotesPanel Component
 * Beautiful note-taking interface with rich text editing, organization, and search
 */

import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  Edit,
  Github,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NotesService, useNotesStore } from '../../../features/notes';
import { cn } from '../../../utils';
import { useGitHubIssueSlideoutStore } from '../../../utils/stores';
import { humanizeTime } from '../../../utils/timeUtils';
import { RichTextEditor } from '../RichTextEditor';

const NOTE_COLORS = [
  { name: 'Default', value: undefined, bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  { name: 'Green', value: 'green', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
];

export function NotesPanel() {
  const notes = useNotesStore((s) => s.notes);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const isLoading = useNotesStore((s) => s.isLoading);
  const filter = useNotesStore((s) => s.filter);
  const selectNote = useNotesStore((s) => s.selectNote);
  const setFilter = useNotesStore((s) => s.setFilter);

  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // GitHub Issue Slideout Store for converting notes to issues
  const githubSlideoutStore = useGitHubIssueSlideoutStore();

  // Load notes on mount
  useEffect(() => {
    NotesService.loadNotes();
  }, []);

  // Filter and sort notes using service layer
  const filteredNotes = useMemo(() => {
    return NotesService.getFilteredNotes();
  }, [notes, filter]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleCreateNote = async () => {
    const note = await NotesService.createNote({
      title: 'Untitled Note',
      content: '',
      tags: [],
      pinned: false,
    });
    setIsEditing(true);
    setEditingTitle(note.title);
  };

  const handleSaveTitle = async () => {
    if (selectedNote && editingTitle.trim()) {
      await NotesService.updateNote(selectedNote.id, { title: editingTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await NotesService.deleteNote(id);
    }
  };

  const handleContentChange = async (content: string) => {
    if (!selectedNoteId) return;
    await NotesService.updateNote(selectedNoteId, { content });
  };

  const handleColorChange = async (color: string | undefined) => {
    if (selectedNote) {
      await NotesService.updateNote(selectedNote.id, { color });
      setShowColorPicker(false);
    }
  };

  const handleConvertToIssue = () => {
    if (!selectedNote) return;

    // Format note content as markdown issue body
    const issueBody = `## Note: ${selectedNote.title}\n\n${selectedNote.content}\n\n---\n\n*Converted from note created on ${new Date(selectedNote.createdAt).toLocaleString()}*`;

    // Open the slideout with note content prefilled
    githubSlideoutStore.open(null, {
      title: selectedNote.title,
      body: issueBody,
    });
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Notes List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-800/50">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes</h2>
            </div>
            <button
              onClick={handleCreateNote}
              className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-all hover:shadow-apple-sm active:scale-95"
              title="Create new note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
            value={filter.search || ''}
            onChange={(e) => setFilter({ search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {filter.search ? 'No notes found' : 'No notes yet'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {filter.search ? 'Try a different search term' : 'Click + to create your first note'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotes.map((note) => {
                const colorConfig = NOTE_COLORS.find((c) => c.value === note.color);
                return (
                  <button
                    key={note.id}
                    onClick={() => selectNote(note.id)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all group',
                      colorConfig?.bg || 'bg-white dark:bg-gray-800',
                      'border',
                      colorConfig?.border || 'border-gray-200 dark:border-gray-700',
                      selectedNoteId === note.id
                        ? 'ring-2 ring-primary shadow-apple-sm'
                        : 'hover:shadow-apple-sm',
                      'relative'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                        {note.title}
                      </h3>
                      {note.pinned && (
                        <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {note.content || 'Empty note'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{humanizeTime(note.updatedAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{filteredNotes.length} notes</span>
            <span>{notes.filter((n) => n.pinned).length} pinned</span>
          </div>
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50">
              <div className="flex-1 mr-4">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') setIsEditing(false);
                      }}
                      className="flex-1 px-3 py-2 text-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="p-2 rounded-lg bg-success hover:bg-success/90 text-white transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingTitle(selectedNote.title);
                      }}
                      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditingTitle(selectedNote.title);
                    }}
                    className="flex items-center gap-2 group"
                  >
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedNote.title}
                    </h1>
                    <Edit className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Color Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Change color"
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2',
                        NOTE_COLORS.find((c) => c.value === selectedNote.color)?.border ||
                          'border-gray-300 dark:border-gray-600',
                        NOTE_COLORS.find((c) => c.value === selectedNote.color)?.bg ||
                          'bg-white dark:bg-gray-800'
                      )}
                    />
                  </button>
                  {showColorPicker && (
                    <div className="absolute right-0 top-full mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-apple-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="grid grid-cols-3 gap-2">
                        {NOTE_COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => handleColorChange(color.value)}
                            className={cn(
                              'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
                              color.bg,
                              color.border,
                              selectedNote.color === color.value && 'ring-2 ring-primary'
                            )}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Convert to Issue Button */}
                <button
                  onClick={handleConvertToIssue}
                  className="p-2 rounded-lg hover:bg-success/10 text-success transition-colors"
                  title="Convert note to GitHub issue"
                >
                  <Github className="w-4 h-4" />
                </button>

                {/* Pin Button */}
                <button
                  onClick={() => NotesService.togglePinNote(selectedNote.id)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    selectedNote.pinned
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}
                  title={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                >
                  <Pin className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created {humanizeTime(selectedNote.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated {humanizeTime(selectedNote.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Rich Text Editor */}
            <div className="flex-1 overflow-hidden">
              <RichTextEditor
                key={selectedNote.id}
                content={selectedNote.content}
                onChange={handleContentChange}
                placeholder="Start writing your ideas..."
                autoFocus={false}
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Start Taking Notes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Capture your ideas, thoughts, and important information. Use rich text formatting,
                organize with colors, and pin your most important notes.
              </p>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white rounded-lg font-medium transition-all hover:shadow-apple-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Create Your First Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
