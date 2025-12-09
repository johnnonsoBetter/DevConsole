/**
 * VideoCallPage Component
 * Full-page video call experience with demo data
 */

import { useCallback, useMemo } from 'react';
import type { Participant } from '../types';

// Demo participants data
const DEMO_PARTICIPANTS: Participant[] = [
  {
    id: '1',
    name: 'Mia Miller',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop',
    isMuted: false,
    isCameraOn: true,
    isSpeaking: true,
    isLocal: false,
  },
  {
    id: '2',
    name: 'Ava Williams',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop',
    isMuted: false,
    isCameraOn: true,
    isSpeaking: false,
  },
  {
    id: '3',
    name: 'James Hall',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    isMuted: false,
    isCameraOn: true,
    isSpeaking: false,
  },
  {
    id: '4',
    name: 'Isabella Garcia',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop',
    isMuted: false,
    isCameraOn: true,
    isSpeaking: false,
  },
  {
    id: '5',
    name: 'Liam Smith',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop',
    isMuted: false,
    isCameraOn: true,
    isSpeaking: true,
  },
];

interface VideoCallPageProps {
  meetingTitle?: string;
  onEndCall?: () => void;
}

export function VideoCallPage({
  onEndCall,
}: VideoCallPageProps) {


  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-200 dark:bg-gray-900">
      {/* <VideoCallLayout
        meetingTitle={meetingTitle}
        participants={participants}
        localParticipant={participants[0]}
        onEndCall={handleEndCall}
      /> */}
    </div>
  );
}
