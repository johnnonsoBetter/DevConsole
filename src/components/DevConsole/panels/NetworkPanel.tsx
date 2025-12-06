/**
 * NetworkPanel Component
 * Displays captured network requests with filtering and details panel
 */

import ReactJson from '@microlink/react-json-view';
import { Check, ChevronDown, ClipboardCopy, Code2, Download, FileText, Github, Search, Sparkles, Trash2, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { useRaindropSettings } from '../../../hooks/useRaindropSettings';
import { useUnifiedTheme } from '../../../hooks/useTheme';
import { RaindropIcon, VSCodeIcon } from '../../../icons';
import { createLogExplainer } from '../../../lib/ai/services/logExplainer';
import { createMemoryEnhancedLogExplainer } from '../../../lib/ai/services/memoryEnhancedLogExplainer';
import {
    copyNetworkContext,
    downloadNetworkContext,
    generateNetworkContext,
    getNetworkFormatOptions,
    type ContextFormat,
    type NetworkData,
} from '../../../lib/devConsole/networkContextGenerator';
import { cn } from '../../../utils';
import { formatDuration } from '../../../utils/formatUtils';
import { ensureJsonObject } from '../../../utils/jsonSanitizer';
import { useGitHubIssueSlideoutStore } from '../../../utils/stores';
import { useAISettingsStore } from '../../../utils/stores/aiSettings';
import { useDevConsoleStore } from '../../../utils/stores/devConsole';
import { humanizeTime } from '../../../utils/timeUtils';
import { DurationChip, GraphQLChip, MethodChip, StatusChip } from '../Chips';
import { EmbeddedCopilotChat, type EmbeddedCopilotContext } from '../EmbeddedCopilotChat';
import { EmptyStateHelper } from '../EmptyStateHelper';
import { GitHubIssueSlideout } from '../GitHubIssueSlideout';
import type { LogExplanationData } from '../LogExplanation';
import { LogExplanation } from '../LogExplanation';
import { MobileDetailsSlideout, MobileDetailsSlideoutContent } from '../MobileDetailsSlideout';

// ============================================================================
// NOTIFICATION TOAST COMPONENT
// ============================================================================

interface NotificationToastProps {
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  if (!notification) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300',
        'backdrop-blur-sm border max-w-sm',
        notification.type === 'success' && 'bg-green-50/95 dark:bg-green-900/95 border-green-300 dark:border-green-700',
        notification.type === 'error' && 'bg-red-50/95 dark:bg-red-900/95 border-red-300 dark:border-red-700',
        notification.type === 'info' && 'bg-blue-50/95 dark:bg-blue-900/95 border-blue-300 dark:border-blue-700'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className={cn(
            'text-sm font-medium',
            notification.type === 'success' && 'text-green-800 dark:text-green-100',
            notification.type === 'error' && 'text-red-800 dark:text-red-100',
            notification.type === 'info' && 'text-blue-800 dark:text-blue-100'
          )}>
            {notification.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={cn(
            'p-0.5 rounded hover:bg-black/10 transition-colors',
            notification.type === 'success' && 'text-green-600 dark:text-green-300',
            notification.type === 'error' && 'text-red-600 dark:text-red-300',
            notification.type === 'info' && 'text-blue-600 dark:text-blue-300'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

// ============================================================================
// NETWORK CONTEXT DROPDOWN COMPONENT
// ============================================================================

interface NetworkContextDropdownProps {
  request: any;
}

/**
 * Dropdown button for exporting network context in various formats
 */
function NetworkContextDropdown({ request }: NetworkContextDropdownProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  const formatOptions = getNetworkFormatOptions();

  const networkData: NetworkData = useMemo(() => ({
    method: request.method,
    url: request.url,
    status: request.status,
    duration: request.duration,
    timestamp: request.timestamp,
    requestHeaders: request.requestHeaders,
    requestBody: request.requestBody,
    responseHeaders: request.responseHeaders,
    responseBody: request.responseBody,
    error: request.error,
    type: request.type,
    graphql: request.graphql,
  }), [request]);

  const handleCopy = useCallback(async (format: ContextFormat) => {
    const success = await copyNetworkContext(networkData, format);
    if (success) {
      setCopySuccess(format);
      setTimeout(() => setCopySuccess(null), 2000);
    }
    setMenuOpen(false);
  }, [networkData]);

  const handleDownload = useCallback((format: ContextFormat) => {
    downloadNetworkContext(networkData, format);
    setMenuOpen(false);
  }, [networkData]);

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground"
        title="Export context"
      >
        <Code2 className="w-3.5 h-3.5" />
        <span>Context</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', menuOpen && 'rotate-180')} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 z-20 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1">
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Copy</div>
            {formatOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCopy(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ClipboardCopy className="w-3 h-3 text-gray-400" />
                <span className="flex-1 text-gray-700 dark:text-gray-300">{opt.label}</span>
                {copySuccess === opt.value && <Check className="w-3 h-3 text-green-500" />}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Download</div>
            {formatOptions.slice(0, 4).map((opt) => (
              <button
                key={`dl-${opt.value}`}
                onClick={() => handleDownload(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Download className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Lazy ReactJson wrapper - only renders when expanded
 * Safely handles any data type and prevents errors from invalid JSON
 */
const LazyReactJson = memo(({ data, isDarkMode, name }: { data: any; isDarkMode: boolean; name: string }) => {
  const safeData = useMemo(() => ensureJsonObject(data), [data]);

  return (
    <ReactJson
      src={safeData}
      theme={isDarkMode ? 'monokai' : 'rjv-default'}
      style={{
        fontSize: '12px',
        fontFamily: 'monospace',
        backgroundColor: 'transparent',
      }}
      collapsed={1}
      displayDataTypes={false}
      displayObjectSize={true}
      enableClipboard={true}
      name={name}
    />
  );
});

LazyReactJson.displayName = 'LazyReactJson';

interface NetworkRowProps {
  request: any;
  isSelected: boolean;
  onSelect: (request: any) => void;
  style: React.CSSProperties;
}

/**
 * Memoized NetworkRow component for virtualization
 */
const NetworkRow = memo(({ request: req, isSelected, onSelect, style }: NetworkRowProps) => {
  // Format request name like Chrome DevTools
  const requestName = useMemo(() => {
    try {
      const urlObj = new URL(req.url, window.location.origin);
      const pathname = urlObj.pathname;
      const search = urlObj.search;
      
      // Special case for GraphQL
      if (req.type === 'graphql' || pathname.includes('/graphql')) {
        const operationName = (req as any).graphql?.operationName;
        return operationName || 'graphql';
      }
      
      // Extract the last segment of the path
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1] || '';
      
      // Check if it's a file (has extension)
      const isFile = /\.[a-zA-Z0-9]+$/.test(lastSegment);
      
      // If it's a file, show the filename
      if (isFile) {
        return lastSegment;
      }
      
      // For API endpoints, show the last meaningful segment
      if (lastSegment) {
        // If there are query params and they're short, show them
        if (search && search.length < 30) {
          return lastSegment + search;
        }
        return lastSegment;
      }
      
      // Fallback to full pathname
      return pathname || '/';
    } catch {
      return req.url;
    }
  }, [req.url, req.type]);

  // Check if request has error (status is truly missing with error, not just undefined)
  const hasError = !!req.error;
  // Check if request is pending (no status and no error - still in flight)
  const isPending = !req.status && req.status !== 0 && !req.error;

  return (
    <div
      style={style}
      onClick={() => onSelect(req)}
      className={cn(
        'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 grid grid-cols-[80px_100px_1fr] sm:grid-cols-[96px_120px_1fr] items-center',
        isSelected && 'bg-primary/5',
        hasError && 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
      )}
    >
      {/* Method */}
      <div className="px-3 sm:px-4 py-3">
        <MethodChip method={req.method} />
      </div>

      {/* Status */}
      <div className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <StatusChip status={req.status ?? null} hasError={hasError} isPending={isPending} />
          {req.type === 'graphql' && (
            <GraphQLChip operation={(req as any).graphql?.operation || 'query'} />
          )}
        </div>
      </div>

      {/* URL */}
      <div className="px-3 sm:px-4 py-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs font-medium">
            {requestName}
          </div>
          {isPending && (
            <span className="text-xs text-blue-500 dark:text-blue-400 animate-pulse" title="Request in progress">
              ⋯
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 mt-0.5">
          {hasError && req.error && (
            <span className="text-xs text-red-600 dark:text-red-400 truncate font-medium">
              ✕ {req.error}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span title={new Date(req.timestamp).toLocaleString()}>
              {humanizeTime(req.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

NetworkRow.displayName = 'NetworkRow';

/**
 * NetworkRequestDetails Component
 */
interface NetworkRequestDetailsProps {
  request: any;
  explanation?: LogExplanationData;
  isExplaining?: boolean;
  explainError?: string;
  streamingText?: string;
}

function NetworkRequestDetails({ 
  request, 
  explanation,
  isExplaining = false,
  explainError,
  streamingText = ''
}: NetworkRequestDetailsProps) {
  const { isDarkMode } = useUnifiedTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    queryParams: false,
    requestHeaders: false,
    requestBody: false,
    responseHeaders: false,
    responseBody: false,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Extract useful data
  const contentType = useMemo(() => {
    return request.responseHeaders?.['content-type'] || 
           request.responseHeaders?.['Content-Type'] || 
           'unknown';
  }, [request.responseHeaders]);

  // Parse query parameters from URL
  const queryParams = useMemo(() => {
    try {
      const url = new URL(request.url, window.location.origin);
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return Object.keys(params).length > 0 ? params : null;
    } catch {
      return null;
    }
  }, [request.url]);

  // Check if request has error
  const hasError = !!request.error;
  // Check if request is pending
  const isPending = !request.status && request.status !== 0 && !request.error;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Error Banner - Show prominently at top */}
      {hasError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="text-red-600 dark:text-red-400 text-lg">✕</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                Request Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                {request.error || 'Network request failed without status code'}
              </p>
              {request.duration !== undefined && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Failed after {formatDuration(request.duration)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Explanation Section */}
      {(explanation || isExplaining || explainError || streamingText) && (
        <LogExplanation
          explanation={explanation}
          isLoading={isExplaining}
          error={explainError}
          streamingText={streamingText}
        />
      )}
      
      {/* ============ ESSENTIAL INFO (Always Visible) ============ */}
      
      {/* Request Overview */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
          <span>🌐</span> Request Overview
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          {/* URL */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">URL</span>
            <div className="bg-white dark:bg-gray-900 rounded px-2 py-1.5 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all">
                {request.url}
              </p>
            </div>
          </div>

          {/* Method & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Method</span>
              <MethodChip method={request.method} />
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</span>
              <StatusChip status={request.status ?? null} hasError={hasError} isPending={isPending} />
            </div>
          </div>

          {/* Content-Type */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Content-Type</span>
            <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
              {contentType}
            </span>
          </div>

          {/* Duration */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Duration</span>
            <DurationChip duration={request.duration || 0} threshold={500} />
          </div>

          {/* Timestamp */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Timestamp</span>
            <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
              {new Date(request.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ============ OPTIONAL/EXPANDABLE SECTIONS ============ */}

      {/* Query Parameters */}
      {queryParams && (
        <div>
          <button
            onClick={() => toggleSection('queryParams')}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>🔍</span> Query Parameters ({Object.keys(queryParams).length})
            </span>
            <span className="text-xs">{expandedSections.queryParams ? '▼' : '▶'}</span>
          </button>
          {expandedSections.queryParams && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                {Object.entries(queryParams).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="font-mono text-primary font-semibold">{key}:</span>
                    <span className="font-mono text-gray-900 dark:text-gray-100 break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Headers */}
      {request.requestHeaders && Object.keys(request.requestHeaders).length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('requestHeaders')}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📨</span> Request Headers ({Object.keys(request.requestHeaders).length})
            </span>
            <span className="text-xs">{expandedSections.requestHeaders ? '▼' : '▶'}</span>
          </button>
          {expandedSections.requestHeaders && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <LazyReactJson data={request.requestHeaders} isDarkMode={isDarkMode} name="requestHeaders" />
            </div>
          )}
        </div>
      )}

      {/* Request Body */}
      {request.requestBody && (
        <div>
          <button
            onClick={() => toggleSection('requestBody')}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📦</span> Request Body
            </span>
            <span className="text-xs">{expandedSections.requestBody ? '▼' : '▶'}</span>
          </button>
          {expandedSections.requestBody && (
            <div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <LazyReactJson data={request.requestBody} isDarkMode={isDarkMode} name="body" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Response Headers */}
      {request.responseHeaders && Object.keys(request.responseHeaders).length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('responseHeaders')}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📋</span> Response Headers ({Object.keys(request.responseHeaders).length})
            </span>
            <span className="text-xs">{expandedSections.responseHeaders ? '▼' : '▶'}</span>
          </button>
          {expandedSections.responseHeaders && (
            <div>
              {/* Show key headers by default */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2 mb-2">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Headers</h5>
                {(['content-type', 'Content-Type', 'content-length', 'Content-Length', 'cache-control', 'Cache-Control', 'server', 'Server']).map((key) => {
                  const value = request.responseHeaders[key];
                  if (!value) return null;
                  return (
                    <div key={key} className="flex items-start gap-2 text-xs">
                      <span className="font-mono text-primary font-semibold min-w-[120px]">{key}:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100 break-all">{value}</span>
                    </div>
                  );
                })}
              </div>
              <details className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <summary className="px-3 py-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Show All Headers
                </summary>
                <div className="p-3 pt-0">
                  <LazyReactJson data={request.responseHeaders} isDarkMode={isDarkMode} name="headers" />
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Response Body */}
      {request.responseBody ? (
        <div>
          <button
            onClick={() => toggleSection('responseBody')}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📤</span> Response Body
            </span>
            <span className="text-xs">{expandedSections.responseBody ? '▼' : '▶'}</span>
          </button>
          {expandedSections.responseBody && (
            <div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto">
                <LazyReactJson data={request.responseBody} isDarkMode={isDarkMode} name="response" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
            <span>📤</span> Response Body
          </h4>
          <div className="flex items-center justify-center h-24 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No response data available
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {request.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
            <span>❌</span> Error
          </h4>
          <p className="text-sm font-mono text-red-900 dark:text-red-100">
            {request.error}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * NetworkPanel Component
 * Displays captured network requests with filtering and details panel
 */
export function NetworkPanel() {
  const {networkRequests, clearNetwork} = useDevConsoleStore();
  const aiSettings = useAISettingsStore();
  const { settings: raindropSettings, isConfigured: isRaindropConfigured } = useRaindropSettings();
  const githubSlideoutStore = useGitHubIssueSlideoutStore();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isMobile = useIsMobile();

  // AI Explanation state
  const [explanation, setExplanation] = useState<LogExplanationData | undefined>();
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | undefined>();
  const [streamingText, setStreamingText] = useState<string>('');

  // Webhook Copilot state
  const [copilotNotification, setCopilotNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isCopilotChatOpen, setIsCopilotChatOpen] = useState(false);

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (copilotNotification) {
      const timer = setTimeout(() => setCopilotNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [copilotNotification]);

  // Clear Copilot chat and notification when switching requests
  useEffect(() => {
    setCopilotNotification(null);
    setIsCopilotChatOpen(false);
  }, [selectedRequest?.id]);

  // Check if AI is ready to use
  const isAIReady = useMemo(() => {
    return !!(
      aiSettings.enabled &&
      ((aiSettings.useGateway && aiSettings.gatewayApiKey) ||
        (!aiSettings.useGateway && aiSettings.apiKey))
    );
  }, [aiSettings]);

  // Paginated requests with search filtering
  const paginatedRequests = useMemo(() => {
    let filtered = networkRequests;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.url.toLowerCase().includes(query) ||
        req.method.toLowerCase().includes(query) ||
        (req.status && String(req.status).includes(query))
      );
    }
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    
    return {
      items: filtered.slice(start, end),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE)
    };
  }, [networkRequests, searchQuery, currentPage, ITEMS_PER_PAGE]);

  // Handle explain network request - uses memory-enhanced explainer when Raindrop is configured
  const handleExplainRequest = useCallback(async () => {
    if (!selectedRequest) return;

    // Check if AI is configured
    if (!isAIReady) {
      console.log('[AI Network] AI not ready:', { enabled: aiSettings.enabled, useGateway: aiSettings.useGateway, hasGatewayKey: !!aiSettings.gatewayApiKey, hasApiKey: !!aiSettings.apiKey });
      setExplainError(
        '⚙️ AI features require configuration. Please enable AI and add your API key in Settings → AI to use this feature.'
      );
      return;
    }

    console.log('[AI Network] Starting explanation for request:', selectedRequest.url);
    setIsExplaining(true);
    setExplainError(undefined);
    setStreamingText('');
    setExplanation(undefined);

    try {
      // Format network request as a log entry for explanation
      const requestLog = {
        level: selectedRequest.status >= 400 ? 'error' : selectedRequest.status >= 300 ? 'warn' : 'info',
        message: `${selectedRequest.method} ${selectedRequest.url} - Status: ${selectedRequest.status || 'Pending'}`,
        args: [
          {
            method: selectedRequest.method,
            url: selectedRequest.url,
            status: selectedRequest.status,
            duration: selectedRequest.duration,
            requestBody: selectedRequest.requestBody,
            responseBody: selectedRequest.responseBody,
            responseHeaders: selectedRequest.responseHeaders,
            error: selectedRequest.error,
          }
        ],
        timestamp: selectedRequest.timestamp,
      };
      
      console.log('[AI Network] Request log formatted:', requestLog);
      
      let fullText = '';
      let chunkCount = 0;

      // Use memory-enhanced explainer if Raindrop is configured
      if (isRaindropConfigured) {
        const memoryExplainer = createMemoryEnhancedLogExplainer(aiSettings, raindropSettings);
        
        // Stream with memory context
        for await (const chunk of memoryExplainer.streamExplanation(requestLog)) {
          chunkCount++;
          fullText += chunk;
          setStreamingText(fullText);
        }
      } else {
        // Use standard explainer
        const explainer = createLogExplainer(aiSettings);
        
        for await (const chunk of explainer.streamExplanation(requestLog)) {
          chunkCount++;
          fullText += chunk;
          setStreamingText(fullText);
          console.log('[AI Network] Received chunk', chunkCount, '- total length:', fullText.length);
        }
      }

      console.log('[AI Network] Streaming complete. Total text:', fullText.substring(0, 100) + '...');
      
      // Parse the complete explanation
      setExplanation({
        summary: fullText.split('\n')[0] || 'AI analysis complete',
        explanation: fullText,
      });
      setStreamingText('');
      console.log('[AI Network] Explanation set successfully');
    } catch (error) {
      console.error('[AI Network] Failed to explain request:', error);
      setExplainError(
        error instanceof Error ? error.message : 'Failed to generate explanation'
      );
    } finally {
      console.log('[AI Network] Cleaning up - setting isExplaining to false');
      setIsExplaining(false);
    }
  }, [isAIReady, aiSettings, selectedRequest, isRaindropConfigured, raindropSettings]);

  // Clear explanation when request changes
  useEffect(() => {
    setExplanation(undefined);
    setExplainError(undefined);
    setStreamingText('');
    setIsExplaining(false);
  }, [selectedRequest?.id]);

  /**
   * Build the Copilot context object for the chat input
   */
  const buildCopilotContext = useCallback((): EmbeddedCopilotContext | null => {
    if (!selectedRequest) return null;

    const networkData: NetworkData = {
      method: selectedRequest.method,
      url: selectedRequest.url,
      status: selectedRequest.status,
      duration: selectedRequest.duration,
      timestamp: selectedRequest.timestamp,
      requestHeaders: selectedRequest.requestHeaders,
      requestBody: selectedRequest.requestBody,
      responseHeaders: selectedRequest.responseHeaders,
      responseBody: selectedRequest.responseBody,
      error: selectedRequest.error,
      type: selectedRequest.type,
      graphql: selectedRequest.graphql,
    };

    // Generate context for the chat
    const { content: fullContext } = generateNetworkContext(networkData, 'copilot');

    // Build preview
    let preview = `${selectedRequest.method} ${selectedRequest.url}`;
    if (selectedRequest.status) {
      preview += ` → ${selectedRequest.status}`;
    }
    if (selectedRequest.error) {
      preview += `\nError: ${selectedRequest.error}`;
    }
    if (preview.length > 200) {
      preview = preview.slice(0, 200) + '...';
    }

    // Build title
    const statusLabel = selectedRequest.status 
      ? `${selectedRequest.status >= 400 ? '❌' : selectedRequest.status >= 300 ? '⚠️' : '✅'} ${selectedRequest.status}` 
      : '⏳ Pending';
    const title = `${selectedRequest.method} Request ${statusLabel}`;

    return {
      type: 'code',
      title,
      preview,
      fullContext: explanation?.summary 
        ? fullContext + '\n\n---\n\n**AI Analysis:**\n' + explanation.summary 
        : fullContext,
      metadata: {
        level: selectedRequest.status >= 400 ? 'error' : selectedRequest.status >= 300 ? 'warn' : 'info',
        file: new URL(selectedRequest.url, window.location.origin).pathname,
        timestamp: selectedRequest.timestamp,
        source: selectedRequest.url,
      },
    };
  }, [selectedRequest, explanation]);

  /**
   * Handle converting network request to GitHub issue
   * Builds proper title and body for the issue slideout
   */
  const handleConvertToIssue = useCallback(() => {
    if (!selectedRequest) return;

    // Build title from request
    const statusEmoji = selectedRequest.status >= 400 ? '❌' : selectedRequest.status >= 300 ? '⚠️' : '✅';
    const statusText = selectedRequest.status || 'Pending';
    const urlPath = new URL(selectedRequest.url, window.location.origin).pathname;
    const title = `[Network ${statusText}] ${selectedRequest.method} ${urlPath}`;

    // Build body from request details
    const bodyParts: string[] = [
      '## Request Details',
      '',
      `**Method:** ${selectedRequest.method}`,
      `**URL:** ${selectedRequest.url}`,
      `**Status:** ${statusEmoji} ${statusText}`,
    ];

    if (selectedRequest.duration) {
      bodyParts.push(`**Duration:** ${formatDuration(selectedRequest.duration)}`);
    }

    bodyParts.push('');

    // Add error info if present
    if (selectedRequest.error) {
      bodyParts.push('## Error', '', '```', selectedRequest.error, '```', '');
    }

    // Add request headers if present
    if (selectedRequest.requestHeaders && Object.keys(selectedRequest.requestHeaders).length > 0) {
      bodyParts.push('## Request Headers', '', '```json', JSON.stringify(selectedRequest.requestHeaders, null, 2), '```', '');
    }

    // Add request body if present
    if (selectedRequest.requestBody) {
      bodyParts.push('## Request Body', '', '```json', typeof selectedRequest.requestBody === 'string' ? selectedRequest.requestBody : JSON.stringify(selectedRequest.requestBody, null, 2), '```', '');
    }

    // Add response info
    if (selectedRequest.responseBody) {
      const responsePreview = typeof selectedRequest.responseBody === 'string' 
        ? selectedRequest.responseBody.slice(0, 1000) 
        : JSON.stringify(selectedRequest.responseBody, null, 2).slice(0, 1000);
      bodyParts.push('## Response Body (Preview)', '', '```json', responsePreview, responsePreview.length >= 1000 ? '\n... (truncated)' : '', '```', '');
    }

    // Add environment info
    bodyParts.push(
      '## Environment',
      '',
      `- **Timestamp:** ${new Date(selectedRequest.timestamp).toISOString()}`,
      `- **Type:** ${selectedRequest.type || 'fetch'}`
    );

    if (selectedRequest.graphql) {
      bodyParts.push(`- **GraphQL Operation:** ${selectedRequest.graphql.operationName || 'Unknown'}`);
    }

    const body = bodyParts.join('\n');

    // Open the slideout with custom content (passing null for log)
    githubSlideoutStore.open(null, { title, body });
  }, [selectedRequest, githubSlideoutStore]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Keyboard shortcuts for pagination
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPage(p => Math.max(1, p - 1));
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage(p => Math.min(paginatedRequests.totalPages, p + 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [paginatedRequests.totalPages]);

  /**
   * Handle horizontal resize of detail panel
   */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = detailPanelWidth;
    },
    [detailPanelWidth]
  );

  // Handle resize mouse move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const deltaX = resizeStartX.current - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;

      // Constrain between 30% and 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setDetailPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Request Table */}
      <div
        className={cn(
          'flex flex-col',
          !isMobile && selectedRequest && 'border-r border-gray-200 dark:border-gray-800'
        )}
        style={{ width: !isMobile && selectedRequest ? `${100 - detailPanelWidth}%` : '100%' }}
      >
        {/* Header with Search */}
        <div className="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Network Requests
              </h3>
              <p className="text-xs text-muted-foreground">
                {networkRequests.length} request{networkRequests.length !== 1 ? 's' : ''} captured
              </p>
            </div>
            <button
              onClick={clearNetwork}
              className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95 min-h-[36px] min-w-[36px]"
              title="Clear Network History"
            >
              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-destructive dark:hover:text-destructive transition-colors" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by URL, method, or status..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-apple-xs"
              aria-label="Search network requests"
            />
          </div>
        </div>

        {/* Table - Simple list (no virtualization for 10 items) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {networkRequests.length === 0 ? (
            <EmptyStateHelper type="network" />
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-[80px_100px_1fr] sm:grid-cols-[96px_120px_1fr] text-left text-sm">
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Method
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    URL
                  </div>
                </div>
              </div>

              {/* Paginated List */}
              <div className="flex-1 overflow-auto">
                {paginatedRequests.items.map((request) => (
                  <NetworkRow
                    key={request.id}
                    request={request}
                    isSelected={selectedRequest?.id === request.id}
                    onSelect={setSelectedRequest}
                    style={{}}
                  />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {paginatedRequests.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, paginatedRequests.total)} of {paginatedRequests.total}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-apple-sm active:scale-95"
                        title="Previous page (Ctrl+←)"
                      >
                        ← Previous
                      </button>
                      <span className="text-gray-700 dark:text-gray-300 font-medium px-2">
                        Page {currentPage} of {paginatedRequests.totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(paginatedRequests.totalPages, p + 1))}
                        disabled={currentPage === paginatedRequests.totalPages}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-apple-sm active:scale-95"
                        title="Next page (Ctrl+→)"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Request Details - Responsive: Bottom Sheet on Mobile, Side Panel on Desktop */}
      {selectedRequest && (
        <>
          {isMobile ? (
            /* Mobile: Slideout Overlay with Embedded Chat */
            <MobileDetailsSlideout
              isOpen={!!selectedRequest}
              onClose={() => setSelectedRequest(null)}
              title="Request Details"
              subtitle={`${selectedRequest.method} • ${selectedRequest.status || 'Pending'}`}
              headerActions={<NetworkContextDropdown request={selectedRequest} />}
              chatContent={
                buildCopilotContext() && (
                  <EmbeddedCopilotChat
                    context={buildCopilotContext() as EmbeddedCopilotContext}
                    onSuccess={(requestId) => {
                      console.log('✅ Sent to Copilot:', requestId);
                      setCopilotNotification({
                        type: 'success',
                        message: '✓ Sent to VS Code! Check Copilot for results.',
                      });
                    }}
                    onFallback={(prompt) => {
                      console.log('📋 Copied to clipboard:', prompt.slice(0, 50) + '...');
                    }}
                  />
                )
              }
              bottomActions={
                <div className="flex items-center gap-3">
                  {/* Explain Request Button */}
                  {!explanation && !isExplaining && (
                    <button
                      onClick={handleExplainRequest}
                      disabled={isExplaining}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                        "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600",
                        "text-white shadow-sm hover:shadow-md active:scale-[0.98]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                      )}
                      title={isRaindropConfigured ? 'Explain with AI + SmartMemory' : 'Explain this request with AI'}
                    >
                      {isRaindropConfigured ? (
                        <RaindropIcon className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Explain Request</span>
                    </button>
                  )}
                  
                  {/* Convert to Issue Button */}
                  <button
                    onClick={handleConvertToIssue}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                      "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100",
                      "text-white dark:text-gray-900 shadow-sm hover:shadow-md active:scale-[0.98]"
                    )}
                    title="Create GitHub Issue from this request"
                  >
                    <Github className="w-4 h-4" />
                    <span>Convert to Issue</span>
                  </button>
                </div>
              }
            >
              <MobileDetailsSlideoutContent>
                <NetworkRequestDetails 
                  request={selectedRequest}
                  explanation={explanation}
                  isExplaining={isExplaining}
                  explainError={explainError}
                  streamingText={streamingText}
                />
              </MobileDetailsSlideoutContent>
            </MobileDetailsSlideout>
          ) : (
            /* Desktop: Resizable Side Panel */
            <>
              {/* Resize Handle */}
              <div
                className={cn(
                  'w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-all relative group bg-gray-200 dark:bg-gray-800',
                  isResizing && 'bg-primary/40'
                )}
                onMouseDown={handleResizeStart}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-16 rounded-full bg-gray-400 dark:bg-gray-600 group-hover:bg-primary dark:group-hover:bg-primary transition-colors shadow-sm" />
              </div>

              <div className="flex flex-col" style={{ width: `${detailPanelWidth}%` }}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Request Details
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <MethodChip method={selectedRequest.method} />
                        <StatusChip status={selectedRequest.status || null} />
                        {selectedRequest.duration && (
                          <DurationChip duration={selectedRequest.duration} threshold={500} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <NetworkContextDropdown request={selectedRequest} />
                      <button
                        onClick={() => setSelectedRequest(null)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Close Details"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* View Tabs */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                  <button
                    onClick={() => setIsCopilotChatOpen(false)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      !isCopilotChatOpen
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                  <button
                    onClick={() => setIsCopilotChatOpen(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      isCopilotChatOpen
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-700"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <VSCodeIcon size={14} className="flex-shrink-0" />
                    <span>Task VSCode</span>
                  </button>
                </div>

                {/* Content Area - Chat view needs flex column for sticky input */}
                <div className={cn(
                  "flex-1 min-h-0",
                  isCopilotChatOpen ? "flex flex-col" : "overflow-hidden"
                )}>
                  {!isCopilotChatOpen ? (
                    <NetworkRequestDetails 
                      request={selectedRequest}
                      explanation={explanation}
                      isExplaining={isExplaining}
                      explainError={explainError}
                      streamingText={streamingText}
                    />
                  ) : (
                    buildCopilotContext() && (
                      <EmbeddedCopilotChat
                        context={buildCopilotContext() as EmbeddedCopilotContext}
                        onSuccess={(requestId) => {
                          console.log('✅ Sent to Copilot:', requestId);
                          setCopilotNotification({
                            type: 'success',
                            message: '✓ Sent to VS Code! Check Copilot for results.',
                          });
                        }}
                        onFallback={(prompt) => {
                          console.log('📋 Copied to clipboard:', prompt.slice(0, 50) + '...');
                        }}
                        className="flex-1"
                      />
                    )
                  )}
                </div>

                {/* Sticky Bottom Action Bar - Only show on Details tab */}
                {!isCopilotChatOpen && (
                  <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Explain Request Button */}
                      {!explanation && !isExplaining && (
                        <button
                          onClick={handleExplainRequest}
                          disabled={isExplaining}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                            "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600",
                            "text-white shadow-sm hover:shadow-md active:scale-[0.98]",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                          )}
                          title={isRaindropConfigured ? 'Explain with AI + SmartMemory' : 'Explain this request with AI'}
                        >
                          {isRaindropConfigured ? (
                            <RaindropIcon className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>Explain Request</span>
                        </button>
                      )}
                      
                      {/* Convert to Issue Button */}
                      <button
                        onClick={handleConvertToIssue}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                          "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100",
                          "text-white dark:text-gray-900 shadow-sm hover:shadow-md active:scale-[0.98]"
                        )}
                        title="Create GitHub Issue from this request"
                      >
                        <Github className="w-4 h-4" />
                        <span>Convert to Issue</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* GitHub Issue Slideout */}
      <GitHubIssueSlideout
        isOpen={githubSlideoutStore.isOpen}
        onClose={() => githubSlideoutStore.close()}
      />

      {/* Copilot Notification Toast */}
      <NotificationToast 
        notification={copilotNotification} 
        onClose={() => setCopilotNotification(null)} 
      />
    </div>
  );
}
