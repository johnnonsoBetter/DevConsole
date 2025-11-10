/**
 * Empty State Helper Component
 * Shows helpful instructions when no logs/network requests are visible
 */

import { Terminal, Network, Info } from 'lucide-react';

interface EmptyStateHelperProps {
  type: 'logs' | 'network';
}

export function EmptyStateHelper({ type }: EmptyStateHelperProps) {
  const handleTestLogs = () => {
    console.log('✅ Test log message - this should appear in DevConsole!');
    console.info('ℹ️ Info message');
    console.warn('⚠️ Warning message');
    console.error('❌ Error message');
    console.debug('🐛 Debug message');
  };

  const handleTestNetwork = () => {
    console.log('🌐 Triggering test network request...');
    fetch('https://jsonplaceholder.typicode.com/posts/1')
      .then(response => response.json())
      .then(data => console.log('✅ Network test successful:', data))
      .catch(error => console.error('❌ Network test failed:', error));
  };

  if (type === 'logs') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Console Logs Yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          DevConsole is actively monitoring this page. Console logs will appear here as they occur.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 max-w-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                How to see logs:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Open the browser Console and run <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">console.log('test')</code></li>
                <li>Interact with the website to trigger logs</li>
                <li>Click the button below to generate test logs</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleTestLogs}
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Generate Test Logs
        </button>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          DevConsole Extension is active and monitoring
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
        <Network className="w-8 h-8 text-secondary" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No Network Requests Yet
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        Network requests (fetch, XHR, GraphQL) will appear here as they occur.
      </p>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 max-w-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
              How to see network activity:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Refresh the page to capture initial requests</li>
              <li>Interact with the website (click buttons, navigate)</li>
              <li>Click the button below to make a test request</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleTestNetwork}
        className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        Make Test Network Request
      </button>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Network interceptor is active and monitoring
      </p>
    </div>
  );
}
