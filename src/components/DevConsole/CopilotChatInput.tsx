/**
 * CopilotChatInput Component
 * A beautiful, chat-style interface for sending context to VS Code Copilot
 * 
 * Features:
 * - Context preview with attached log/note info
 * - User-controlled prompt input
 * - Quick action suggestions
 * - Connection status indicator
 * - Elegant animations and transitions
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Code2,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Sparkles,
  Terminal,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { webhookCopilot } from '../../lib/webhookCopilot';
import { cn } from '../../utils';
import { useCodeActionsStore } from '../../utils/stores/codeActions';

// ============================================================================
// TYPES
// ============================================================================

export interface CopilotContext {
  type: 'log' | 'note' | 'code' | 'custom';
  title: string;
  preview: string;
  fullContext: string;
  metadata?: {
    level?: 'error' | 'warn' | 'info' | 'log';
    file?: string;
    line?: number;
    timestamp?: number;
    source?: string;
  };
}

export interface CopilotChatInputProps {
  context: CopilotContext;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (requestId: string) => void;
  onFallback?: (prompt: string) => void;
  position?: 'bottom' | 'inline';
  className?: string;
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explain',
    label: 'Explain',
    icon: HelpCircle,
    prompt: 'Explain what this means and why it might be happening',
    color: 'text-blue-500',
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: Wrench,
    prompt: 'Help me fix this issue',
    color: 'text-orange-500',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: Lightbulb,
    prompt: 'Suggest improvements or best practices',
    color: 'text-yellow-500',
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: Terminal,
    prompt: 'Help me debug this step by step',
    color: 'text-purple-500',
  },
];

// ============================================================================
// CONNECTION STATUS COMPONENT
// ============================================================================

type ConnectionStatus = 'checking' | 'connected' | 'no-workspace' | 'disconnected';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  workspaceName?: string;
}

const ConnectionIndicator = memo(({ status, workspaceName }: ConnectionIndicatorProps) => {
  const statusConfig = {
    checking: {
      icon: Loader2,
      text: 'Checking...',
      className: 'text-gray-400 animate-pulse',
      iconClassName: 'animate-spin',
    },
    connected: {
      icon: CheckCircle2,
      text: workspaceName || 'VS Code Ready',
      className: 'text-green-500',
      iconClassName: '',
    },
    'no-workspace': {
      icon: AlertCircle,
      text: 'Open a folder in VS Code',
      className: 'text-amber-500',
      iconClassName: '',
    },
    disconnected: {
      icon: AlertCircle,
      text: 'VS Code not running',
      className: 'text-red-500',
      iconClassName: '',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.className)}>
      <Icon className={cn('w-3.5 h-3.5', config.iconClassName)} />
      <span>{config.text}</span>
    </div>
  );
});

ConnectionIndicator.displayName = 'ConnectionIndicator';

// ============================================================================
// CONTEXT PREVIEW COMPONENT
// ============================================================================

interface ContextPreviewProps {
  context: CopilotContext;
  onRemove?: () => void;
}

const ContextPreview = memo(({ context, onRemove }: ContextPreviewProps) => {
  const levelColors = {
    error: 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20',
    warn: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/20',
    info: 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20',
    log: 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50',
  };

  const levelIcons = {
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    warn: <AlertCircle className="w-4 h-4 text-yellow-500" />,
    info: <MessageSquare className="w-4 h-4 text-blue-500" />,
    log: <Terminal className="w-4 h-4 text-gray-500" />,
  };

  const typeIcons = {
    log: Terminal,
    note: MessageSquare,
    code: Code2,
    custom: Sparkles,
  };

  const TypeIcon = typeIcons[context.type];
  const level = context.metadata?.level || 'log';

  return (
    <div
      className={cn(
        'relative rounded-lg border p-3 transition-all',
        levelColors[level]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {context.type === 'log' && context.metadata?.level
            ? levelIcons[context.metadata.level]
            : <TypeIcon className="w-4 h-4 text-gray-500" />
          }
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {context.title}
          </span>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-600 dark:text-gray-400 font-mono line-clamp-2 break-all">
        {context.preview}
      </div>

      {/* Metadata */}
      {context.metadata?.file && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
          <Code2 className="w-3 h-3" />
          <span className="truncate">
            {context.metadata.file}
            {context.metadata.line && `:${context.metadata.line}`}
          </span>
        </div>
      )}
    </div>
  );
});

ContextPreview.displayName = 'ContextPreview';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CopilotChatInput = memo(({
  context,
  isOpen,
  onClose,
  onSuccess,
  onFallback,
  position = 'bottom',
  className,
}: CopilotChatInputProps) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [workspaceName, setWorkspaceName] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addAction, updateAction } = useCodeActionsStore();

  // Check connection status on open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const checkConnection = async () => {
      setConnectionStatus('checking');
      try {
        const { connected, workspaceReady, health } = await webhookCopilot.checkWorkspaceReady();
        
        if (cancelled) return;
        
        if (!connected) {
          setConnectionStatus('disconnected');
        } else if (!workspaceReady) {
          setConnectionStatus('no-workspace');
        } else {
          setConnectionStatus('connected');
          setWorkspaceName(health?.workspace?.folders?.[0]?.name);
        }
      } catch {
        if (!cancelled) {
          setConnectionStatus('disconnected');
        }
      }
    };

    checkConnection();
    
    // Focus input when opened
    setTimeout(() => inputRef.current?.focus(), 100);

    return () => { cancelled = true; };
  }, [isOpen]);

  // Build the full prompt with context
  const buildFullPrompt = useCallback((userMessage: string): string => {
    let prompt = userMessage.trim();
    
    // Add context
    if (context.fullContext) {
      prompt += '\n\n---\n\n**Context:**\n' + context.fullContext;
    }
    
    // Add metadata hints
    if (context.metadata?.file) {
      prompt += `\n\nFile: \`${context.metadata.file}\``;
      if (context.metadata.line) {
        prompt += ` (line ${context.metadata.line})`;
      }
    }

    return prompt;
  }, [context]);

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Send to Copilot
  const handleSend = useCallback(async (promptOverride?: string) => {
    const prompt = promptOverride || userPrompt.trim();
    if (!prompt) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    setIsSending(true);
    setNotification(null);

    const fullPrompt = buildFullPrompt(prompt);

    // Create action in store
    const actionId = addAction({
      source: context.type === 'log' ? 'logs' : 'sticky-notes',
      actionType: 'copilot_chat',
      promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''),
      fullPrompt,
      status: 'sending',
      workspaceReady: connectionStatus === 'connected',
      sentAt: Date.now(),
    });

    try {
      // If not connected, fallback to clipboard
      if (connectionStatus === 'disconnected' || connectionStatus === 'no-workspace') {
        const copied = await copyToClipboard(fullPrompt);
        
        updateAction(actionId, {
          status: 'copied_fallback',
          error: connectionStatus === 'disconnected' ? 'VS Code not connected' : 'No workspace open',
          completedAt: Date.now(),
        });

        if (copied) {
          setNotification({
            type: 'info',
            message: '📋 Prompt copied! Paste it into Copilot when ready.',
          });
          onFallback?.(fullPrompt);
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setNotification({ type: 'error', message: 'Failed to copy to clipboard' });
        }
        setIsSending(false);
        return;
      }

      // Send to webhook using simplified API
      const response = await webhookCopilot.sendPrompt(fullPrompt, {
        type: context.type,
        ...(context.metadata || {}),
      });

      if (!response.success) {
        // Try clipboard fallback
        const copied = await copyToClipboard(fullPrompt);
        
        updateAction(actionId, {
          status: copied ? 'copied_fallback' : 'failed',
          error: response.message || response.error,
          completedAt: Date.now(),
        });

        if (copied) {
          setNotification({
            type: 'info',
            message: `📋 ${response.message || 'Error'}. Prompt copied to clipboard.`,
          });
          onFallback?.(fullPrompt);
        } else {
          setNotification({
            type: 'error',
            message: response.message || 'Failed to send',
          });
        }
      } else {
        // Success!
        const isQueued = response.status === 'queued';
        
        updateAction(actionId, {
          status: isQueued ? 'queued' : 'processing',
          requestId: response.requestId,
          queuePosition: response.queue?.position,
        });

        setNotification({
          type: 'success',
          message: isQueued
            ? `✓ Queued (#${response.queue?.position}) - waiting for other tasks`
            : '✓ Sent to Copilot! Check VS Code.',
        });
        
        onSuccess?.(response.requestId || '');
        
        // Close after success
        setTimeout(() => {
          onClose();
          setUserPrompt('');
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Try clipboard fallback
      const copied = await copyToClipboard(fullPrompt);
      
      updateAction(actionId, {
        status: copied ? 'copied_fallback' : 'failed',
        error: errorMessage,
        completedAt: Date.now(),
      });

      if (copied) {
        setNotification({
          type: 'info',
          message: `📋 ${errorMessage}. Prompt copied to clipboard.`,
        });
        onFallback?.(fullPrompt);
      } else {
        setNotification({ type: 'error', message: errorMessage });
      }
    } finally {
      setIsSending(false);
    }
  }, [
    userPrompt,
    buildFullPrompt,
    connectionStatus,
    context,
    addAction,
    updateAction,
    copyToClipboard,
    onSuccess,
    onFallback,
    onClose,
  ]);

  // Handle quick action click
  const handleQuickAction = useCallback((action: QuickAction) => {
    setUserPrompt(action.prompt);
    // Auto-send after a brief delay for visual feedback
    setTimeout(() => handleSend(action.prompt), 150);
  }, [handleSend]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSend, onClose]);

  // Clear notification after delay
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 w-full max-w-lg mx-auto',
              position === 'bottom'
                ? 'bottom-4 left-1/2 -translate-x-1/2 px-4'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              className
            )}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Ask Copilot
                    </h3>
                    <ConnectionIndicator status={connectionStatus} workspaceName={workspaceName} />
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Context Preview */}
              <div className="px-4 pt-4">
                <ContextPreview context={context} />
              </div>

              {/* Quick Actions */}
              <div className="px-4 pt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                    Quick Actions
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        disabled={isSending}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                          'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
                          'text-gray-700 dark:text-gray-300 transition-all',
                          'hover:shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                          'border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <Icon className={cn('w-3.5 h-3.5', action.color)} />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What would you like Copilot to help with?"
                    disabled={isSending}
                    rows={3}
                    className={cn(
                      'w-full px-4 py-3 pr-12 rounded-xl resize-none',
                      'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                      'text-sm text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                      'transition-all disabled:opacity-50'
                    )}
                  />
                  
                  {/* Send Button */}
                  <button
                    onClick={() => handleSend()}
                    disabled={isSending || !userPrompt.trim()}
                    className={cn(
                      'absolute right-2 bottom-2 p-2 rounded-lg transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      userPrompt.trim()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    )}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Keyboard Hint */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">Enter</kbd> to send</span>
                  {connectionStatus !== 'connected' && (
                    <span className="flex items-center gap-1">
                      <Clipboard className="w-3 h-3" />
                      Will copy to clipboard
                    </span>
                  )}
                </div>
              </div>

              {/* Notification */}
              <AnimatePresence>
                {notification && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cn(
                      'mx-4 mb-4 px-4 py-3 rounded-xl text-sm font-medium',
                      notification.type === 'success' && 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                      notification.type === 'error' && 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                      notification.type === 'info' && 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    )}
                  >
                    {notification.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

CopilotChatInput.displayName = 'CopilotChatInput';

export default CopilotChatInput;
