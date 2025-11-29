/**
 * StickyNote Component
 * Draggable, resizable sticky note UI for quick note-taking
 * Mimics physical sticky notes with drag, color options, and auto-save
 */

import { useDraggable } from '@dnd-kit/core';
import { Camera, Code2, Github, Maximize2, Minimize2, Minus, Pin, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { webhookCopilot } from '../../../lib/webhookCopilot';
import { cn } from '../../../utils';
import { useCodeActionsStore, useGitHubIssueSlideoutStore } from '../../../utils/stores';
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
  { name: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-gray-900' },
  { name: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-gray-900' },
  { name: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-gray-900' },
  { name: 'green', bg: 'bg-green-100', border: 'border-green-300', text: 'text-gray-900' },
  { name: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-gray-900' },
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
  const [isExecutingCode, setIsExecutingCode] = useState(false);
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

  // Code Actions store for tracking
  const { addAction, updateAction } = useCodeActionsStore();

  // Code functionality - Send to Webhook Copilot
  const handleCodeAction = useCallback(async () => {
    if (!content.trim()) {
      setNotification({
        type: 'error',
        message: 'Note is empty. Add some content first!',
      });
      return;
    }

    setIsExecutingCode(true);
    setNotification({
      type: 'info',
      message: 'Checking VS Code connection...',
    });

    // Determine the best action based on note content
    const noteTitle = generateTitle(content);
    const isQuestion = /\?|how|what|why|when|where|explain/i.test(content);
    const actionType = isQuestion ? 'copilot_chat' : 'execute_task';
    const fullPrompt = isQuestion ? content : `${noteTitle}\n\n${content}`;

    try {
      // Check connection and workspace status
      const { connected, workspaceReady, health } = await webhookCopilot.checkWorkspaceReady();
      
      // Create action in store
      const actionId = addAction({
        source: 'sticky-notes',
        actionType: actionType as 'execute_task' | 'copilot_chat',
        promptPreview: fullPrompt.slice(0, 100) + (fullPrompt.length > 100 ? '...' : ''),
        fullPrompt,
        status: 'sending',
        workspaceReady,
        sentAt: Date.now(),
      });
      
      if (!connected) {
        // VS Code not running - copy to clipboard as fallback
        await navigator.clipboard.writeText(fullPrompt);
        updateAction(actionId, {
          status: 'copied_fallback',
          error: 'VS Code not connected',
          completedAt: Date.now(),
        });
        setNotification({
          type: 'info',
          message: '📋 VS Code not connected. Prompt copied to clipboard.',
        });
        setIsExecutingCode(false);
        return;
      }

      if (!workspaceReady) {
        // Connected but no workspace - copy to clipboard
        await navigator.clipboard.writeText(fullPrompt);
        const workspaceMessage = health?.workspace?.message || 'No workspace folder open';
        updateAction(actionId, {
          status: 'copied_fallback',
          error: workspaceMessage,
          completedAt: Date.now(),
        });
        setNotification({
          type: 'info',
          message: `📋 ${workspaceMessage}. Prompt copied to clipboard.`,
        });
        setIsExecutingCode(false);
        return;
      }

      setNotification({
        type: 'info',
        message: 'Sending to Copilot...',
      });

      let response;
      if (isQuestion) {
        response = await webhookCopilot.copilotChat(fullPrompt);
      } else {
        response = await webhookCopilot.executeTask(fullPrompt, true);
      }

      // Handle NO_WORKSPACE error
      if (!response.success && response.error === 'NO_WORKSPACE') {
        await navigator.clipboard.writeText(fullPrompt);
        updateAction(actionId, {
          status: 'copied_fallback',
          error: 'Workspace closed',
          completedAt: Date.now(),
        });
        setNotification({
          type: 'info',
          message: '📋 Workspace closed. Prompt copied to clipboard.',
        });
        setIsExecutingCode(false);
        return;
      }

      if (response.success) {
        console.log('✅ Webhook Copilot request successful:', response);
        
        // Check if task was queued or is processing immediately
        const isQueued = response.status === 'queued';
        const queuePosition = response.queue?.position;
        
        updateAction(actionId, {
          status: isQueued ? 'queued' : 'processing',
          requestId: response.requestId,
          queuePosition: queuePosition,
        });
        setNotification({
          type: 'success',
          message: isQueued 
            ? `✓ Queued (#${queuePosition}) - waiting for other tasks.`
            : '✓ Task sent to VS Code! Check Copilot for results.',
        });
      } else {
        updateAction(actionId, {
          status: 'failed',
          error: response.message,
          errorCode: response.error,
          completedAt: Date.now(),
        });
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Failed to send webhook:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setNotification({
        type: 'error',
        message: `Failed to send: ${errorMessage}`,
      });
    } finally {
      setIsExecutingCode(false);
    }
  }, [content, addAction, updateAction]);

  // Get color classes
  const colorConfig = STICKY_COLORS.find((c) => c.name === selectedColor) || STICKY_COLORS[0];

  // If minimized, show floating note icon
  if (isMinimized) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'fixed z-50 shadow-2xl rounded-full transition-all cursor-pointer hover:scale-110',
          colorConfig.bg,
          colorConfig.border,
          'border-2 w-16 h-16 flex items-center justify-center',
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
      ref={setNodeRef}
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
        left: `${translatedPosition.x}px`,
        top: `${translatedPosition.y}px`,
      }}
      {...listeners}
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
              'p-1.5 rounded  dark:bg-muted hover:bg-white/50 transition-colors flex items-center justify-center',
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
            'p-2.5 rounded-lg transition-all duration-200',
            'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm',
            'border-2 border-gray-300 dark:border-gray-600',
            'hover:border-success hover:bg-success/10 hover:scale-110',
            'active:scale-95',
            'shadow-lg hover:shadow-xl',
            'group'
          )}
          title="Convert to GitHub Issue"
        >
          <Github className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-success transition-colors" />
        </button>

        {/* Code Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCodeAction();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isExecutingCode}
          className={cn(
            'p-2.5 rounded-lg transition-all duration-200',
            'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm',
            'border-2 border-gray-300 dark:border-gray-600',
            'hover:border-primary hover:bg-primary/10 hover:scale-110',
            'active:scale-95',
            'shadow-lg hover:shadow-xl',
            'group',
            isExecutingCode && 'opacity-50 cursor-wait'
          )}
          title={isExecutingCode ? 'Sending to VS Code...' : 'Send to Copilot (Code Actions)'}
        >
          <Code2 className={cn(
            'w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors',
            isExecutingCode && 'animate-pulse'
          )} />
        </button>
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
