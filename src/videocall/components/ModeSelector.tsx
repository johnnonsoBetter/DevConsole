/**
 * ModeSelector Component
 * Selection UI for creating or joining a call
 */

import { Phone, Users } from 'lucide-react';

interface ModeSelectorProps {
  onSelectCreate: () => void;
  onSelectJoin: () => void;
}

export function ModeSelector({ onSelectCreate, onSelectJoin }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={onSelectCreate}
        className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-700 hover:border-green-500 hover:bg-green-500/5 transition-all"
      >
        <div className="w-12 h-12 rounded-full bg-green-900/50 flex items-center justify-center">
          <Phone className="w-6 h-6 text-green-400" />
        </div>
        <div className="text-center">
          <span className="block font-medium text-white">Start Call</span>
          <span className="text-xs text-gray-400">Create a new room</span>
        </div>
      </button>

      <button
        onClick={onSelectJoin}
        className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-500/5 transition-all"
      >
        <div className="w-12 h-12 rounded-full bg-blue-900/50 flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-400" />
        </div>
        <div className="text-center">
          <span className="block font-medium text-white">Join Call</span>
          <span className="text-xs text-gray-400">Enter room name</span>
        </div>
      </button>
    </div>
  );
}
