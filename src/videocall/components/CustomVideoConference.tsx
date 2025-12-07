/**
 * CustomVideoConference Component
 * Custom video conference UI that integrates LiveKit with our design system
 */

import {
  AudioTrack,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConnectionState, RemoteTrackPublication, Track } from 'livekit-client';
import {
  Copy,
  Hand,
  Mic,
  MicOff,
  Monitor,
  MoreVertical,
  PhoneOff,
  Smile,
  User,
  Video,
  VideoOff,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Participant as ParticipantType } from '../types';
import { ControlButton } from './ui';

interface CustomVideoConferenceProps {
  roomName: string;
  onLeave: () => void;
  onClose: () => void;
}

export function CustomVideoConference({
  roomName,
  onLeave,
  onClose,
}: CustomVideoConferenceProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
    Track.Source.ScreenShare,
  ], {
    // Include publications even before they are subscribed so we can explicitly subscribe below.
    onlySubscribed: false,
  });

  // Ensure we subscribe to remote tracks (camera/mic/screenshare) so their tiles render.
  useEffect(() => {
    tracks.forEach((trackRef) => {
      if (trackRef.participant.isLocal) return;
      const publication = trackRef.publication;
      if (
        publication instanceof RemoteTrackPublication &&
        publication.isDesired &&
        !publication.isSubscribed
      ) {
        publication.setSubscribed(true);
      }
    });
  }, [tracks]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Local participant controls
  const isMuted = !localParticipant.isMicrophoneEnabled;
  const isCameraOn = localParticipant.isCameraEnabled;
  const isScreenSharing = localParticipant.isScreenShareEnabled;

  // Convert LiveKit participants to our format
  const mappedParticipants: ParticipantType[] = useMemo(() => {
    return participants.map((p) => ({
      id: p.identity,
      name: p.name || p.identity || 'Unknown',
      isMuted: !p.isMicrophoneEnabled,
      isCameraOn: p.isCameraEnabled,
      isSpeaking: p.isSpeaking,
      isLocal: p.isLocal,
    }));
  }, [participants]);

  // Get active speaker - prioritize remote participants, but show local if alone
  const activeSpeaker = useMemo(() => {
    // If manually selected, use that
    if (activeSpeakerId) {
      const selected = mappedParticipants.find((p) => p.id === activeSpeakerId);
      if (selected) return selected;
    }
    // Find speaking remote participant
    const speakingRemote = mappedParticipants.find((p) => p.isSpeaking && !p.isLocal);
    if (speakingRemote) return speakingRemote;
    // Find any remote participant
    const anyRemote = mappedParticipants.find((p) => !p.isLocal);
    if (anyRemote) return anyRemote;
    // Fall back to local participant (when alone)
    return mappedParticipants.find((p) => p.isLocal) || mappedParticipants[0];
  }, [mappedParticipants, activeSpeakerId]);

  // Get active speaker's video track
  const activeSpeakerVideoTrack = useMemo(() => {
    if (!activeSpeaker) return null;
    const track = tracks.find(
      (t) =>
        t.participant.identity === activeSpeaker.id &&
        t.source === Track.Source.Camera
    );
    return track;
  }, [tracks, activeSpeaker]);

  // Sidebar participants - show ALL participants except the one in main view
  // This includes the local participant as a self-view
  const sidebarParticipants = useMemo(() => {
    return mappedParticipants.filter((p) => p.id !== activeSpeaker?.id);
  }, [mappedParticipants, activeSpeaker]);

  // Handlers
  const handleToggleMute = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(isMuted);
  }, [localParticipant, isMuted]);

  const handleToggleCamera = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCameraOn);
  }, [localParticipant, isCameraOn]);

  const handleToggleScreenShare = useCallback(async () => {
    await localParticipant.setScreenShareEnabled(!isScreenSharing);
  }, [localParticipant, isScreenSharing]);

  const handleCopyRoomName = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [roomName]);

  const handleEndCall = useCallback(() => {
    room.disconnect();
    onLeave();
  }, [room, onLeave]);

  // Connection status
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-caption2 text-gray-300">Connected</span>
          </div>

          {/* Room name */}
          <div className="flex items-center gap-2">
            <code className="px-2.5 py-1 bg-gray-700/50 rounded-lg text-caption2 text-gray-300 font-mono">
              {roomName}
            </code>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyRoomName}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Copy room name"
            >
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            </motion.button>
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-caption2 text-success"
                >
                  Copied!
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Participant count */}
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span className="text-caption2">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="Close window"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Main content - vertical layout with main view + bottom strip */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        {/* Main video view - takes most space */}
        <motion.div
          layout
          className="flex-1 relative bg-gray-800 rounded-2xl overflow-hidden"
        >
          {activeSpeakerVideoTrack ? (
            <VideoTrack
              trackRef={activeSpeakerVideoTrack}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
              <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Speaker name with badge */}
          {activeSpeaker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
                <span className="text-body font-medium text-white">
                  {activeSpeaker.name}
                </span>
                {activeSpeaker.isLocal && (
                  <span className="text-caption2 text-white/70">(You)</span>
                )}
              </div>
              
              {/* Mute indicator badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeSpeaker.isMuted ? 'bg-gray-700/80' : 'bg-white/20'} backdrop-blur-sm`}>
                {activeSpeaker.isMuted ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-white" />
                )}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Bottom participant strip - horizontal scroll */}
        <AnimatePresence>
          {isSidebarOpen && sidebarParticipants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0"
            >
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {sidebarParticipants.slice(0, 4).map((participant, index) => {
                  const videoTrack = tracks.find(
                    (t) =>
                      t.participant.identity === participant.id &&
                      t.source === Track.Source.Camera
                  );

                  return (
                    <motion.button
                      key={participant.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveSpeakerId(participant.id)}
                      className={`
                        relative flex-shrink-0 w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32
                        rounded-xl overflow-hidden bg-gray-800
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        ${participant.isSpeaking ? 'ring-2 ring-success/60' : ''}
                      `}
                    >
                      {videoTrack ? (
                        <VideoTrack
                          trackRef={videoTrack}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />

                      {/* Name */}
                      <div className="absolute bottom-2 left-2 right-8 flex items-center gap-1">
                        <span className="text-caption2 font-medium text-white truncate">
                          {participant.name}
                        </span>
                      </div>

                      {/* Mic indicator */}
                      <div className="absolute bottom-2 right-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${participant.isMuted ? 'bg-gray-700/80' : 'bg-white/20'}`}>
                          {participant.isMuted ? (
                            <MicOff className="w-2.5 h-2.5 text-white" />
                          ) : (
                            <Mic className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Overflow indicator - shows when more than 4 participants */}
                {sidebarParticipants.length > 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex-shrink-0 w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32 rounded-xl overflow-hidden bg-gray-800"
                  >
                    {/* Blurred background from last visible participant if available */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" />
                    
                    {/* Overlay with count */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                        <Users className="w-4 h-4 text-white" />
                        <span className="text-body font-semibold text-white">
                          {sidebarParticipants.length - 4}+
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Render audio tracks */}
      {tracks
        .filter((t) => t.source === Track.Source.Microphone && !t.participant.isLocal)
        .map((track) => (
          <AudioTrack key={track.participant.identity} trackRef={track} />
        ))}

      {/* Control bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center pb-4"
      >
        <div className="flex items-center gap-1 px-3 py-2 bg-gray-800/95 backdrop-blur-md rounded-full shadow-apple-lg border border-white/5">
          {/* Mic */}
          <ControlButton
            icon={isMuted ? MicOff : Mic}
            isActive={isMuted}
            onClick={handleToggleMute}
            label={isMuted ? 'Unmute' : 'Mute'}
          />

          {/* Camera */}
          <ControlButton
            icon={isCameraOn ? Video : VideoOff}
            isActive={!isCameraOn}
            onClick={handleToggleCamera}
            label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          />

          {/* Participants toggle */}
          <div className="relative">
            <ControlButton
              icon={Users}
              isActive={isSidebarOpen}
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              label="Toggle participants"
            />
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-semibold text-white bg-primary rounded-full">
              {participants.length}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Screen share */}
          <ControlButton
            icon={Monitor}
            isActive={isScreenSharing}
            onClick={handleToggleScreenShare}
            label="Share screen"
          />

          {/* Reactions */}
          <ControlButton
            icon={Smile}
            onClick={() => {}}
            label="Reactions"
          />

          {/* Raise hand */}
          <ControlButton
            icon={Hand}
            onClick={() => {}}
            label="Raise hand"
          />

          {/* More */}
          <ControlButton
            icon={MoreVertical}
            onClick={() => {}}
            label="More options"
          />

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* End call */}
          <ControlButton
            icon={PhoneOff}
            isDestructive
            onClick={handleEndCall}
            label="End call"
            size="lg"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
