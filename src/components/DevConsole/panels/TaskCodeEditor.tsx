/**
 * TaskCodeEditor Component
 * A slideout editor for creating custom tasks to send to VS Code Copilot
 * Similar to a note editor but focused on task composition
 */

import { AnimatePresence, motion } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { VSCodeIcon } from '../../../icons';
import { cn } from '../../../utils';
import { EmbeddedCopilotChat, type EmbeddedCopilotContext } from '../EmbeddedCopilotChat';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskCodeEditorProps {
  /** Whether the editor is open */
  isOpen: boolean;
  /** Callback when the editor should close */
  onClose: () => void;
  /** Callback when task is successfully sent */
  onSuccess?: (requestId: string) => void;
}

type EditorView = 'compose' | 'chat';

// ============================================================================
// COMPOSE VIEW
// ============================================================================

interface ComposeViewProps {
  taskTitle: string;
  taskDescription: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSendToChat: () => void;
  hasContent: boolean;
}

const ComposeView = memo(({
  taskTitle,
  taskDescription,
  onTitleChange,
  onDescriptionChange,
  onSendToChat,
  hasContent,
}: ComposeViewProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Compose Form */}
      <div className="flex-1 overflow-auto p-4">
        {/* Task Title */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Task Title
          </label>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="What do you want to accomplish?"
            className={cn(
              'w-full px-3 py-2.5 rounded-lg',
              'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40',
              'transition-all duration-150'
            )}
          />
        </div>

        {/* Task Description */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Description (optional)
          </label>
          <textarea
            value={taskDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Add more context, code snippets, or details..."
            rows={8}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg resize-none',
              'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40',
              'transition-all duration-150 font-mono'
            )}
          />
        </div>

        {/* Quick Templates */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Quick Templates
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Fix bug', title: 'Fix a bug', desc: 'I found a bug that needs fixing:\n\n**What\'s happening:**\n\n**Expected behavior:**\n\n**Steps to reproduce:**' },
              { label: 'Add feature', title: 'Add new feature', desc: 'I want to add a new feature:\n\n**Feature description:**\n\n**Acceptance criteria:**' },
              { label: 'Refactor', title: 'Refactor code', desc: 'I need to refactor some code:\n\n**Current code:**\n```\n\n```\n\n**What should change:**' },
              { label: 'Review', title: 'Code review', desc: 'Please review this code:\n\n```\n\n```\n\n**Areas of concern:**' },
            ].map((template) => (
              <button
                key={template.label}
                onClick={() => {
                  onTitleChange(template.title);
                  onDescriptionChange(template.desc);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
                  'text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                )}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <button
          onClick={onSendToChat}
          disabled={!hasContent}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
            'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
            'text-white shadow-sm hover:shadow-md active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm'
          )}
        >
          <VSCodeIcon size={16} />
          <span>Continue to Copilot Chat</span>
        </button>
      </div>
    </div>
  );
});

ComposeView.displayName = 'ComposeView';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TaskCodeEditor = memo(({
  isOpen,
  onClose,
  onSuccess,
}: TaskCodeEditorProps) => {
  const [activeView, setActiveView] = useState<EditorView>('compose');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [copilotContext, setCopilotContext] = useState<EmbeddedCopilotContext | null>(null);

  const hasContent = taskTitle.trim().length > 0;

  // Build context for EmbeddedCopilotChat
  const buildCopilotContext = useCallback((): EmbeddedCopilotContext => {
    const fullContext = taskDescription.trim() 
      ? `${taskTitle}\n\n${taskDescription}` 
      : taskTitle;

    return {
      type: 'custom',
      title: taskTitle || 'Custom Task',
      preview: taskTitle.slice(0, 100),
      fullContext,
      metadata: {
        source: 'code-actions',
        timestamp: Date.now(),
      },
    };
  }, [taskTitle, taskDescription]);

  // Handle transition to chat view
  const handleSendToChat = useCallback(() => {
    const context = buildCopilotContext();
    setCopilotContext(context);
    setActiveView('chat');
  }, [buildCopilotContext]);

  // Handle successful send
  const handleSuccess = useCallback((requestId: string) => {
    onSuccess?.(requestId);
    // Reset form after successful send
    setTimeout(() => {
      setTaskTitle('');
      setTaskDescription('');
      setActiveView('compose');
      setCopilotContext(null);
      onClose();
    }, 2000);
  }, [onSuccess, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setTaskTitle('');
    setTaskDescription('');
    setActiveView('compose');
    setCopilotContext(null);
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/20 dark:bg-black/40 z-[100]"
          />

          {/* Slideout Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'absolute top-0 right-0 bottom-0 w-full max-w-[420px]',
              'bg-white dark:bg-gray-900 shadow-2xl z-[101]',
              'flex flex-col border-l border-gray-200 dark:border-gray-800'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Create Task for VS Code
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Compose a task and send it to Copilot
                </p>
              </div>

              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors ml-2"
                title="Close"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
              <button
                onClick={() => setActiveView('compose')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeView === 'compose'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Compose</span>
              </button>
              <button
                onClick={() => {
                  if (hasContent) {
                    handleSendToChat();
                  }
                }}
                disabled={!hasContent}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeView === 'chat'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-700'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  !hasContent && 'opacity-50 cursor-not-allowed'
                )}
              >
                <VSCodeIcon size={14} className="flex-shrink-0" />
                <span>Send to Copilot</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {activeView === 'compose' ? (
                <ComposeView
                  taskTitle={taskTitle}
                  taskDescription={taskDescription}
                  onTitleChange={setTaskTitle}
                  onDescriptionChange={setTaskDescription}
                  onSendToChat={handleSendToChat}
                  hasContent={hasContent}
                />
              ) : (
                copilotContext && (
                  <EmbeddedCopilotChat
                    context={copilotContext}
                    onSuccess={handleSuccess}
                    onFallback={(prompt) => {
                      console.log('📋 Copied to clipboard:', prompt.slice(0, 50) + '...');
                    }}
                    className="flex-1"
                  />
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

TaskCodeEditor.displayName = 'TaskCodeEditor';
