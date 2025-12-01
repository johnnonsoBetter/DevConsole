/**
 * StickyNote Component
 * Draggable, resizable sticky note UI for quick note-taking
 * Mimics physical sticky notes with drag, color options, and auto-save
 */

import { useDraggable } from '@dnd-kit/core';
import { Camera, Github, Maximize2, Minimize2, Minus, Pin, Trash2, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopilotChatInput, type CopilotContext } from '../../../components/DevConsole/CopilotChatInput';
import { cn } from '../../../utils';
import { useGitHubIssueSlideoutStore } from '../../../utils/stores';
import { NotesService } from '../services/notesService';
import { Note, useNotesStore } from '../stores/notes';

// ============================================================================
// TYPES
// ============================================================================

interface StickyNoteProps {
  note?: Note;
  noteId: string; // ID used to track this sticky instance (can be temp)
  onClose: () => void;
  position: { x: number; y: number };
}

const STICKY_COLORS = [
  { 
    name: 'yellow', 
    bg: 'bg-yellow-100 dark:bg-amber-950', 
    border: 'border-yellow-300 dark:border-amber-700', 
    text: 'text-gray-900 dark:text-amber-100',
    swatch: 'bg-yellow-400 dark:bg-amber-500'
  },
  { 
    name: 'pink', 
    bg: 'bg-pink-100 dark:bg-pink-950', 
    border: 'border-pink-300 dark:border-pink-700', 
    text: 'text-gray-900 dark:text-pink-100',
    swatch: 'bg-pink-400 dark:bg-pink-500'
  },
  { 
    name: 'blue', 
    bg: 'bg-blue-100 dark:bg-blue-950', 
    border: 'border-blue-300 dark:border-blue-700', 
    text: 'text-gray-900 dark:text-blue-100',
    swatch: 'bg-blue-400 dark:bg-blue-500'
  },
  { 
    name: 'green', 
    bg: 'bg-green-100 dark:bg-emerald-950', 
    border: 'border-green-300 dark:border-emerald-700', 
    text: 'text-gray-900 dark:text-emerald-100',
    swatch: 'bg-green-400 dark:bg-emerald-500'
  },
  { 
    name: 'purple', 
    bg: 'bg-purple-100 dark:bg-purple-950', 
    border: 'border-purple-300 dark:border-purple-700', 
    text: 'text-gray-900 dark:text-purple-100',
    swatch: 'bg-purple-400 dark:bg-purple-500'
  },
];

// ============================================================================
// STICKY NOTE COMPONENT
// ============================================================================

export function StickyNote({ note, noteId, onClose, position }: StickyNoteProps) {
  const githubSlideoutStore = useGitHubIssueSlideoutStore();
  const closeStickyNote = useNotesStore((s) => s.closeStickyNote);

  const [persistedId, setPersistedId] = useState<string | null>(note?.id || null); // Track if note is persisted
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [content, setContent] = useState(note?.content || '');
  const [selectedColor, setSelectedColor] = useState(note?.color || 'yellow');
  const [isPinned, setIsPinned] = useState(note?.pinned || false);
  const [isSaving, setIsSaving] = useState(false);
  const [screenshot, setScreenshot] = useState<string | undefined>(note?.screenshot);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const tempNoteIdRef = useRef<string | null>(note ? null : noteId);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: noteId,
  });

  const translatedPosition = {
    x: position.x + (transform?.x ?? 0),
    y: position.y + (transform?.y ?? 0),
  };

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  // Cleanup on unmount - save if there's unsaved content
  useEffect(() => {
    return () => {
      // Force save on unmount if there's content
      if (content.trim() && !persistedId && !note) {
        // This is a temp note with content that was never saved
        handleSave();
      }
    };
  }, []); // Empty deps - only run on unmount

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

  // Save note
  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);

    try {
      const autoTitle = generateTitle(content);
      
      if (note || persistedId) {
        // Update existing note
        const idToUpdate = note?.id || persistedId;
        if (idToUpdate) {
          await NotesService.updateNote(idToUpdate, {
            title: autoTitle,
            content: content.trim(),
            color: selectedColor,
            pinned: isPinned,
            screenshot,
          });
        }
      } else {
        // Create new note
        const newNote = await NotesService.createNote({
          title: autoTitle,
          content: content.trim(),
          tags: [],
          pinned: isPinned,
          color: selectedColor,
          screenshot,
        });
        // Track the newly created note ID
        setPersistedId(newNote.id);
        // Update the store to track this persisted note instead of temp ID
        if (tempNoteIdRef.current) {
          closeStickyNote(tempNoteIdRef.current);
          tempNoteIdRef.current = null;
        }
        useNotesStore.getState().openStickyNote(newNote.id);
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
        setNotification({
          type: 'error',
          message: 'Unable to capture screenshot: No active tab found',
        });
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
      });

      setScreenshot(dataUrl);
      setNotification({
        type: 'success',
        message: '✓ Screenshot captured and attached!',
      });
      console.log('📸 Screenshot captured and attached to note!');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setNotification({
        type: 'error',
        message: 'Failed to capture screenshot. Check permissions.',
      });
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
    const idToDelete = note?.id || persistedId;
    
    if (idToDelete && confirm('Delete this note?')) {
      await NotesService.deleteNote(idToDelete);
      // Store cleanup happens automatically in deleteNote action
      onClose();
    } else if (!idToDelete) {
      // Just close temp note without saving
      onClose();
    }
  };

  // Toggle pin
  const handleTogglePin = () => {
    setIsPinned((prev) => !prev);
  };

  // Convert to GitHub Issue
  const handleConvertToIssue = useCallback(() => {
    const noteTitle = generateTitle(content);
    
    // Build comprehensive issue body
    const bodyParts = ['## Note Details', '', content, ''];
    
    // Add note metadata
    bodyParts.push(
      '---',
      '## Note Information',
      `- **Created**: ${note?.createdAt ? new Date(note.createdAt).toLocaleString() : new Date().toLocaleString()}`,
      `- **Color**: ${selectedColor}`,
      `- **Pinned**: ${isPinned ? 'Yes' : 'No'}`
    );
    
    if (note?.tags && note.tags.length > 0) {
      bodyParts.push(`- **Tags**: ${note.tags.join(', ')}`);
    }
    
    const issueBody = bodyParts.join('\n');
    
    // Open GitHub issue slideout with pre-populated content using new API
    githubSlideoutStore.open(null, {
      title: noteTitle,
      body: issueBody,
    });
    
    // Set screenshot if available
    if (screenshot) {
      githubSlideoutStore.setScreenshot(screenshot);
    }
    
    console.log('📝 Note converted to GitHub issue draft:', { title: noteTitle, hasScreenshot: !!screenshot });
  }, [content, screenshot, note, selectedColor, isPinned, githubSlideoutStore]);

  // Copilot Chat state
  const [isCopilotChatOpen, setIsCopilotChatOpen] = useState(false);

  /**
   * Build the Copilot context object for the chat input
   */
  const buildCopilotContext = useCallback((): CopilotContext | null => {
    if (!content.trim()) return null;

    const noteTitle = generateTitle(content);
    
    // Build preview
    let preview = content;
    if (preview.length > 200) {
      preview = preview.slice(0, 200) + '...';
    }

    return {
      type: 'note',
      title: noteTitle,
      preview,
      fullContext: content,
      metadata: {
        timestamp: Date.now(),
      },
    };
  }, [content]);

  /**
   * Handle opening Copilot chat
   */
  const handleOpenCopilotChat = useCallback(() => {
    if (!content.trim()) {
      setNotification({
        type: 'error',
        message: 'Note is empty. Add some content first!',
      });
      return;
    }
    setIsCopilotChatOpen(true);
  }, [content]);

  // Get color classes
  const colorConfig = STICKY_COLORS.find((c) => c.name === selectedColor) || STICKY_COLORS[0];

  // If minimized, show floating note icon
  if (isMinimized) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'fixed z-50 shadow-lg rounded-full transition-all cursor-pointer hover:scale-110',
          colorConfig.bg,
          colorConfig.border,
          'border w-14 h-14 flex items-center justify-center',
          isDragging && 'scale-105'
        )}
        style={{
          left: `${translatedPosition.x}px`,
          top: `${translatedPosition.y}px`,
        }}
        onClick={() => setIsMinimized(false)}
        {...listeners}
        {...attributes}
        title={`${generateTitle(content)} - Click to restore`}
      >
        <div className="flex flex-col items-center justify-center">
          <Pin className={cn('w-5 h-5', colorConfig.text, isPinned && 'fill-current text-red-500 dark:text-red-400')} />
          {screenshot && (
            <Camera className={cn('w-3 h-3 absolute bottom-2 right-2', colorConfig.text)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'fixed z-50 shadow-xl rounded-xl overflow-hidden transition-all',
        colorConfig.bg,
        colorConfig.border,
        'border',
        isDragging && 'scale-[1.02] shadow-2xl',
        isExpanded ? 'w-[500px] h-[600px]' : 'w-[320px] h-[380px]'
      )}
      style={{
        left: `${translatedPosition.x}px`,
        top: `${translatedPosition.y}px`,
      }}
      {...attributes}
    >
      {/* Notification Toast */}
      {notification && (
        <div
          className={cn(
            'absolute top-2 left-2 right-2 z-20 p-3 rounded-lg shadow-lg animate-in slide-in-from-top-2 fade-in duration-300',
            'backdrop-blur-sm border',
            notification.type === 'success' && 'bg-green-50/95 dark:bg-green-900/95 border-green-300 dark:border-green-700',
            notification.type === 'error' && 'bg-red-50/95 dark:bg-red-900/95 border-red-300 dark:border-red-700',
            notification.type === 'info' && 'bg-blue-50/95 dark:bg-blue-900/95 border-blue-300 dark:border-blue-700'
          )}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className={cn(
                'text-xs font-medium',
                notification.type === 'success' && 'text-green-800 dark:text-green-100',
                notification.type === 'error' && 'text-red-800 dark:text-red-100',
                notification.type === 'info' && 'text-blue-800 dark:text-blue-100'
              )}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotification(null);
              }}
              className={cn(
                'p-0.5 rounded hover:bg-black/10 transition-colors',
                notification.type === 'success' && 'text-green-600 dark:text-green-300',
                notification.type === 'error' && 'text-red-600 dark:text-red-300',
                notification.type === 'info' && 'text-blue-600 dark:text-blue-300'
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Header - Drag Handle */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b',
          colorConfig.border,
          'bg-white/30 dark:bg-white/5',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        {...listeners}
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              'p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors flex items-center justify-center',
              isPinned ? 'text-red-500 dark:text-red-400' : colorConfig.text
            )}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} />
          </button>

          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Saving...</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCaptureScreenshot();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isCapturing}
            className={cn(
              'p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors flex items-center justify-center',
              colorConfig.text,
              isCapturing && 'opacity-50 cursor-wait'
            )}
            title="Capture Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              'p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors flex items-center justify-center',
              colorConfig.text
            )}
            title={isExpanded ? 'Compact View' : 'Expand View'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized((prev) => !prev);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              'p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors flex items-center justify-center',
              colorConfig.text
            )}
            title={isMinimized ? 'Restore' : 'Minimize to Title Bar'}
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center justify-center"
            title="Delete"
          >
            <Trash2 className={cn('w-4 h-4', colorConfig.text)} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              'p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors flex items-center justify-center',
              colorConfig.text
            )}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right-side Action Buttons - Absolutely positioned */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 pr-2 z-10">
        {/* Convert to Issue Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleConvertToIssue();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'p-2.5 rounded-xl transition-all duration-200',
            'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
            'border border-gray-200 dark:border-gray-600/50',
            'hover:border-success hover:bg-success/10 dark:hover:bg-success/20 hover:scale-105',
            'active:scale-95',
            'shadow-md hover:shadow-lg',
            'group'
          )}
          title="Convert to GitHub Issue"
        >
          <Github className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-success transition-colors" />
        </button>

        {/* Ask Copilot Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenCopilotChat();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'p-2.5 rounded-xl transition-all duration-200',
            'bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700',
            'border border-blue-400/30 dark:border-purple-500/30',
            'hover:from-blue-600 hover:to-purple-700 hover:scale-105',
            'active:scale-95',
            'shadow-md hover:shadow-lg',
            'group'
          )}
          title="Ask Copilot about this note"
        >
          <Zap className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <div 
        className="p-4 h-[calc(100%-8rem)] flex flex-col gap-3 overflow-y-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
          {/* Screenshot Preview - Compact */}
          {screenshot && (
            <div className="relative group">
              <img
                src={screenshot}
                alt="Screenshot"
                className="w-full h-24 object-cover rounded-lg border border-gray-300/50 dark:border-gray-600/50 cursor-pointer hover:opacity-90 transition-opacity"
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
                className="absolute top-1.5 right-1.5 p-1 bg-red-500 dark:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 dark:hover:bg-red-500"
                title="Remove screenshot"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1.5 left-1.5 px-2 py-1 bg-black/70 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
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
              'placeholder:text-gray-500/70 dark:placeholder:text-gray-400/70',
              'leading-relaxed'
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
      </div>

      {/* Footer with color picker */}
      <div className={cn('p-3 border-t', colorConfig.border, 'bg-white/20 dark:bg-white/5')}>
        <div className="flex items-center justify-center gap-3">
          {STICKY_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedColor(color.name);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                'w-7 h-7 rounded-full border transition-all hover:scale-110 flex items-center justify-center',
                color.swatch,
                'border-gray-300/50 dark:border-gray-500/50',
                selectedColor === color.name && 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110'
              )}
              title={`Change to ${color.name}`}
            />
          ))}
        </div>
      </div>

      {/* Copilot Chat Input Modal */}
      {buildCopilotContext() && (
        <CopilotChatInput
          context={buildCopilotContext()!}
          isOpen={isCopilotChatOpen}
          onClose={() => setIsCopilotChatOpen(false)}
          onSuccess={(requestId) => {
            console.log('✅ Sent to Copilot:', requestId);
            setNotification({
              type: 'success',
              message: '✓ Sent to VS Code! Check Copilot for results.',
            });
          }}
          onFallback={(prompt) => {
            console.log('📋 Copied to clipboard:', prompt.slice(0, 50) + '...');
          }}
        />
      )}
    </div>
  );
}
