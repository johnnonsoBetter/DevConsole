/**
 * StickyNote Component
 * Draggable, resizable sticky note UI for quick note-taking
 * Mimics physical sticky notes with drag, color options, and auto-save
 */

import { Camera, Maximize2, Minimize2, Minus, Pin, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../../utils';
import { NotesService } from '../services/notesService';
import { Note } from '../stores/notes';

// ============================================================================
// TYPES
// ============================================================================

interface StickyNoteProps {
  note?: Note;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

const STICKY_COLORS = [
  { name: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-gray-900' },
  { name: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-gray-900' },
  { name: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-gray-900' },
  { name: 'green', bg: 'bg-green-100', border: 'border-green-300', text: 'text-gray-900' },
  { name: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-gray-900' },
];

// ============================================================================
// STICKY NOTE COMPONENT
// ============================================================================

export function StickyNote({ note, onClose, initialPosition }: StickyNoteProps) {
  const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [content, setContent] = useState(note?.content || '');
  const [selectedColor, setSelectedColor] = useState(note?.color || 'yellow');
  const [isPinned, setIsPinned] = useState(note?.pinned || false);
  const [isSaving, setIsSaving] = useState(false);
  const [screenshot, setScreenshot] = useState<string | undefined>(note?.screenshot);
  const [isCapturing, setIsCapturing] = useState(false);

  const noteRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-generate title from content or timestamp
  const generateTitle = (content: string): string => {
    if (!content.trim()) {
      const now = new Date();
      return `Note ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    // Use first line or first 30 characters
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
  };

  // Auto-focus content on mount if new note
  useEffect(() => {
    if (!note && contentRef.current) {
      contentRef.current.focus();
    }
  }, [note]);

  // Auto-save debounced
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (content) {
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 1000); // Auto-save after 1 second of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, selectedColor, isPinned, screenshot]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, textarea, button')) {
      return; // Don't drag when interacting with inputs or buttons
    }

    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Save note
  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);

    try {
      const autoTitle = generateTitle(content);
      
      if (note) {
        // Update existing note
        await NotesService.updateNote(note.id, {
          title: autoTitle,
          content: content.trim(),
          color: selectedColor,
          pinned: isPinned,
          screenshot,
        });
      } else {
        // Create new note
        await NotesService.createNote({
          title: autoTitle,
          content: content.trim(),
          tags: [],
          pinned: isPinned,
          color: selectedColor,
          screenshot,
        });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Capture screenshot
  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        alert('❌ Unable to capture screenshot: No active tab found');
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
      });

      setScreenshot(dataUrl);
      console.log('📸 Screenshot captured and attached to note!');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert('❌ Failed to capture screenshot. Make sure the extension has the necessary permissions.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Remove screenshot
  const handleRemoveScreenshot = () => {
    setScreenshot(undefined);
  };

  // Delete note
  const handleDelete = async () => {
    if (note && confirm('Delete this note?')) {
      await NotesService.deleteNote(note.id);
      onClose();
    } else if (!note) {
      onClose();
    }
  };

  // Toggle pin
  const handleTogglePin = () => {
    setIsPinned((prev) => !prev);
  };

  // Get color classes
  const colorConfig = STICKY_COLORS.find((c) => c.name === selectedColor) || STICKY_COLORS[0];

  // If minimized, show floating note icon
  if (isMinimized) {
    return (
      <div
        ref={noteRef}
        className={cn(
          'fixed z-50 shadow-2xl rounded-full transition-all cursor-pointer hover:scale-110',
          colorConfig.bg,
          colorConfig.border,
          'border-2 w-16 h-16 flex items-center justify-center',
          isDragging && 'scale-105'
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={() => setIsMinimized(false)}
        onMouseDown={handleMouseDown}
        title={`${generateTitle(content)} - Click to restore`}
      >
        <div className="flex flex-col items-center justify-center">
          <Pin className={cn('w-6 h-6', isPinned && 'fill-current text-red-500')} />
          {screenshot && (
            <Camera className="w-3 h-3 absolute bottom-2 right-2" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={noteRef}
      className={cn(
        'fixed z-50 shadow-2xl rounded-lg overflow-hidden transition-all',
        colorConfig.bg,
        colorConfig.border,
        'border-2',
        isDragging && 'cursor-grabbing scale-105',
        !isDragging && 'cursor-grab',
        isExpanded ? 'w-[500px] h-[600px]' : 'w-[320px] h-[380px]'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b-2',
          colorConfig.border,
          'bg-gradient-to-b from-white/40 to-transparent'
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={handleTogglePin}
            className={cn(
              'p-1.5 rounded hover:bg-white/50 transition-colors flex items-center justify-center',
              isPinned && 'text-red-500'
            )}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} />
          </button>

          {isSaving && (
            <span className="text-xs text-gray-500 animate-pulse">Saving...</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            className={cn(
              'p-1.5 rounded hover:bg-white/50 transition-colors flex items-center justify-center',
              isCapturing && 'opacity-50 cursor-wait'
            )}
            title="Capture Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded hover:bg-white/50 transition-colors flex items-center justify-center"
            title={isExpanded ? 'Compact View' : 'Expand View'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1.5 rounded hover:bg-white/50 transition-colors flex items-center justify-center"
            title={isMinimized ? 'Restore' : 'Minimize to Title Bar'}
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/50 transition-colors flex items-center justify-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-8rem)] flex flex-col gap-3 overflow-y-auto">
          {/* Screenshot Preview - Compact */}
          {screenshot && (
            <div className="relative group">
              <img
                src={screenshot}
                alt="Screenshot"
                className="w-full h-24 object-cover rounded border-2 border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  // Open in new tab for full view
                  const win = window.open();
                  if (win) {
                    win.document.write(`<img src="${screenshot}" style="max-width:100%;height:auto;" />`);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveScreenshot();
                }}
                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Remove screenshot"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Click to view full size
              </div>
            </div>
          )}

          {/* Content */}
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            className={cn(
              'flex-1 w-full px-2 py-1 bg-transparent border-none outline-none resize-none',
              colorConfig.text,
              'placeholder:text-gray-500'
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
      </div>

      {/* Footer with color picker */}
      <div className={cn('p-3 border-t-2', colorConfig.border, 'bg-gradient-to-t from-white/40 to-transparent')}>
        <div className="flex items-center justify-center gap-2">
          {STICKY_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => setSelectedColor(color.name)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center',
                color.bg,
                color.border,
                selectedColor === color.name && 'ring-2 ring-gray-600 ring-offset-1'
              )}
              title={`Change to ${color.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
