/**
 * LoadingView Component
 * Displayed while settings are being loaded
 */

import { Loader2 } from 'lucide-react';

export function LoadingView() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}
