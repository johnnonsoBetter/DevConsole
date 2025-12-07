/**
 * JoinCallForm Component
 * Form for joining an existing video call
 */

import { Users } from 'lucide-react';

interface JoinCallFormProps {
  roomName: string;
  displayName: string;
  onRoomNameChange: (name: string) => void;
  onDisplayNameChange: (name: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function JoinCallForm({
  roomName,
  displayName,
  onRoomNameChange,
  onDisplayNameChange,
  onBack,
  onSubmit,
}: JoinCallFormProps) {
  const isValid = roomName.trim().length > 0;

  return (
    <div className="space-y-4 p-6 bg-gray-800 rounded-xl border border-gray-700">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Room Name
        </label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => onRoomNameChange(e.target.value)}
          placeholder="Enter room name"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-900 border-gray-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50"
        />
      </div>

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
          disabled={!isValid}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Users className="w-4 h-4" />
          Join Call
        </button>
      </div>
    </div>
  );
}
