/**
 * EmbeddedCopilotChat Component
 * A compact chat interface for sending context to VS Code Copilot
 * Designed to be embedded within slideout panels
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowUp,
    Camera,
    CheckCircle2,
    Clipboard,
    FolderOpen,
    HelpCircle,
    Image as ImageIcon,
    Lightbulb,
    Loader2,
    RefreshCw,
    Settings,
    Terminal,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { VSCodeIcon } from '../../icons';
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
  preview: string;
  base64: string;
  mimeType: ImageAttachment['mimeType'];
}

export interface EmbeddedCopilotContext {
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

export interface EmbeddedCopilotChatProps {
  context: EmbeddedCopilotContext;
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
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explain',
    label: 'Explain',
    icon: HelpCircle,
    prompt: 'Explain what this means and why it might be happening',
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: Wrench,
    prompt: 'Help me fix this issue',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: Lightbulb,
    prompt: 'Suggest improvements or best practices',
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: Terminal,
    prompt: 'Help me debug this step by step',
  },
];

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
      className: 'text-gray-500 dark:text-gray-400',
      iconClassName: 'animate-spin',
    },
    connected: {
      icon: CheckCircle2,
      text: workspaceName ? `Connected: ${workspaceName}` : 'VS Code Ready',
      className: 'text-emerald-600 dark:text-emerald-400',
      iconClassName: '',
    },
    busy: {
      icon: Loader2,
      text: 'Copilot is busy...',
      className: 'text-amber-600 dark:text-amber-400',
      iconClassName: 'animate-spin',
    },
    'no-workspace': {
      icon: AlertCircle,
      text: 'Open a folder in VS Code',
      className: 'text-amber-600 dark:text-amber-400',
      iconClassName: '',
    },
    disconnected: {
      icon: AlertCircle,
      text: 'VS Code not running',
      className: 'text-red-500 dark:text-red-400',
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
// SETUP VIEW - Shown when VS Code is not connected
// ============================================================================

interface SetupViewProps {
  status: ConnectionStatus;
  onRetry: () => void;
  onOpenSettings: () => void;
  isRetrying: boolean;
}

const SetupView = memo(({ status, onRetry, onOpenSettings, isRetrying }: SetupViewProps) => {
  const getStatusContent = () => {
    switch (status) {
      case 'checking':
        return {
          icon: Loader2,
          iconClassName: 'animate-spin text-blue-500 dark:text-blue-400',
          title: 'Connecting to VS Code...',
          description: 'Checking if VS Code is running with the Copilot extension.',
          showRetry: false,
        };
      case 'disconnected':
        return {
          icon: VSCodeIcon,
          iconClassName: 'text-gray-400 dark:text-gray-500',
          title: 'VS Code Not Connected',
          description: 'Start VS Code with the DevConsole extension to enable AI-powered assistance.',
          showRetry: true,
        };
      case 'no-workspace':
        return {
          icon: FolderOpen,
          iconClassName: 'text-amber-500 dark:text-amber-400',
          title: 'Open a Workspace',
          description: 'Open a folder or workspace in VS Code to start using Copilot integration.',
          showRetry: true,
        };
      case 'busy':
        return {
          icon: Loader2,
          iconClassName: 'animate-spin text-amber-500 dark:text-amber-400',
          title: 'Copilot is Busy',
          description: 'VS Code Copilot is processing another request. Please wait a moment.',
          showRetry: true,
        };
      default:
        return {
          icon: VSCodeIcon,
          iconClassName: 'text-gray-400 dark:text-gray-500',
          title: 'Setup Required',
          description: 'Configure VS Code integration to get started.',
          showRetry: true,
        };
    }
  };

  const content = getStatusContent();
  const IconComponent = content.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Icon */}
        <div className="mb-4">
          {IconComponent === VSCodeIcon ? (
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <VSCodeIcon size={32} className={content.iconClassName} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconComponent className={cn('w-8 h-8', content.iconClassName)} />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
          {content.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-[280px] mb-6">
          {content.description}
        </p>

        {/* Action Buttons */}
        {content.showRetry && (
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
                "text-white shadow-sm hover:shadow-md active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Connection</span>
                </>
              )}
            </button>
            <button
              onClick={onOpenSettings}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              )}
            >
              <Settings className="w-4 h-4" />
              <span>Open Settings</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Section - Features Info */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
          What you can do
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Zap, label: 'Quick fixes' },
            { icon: HelpCircle, label: 'Get explanations' },
            { icon: Terminal, label: 'Debug step-by-step' },
            { icon: Lightbulb, label: 'Improve code' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <feature.icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SetupView.displayName = 'SetupView';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EmbeddedCopilotChat = memo(({
  context,
  onSuccess,
  onFallback,
  className,
}: EmbeddedCopilotChatProps) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [workspaceName, setWorkspaceName] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const { addAction, updateAction } = useCodeActionsStore();

  // Check connection status
  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking');
    
    try {
      const { connected, workspaceReady, chatBusy, health } = await webhookCopilot.checkWorkspaceReady();
      
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
      setConnectionStatus('disconnected');
    }
  }, []);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [checkConnection]);

  // Handle retry connection
  const handleRetryConnection = useCallback(async () => {
    setIsRetrying(true);
    await checkConnection();
    setIsRetrying(false);
  }, [checkConnection]);

  // Handle open settings
  const handleOpenSettings = useCallback(() => {
    // Dispatch custom event to open settings panel
    window.dispatchEvent(new CustomEvent('devconsole:openSettings', { 
      detail: { section: 'copilot' } 
    }));
  }, []);

  // Build the full prompt with context
  const buildFullPrompt = useCallback((userMessage: string): string => {
    const parts: string[] = [];
    
    parts.push(`## Request\n${userMessage.trim()}`);
    
    if (context.fullContext) {
      const contextType = context.type === 'log' ? 'Console Log' 
        : context.type === 'note' ? 'Note' 
        : context.type === 'code' ? 'Code Snippet'
        : 'Context';
      
      const level = context.metadata?.level;
      const levelLabel = level ? ` (${level.toUpperCase()})` : '';
      
      parts.push(`## ${contextType}${levelLabel}\n\`\`\`\n${context.fullContext}\n\`\`\``);
    }
    
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

  // Image handling
  const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_IMAGES = 4;

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
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
      if (attachedImages.length + newImages.length >= MAX_IMAGES) {
        errors.push(`Maximum ${MAX_IMAGES} images allowed`);
        break;
      }

      if (!SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
        errors.push(`${file.name}: Unsupported format`);
        continue;
      }

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
      } catch {
        errors.push(`${file.name}: Failed to process`);
      }
    }

    if (newImages.length > 0) {
      setAttachedImages(prev => [...prev, ...newImages]);
    }

    if (errors.length > 0) {
      setNotification({ type: 'error', message: errors[0] });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachedImages.length, fileToBase64]);

  const removeImage = useCallback((imageId: string) => {
    setAttachedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  const handleCaptureScreenshot = useCallback(async () => {
    if (attachedImages.length >= MAX_IMAGES) {
      setNotification({ type: 'error', message: `Maximum ${MAX_IMAGES} images allowed` });
      return;
    }

    setIsCapturingScreenshot(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.windowId) {
        setNotification({ type: 'error', message: 'Unable to capture screenshot' });
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
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
      setNotification({ type: 'success', message: '📸 Screenshot captured!' });
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setNotification({ type: 'error', message: 'Failed to capture screenshot' });
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
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(f => dataTransfer.items.add(f));
      handleImageSelect(dataTransfer.files);
    }
  }, [handleImageSelect]);

  // Send to Copilot
  const handleSend = useCallback(async (promptOverride?: string) => {
    if (sendingRef.current || isSending) return;
    
    const userMessage = promptOverride || userPrompt.trim();
    if (!userMessage) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    setNotification(null);

    const fullPrompt = buildFullPrompt(userMessage);

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
      if (connectionStatus === 'disconnected' || connectionStatus === 'no-workspace') {
        const copied = await copyToClipboard(fullPrompt);
        
        updateAction(actionId, {
          status: 'copied_fallback',
          error: connectionStatus === 'disconnected' ? 'VS Code not connected' : 'No workspace open',
          completedAt: Date.now(),
        });

        if (copied) {
          setNotification({ type: 'info', message: '📋 Copied! Paste in Copilot when ready.' });
          onFallback?.(fullPrompt);
          setTimeout(() => setUserPrompt(''), 2000);
        } else {
          setNotification({ type: 'error', message: 'Failed to copy to clipboard' });
        }
        setIsSending(false);
        sendingRef.current = false;
        return;
      }

      if (connectionStatus === 'busy') {
        setNotification({ type: 'info', message: '⏳ Copilot is busy. Waiting...' });
        
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
          const copied = await copyToClipboard(fullPrompt);
          
          updateAction(actionId, {
            status: 'copied_fallback',
            error: 'Copilot busy timeout',
            completedAt: Date.now(),
          });
          
          setNotification({
            type: 'info',
            message: copied ? '📋 Copilot still busy. Copied to clipboard!' : 'Copilot is busy. Try again later.',
          });
          
          if (copied) onFallback?.(fullPrompt);
          setIsSending(false);
          sendingRef.current = false;
          return;
        }
      }

      const images: ImageAttachment[] = attachedImages.map(img => ({
        data: img.base64,
        mimeType: img.mimeType,
        description: img.file.name,
      }));

      const contextPayload: Record<string, unknown> = { type: context.type };
      
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
        const copied = await copyToClipboard(fullPrompt);
        
        updateAction(actionId, {
          status: copied ? 'copied_fallback' : 'failed',
          error: response.message || response.error,
          completedAt: Date.now(),
        });

        if (copied) {
          setNotification({ type: 'info', message: `📋 ${response.message || 'Error'}. Copied.` });
          onFallback?.(fullPrompt);
        } else {
          setNotification({ type: 'error', message: response.message || 'Failed to send' });
        }
      } else {
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
            : '✓ Sent! Check VS Code for response',
        });
        
        onSuccess?.(response.requestId || '');
        setTimeout(() => setUserPrompt(''), 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const copied = await copyToClipboard(fullPrompt);
      
      updateAction(actionId, {
        status: copied ? 'copied_fallback' : 'failed',
        error: errorMessage,
        completedAt: Date.now(),
      });

      if (copied) {
        setNotification({ type: 'info', message: `📋 ${errorMessage}. Copied.` });
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
    attachedImages,
    addAction,
    updateAction,
    copyToClipboard,
    onSuccess,
    onFallback,
  ]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    setUserPrompt(action.prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Clear notification after delay
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [userPrompt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show setup view when not connected or still checking
  const isReady = connectionStatus === 'connected';

  if (!isReady) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <SetupView
          status={connectionStatus}
          onRetry={handleRetryConnection}
          onOpenSettings={handleOpenSettings}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Top Section: Scrollable Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* Context Section - with clear section header */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Context
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className={cn(
            'rounded-lg border-l-[3px] px-3 py-2.5',
            context.metadata?.level === 'error' && 'border-l-red-500 bg-red-50 dark:bg-red-500/10',
            context.metadata?.level === 'warn' && 'border-l-amber-500 bg-amber-50 dark:bg-amber-500/10',
            context.metadata?.level === 'info' && 'border-l-blue-500 bg-blue-50 dark:bg-blue-500/10',
            (!context.metadata?.level || context.metadata?.level === 'log') && 'border-l-gray-400 bg-gray-50 dark:bg-gray-800/50',
          )}>
            <div className="flex items-center gap-2 mb-1">
              {/* Level badge */}
              {context.metadata?.level && (
                <span className={cn(
                  'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                  context.metadata.level === 'error' && 'bg-red-200 dark:bg-red-500/30 text-red-700 dark:text-red-300',
                  context.metadata.level === 'warn' && 'bg-amber-200 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300',
                  context.metadata.level === 'info' && 'bg-blue-200 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300',
                  context.metadata.level === 'log' && 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
                )}>
                  {context.metadata.level}
                </span>
              )}
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate flex-1">
                {context.title}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono line-clamp-2 break-all">
              {context.preview}
            </p>
            {/* Source info if available */}
            {context.metadata?.file && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 truncate">
                📍 {context.metadata.file}{context.metadata.line ? `:${context.metadata.line}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions - with section header */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Quick Actions
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              const isSelected = userPrompt === action.prompt;
              // First action (Fix) is primary if context is an error
              const isPrimary = action.id === 'fix' && context.metadata?.level === 'error';
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  disabled={isSending}
                  title={action.prompt}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                    'transition-all duration-150 active:scale-95',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/50 shadow-sm'
                      : isPrimary
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification - shown in content area */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn(
                'mx-4 mt-4 px-3 py-2 rounded-lg text-xs font-medium',
                notification.type === 'success' && 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
                notification.type === 'error' && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30',
                notification.type === 'info' && 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'
              )}
            >
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section: Sticky Input Area */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Connection Status Bar */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <ConnectionIndicator status={connectionStatus} workspaceName={workspaceName} />
            {connectionStatus === 'connected' && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Image Attachments */}
        {attachedImages.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
            {attachedImages.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
              >
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className="w-12 h-12 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className={cn(
                    'absolute -top-1 -right-1 p-0.5 rounded-full',
                    'bg-gray-900/80 border border-gray-600',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'hover:bg-red-500'
                  )}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="p-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            onChange={(e) => handleImageSelect(e.target.files)}
            className="hidden"
          />

          {/* Textarea with actions */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="What would you like Copilot to help with?"
              disabled={isSending}
              rows={2}
              className={cn(
                'w-full px-3 py-2.5 pb-10 rounded-xl resize-none',
                'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40',
                'transition-all duration-150 disabled:opacity-50'
              )}
            />

            {/* Action buttons row - positioned at bottom of textarea */}
            <div className="absolute left-2 right-2 bottom-2 flex items-center justify-between">
              {/* Left side: Attachment actions */}
              <div className="flex items-center gap-0.5">
                {/* Screenshot */}
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  disabled={isSending || isCapturingScreenshot || attachedImages.length >= 4}
                  title="Capture screenshot"
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400',
                    isCapturingScreenshot && 'animate-pulse'
                  )}
                >
                  {isCapturingScreenshot ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                
                {/* Image Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || attachedImages.length >= 4}
                  title="Upload image"
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Keyboard hint */}
                <span className="ml-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                  <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono text-[9px]">⌘↵</kbd>
                </span>
              </div>

              {/* Right side: Send button */}
              <button
                type="submit"
                onClick={() => handleSend()}
                disabled={isSending || !userPrompt.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  userPrompt.trim()
                    ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                )}
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </div>
          </div>

          {/* Footer hint for offline mode */}
          {connectionStatus !== 'connected' && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-500 dark:text-amber-400">
              <Clipboard className="w-3 h-3" />
              <span>Will copy to clipboard when VS Code is unavailable</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

EmbeddedCopilotChat.displayName = 'EmbeddedCopilotChat';
