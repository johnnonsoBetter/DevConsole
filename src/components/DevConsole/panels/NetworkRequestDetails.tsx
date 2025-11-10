/**
 * NetworkRequestDetails Component
 * Shows detailed information about a selected network request
 * Includes headers, request body, and response data
 * Uses lazy ReactJson rendering for better performance
 */

import { useState, useMemo, memo } from 'react';
import ReactJson from '@microlink/react-json-view';
import { cn } from '../../../utils';
import { useUnifiedTheme } from '../../../hooks/useTheme';

/**
 * Lazy ReactJson wrapper - only renders when expanded
 */
const LazyReactJson = memo(({ data, isDarkMode, name }: { data: any; isDarkMode: boolean; name: string }) => (
  <ReactJson
    src={data}
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
));

LazyReactJson.displayName = 'LazyReactJson';

// ============================================================================
// NETWORK REQUEST DETAILS COMPONENT
// ============================================================================

interface NetworkRequestDetailsProps {
  request: any;
}

export function NetworkRequestDetails({ request }: NetworkRequestDetailsProps) {
  const [activeSection, setActiveSection] = useState<'headers' | 'body' | 'response'>('response');
  const { isDarkMode } = useUnifiedTheme();

  /**
   * Get data for currently active section - memoized
   */
  const sectionData = useMemo(() => {
    switch (activeSection) {
      case 'headers':
        return request.responseHeaders || {};
      case 'body':
        return request.requestBody || {};
      case 'response':
        return request.responseBody || {};
      default:
        return {};
    }
  }, [activeSection, request]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        {(['headers', 'body', 'response'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all hover:shadow-apple-sm active:scale-95',
              activeSection === section
                ? 'bg-primary text-white shadow-apple-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            {section}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          {/* Only render ReactJson for active section */}
          <LazyReactJson data={sectionData} isDarkMode={isDarkMode} name={activeSection} />
        </div>
      </div>
    </div>
  );
}
