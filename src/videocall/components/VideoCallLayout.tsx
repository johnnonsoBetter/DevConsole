/**
 * VideoCallLayout Component
 * Main layout orchestrating all video call sections
 */

import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import type { Participant } from '../types';
import { ControlBar } from './ControlBar';
import { MainVideoView } from './MainVideoView';
import { MeetingHeader } from './MeetingHeader';
import { ParticipantSidebar } from './ParticipantSidebar';

interface VideoCallLayoutProps {
  meetingTitle: string;
  participants: Participant[];
  localParticipant?: Participant;
  onEndCall: () => void;
}

export function VideoCallLayout({
  meetingTitle,
  participants,
  localParticipant,
  onEndCall,
}: VideoCallLayoutProps) {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>(
    participants[0]?.id
  );

  // Control State
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording] = useState(true); // Demo: show recording
  const [recordingTime] = useState('00:32');

  // Get active speaker
  const activeSpeaker = participants.find((p) => p.id === activeSpeakerId) || participants[0];

  // Handlers
  const handleToggleMute = useCallback(() => setIsMuted((prev) => !prev), []);
  const handleToggleCamera = useCallback(() => setIsCameraOn((prev) => !prev), []);
  const handleToggleScreenShare = useCallback(() => setIsScreenSharing((prev) => !prev), []);
  const handleToggleParticipants = useCallback(() => setIsSidebarOpen((prev) => !prev), []);
  const handleSelectParticipant = useCallback((id: string) => setActiveSpeakerId(id), []);

  // Placeholder handlers
  const handleReaction = useCallback(() => console.log('Reaction'), []);
  const handleRaiseHand = useCallback(() => console.log('Raise hand'), []);
  const handleEffects = useCallback(() => console.log('Effects'), []);
  const handleSettings = useCallback(() => console.log('Settings'), []);

  // All participants including sidebar ones
  const sidebarParticipants = participants.filter((p) => p.id !== activeSpeakerId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative h-full w-full bg-gray-100 dark:bg-gray-950 p-3 md:p-4"
    >
      {/* Outer container with rounded corners */}
      <div className="relative h-full w-full bg-gray-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-apple-xl">
        {/* Meeting header overlay */}
        <MeetingHeader
          title={meetingTitle}
          participantCount={participants.length}
        />

        {/* Main content area */}
        <div className="absolute inset-0 flex">
          {/* Main video view */}
          <div className="flex-1 relative p-3 md:p-4 flex">
            <MainVideoView
              participant={activeSpeaker}
              isLocal={activeSpeaker?.id === localParticipant?.id}
            />
          </div>

          {/* Participant sidebar */}
          <ParticipantSidebar
            participants={sidebarParticipants}
            activeSpeakerId={activeSpeakerId}
            onSelectParticipant={handleSelectParticipant}
            isOpen={isSidebarOpen}
          />
        </div>

        {/* Control bar */}
        <ControlBar
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          recordingTime={recordingTime}
          participantCount={participants.length}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleParticipants={handleToggleParticipants}
          onReaction={handleReaction}
          onRaiseHand={handleRaiseHand}
          onEffects={handleEffects}
          onSettings={handleSettings}
          onEndCall={onEndCall}
        />
      </div>
    </motion.div>
  );
}
