import React, { useState, useEffect } from 'react';

interface DevToolsPanelProps {}

const DevToolsPanel: React.FC<DevToolsPanelProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Test connection to background script
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (response) {
        setIsConnected(true);
        setLogs(response.logs || []);
      }
    });

    // Listen for updates from background script
    const messageListener = (message: any) => {
      if (message.type === 'DEVTOOLS_UPDATE') {
        console.log('DevTools update:', message);
        // Handle updates here
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div className="h-screen bg-gray-900 text-white p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-blue-400">DevConsole</h1>
        <p className="text-gray-400">
          Status: {isConnected ? (
            <span className="text-green-400">Connected</span>
          ) : (
            <span className="text-red-400">Disconnected</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-blue-300">Console Logs</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No logs captured yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="font-mono text-sm text-gray-300">
                  [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-green-300">Network Requests</h2>
          <p className="text-gray-500 italic">Network monitoring coming soon...</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-purple-300">AI Assistant</h2>
          <p className="text-gray-500 italic">AI features coming soon...</p>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-600">
        <p>🚀 DevConsole Extension v1.0.0</p>
        <p>Open the browser console and visit any website to see captured logs here.</p>
      </div>
    </div>
  );
};

export default DevToolsPanel;