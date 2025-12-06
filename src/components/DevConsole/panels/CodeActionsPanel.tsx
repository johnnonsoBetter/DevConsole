/**
 * Code Actions Panel
 * Tracks all webhook requests sent to VS Code Copilot
 * Shows status, allows retry, and displays history
 */

import {
    AlertCircle,
    Check,
    Clipboard,
    Clock,
    Code2,
    Image as ImageIcon,
    Loader2,
    Plus,
    RefreshCw,
    StickyNote,
    Terminal,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { VSCodeIcon } from '../../../icons';
import { webhookCopilot } from '../../../lib/webhookCopilot/webhookService';
import { cn } from '../../../utils';
import {
    CodeAction,
    CodeActionStatus,
    useCodeActionsStore,
} from '../../../utils/stores/codeActions';
import { TaskCodeEditor } from './TaskCodeEditor';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getStatusIcon(status: CodeActionStatus, queuePosition?: number) {
  switch (status) {
    case 'queued':
      return (
        <div className="relative">
          <Clock className="w-4 h-4 text-orange-500" />
          {queuePosition && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {queuePosition}
            </span>
          )}
        </div>
      );
    case 'sending':
    case 'processing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'sent_to_vscode':
    case 'completed':
      return <Check className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <X className="w-4 h-4 text-red-500" />;
    case 'copied_fallback':
      return <Clipboard className="w-4 h-4 text-amber-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function getStatusLabel(status: CodeActionStatus, queuePosition?: number): string {
  switch (status) {
    case 'queued': return queuePosition ? `Queued #${queuePosition}` : 'Queued';
    case 'sending': return 'Sending...';
    case 'processing': return 'Processing...';
    case 'sent_to_vscode': return 'In VS Code';
    case 'completed': return 'Done';  // Legacy
    case 'failed': return 'Failed';
    case 'copied_fallback': return 'Copied';
    default: return status;
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'logs':
      return <Terminal className="w-3.5 h-3.5" />;
    case 'sticky-notes':
      return <StickyNote className="w-3.5 h-3.5" />;
    default:
      return <Code2 className="w-3.5 h-3.5" />;
  }
}

// ============================================================================
// ACTION ITEM COMPONENT
// ============================================================================

interface ActionItemProps {
  action: CodeAction;
  onRetry: (action: CodeAction) => void;
  onCopy: (action: CodeAction) => void;
  onRemove: (id: string) => void;
}

function ActionItem({ action, onRetry, onCopy, onRemove }: ActionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = {
    queued: 'bg-orange-50 dark:bg-orange-900/20',
    sending: 'bg-blue-50 dark:bg-blue-900/20',
    processing: 'bg-blue-50 dark:bg-blue-900/20',
    sent_to_vscode: 'bg-green-50 dark:bg-green-900/20',
    completed: 'bg-green-50 dark:bg-green-900/20',
    failed: 'bg-red-50 dark:bg-red-900/20',
    copied_fallback: 'bg-amber-50 dark:bg-amber-900/20',
  }[action.status];

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors ${statusColor}`}
    >
      {/* Main Row */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">{getStatusIcon(action.status, action.queuePosition)}</div>

        {/* Source Badge */}
        <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-200/50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400">
          {getSourceIcon(action.source)}
          <span className="capitalize">{action.source.replace('-', ' ')}</span>
        </div>

        {/* Image Badge */}
        {action.imageCount && action.imageCount > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-xs text-purple-600 dark:text-purple-400">
            <ImageIcon className="w-3 h-3" />
            <span>{action.imageCount}</span>
          </div>
        )}

        {/* Prompt Preview */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
            "{action.promptPreview}"
          </p>
        </div>

        {/* Time */}
        <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {formatTimeAgo(action.createdAt)}
        </div>

        {/* Status Label */}
        <div className="flex-shrink-0 text-xs font-medium">
          <span
            className={
              action.status === 'completed'
                ? 'text-green-600 dark:text-green-400'
                : action.status === 'failed'
                ? 'text-red-600 dark:text-red-400'
                : action.status === 'copied_fallback'
                ? 'text-amber-600 dark:text-amber-400'
                : action.status === 'queued'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-blue-600 dark:text-blue-400'
            }
          >
            {getStatusLabel(action.status, action.queuePosition)}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
          {/* Images Attached */}
          {action.imageCount && action.imageCount > 0 && (
            <div className="mb-2 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{action.imageCount} image{action.imageCount > 1 ? 's' : ''} attached</span>
            </div>
          )}

          {/* Full Prompt */}
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Full Prompt
            </p>
            <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
              {action.fullPrompt}
            </pre>
          </div>

          {/* Error Message */}
          {action.error && (
            <div className="mb-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{action.error}</span>
            </div>
          )}

          {/* Suggestions */}
          {action.suggestions && action.suggestions.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Suggestions
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                {action.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Request ID */}
          {action.requestId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Request ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{action.requestId}</code>
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            {action.status === 'failed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(action);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(action);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copy Prompt
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(action.id);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  onCreateTask: () => void;
}

function EmptyState({ onCreateTask }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
        <VSCodeIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No Code Actions Yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        Send logs or notes to VS Code Copilot and they'll appear here. Use the{' '}
        <span className="font-medium">Copilot</span> button in Logs or the{' '}
        <span className="font-medium">Code</span> button on Sticky Notes.
        You can also attach screenshots for visual context.
      </p>
      
      {/* Create Task Button */}
      <button
        onClick={onCreateTask}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
          "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
          "text-white shadow-sm hover:shadow-md active:scale-[0.98]"
        )}
      >
        <Plus className="w-4 h-4" />
        <span>Create Task</span>
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================

export function CodeActionsPanel() {
  const { actions, removeAction, clearAll, clearCompleted, updateAction } = useCodeActionsStore();
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);

  // Note: Status polling removed for now to simplify debugging
  // Actions will show their last known status without auto-updates

  const handleRetry = useCallback(async (action: CodeAction) => {
    updateAction(action.id, { status: 'sending', sentAt: Date.now(), error: undefined, queuePosition: undefined });
    
    try {
      const { connected, workspaceReady } = await webhookCopilot.checkWorkspaceReady();
      
      if (!connected || !workspaceReady) {
        await navigator.clipboard.writeText(action.fullPrompt);
        updateAction(action.id, {
          status: 'copied_fallback',
          error: !connected ? 'VS Code not connected' : 'No workspace open',
          completedAt: Date.now(),
        });
        return;
      }

      const response = action.actionType === 'execute_task'
        ? await webhookCopilot.executeTask(action.fullPrompt, true)
        : await webhookCopilot.copilotChat(action.fullPrompt);

      if (response.success) {
        const isQueued = response.status === 'queued';
        updateAction(action.id, {
          status: isQueued ? 'queued' : 'processing',
          requestId: response.requestId,
          queuePosition: response.queue?.position,
        });
      } else {
        updateAction(action.id, {
          status: 'failed',
          error: response.message,
          errorCode: response.error,
          completedAt: Date.now(),
        });
      }
    } catch (err) {
      updateAction(action.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        completedAt: Date.now(),
      });
    }
  }, [updateAction]);

  const handleCopy = useCallback(async (action: CodeAction) => {
    await navigator.clipboard.writeText(action.fullPrompt);
  }, []);

  const pendingCount = actions.filter(
    (a) => a.status === 'queued' || a.status === 'sending' || a.status === 'processing'
  ).length;

  const completedCount = actions.filter(
    (a) => a.status === 'completed' || a.status === 'copied_fallback'
  ).length;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Code Actions
          </h2>
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {pendingCount} pending
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {actions.length} total
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Create Task Button - Always visible */}
          <button
            onClick={() => setIsTaskEditorOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50",
              "text-blue-700 dark:text-blue-300"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>

          {actions.length > 0 && (
            <>
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {actions.length === 0 ? (
          <EmptyState onCreateTask={() => setIsTaskEditorOpen(true)} />
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                onRetry={handleRetry}
                onCopy={handleCopy}
                onRemove={removeAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Editor Slideout */}
      <TaskCodeEditor
        isOpen={isTaskEditorOpen}
        onClose={() => setIsTaskEditorOpen(false)}
        onSuccess={(requestId) => {
          console.log('✅ Task sent to Copilot:', requestId);
        }}
      />
    </div>
  );
}
