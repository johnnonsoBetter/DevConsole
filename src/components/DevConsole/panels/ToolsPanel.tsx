/**
 * ToolsPanel Component
 * Provides developer utilities for exporting data and creating context packs
 * Lazy-loaded for better performance
 */

import { useState, useCallback } from 'react';
import { Download, Trash2, Info, RefreshCw } from 'lucide-react';
import { useDevConsoleStore } from '../../../utils/stores/devConsole';
import {
  createContextPack,
  exportContextPack,
  copyContextPackToClipboard,
} from '../../../lib/devConsole/contextPacker';

export function ToolsPanel() {
  const { logsToBeExported, clearAll } = useDevConsoleStore();
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Create and export a comprehensive context pack
   * Includes screenshots, logs, network requests, and metadata
   */
  const handleCreateContextPack = useCallback(async () => {
    setIsGenerating(true);
    try {
      const pack = await createContextPack({
        includeScreenshot: true,
        eventCount: 20,
        networkCount: 10,
      });

      // Try to copy to clipboard first
      const copied = await copyContextPackToClipboard(pack);

      if (copied) {
        alert('📋 Context pack copied to clipboard!\n\nPaste into your issue tracker.');
      } else {
        // Fallback: download as file
        exportContextPack(pack);
        alert('📦 Context pack downloaded!\n\nAttach to your issue tracker.');
      }
    } catch (error) {
      console.error('Failed to create context pack:', error);
      alert('❌ Failed to create context pack. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Export all logs as JSON to clipboard
   */
  const handleExportLogs = useCallback(async () => {
    const data = logsToBeExported || '';
    try {
      await navigator.clipboard.writeText(data);
      alert('📋 Logs copied to clipboard!');
    } catch (error) {
      console.error('Clipboard error:', error);
      // Fallback: use textarea method
      const textArea = document.createElement('textarea');
      textArea.value = data;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('📋 Logs copied to clipboard!');
    }
  }, [logsToBeExported]);

  /**
   * Clear all console data with confirmation
   */
  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all console data?')) {
      clearAll();
    }
  }, [clearAll]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Developer Tools
        </h3>
        <p className="text-sm text-muted-foreground">Export data and manage console state</p>
      </div>

      {/* Featured Context Pack Tool */}
      <div className="card bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 border-primary/10 hover:border-primary/20 transition-all duration-200">
        <button
          onClick={handleCreateContextPack}
          disabled={isGenerating}
          className="w-full p-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-apple-sm">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {isGenerating ? 'Capturing Context...' : 'Export Context Pack'}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Creates a comprehensive debug package with screenshot, route, events, and network
                data
              </p>
              <div className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                <span>{isGenerating ? 'Processing...' : 'Copy to Clipboard'}</span>
                {isGenerating && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportLogs}
            className="card hover:shadow-apple-sm transition-all duration-200 p-4 text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Download className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Export Logs
            </h5>
            <p className="text-xs text-muted-foreground">Copy all console data as JSON</p>
          </button>

          <button
            onClick={handleClearAll}
            className="card hover:shadow-apple-sm transition-all duration-200 p-4 text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/15 transition-colors">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Clear All Data
            </h5>
            <p className="text-xs text-muted-foreground">Reset logs and network history</p>
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="card bg-info/5 border-info/20">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-info" />
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                💡 Pro Tip
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                To create a GitHub issue, go to the <strong>Logs</strong> tab, select an error or
                warning, and click <strong>"Create Issue"</strong> in the details panel for
                automatic issue creation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
