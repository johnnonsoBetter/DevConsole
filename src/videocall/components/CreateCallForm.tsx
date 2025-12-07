/**
 * CreateCallForm Component
 * Form for starting a new video call
 */

import { Phone } from 'lucide-react';

interface CreateCallFormProps {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function CreateCallForm({
  displayName,
  onDisplayNameChange,
  onBack,
  onSubmit,
}: CreateCallFormProps) {
  return (
    <div className="space-y-4 p-6 bg-gray-800 rounded-xl border border-gray-700">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-900 border-gray-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white"
        >
          <Phone className="w-4 h-4" />
          Start Call
        </button>
      </div>
    </div>
  );
}
