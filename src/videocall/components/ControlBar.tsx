/**
 * ControlBar Component
 * Bottom control dock with all call actions
 */

import { motion } from 'framer-motion';
import {
    Hand,
    Mic,
    MicOff,
    Monitor,
    MoreVertical,
    PhoneOff,
    Smile,
    Sparkles,
    Users,
    Video,
    VideoOff,
} from 'lucide-react';
import { ControlButton, RecordingIndicator } from './ui';

interface ControlBarProps {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  recordingTime?: string;
  participantCount: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onReaction: () => void;
  onRaiseHand: () => void;
  onEffects: () => void;
  onSettings: () => void;
  onEndCall: () => void;
}

export function ControlBar({
  isMuted,
  isCameraOn,
  isScreenSharing,
  isRecording,
  recordingTime = '00:00',
  participantCount,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleParticipants,
  onReaction,
  onRaiseHand,
  onEffects,
  onSettings,
  onEndCall,
}: ControlBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-900/95 backdrop-blur-md rounded-full shadow-apple-xl border border-white/5">
        {/* Primary controls */}
        <div className="flex items-center gap-1">
          {/* Mic */}
          <div className="relative">
            <ControlButton
              icon={isMuted ? MicOff : Mic}
              isActive={isMuted}
              onClick={onToggleMute}
              label={isMuted ? 'Unmute' : 'Mute'}
            />
            {/* Dropdown indicator */}
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/40" />
          </div>

          {/* Camera */}
          <div className="relative">
            <ControlButton
              icon={isCameraOn ? Video : VideoOff}
              isActive={!isCameraOn}
              onClick={onToggleCamera}
              label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            />
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/40" />
          </div>

          {/* Participants */}
          <div className="relative">
            <ControlButton
              icon={Users}
              onClick={onToggleParticipants}
              label="Participants"
            />
            {/* Count badge */}
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-semibold text-white bg-primary rounded-full">
              {participantCount}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Secondary controls */}
        <div className="flex items-center gap-1">
          {/* Screen share */}
          <div className="relative">
            <ControlButton
              icon={Monitor}
              isActive={isScreenSharing}
              onClick={onToggleScreenShare}
              label="Share screen"
            />
            {isScreenSharing && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-gray-900" />
            )}
          </div>

          {/* Reactions */}
          <ControlButton
            icon={Smile}
            onClick={onReaction}
            label="Reactions"
          />

          {/* Raise hand */}
          <ControlButton
            icon={Hand}
            onClick={onRaiseHand}
            label="Raise hand"
          />

          {/* Effects */}
          <ControlButton
            icon={Sparkles}
            onClick={onEffects}
            label="Effects"
          />

          {/* More/Settings */}
          <ControlButton
            icon={MoreVertical}
            onClick={onSettings}
            label="More options"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Recording indicator */}
        {isRecording && <RecordingIndicator time={recordingTime} />}

        {/* Divider before end call */}
        {isRecording && <div className="w-px h-6 bg-white/10 mx-1" />}

        {/* End call */}
        <ControlButton
          icon={PhoneOff}
          isDestructive
          onClick={onEndCall}
          label="End call"
          size="lg"
        />
      </div>
    </motion.div>
  );
}
