/**
 * CopilotChatInput Component
 * A beautiful, chat-style interface for sending context to VS Code Copilot
 * 
 * Design: Floating avatar at bottom-center with chat bubble above
 * 
 * Features:
 * - Animated Copilot avatar at bottom center
 * - Chat bubble that expands from the avatar
 * - Context preview with attached log/note info
 * - Quick action suggestions
 * - Connection status indicator
 * - Graceful fallback to clipboard
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowUp,
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
    color: 'text-blue-400',
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: Wrench,
    prompt: 'Help me fix this issue',
    color: 'text-orange-400',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: Lightbulb,
    prompt: 'Suggest improvements or best practices',
    color: 'text-yellow-400',
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: Terminal,
    prompt: 'Help me debug this step by step',
    color: 'text-purple-400',
  },
];

// ============================================================================
// ANIMATED COPILOT AVATAR
// ============================================================================

interface CopilotAvatarProps {
  isActive?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

const CopilotAvatar = memo(({ isActive = false, isLoading = false, onClick }: CopilotAvatarProps) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative w-14 h-14 rounded-full flex items-center justify-center',
        'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500',
        'shadow-xl shadow-purple-500/40',
        'cursor-pointer transition-shadow',
        'hover:shadow-2xl hover:shadow-purple-500/50'
      )}
    >
      {/* Outer pulse ring when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/40"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      
      {/* Loading pulse effect */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-full bg-white/30"
          animate={{
            scale: [1, 1.4],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      {/* Inner glow */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

      {/* Icon */}
      {isLoading ? (
        <Loader2 className="w-7 h-7 text-white animate-spin" />
      ) : (
        <Zap className="w-7 h-7 text-white drop-shadow-lg" />
      )}
    </motion.button>
  );
});

CopilotAvatar.displayName = 'CopilotAvatar';

// ============================================================================
// CONNECTION STATUS
// ============================================================================

type ConnectionStatus = 'checking' | 'connected' | 'busy' | 'no-workspace' | 'disconnected';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  workspaceName?: string;
}

const ConnectionIndicator = memo(({ status, workspaceName }: ConnectionIndicatorProps) => {
  const statusConfig = {
    checking: {
      icon: Loader2,
      text: 'Checking...',
      className: 'text-gray-400',
      iconClassName: 'animate-spin',
    },
    connected: {
      icon: CheckCircle2,
      text: workspaceName ? `Connected: ${workspaceName}` : 'VS Code Ready',
      className: 'text-green-400',
      iconClassName: '',
    },
    busy: {
      icon: Loader2,
      text: 'Copilot is busy...',
      className: 'text-amber-400',
      iconClassName: 'animate-spin',
    },
    'no-workspace': {
      icon: AlertCircle,
      text: 'Open a folder in VS Code',
      className: 'text-amber-400',
      iconClassName: '',
    },
    disconnected: {
      icon: AlertCircle,
      text: 'VS Code not running',
      className: 'text-red-400',
      iconClassName: '',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.className)}>
      <Icon className={cn('w-3.5 h-3.5', config.iconClassName)} />
      <span className="truncate max-w-[200px]">{config.text}</span>
    </div>
  );
});

ConnectionIndicator.displayName = 'ConnectionIndicator';

// ============================================================================
// CONTEXT PREVIEW
// ============================================================================

interface ContextPreviewProps {
  context: CopilotContext;
}

const ContextPreview = memo(({ context }: ContextPreviewProps) => {
  const levelColors = {
    error: 'border-l-red-500 bg-red-500/10',
    warn: 'border-l-yellow-500 bg-yellow-500/10',
    info: 'border-l-blue-500 bg-blue-500/10',
    log: 'border-l-gray-500 bg-gray-500/10',
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
        'rounded-lg border-l-4 p-3',
        levelColors[level]
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <TypeIcon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-300 truncate">
          {context.title}
        </span>
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-400 font-mono line-clamp-2 break-all leading-relaxed">
        {context.preview}
      </div>

      {/* File info */}
      {context.metadata?.file && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
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

  // Check connection status on open and poll for busy state changes
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const checkConnection = async () => {
      // Don't reset to 'checking' if already connected/busy (avoids UI flicker during polling)
      if (connectionStatus !== 'connected' && connectionStatus !== 'busy') {
        setConnectionStatus('checking');
      }
      
      try {
        const { connected, workspaceReady, chatBusy, health } = await webhookCopilot.checkWorkspaceReady();
        
        if (cancelled) return;
        
        if (!connected) {
          setConnectionStatus('disconnected');
        } else if (!workspaceReady) {
          setConnectionStatus('no-workspace');
        } else if (chatBusy) {
          setConnectionStatus('busy');
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

    // Initial check
    checkConnection();
    
    // Poll every 2 seconds while open to catch busy → ready transitions
    const pollInterval = setInterval(checkConnection, 2000);
    
    // Focus input when opened
    setTimeout(() => inputRef.current?.focus(), 150);

    return () => { 
      cancelled = true; 
      clearInterval(pollInterval);
    };
  }, [isOpen, connectionStatus]);

  // Build the full prompt with context (for clipboard fallback & display)
  const buildFullPrompt = useCallback((userMessage: string): string => {
    let prompt = userMessage.trim();
    
    if (context.fullContext) {
      prompt += '\n\n---\n\n**Context:**\n' + context.fullContext;
    }
    
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
    const userMessage = promptOverride || userPrompt.trim();
    if (!userMessage) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    setIsSending(true);
    setNotification(null);

    // Build full prompt for clipboard/storage
    const fullPrompt = buildFullPrompt(userMessage);

    // Create action in store
    const actionId = addAction({
      source: context.type === 'log' ? 'logs' : 'sticky-notes',
      actionType: 'copilot_chat',
      promptPreview: userMessage.slice(0, 100) + (userMessage.length > 100 ? '...' : ''),
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
            message: '📋 Copied! Paste in Copilot when ready.',
          });
          onFallback?.(fullPrompt);
          setTimeout(() => {
            onClose();
            setUserPrompt('');
          }, 2000);
        } else {
          setNotification({ type: 'error', message: 'Failed to copy to clipboard' });
        }
        setIsSending(false);
        return;
      }

      // If Copilot is busy, show message and wait
      if (connectionStatus === 'busy') {
        setNotification({
          type: 'info',
          message: '⏳ Copilot is busy. Waiting for it to be ready...',
        });
        
        // Poll for readiness (max 15 seconds)
        let attempts = 0;
        const maxAttempts = 15;
        
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000));
          const { ready, chatBusy } = await webhookCopilot.isReady();
          
          if (ready && !chatBusy) {
            setConnectionStatus('connected');
            setNotification(null);
            break;
          }
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          // Still busy after waiting, copy to clipboard
          const copied = await copyToClipboard(fullPrompt);
          
          updateAction(actionId, {
            status: 'copied_fallback',
            error: 'Copilot busy timeout',
            completedAt: Date.now(),
          });
          
          setNotification({
            type: 'info',
            message: copied 
              ? '📋 Copilot still busy. Copied to clipboard!' 
              : 'Copilot is busy. Please try again later.',
          });
          
          if (copied) onFallback?.(fullPrompt);
          setIsSending(false);
          return;
        }
      }

      // Send to webhook - use the FULL prompt with embedded context
      // The extension's /webhook endpoint expects the prompt field to contain everything
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
            message: `📋 ${response.message || 'Error'}. Copied to clipboard.`,
          });
          onFallback?.(fullPrompt);
        } else {
          setNotification({
            type: 'error',
            message: response.message || 'Failed to send',
          });
        }
      } else {
        // Success! Note: Response streams to VS Code Chat, not back here
        const isQueued = response.status === 'queued';
        
        updateAction(actionId, {
          status: isQueued ? 'queued' : 'sent_to_vscode',
          requestId: response.requestId,
          queuePosition: response.queue?.position,
        });

        setNotification({
          type: 'success',
          message: isQueued
            ? `✓ Queued (#${response.queue?.position}) - Check VS Code!`
            : '✓ Sent! Check VS Code for Copilot\'s response',
        });
        
        onSuccess?.(response.requestId || '');
        
        setTimeout(() => {
          onClose();
          setUserPrompt('');
        }, 2000); // Slightly longer to read the message
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
          message: `📋 ${errorMessage}. Copied to clipboard.`,
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
    setTimeout(() => handleSend(action.prompt), 100);
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
        <div className={cn('fixed inset-0 z-50 pointer-events-none', className)}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />

          {/* Bottom-center container with avatar and chat bubble */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
            
            {/* Chat Bubble - appears above avatar */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="mb-3 w-[400px] max-w-[calc(100vw-2rem)]"
            >
              <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700/60 overflow-hidden">
                
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">
                        Ask Copilot
                      </h3>
                      <ConnectionIndicator status={connectionStatus} workspaceName={workspaceName} />
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Context Preview */}
                <div className="px-4 pt-3">
                  <ContextPreview context={context} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Quick Actions
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                          disabled={isSending}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                            'bg-gray-800/80 hover:bg-gray-700',
                            'text-gray-300 transition-all',
                            'hover:scale-[1.02] active:scale-[0.98]',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'border border-gray-700/50 hover:border-gray-600'
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
                      rows={2}
                      className={cn(
                        'w-full px-4 py-3 pr-12 rounded-xl resize-none',
                        'bg-gray-800/80 border border-gray-700/60',
                        'text-sm text-white placeholder:text-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                        'transition-all disabled:opacity-50'
                      )}
                    />
                    
                    {/* Send Button */}
                    <button
                      onClick={() => handleSend()}
                      disabled={isSending || !userPrompt.trim()}
                      className={cn(
                        'absolute right-2 bottom-2 p-2 rounded-lg transition-all',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        userPrompt.trim()
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-700 text-gray-500'
                      )}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Footer hints */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">⌘</kbd>
                      {' + '}
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">↵</kbd>
                      {' to send'}
                    </span>
                    {connectionStatus !== 'connected' && (
                      <span className="flex items-center gap-1 text-amber-400/80">
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
                        'mx-4 mb-4 px-4 py-2.5 rounded-xl text-sm font-medium',
                        notification.type === 'success' && 'bg-green-500/20 text-green-400 border border-green-500/30',
                        notification.type === 'error' && 'bg-red-500/20 text-red-400 border border-red-500/30',
                        notification.type === 'info' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      )}
                    >
                      {notification.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Speech bubble pointer (triangle) */}
              <div className="flex justify-center -mt-px">
                <div 
                  className="w-4 h-4 bg-gray-900 border-r border-b border-gray-700/60 transform rotate-45 -translate-y-2"
                  style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}
                />
              </div>
            </motion.div>

            {/* Animated Copilot Avatar */}
            <CopilotAvatar
              isActive={isOpen}
              isLoading={isSending}
              onClick={onClose}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
});

CopilotChatInput.displayName = 'CopilotChatInput';

export default CopilotChatInput;
