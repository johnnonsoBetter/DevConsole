/**
 * NetworkPanel Component
 * Displays captured network requests with filtering and details panel
 * Lazy-loaded for better performance
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Trash2, X } from 'lucide-react';
import { List, AutoSizer } from 'react-virtualized';
import 'react-virtualized/styles.css';
import { useDevConsoleStore, useDevConsoleNetwork } from '../../../utils/stores/devConsole';
import { cn } from '../../../utils';
import { EmptyStateHelper } from '../EmptyStateHelper';
import { MethodChip, StatusChip, DurationChip, GraphQLChip } from '../Chips';
import { DurationSparkline } from '../Sparkline';
import { humanizeTime } from '../../../utils/timeUtils';
import { NetworkRequestDetails } from './NetworkRequestDetails';
import { MobileBottomSheet } from '../MobileBottomSheet';
import { useIsMobile } from '../../../hooks/useMediaQuery';

// ============================================================================
// NETWORK ROW COMPONENT
// ============================================================================

interface NetworkRowProps {
  request: any;
  isSelected: boolean;
  onSelect: (request: any) => void;
  style: React.CSSProperties;
  endpointStats: Record<string, number[]>;
}

/**
 * Memoized NetworkRow component for virtualization
 */
const NetworkRow = memo(({ request: req, isSelected, onSelect, style, endpointStats }: NetworkRowProps) => {
  const endpoint = useMemo(() => new URL(req.url, window.location.origin).pathname, [req.url]);
  const trendData = useMemo(() => endpointStats[endpoint]?.slice(-20) || [], [endpointStats, endpoint]);

  return (
    <div
      style={style}
      onClick={() => onSelect(req)}
      className={cn(
        'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 grid grid-cols-[80px_120px_1fr_112px_80px] sm:grid-cols-[96px_128px_1fr_112px_80px] md:grid-cols-[96px_128px_1fr_112px_80px] items-center',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Method */}
      <div className="px-3 sm:px-4 py-3">
        <MethodChip method={req.method} />
      </div>

      {/* Status */}
      <div className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <StatusChip status={req.status ?? null} />
          {req.type === 'graphql' && (
            <GraphQLChip operation={(req as any).graphql?.operation || 'query'} />
          )}
        </div>
      </div>

      {/* URL */}
      <div className="px-3 sm:px-4 py-3 min-w-0">
        <div className="truncate font-mono text-gray-900 dark:text-gray-100 text-xs">
          {endpoint}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
          <span title={new Date(req.timestamp).toLocaleString()}>
            {humanizeTime(req.timestamp)}
          </span>
          <span className="sm:hidden">
            <DurationChip duration={req.duration || 0} threshold={500} />
          </span>
        </div>
      </div>

      {/* Duration */}
      <div className="px-3 sm:px-4 py-3 hidden sm:block">
        <DurationChip duration={req.duration || 0} threshold={500} />
      </div>

      {/* Trend */}
      <div className="px-3 sm:px-4 py-3 hidden md:block">
        {trendData.length > 1 ? (
          <DurationSparkline
            data={trendData}
            width={60}
            height={20}
            threshold={500}
          />
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </div>
    </div>
  );
});

NetworkRow.displayName = 'NetworkRow';

// ============================================================================
// NETWORK PANEL COMPONENT
// ============================================================================

export function NetworkPanel() {
  const requests = useDevConsoleNetwork();
  const { clearNetwork } = useDevConsoleStore();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [listHeight, setListHeight] = useState(600);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isMobile = useIsMobile();

  /**
   * Group requests by endpoint for sparkline visualization
   * Shows request duration trends over time
   * Memoized to avoid recalculation on every render
   */
  const endpointStats = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        const endpoint = new URL(req.url, window.location.origin).pathname;
        if (!acc[endpoint]) {
          acc[endpoint] = [];
        }
        acc[endpoint].push(req.duration || 0);
        return acc;
      },
      {} as Record<string, number[]>
    );
  }, [requests]);

  // Dynamic height calculation for virtualized list
  useEffect(() => {
    if (!listContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setListHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(listContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

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
    <div className="h-full flex">
      {/* Request Table */}
      <div
        className={cn(
          'flex flex-col',
          !isMobile && selectedRequest && 'border-r border-gray-200 dark:border-gray-800'
        )}
        style={{ width: !isMobile && selectedRequest ? `${100 - detailPanelWidth}%` : '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Network Requests
            </h3>
            <p className="text-xs text-muted-foreground">
              {requests.length} request{requests.length !== 1 ? 's' : ''} captured
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

        {/* Table with Virtualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {requests.length === 0 ? (
            <EmptyStateHelper type="network" />
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-[80px_120px_1fr_112px_80px] sm:grid-cols-[96px_128px_1fr_112px_80px] md:grid-cols-[96px_128px_1fr_112px_80px] text-left text-sm">
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Method
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    URL
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    Duration
                  </div>
                  <div className="px-3 sm:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hidden md:block">
                    Trend
                  </div>
                </div>
              </div>

              {/* Virtualized List */}
              <div ref={listContainerRef} className="flex-1">
                <AutoSizer>
                  {({ width }) => (
                    <List
                      height={listHeight}
                      rowCount={requests.length}
                      rowHeight={65}
                      width={width}
                      className="scrollbar-thin"
                      rowRenderer={({ index, key, style }) => (
                        <NetworkRow
                          key={key}
                          request={requests[index]}
                          isSelected={selectedRequest?.id === requests[index].id}
                          onSelect={setSelectedRequest}
                          style={style}
                          endpointStats={endpointStats}
                        />
                      )}
                    />
                  )}
                </AutoSizer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Request Details - Responsive: Bottom Sheet on Mobile, Side Panel on Desktop */}
      {selectedRequest && (
        <>
          {isMobile ? (
            /* Mobile: Bottom Sheet */
            <MobileBottomSheet
              isOpen={!!selectedRequest}
              onClose={() => setSelectedRequest(null)}
              title="Request Details"
              subtitle={`${selectedRequest.method} • ${selectedRequest.status || 'Pending'}`}
            >
              <NetworkRequestDetails request={selectedRequest} />
            </MobileBottomSheet>
          ) : (
            /* Desktop: Resizable Side Panel */
            <>
              {/* Resize Handle */}
              <div
                className={cn(
                  'w-1 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors relative group',
                  isResizing && 'bg-primary/50'
                )}
                onMouseDown={handleResizeStart}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-primary transition-colors" />
              </div>

              <div className="flex flex-col" style={{ width: `${detailPanelWidth}%` }}>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Request Details
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequest.method} • {selectedRequest.status || 'Pending'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
                    title="Close Details"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <NetworkRequestDetails request={selectedRequest} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
