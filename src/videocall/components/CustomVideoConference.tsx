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
import { ConnectionState, Participant, RemoteTrackPublication, RoomEvent, Track } from 'livekit-client';
import {
    Copy,
    FileText,
    Hand,
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    MoreVertical,
    PanelRightClose,
    PanelRightOpen,
    PhoneOff,
    Smile,
    User,
    Users,
    Video,
    VideoOff,
    X
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useReactionsChannel, type ReactionType } from '../hooks/useReactionsChannel';
import type { Participant as ParticipantType } from '../types';
import { AgentIndicator } from './AgentIndicator';
import { useCallMemoryBridge } from './CallMemoryBridge';
import { FloatingReactionsV2 } from './FloatingReactionsV2';
import { LiveCaptions } from './LiveCaptions';
import { MemoryBadge } from './MemoryStatusIndicator';
import { ParticipantToast, useParticipantEvents } from './ParticipantToast';
import { RaisedHandsV2 } from './RaisedHandsV2';
import { ReactionPicker as ReactionPickerV2 } from './ReactionPickerV2';
import { TranscriptPanel } from './TranscriptPanel';
import { ControlButton } from './ui';

// Lazy load DevConsolePanel to avoid circular dependencies and reduce initial bundle
const DevConsolePanel = lazy(() => 
  import('../../components/DevConsole/DevConsolePanel').then(module => ({
    default: module.DevConsolePanel
  }))
);

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
  const [isDevConsolePanelOpen, setIsDevConsolePanelOpen] = useState(false);
  const [isTranscriptPanelOpen, setIsTranscriptPanelOpen] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  
  // Real-time reactions and hand-raising via LiveKit data channel
  const {
    reactions,
    raisedHands,
    sendReaction,
    removeReaction,
    toggleHandRaise,
    lowerHand,
    isLocalHandRaised,
  } = useReactionsChannel();
  
  // Call memory integration - syncs transcripts to SmartMemory
  const callMemory = useCallMemoryBridge({
    roomName,
    displayName: localParticipant?.name || localParticipant?.identity || 'Unknown',
    enabled: true,
  });
  
  // Participant events for join/leave notifications
  const { events: participantEvents, addEvent, dismissEvent } = useParticipantEvents();
  
  // Handle participant join/leave events
  useEffect(() => {
    const handleParticipantConnected = (participant: Participant) => {
      if (!participant.isLocal) {
        addEvent('joined', participant.name || participant.identity || 'Unknown');
      }
    };
    
    const handleParticipantDisconnected = (participant: Participant) => {
      if (!participant.isLocal) {
        addEvent('left', participant.name || participant.identity || 'Unknown');
        // Clear active speaker if they left
        if (activeSpeakerId === participant.identity) {
          setActiveSpeakerId(null);
        }
      }
    };
    
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, addEvent, activeSpeakerId]);

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

  // Detect AI agent participant (identity starts with "agent-")
  const agentParticipant = useMemo(() => {
    const agentLkParticipant = participants.find(p => 
      p.identity.toLowerCase().startsWith('agent-') || 
      p.name?.toLowerCase().includes('transcription') ||
      p.name?.toLowerCase().includes('ai agent')
    );
    if (!agentLkParticipant) return null;
    
    return {
      id: agentLkParticipant.identity,
      name: agentLkParticipant.name || 'AI Agent',
      isMuted: !agentLkParticipant.isMicrophoneEnabled,
      isCameraOn: agentLkParticipant.isCameraEnabled,
      isSpeaking: agentLkParticipant.isSpeaking,
      isLocal: false,
    };
  }, [participants]);

  // Filter out agent from displayed participants (humans only)
  const humanParticipants = useMemo(() => {
    if (!agentParticipant) return mappedParticipants;
    return mappedParticipants.filter(p => p.id !== agentParticipant.id);
  }, [mappedParticipants, agentParticipant]);

  // Get active speaker - prioritize remote participants, but show local if alone
  // Uses humanParticipants to exclude AI agent from main view selection
  const activeSpeaker = useMemo(() => {
    // If manually selected, use that
    if (activeSpeakerId) {
      const selected = humanParticipants.find((p) => p.id === activeSpeakerId);
      if (selected) return selected;
    }
    // Find speaking remote participant
    const speakingRemote = humanParticipants.find((p) => p.isSpeaking && !p.isLocal);
    if (speakingRemote) return speakingRemote;
    // Find any remote participant
    const anyRemote = humanParticipants.find((p) => !p.isLocal);
    if (anyRemote) return anyRemote;
    // Fall back to local participant (when alone)
    return humanParticipants.find((p) => p.isLocal) || humanParticipants[0];
  }, [humanParticipants, activeSpeakerId]);

  // Check if anyone is screen sharing - prioritize screen share in main view
  const screenShareTrack = useMemo(() => {
    const screenTrack = tracks.find(
      (t) => t.source === Track.Source.ScreenShare && t.publication?.isSubscribed
    );
    return screenTrack;
  }, [tracks]);
  
  // Get screen share participant info
  const screenShareParticipant = useMemo(() => {
    if (!screenShareTrack) return null;
    return mappedParticipants.find((p) => p.id === screenShareTrack.participant.identity);
  }, [screenShareTrack, mappedParticipants]);

  // Get active speaker's video track (used when no screen share)
  const activeSpeakerVideoTrack = useMemo(() => {
    if (!activeSpeaker) return null;
    const track = tracks.find(
      (t) =>
        t.participant.identity === activeSpeaker.id &&
        t.source === Track.Source.Camera
    );
    return track;
  }, [tracks, activeSpeaker]);
  
  // Determine what to show in main view: prioritize screen share over camera
  const mainViewTrack = screenShareTrack || activeSpeakerVideoTrack;
  const mainViewParticipant = screenShareParticipant || activeSpeaker;
  const isShowingScreenShare = !!screenShareTrack;

  // Sidebar participants - show ALL human participants except the one in main view
  // This includes the local participant as a self-view, but excludes AI agents
  const sidebarParticipants = useMemo(() => {
    return humanParticipants.filter((p) => p.id !== activeSpeaker?.id);
  }, [humanParticipants, activeSpeaker]);

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

  // Handle raise hand toggle
  const handleToggleRaiseHand = useCallback(() => {
    toggleHandRaise();
  }, [toggleHandRaise]);

  // Handle reaction selection
  const handleReaction = useCallback((reactionType: ReactionType) => {
    sendReaction(reactionType);
    setIsReactionPickerOpen(false);
  }, [sendReaction]);

  // Handle lowering hand (only local user can lower their own hand)
  const handleLowerHand = useCallback(() => {
    lowerHand();
  }, [lowerHand]);

  // Connection status
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div 
        className="h-full flex items-center justify-center bg-gray-900"
        role="status"
        aria-label="Connecting to video call"
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-400 text-sm">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900" role="application" aria-label="Video call">
      {/* Main video call area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDevConsolePanelOpen ? 'mr-0' : ''}`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm border-b border-white/5" role="banner">
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-1.5" role="status" aria-label="Connection status: Connected">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
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
                {humanParticipants.length} participant{humanParticipants.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Memory status badge */}
            {callMemory.isConfigured && (
              <MemoryBadge
                isActive={callMemory.isActive}
                isSyncing={callMemory.state === 'syncing'}
              />
            )}
            
            {/* AI Agent indicator - shows when agent is in the room */}
            {agentParticipant && (
              <AgentIndicator
                agent={{
                  id: agentParticipant.id,
                  name: agentParticipant.name,
                  isListening: !agentParticipant.isMuted,
                  isSpeaking: agentParticipant.isSpeaking,
                  status: agentParticipant.isSpeaking ? 'speaking' : !agentParticipant.isMuted ? 'listening' : 'idle',
                }}
                onToggleTranscript={() => setIsTranscriptPanelOpen(prev => !prev)}
                isTranscriptOpen={isTranscriptPanelOpen}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* DevConsole Panel Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDevConsolePanelOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDevConsolePanelOpen 
                  ? 'bg-primary/20 text-primary' 
                  : 'hover:bg-white/10 text-gray-400'
              }`}
              title={isDevConsolePanelOpen ? 'Close DevConsole' : 'Open DevConsole'}
              aria-label={isDevConsolePanelOpen ? 'Close developer console' : 'Open developer console'}
              aria-pressed={isDevConsolePanelOpen}
            >
              {isDevConsolePanelOpen ? (
                <PanelRightClose className="w-4 h-4" aria-hidden="true" />
              ) : (
                <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
              )}
            </motion.button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Close window"
              aria-label="Close video call window"
            >
              <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>
          </div>
        </header>

      {/* Main content - vertical layout with main view + bottom strip */}
      <div 
        className="flex-1 flex flex-col min-h-0 p-3 gap-3"
        role="main"
        aria-label="Video call main content"
      >
        {/* Main video view - takes most space */}
        <motion.div
          layout
          className={`flex-1 relative bg-gray-800 rounded-2xl overflow-hidden ${isShowingScreenShare ? 'ring-2 ring-primary/40' : ''}`}
          role="region"
          aria-label={isShowingScreenShare 
            ? `Screen share from ${mainViewParticipant?.name || 'participant'}`
            : `Video from ${mainViewParticipant?.name || 'participant'}`
          }
        >
          {/* Screen share indicator badge */}
          {isShowingScreenShare && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-primary/90 backdrop-blur-sm rounded-full"
            >
              <Monitor className="w-4 h-4 text-white" aria-hidden="true" />
              <span className="text-caption2 font-medium text-white">
                {mainViewParticipant?.name || 'Someone'} is sharing their screen
              </span>
            </motion.div>
          )}
          
          {mainViewTrack ? (
            <VideoTrack
              trackRef={mainViewTrack}
              className={`absolute inset-0 w-full h-full ${isShowingScreenShare ? 'object-contain bg-black' : 'object-cover'}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
              <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />

          {/* Speaker name with badge */}
          {mainViewParticipant && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
                <span className="text-body font-medium text-white">
                  {mainViewParticipant.name}
                </span>
                {mainViewParticipant.isLocal && (
                  <span className="text-caption2 text-white/70">(You)</span>
                )}
              </div>
              
              {/* Mute indicator badge */}
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${mainViewParticipant.isMuted ? 'bg-gray-700/80' : 'bg-white/20'} backdrop-blur-sm`}
                role="status"
                aria-label={mainViewParticipant.isMuted ? 'Microphone muted' : 'Microphone on'}
              >
                {mainViewParticipant.isMuted ? (
                  <MicOff className="w-4 h-4 text-white" aria-hidden="true" />
                ) : (
                  <Mic className="w-4 h-4 text-white" aria-hidden="true" />
                )}
              </div>
            </motion.div>
          )}
          
          {/* Live captions overlay - shows real-time transcription */}
          {agentParticipant && (
            <LiveCaptions />
          )}
          
          {/* Floating reactions - animated Lucide icon reactions synced via data channel */}
          <FloatingReactionsV2
            reactions={reactions}
            onReactionComplete={removeReaction}
          />
          
          {/* Raised hands indicator - synced via data channel */}
          <AnimatePresence>
            {raisedHands.length > 0 && (
              <RaisedHandsV2
                hands={raisedHands}
                onLowerHand={handleLowerHand}
                localParticipantId={localParticipant.identity}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bottom participant strip - horizontal scroll */}
        <AnimatePresence>
          {isSidebarOpen && sidebarParticipants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0"
              role="region"
              aria-label="Other participants"
            >
              <div 
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                role="list"
                aria-label="Participant video tiles"
              >
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveSpeakerId(participant.id);
                        }
                      }}
                      role="listitem"
                      aria-label={`${participant.name}${participant.isLocal ? ' (You)' : ''}${participant.isMuted ? ', muted' : ''}${participant.isSpeaking ? ', speaking' : ''}. Click to view in main area.`}
                      tabIndex={0}
                      className={`
                        relative flex-shrink-0 w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32
                        rounded-xl overflow-hidden bg-gray-800
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
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
                            <User className="w-6 h-6 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />

                      {/* Name */}
                      <div className="absolute bottom-2 left-2 right-8 flex items-center gap-1">
                        <span className="text-caption2 font-medium text-white truncate">
                          {participant.name}
                        </span>
                        {participant.isLocal && (
                          <span className="text-caption2 text-white/60">(You)</span>
                        )}
                      </div>

                      {/* Mic indicator */}
                      <div className="absolute bottom-2 right-2" aria-hidden="true">
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
                    role="listitem"
                    aria-label={`${sidebarParticipants.length - 4} more participants`}
                  >
                    {/* Blurred background from last visible participant if available */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" aria-hidden="true" />
                    
                    {/* Overlay with count */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                        <Users className="w-4 h-4 text-white" aria-hidden="true" />
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
        role="toolbar"
        aria-label="Video call controls"
      >
        <div className="flex items-center gap-1 px-3 py-2 bg-gray-800/95 backdrop-blur-md rounded-full shadow-apple-lg border border-white/5">
          {/* Mic */}
          <ControlButton
            icon={isMuted ? MicOff : Mic}
            isActive={isMuted}
            onClick={handleToggleMute}
            label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
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
              label={isSidebarOpen ? 'Hide participants' : 'Show participants'}
            />
            <span 
              className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-semibold text-white bg-primary rounded-full"
              aria-hidden="true"
            >
              {humanParticipants.length}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" role="separator" aria-hidden="true" />

          {/* Screen share */}
          <ControlButton
            icon={isScreenSharing ? MonitorOff : Monitor}
            isActive={isScreenSharing}
            onClick={handleToggleScreenShare}
            label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          />

          {/* Transcript */}
          <ControlButton
            icon={FileText}
            isActive={isTranscriptPanelOpen}
            onClick={() => setIsTranscriptPanelOpen((prev) => !prev)}
            label={isTranscriptPanelOpen ? 'Hide transcript' : 'Show transcript'}
          />

          {/* Reactions */}
          <div className="relative">
            <ControlButton
              icon={Smile}
              isActive={isReactionPickerOpen}
              onClick={() => setIsReactionPickerOpen((prev) => !prev)}
              label="Send reaction"
            />
            <ReactionPickerV2
              isOpen={isReactionPickerOpen}
              onClose={() => setIsReactionPickerOpen(false)}
              onSelectReaction={handleReaction}
            />
          </div>
          
          {/* Raise hand */}
          <div className="relative">
            <ControlButton
              icon={Hand}
              isActive={isLocalHandRaised}
              onClick={handleToggleRaiseHand}
              label={isLocalHandRaised ? 'Lower hand' : 'Raise hand'}
            />
            {/* Show indicator when hand is raised */}
            {isLocalHandRaised && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full border-2 border-gray-800"
                aria-hidden="true"
              />
            )}
          </div>

          {/* More */}
          <ControlButton
            icon={MoreVertical}
            onClick={() => {}}
            label="More options"
          />

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" role="separator" aria-hidden="true" />

          {/* End call */}
          <ControlButton
            icon={PhoneOff}
            isDestructive
            onClick={handleEndCall}
            label="Leave call"
            size="lg"
          />
        </div>
      </motion.div>
    </motion.div>

      {/* DevConsole Panel Sidebar */}
      <AnimatePresence>
        {isDevConsolePanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 450, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full border-l border-white/10 bg-gray-900 overflow-hidden"
            role="complementary"
            aria-label="Developer console"
          >
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <div className="h-full w-[450px]">
                <DevConsolePanel compact />
              </div>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Panel Sidebar */}
      <AnimatePresence>
        {isTranscriptPanelOpen && (
          <TranscriptPanel
            isOpen={isTranscriptPanelOpen}
            onClose={() => setIsTranscriptPanelOpen(false)}
            className="h-full"
          />
        )}
      </AnimatePresence>
      
      {/* Participant join/leave notifications */}
      <ParticipantToast
        events={participantEvents}
        onDismiss={dismissEvent}
      />
    </div>
  );
}
