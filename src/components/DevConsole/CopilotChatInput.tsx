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
  Camera,
  CheckCircle2,
  Clipboard,
  Code2,
  HelpCircle,
  Image as ImageIcon,
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
import type { ImageAttachment } from '../../lib/webhookCopilot/webhookService';
import { cn } from '../../utils';
import { useCodeActionsStore } from '../../utils/stores/codeActions';

// ============================================================================
// TYPES
// ============================================================================

interface AttachedImage {
  id: string;
  file: File;
  preview: string; // Data URL for preview
  base64: string; // Base64 data (without data URL prefix)
  mimeType: ImageAttachment['mimeType'];
}

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
    color: 'text-blue-300 group-hover:text-blue-200',
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: Wrench,
    prompt: 'Help me fix this issue',
    color: 'text-orange-300 group-hover:text-orange-200',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: Lightbulb,
    prompt: 'Suggest improvements or best practices',
    color: 'text-yellow-300 group-hover:text-yellow-200',
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: Terminal,
    prompt: 'Help me debug this step by step',
    color: 'text-purple-300 group-hover:text-purple-200',
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
      className: 'text-gray-300',
      iconClassName: 'animate-spin',
    },
    connected: {
      icon: CheckCircle2,
      text: workspaceName ? `Connected: ${workspaceName}` : 'VS Code Ready',
      className: 'text-emerald-400',
      iconClassName: '',
    },
    busy: {
      icon: Loader2,
      text: 'Copilot is busy...',
      className: 'text-amber-300',
      iconClassName: 'animate-spin',
    },
    'no-workspace': {
      icon: AlertCircle,
      text: 'Open a folder in VS Code',
      className: 'text-amber-300',
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
    <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', config.className)}>
      <Icon className={cn('w-3 h-3 flex-shrink-0', config.iconClassName)} />
      <span className="truncate max-w-[180px]">{config.text}</span>
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
    error: 'border-l-red-400 bg-red-500/15',
    warn: 'border-l-amber-400 bg-amber-500/15',
    info: 'border-l-blue-400 bg-blue-500/15',
    log: 'border-l-gray-400 bg-gray-500/15',
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
        'rounded-lg border-l-[3px] px-3 py-2.5',
        levelColors[level]
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <TypeIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-gray-100 truncate leading-tight">
          {context.title}
        </span>
      </div>

      {/* Preview */}
      <div className="text-[12px] text-gray-300 font-mono line-clamp-2 break-all leading-relaxed">
        {context.preview}
      </div>

      {/* File info */}
      {context.metadata?.file && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-gray-400">
          <Code2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate font-medium">
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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false); // Prevent double-sending
  const { addAction, updateAction } = useCodeActionsStore();

  // Check connection status once when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const checkConnection = async () => {
      setConnectionStatus('checking');
      
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

    // Initial check only (no polling)
    checkConnection();
    
    // Focus input when opened
    setTimeout(() => inputRef.current?.focus(), 150);

    return () => { 
      cancelled = true; 
    };
  }, [isOpen]);

  // Build the full prompt with context (for clipboard fallback & display)
  const buildFullPrompt = useCallback((userMessage: string): string => {
    const parts: string[] = [];
    
    // User's question/request first
    parts.push(`## Request\n${userMessage.trim()}`);
    
    // Context section with clear labeling
    if (context.fullContext) {
      const contextType = context.type === 'log' ? 'Console Log' 
        : context.type === 'note' ? 'Note' 
        : context.type === 'code' ? 'Code Snippet'
        : 'Context';
      
      const level = context.metadata?.level;
      const levelLabel = level ? ` (${level.toUpperCase()})` : '';
      
      parts.push(`## ${contextType}${levelLabel}\n\`\`\`\n${context.fullContext}\n\`\`\``);
    }
    
    // File info as metadata
    if (context.metadata?.file) {
      let fileInfo = `**Source:** \`${context.metadata.file}\``;
      if (context.metadata.line) {
        fileInfo += `:${context.metadata.line}`;
      }
      parts.push(fileInfo);
    }

    return parts.join('\n\n');
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

  // Image handling helpers
  const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB max
  const MAX_IMAGES = 4;

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get raw base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newImages: AttachedImage[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      // Check if we've reached max images
      if (attachedImages.length + newImages.length >= MAX_IMAGES) {
        errors.push(`Maximum ${MAX_IMAGES} images allowed`);
        break;
      }

      // Validate file type
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
        errors.push(`${file.name}: Unsupported format. Use PNG, JPEG, GIF, or WebP`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: Too large (max 10MB)`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          preview,
          base64,
          mimeType: file.type as ImageAttachment['mimeType'],
        });
      } catch (err) {
        errors.push(`${file.name}: Failed to process`);
      }
    }

    if (newImages.length > 0) {
      setAttachedImages(prev => [...prev, ...newImages]);
    }

    if (errors.length > 0) {
      setNotification({
        type: 'error',
        message: errors[0], // Show first error
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachedImages.length, fileToBase64]);

  const removeImage = useCallback((imageId: string) => {
    setAttachedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview); // Clean up object URL
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  // Capture screenshot of current page
  const handleCaptureScreenshot = useCallback(async () => {
    // Check if we've reached max images
    if (attachedImages.length >= MAX_IMAGES) {
      setNotification({
        type: 'error',
        message: `Maximum ${MAX_IMAGES} images allowed`,
      });
      return;
    }

    setIsCapturingScreenshot(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.windowId) {
        setNotification({
          type: 'error',
          message: 'Unable to capture screenshot: No active tab found',
        });
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
      });

      // Convert data URL to base64 and create attachment
      const base64 = dataUrl.split(',')[1];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      const newImage: AttachedImage = {
        id: `screenshot-${Date.now()}`,
        file: new File([dataUrl], `screenshot-${timestamp}.png`, { type: 'image/png' }),
        preview: dataUrl,
        base64,
        mimeType: 'image/png',
      };

      setAttachedImages(prev => [...prev, newImage]);
      setNotification({
        type: 'success',
        message: '📸 Screenshot captured!',
      });
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setNotification({
        type: 'error',
        message: 'Failed to capture screenshot. Check permissions.',
      });
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [attachedImages.length]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault(); // Prevent pasting image as text
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(f => dataTransfer.items.add(f));
      handleImageSelect(dataTransfer.files);
    }
  }, [handleImageSelect]);

  // Handle drag and drop for images
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Filter only image files
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(f => dataTransfer.items.add(f));
        handleImageSelect(dataTransfer.files);
      }
    }
  }, [handleImageSelect]);

  // Send to Copilot
  const handleSend = useCallback(async (promptOverride?: string) => {
    // Prevent double-sending
    if (sendingRef.current || isSending) {
      return;
    }
    
    const userMessage = promptOverride || userPrompt.trim();
    if (!userMessage) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    sendingRef.current = true;
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
      imageCount: attachedImages.length > 0 ? attachedImages.length : undefined,
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
      // Include images if attached
      const images: ImageAttachment[] = attachedImages.map(img => ({
        data: img.base64,
        mimeType: img.mimeType,
        description: img.file.name,
      }));

      // Build context object, only including defined values to avoid "undefined" in output
      const contextPayload: Record<string, unknown> = {
        type: context.type,
      };
      
      // Only add metadata fields that have actual values
      if (context.metadata) {
        if (context.metadata.file) contextPayload.file = context.metadata.file;
        if (context.metadata.line) contextPayload.line = context.metadata.line;
        if (context.metadata.level) contextPayload.level = context.metadata.level;
        if (context.metadata.source) contextPayload.source = context.metadata.source;
        if (context.metadata.timestamp) contextPayload.timestamp = context.metadata.timestamp;
      }

      const response = await webhookCopilot.sendPrompt(
        fullPrompt,
        contextPayload,
        images.length > 0 ? images : undefined
      );

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
      sendingRef.current = false;
      setIsSending(false);
    }
  }, [
    isSending,
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

  // Handle quick action click - populate input instead of auto-sending
  const handleQuickAction = useCallback((action: QuickAction) => {
    setUserPrompt(action.prompt);
    // Focus the input so user can edit or send
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Handle keyboard shortcuts (Escape disabled - use close button)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    // Escape key disabled - modal can only be closed via close button
  }, [handleSend]);

  // Clear notification after delay
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Max 150px
  }, [userPrompt]);

  // Clear input, images, and notification when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUserPrompt('');
      setNotification(null);
      // Clean up image object URLs
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
      setAttachedImages([]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus trap - keep focus within the modal
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    // Get all focusable elements within the modal
    const getFocusableElements = () => {
      return modalElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab: if on first element, go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab: if on last element, go to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    // Prevent escape key from closing (handled at document level)
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn('fixed inset-0 z-50 pointer-events-none', className)}>
          {/* Backdrop - no click to close, only close button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />

          {/* Bottom-center container with avatar and chat bubble */}
          <div 
            ref={modalRef}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto"
          >
            
            {/* Chat Bubble - appears above avatar */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="mb-3 w-[400px] max-w-[calc(100vw-2rem)]"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={cn(
                "bg-gray-900 rounded-2xl shadow-2xl border overflow-hidden transition-colors",
                isDragging 
                  ? "border-purple-500/60 ring-2 ring-purple-500/30" 
                  : "border-gray-700/60"
              )}>
                
                {/* Drag overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-purple-500/10 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                    <div className="flex flex-col items-center gap-2 text-purple-300">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm font-medium">Drop images here</span>
                    </div>
                  </div>
                )}
                
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <Zap className="w-[18px] h-[18px] text-white" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-[15px] font-bold text-white tracking-tight">
                        Ask Copilot
                      </h3>
                      <ConnectionIndicator status={connectionStatus} workspaceName={workspaceName} />
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className={cn(
                      'p-2.5 rounded-xl transition-all duration-150 group',
                      'bg-gray-700/40 hover:bg-red-500/20',
                      'border border-gray-600/50 hover:border-red-500/50',
                      'focus:outline-none focus:ring-2 focus:ring-red-500/40',
                      'hover:scale-105 active:scale-95'
                    )}
                    aria-label="Close dialog"
                    title="Close (only way to exit)"
                  >
                    <X className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors" />
                  </button>
                </div>

                {/* Context Preview */}
                <div className="px-4 pt-4">
                  <ContextPreview context={context} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 pt-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Quick Actions
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      const isSelected = userPrompt === action.prompt;
                      return (
                        <button
                          key={action.id}
                          type='button'
                          onClick={() => handleQuickAction(action)}
                          disabled={isSending}
                          className={cn(
                            'group inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium',
                            'transition-all duration-150',
                            'hover:scale-[1.02] active:scale-[0.98]',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 border'
                              : 'bg-gray-800/60 hover:bg-gray-700/80 text-gray-200 border border-gray-600/50 hover:border-gray-500/60'
                          )}
                        >
                          <Icon className={cn('w-4 h-4 transition-colors', action.color)} />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 pt-4">
                  {/* Image Attachments Preview */}
                  {attachedImages.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachedImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative group rounded-lg overflow-hidden border border-gray-600/50 bg-gray-800/50"
                        >
                          <img
                            src={img.preview}
                            alt={img.file.name}
                            className="w-16 h-16 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className={cn(
                              'absolute -top-1 -right-1 p-1 rounded-full',
                              'bg-gray-900/90 border border-gray-600/50',
                              'opacity-0 group-hover:opacity-100 transition-opacity',
                              'hover:bg-red-500/80 hover:border-red-500/50'
                            )}
                            aria-label={`Remove ${img.file.name}`}
                          >
                            <X className="w-3 h-3 text-gray-300" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                            <span className="text-[9px] text-gray-300 truncate block">
                              {img.file.name.length > 10 
                                ? img.file.name.slice(0, 8) + '...' 
                                : img.file.name}
                            </span>
                          </div>
                        </div>
                      ))}
                      {attachedImages.length < 4 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            'w-16 h-16 rounded-lg border-2 border-dashed border-gray-600/50',
                            'flex items-center justify-center',
                            'hover:border-purple-500/50 hover:bg-purple-500/10',
                            'transition-colors'
                          )}
                          aria-label="Add another image"
                        >
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder="What would you like Copilot to help with?"
                      disabled={isSending}
                      rows={1}
                      className={cn(
                        'w-full px-4 py-3 pr-28 rounded-xl resize-none overflow-hidden',
                        'bg-gray-800/70 border border-gray-600/50',
                        'text-[14px] text-gray-100 placeholder:text-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40',
                        'transition-all duration-150 disabled:opacity-50',
                        'min-h-[48px]', // Slightly taller for better touch targets
                        'leading-relaxed'
                      )}
                    />

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      multiple
                      onChange={(e) => handleImageSelect(e.target.files)}
                      className="hidden"
                      aria-label="Upload images"
                    />
                    
                    {/* Screenshot Button */}
                    <button
                      type="button"
                      onClick={handleCaptureScreenshot}
                      disabled={isSending || isCapturingScreenshot || attachedImages.length >= 4}
                      aria-label="Capture screenshot"
                      title="Capture page screenshot"
                      className={cn(
                        'absolute right-[88px] bottom-2.5 p-2 rounded-lg transition-all duration-150',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        'hover:bg-gray-700/80 text-gray-400 hover:text-gray-200',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                        isCapturingScreenshot && 'animate-pulse'
                      )}
                    >
                      {isCapturingScreenshot ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Image Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending || attachedImages.length >= 4}
                      aria-label="Attach image"
                      title="Upload image"
                      className={cn(
                        'absolute right-14 bottom-2.5 p-2 rounded-lg transition-all duration-150',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        'hover:bg-gray-700/80 text-gray-400 hover:text-gray-200',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                      )}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      onClick={() => handleSend()}
                      disabled={isSending || !userPrompt.trim()}
                      aria-label="Send message"
                      className={cn(
                        'absolute right-2.5 bottom-2.5 p-2.5 rounded-lg transition-all duration-150',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                        userPrompt.trim()
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                          : 'bg-gray-700/80 text-gray-500'
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
                  <div className="mt-3 flex items-center justify-between text-[11px] flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 flex items-center gap-1">
                        <kbd className="px-1.5 py-1 rounded bg-gray-700/80 text-gray-300 font-mono text-[10px] border border-gray-600/50">⌘</kbd>
                        <span className="text-gray-500">+</span>
                        <kbd className="px-1.5 py-1 rounded bg-gray-700/80 text-gray-300 font-mono text-[10px] border border-gray-600/50">↵</kbd>
                        <span className="ml-1">send</span>
                      </span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Screenshot</span>
                        <span className="text-gray-600">•</span>
                        <ImageIcon className="w-3 h-3" />
                        <span>Upload</span>
                      </span>
                    </div>
                    {connectionStatus !== 'connected' && (
                      <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                        <Clipboard className="w-3.5 h-3.5" />
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
                        'mx-4 mb-4 px-4 py-3 rounded-xl text-[13px] font-medium leading-relaxed',
                        notification.type === 'success' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                        notification.type === 'error' && 'bg-red-500/20 text-red-300 border border-red-500/30',
                        notification.type === 'info' && 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
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
