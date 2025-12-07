/**
 * NotConfiguredView Component
 * Displayed when LiveKit settings are not configured
 */

import { AlertCircle, X } from 'lucide-react';

interface NotConfiguredViewProps {
  onClose: () => void;
}

export function NotConfiguredView({ onClose }: NotConfiguredViewProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          Video Calls Not Configured
        </h3>
        <p className="text-sm text-gray-400">
          Please configure LiveKit settings in the DevConsole Settings tab first.
        </p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-600"
        >
          <X className="w-4 h-4" />
          Close Window
        </button>
      </div>
    </div>
  );
}
