






import { useCallMemoryStore } from '@/utils/stores';
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
  Brain,
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
  User,
  Users,
  Video,
  VideoOff,
  X
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactionType, useCallMemory, useReactionsChannel } from '../hooks';
import type { TranscriptTurn } from '../lib/callMemoryTypes';
import type { Participant as ParticipantType } from '../types';
import { AgentIndicator } from './AgentIndicator';
import { FloatingReactionsV2 } from './FloatingReactionsV2';
import { InsightsPanel } from './InsightsPanel';
import { LiveCaptions } from './LiveCaptions';
import { MediaDeviceSelector } from './MediaDeviceSelector';
import { MemoryBadge } from './MemoryStatusIndicator';
import { ParticipantToast, useParticipantEvents } from './ParticipantToast';
import { RaisedHandsV2 } from './RaisedHandsV2';
import { ReactionPicker as ReactionPickerV2 } from './ReactionPickerV2';
import { TranscriptPanel } from './TranscriptPanel';
import { ControlButton } from './ui';

// ============================================================================
// HELPERS
// ============================================================================


// Lazy load DevConsolePanel to avoid circular dependencies and reduce initial bundle
const DevConsolePanel = lazy(() => 
  import('../../components/DevConsole/DevConsolePanel').then(module => ({
    default: module.DevConsolePanel
  }))
);

interface CustomVideoConferenceProps {
  onLeave: () => void;
  onClose: () => void;
}

export function CustomVideoConference({
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
  const [isInsightsPanelOpen, setIsInsightsPanelOpen] = useState(false);
  const [transcriptSearchTerm] = useState('');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
  
  // Call memory integration - syncs transcripts to SmartMemory IMMEDIATELY
  // Uses shared API key from room metadata if provided by room creator
  const {
    canUseMemory,
    state: memoryState,
    displayName: _displayName, // Available if needed
    startSession,
    addTurn,
    hasTurn,
    endSession,
    
  } = useCallMemory();

  useCallMemoryStore()
  
  // Track if memory session has been started
  const memorySessionStartedRef = useRef(false);
  
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

  // Start memory session when room connects (if API key available in room metadata)
  useEffect(() => {
    if (!canUseMemory || memorySessionStartedRef.current) {
      return;
    }

    if (connectionState === ConnectionState.Connected) {
      console.log('[CustomVideoConference] Starting memory session');
      memorySessionStartedRef.current = true;
      startSession().catch((err) => {
        console.error('[CustomVideoConference] Failed to start memory session:', err);
        memorySessionStartedRef.current = false;
      });
    }
  }, [canUseMemory, connectionState, startSession]);

  // Handle transcription received - store IMMEDIATELY to working memory
  useEffect(() => {
    if (memoryState !== 'connected') {
      return;
    }

    // Listen for transcription events directly from the room
    const handleTranscriptionReceived = (
      segments: Array<{
        id: string;
        text: string;
        language: string;
        startTime: number;
        endTime: number;
        final: boolean;
        firstReceivedTime: number;
        lastReceivedTime: number;
      }>,
      participant?: Participant
    ) => {
      for (const segment of segments) {
        // Only store final transcriptions
        if (!segment.final) continue;
        
        // Skip if already stored
        if (hasTurn(segment.id)) continue;

        const speakerName = participant?.name || participant?.identity || 'Unknown';
        const isLocal = participant?.isLocal ?? false;

        const turn: TranscriptTurn = {
          id: segment.id,
          participantIdentity: participant?.identity || 'unknown',
          participantName: isLocal ? 'You' : speakerName,
          text: segment.text,
          timestamp: segment.firstReceivedTime || Date.now(),
          isLocal,
        };

        console.log('[CustomVideoConference] 📝 Storing transcription immediately:', {
          id: turn.id,
          speaker: turn.participantName,
          text: turn.text.substring(0, 50),
        });

        // Store immediately
        addTurn(turn).catch((err) => {
          console.error('[CustomVideoConference] Failed to store turn:', err);
        });
      }
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
    };
  }, [room, memoryState, addTurn, hasTurn]);

  // End memory session on unmount
  useEffect(() => {
    return () => {
      if (memorySessionStartedRef.current) {
        console.log('[CustomVideoConference] Ending memory session');
        endSession(true).catch(console.error);
      }
    };
  }, [endSession]);

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
    const agentLkParticipant = participants.find(p => p.isAgent
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
      await navigator.clipboard.writeText(room.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [room.name]);

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
        {/* Header - Compact on mobile */}
        <header className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 bg-gray-800/80 backdrop-blur-sm border-b border-white/5 safe-area-inset-top" role="banner">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Connection status - hidden on very small screens, icon only on mobile */}
            <div className="hidden xs:flex items-center gap-1.5 flex-shrink-0" role="status" aria-label="Connection status: Connected">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
              <span className="hidden sm:inline text-caption2 text-gray-300">Connected</span>
            </div>

            {/* Room name - truncated on mobile */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink">
              <code className="px-2 sm:px-2.5 py-1 bg-gray-700/50 rounded-lg text-[10px] sm:text-caption2 text-gray-300 font-mono truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">
                {room.name}
              </code>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyRoomName}
                className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                title="Copy room name"
              >
                <Copy className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400" />
              </motion.button>
              <AnimatePresence>
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-caption2 text-success hidden sm:inline"
                  >
                    Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Participant count - compact on mobile */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-gray-400 flex-shrink-0">
              <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[10px] sm:text-caption2">
                {humanParticipants.length}
                <span className="hidden sm:inline"> participant{humanParticipants.length !== 1 ? 's' : ''}</span>
              </span>
            </div>
            
            {/* Memory status badge - hidden on mobile */}
            {canUseMemory && (
              <div className="hidden md:block flex-shrink-0">
                <MemoryBadge
                  isActive={memoryState === 'connected'}
                  isSyncing={false}
                />
              </div>
            )}
            
            {/* AI Agent indicator - hidden on small screens */}
            {agentParticipant && (
              <div className="hidden lg:block flex-shrink-0">
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
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* DevConsole Panel Toggle - hidden on mobile */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDevConsolePanelOpen((prev) => !prev)}
              className={`hidden sm:flex p-1.5 rounded-lg transition-colors ${
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
              className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Close window"
              aria-label="Close video call window"
            >
              <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>
          </div>
        </header>

      {/* Main content - vertical layout with main view + bottom strip */}
      <div 
        className="flex-1 flex flex-col min-h-0 p-1.5 sm:p-2 md:p-3 gap-1.5 sm:gap-2 md:gap-3"
        role="main"
        aria-label="Video call main content"
      >
        {/* Main video view - takes most space */}
        <motion.div
          layout
          className={`flex-1 relative bg-gray-800 rounded-xl sm:rounded-2xl overflow-hidden min-h-[200px] ${isShowingScreenShare ? 'ring-2 ring-primary/40' : ''}`}
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
              className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-primary/90 backdrop-blur-sm rounded-full"
            >
              <Monitor className="w-3 sm:w-4 h-3 sm:h-4 text-white" aria-hidden="true" />
              <span className="text-[10px] sm:text-caption2 font-medium text-white">
                <span className="hidden sm:inline">{mainViewParticipant?.name || 'Someone'} is </span>Sharing
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
              <div className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-full bg-gray-600 flex items-center justify-center">
                <User className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 text-gray-400" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />

          {/* Speaker name with badge */}
          {mainViewParticipant && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center gap-1.5 sm:gap-3"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
                <span className="text-xs sm:text-body font-medium text-white max-w-[100px] sm:max-w-none truncate">
                  {mainViewParticipant.name}
                </span>
                {mainViewParticipant.isLocal && (
                  <span className="text-[10px] sm:text-caption2 text-white/70">(You)</span>
                )}
              </div>
              
              {/* Mute indicator badge */}
              <div 
                className={`w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center ${mainViewParticipant.isMuted ? 'bg-gray-700/80' : 'bg-white/20'} backdrop-blur-sm`}
                role="status"
                aria-label={mainViewParticipant.isMuted ? 'Microphone muted' : 'Microphone on'}
              >
                {mainViewParticipant.isMuted ? (
                  <MicOff className="w-3 sm:w-4 h-3 sm:h-4 text-white" aria-hidden="true" />
                ) : (
                  <Mic className="w-3 sm:w-4 h-3 sm:h-4 text-white" aria-hidden="true" />
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
                className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent snap-x snap-mandatory"
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
                        relative flex-shrink-0 w-28 h-20 sm:w-36 sm:h-24 md:w-44 md:h-28 lg:w-52 lg:h-32
                        rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 snap-start
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
                          <div className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 rounded-full bg-gray-600 flex items-center justify-center">
                            <User className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-10 sm:h-12 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />

                      {/* Name */}
                      <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 right-6 sm:right-8 flex items-center gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-caption2 font-medium text-white truncate">
                          {participant.name}
                        </span>
                        {participant.isLocal && (
                          <span className="text-[10px] sm:text-caption2 text-white/60">(You)</span>
                        )}
                      </div>

                      {/* Mic indicator */}
                      <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2" aria-hidden="true">
                        <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full flex items-center justify-center ${participant.isMuted ? 'bg-gray-700/80' : 'bg-white/20'}`}>
                          {participant.isMuted ? (
                            <MicOff className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-white" />
                          ) : (
                            <Mic className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-white" />
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
                    className="relative flex-shrink-0 w-28 h-20 sm:w-36 sm:h-24 md:w-44 md:h-28 lg:w-52 lg:h-32 rounded-lg sm:rounded-xl overflow-hidden bg-gray-800 snap-start"
                    role="listitem"
                    aria-label={`${sidebarParticipants.length - 4} more participants`}
                  >
                    {/* Blurred background from last visible participant if available */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" aria-hidden="true" />
                    
                    {/* Overlay with count */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full">
                        <Users className="w-3 sm:w-4 h-3 sm:h-4 text-white" aria-hidden="true" />
                        <span className="text-xs sm:text-body font-semibold text-white">
                          +{sidebarParticipants.length - 4}
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
        className="flex justify-center pb-2 sm:pb-4 px-1.5 sm:px-0 safe-area-inset-bottom"
        role="toolbar"
        aria-label="Video call controls"
      >
        <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/95 backdrop-blur-md rounded-full shadow-apple-lg border border-white/5 max-w-full overflow-x-auto scrollbar-none">
          {/* Mic */}
          <ControlButton
            icon={isMuted ? MicOff : Mic}
            isActive={isMuted}
            onClick={handleToggleMute}
            label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            size="sm"
          />

          {/* Camera */}
          <ControlButton
            icon={isCameraOn ? Video : VideoOff}
            isActive={!isCameraOn}
            onClick={handleToggleCamera}
            label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            size="sm"
          />

          {/* Participants toggle */}
          <div className="relative">
            <ControlButton
              icon={Users}
              isActive={isSidebarOpen}
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              label={isSidebarOpen ? 'Hide participants' : 'Show participants'}
              size="sm"
            />
            <span 
              className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 flex items-center justify-center px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-semibold text-white bg-primary rounded-full"
              aria-hidden="true"
            >
              {humanParticipants.length}
            </span>
          </div>

          {/* Divider - hidden on very small screens */}
          <div className="hidden xs:block w-px h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1" role="separator" aria-hidden="true" />

          {/* Screen share - hidden on mobile (not supported well) */}
          <div className="hidden sm:block">
            <ControlButton
              icon={isScreenSharing ? MonitorOff : Monitor}
              isActive={isScreenSharing}
              onClick={handleToggleScreenShare}
              label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              size="sm"
            />
          </div>

          {/* Transcript */}
          <ControlButton
            icon={FileText}
            isActive={isTranscriptPanelOpen}
            onClick={() => setIsTranscriptPanelOpen((prev) => !prev)}
            label={isTranscriptPanelOpen ? 'Hide transcript' : 'Show transcript'}
            size="sm"
          />

          {/* Insights - AI-powered search through call memory (hidden on small mobile) */}
          {canUseMemory && (
            <div className="hidden xs:block">
              <ControlButton
                icon={Brain}
                isActive={isInsightsPanelOpen}
                onClick={() => setIsInsightsPanelOpen((prev) => !prev)}
                label={isInsightsPanelOpen ? 'Hide insights' : 'Search insights'}
                size="sm"
              />
            </div>
          )}

          {/* Reactions - self-contained with trigger */}
          <ReactionPickerV2 onSelectReaction={handleReaction} />
          
          {/* Raise hand */}
          <div className="relative">
            <ControlButton
              icon={Hand}
              isActive={isLocalHandRaised}
              onClick={handleToggleRaiseHand}
              label={isLocalHandRaised ? 'Lower hand' : 'Raise hand'}
              size="sm"
            />
            {/* Show indicator when hand is raised */}
            {isLocalHandRaised && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-warning rounded-full border-2 border-gray-800"
                aria-hidden="true"
              />
            )}
          </div>
          
          {/* Device Settings - hidden on small mobile */}
          <div className="hidden xs:block">
            <MediaDeviceSelector />
          </div>
          
          {/* More - only show on mobile for additional options */}
          <div className="sm:hidden">
            <ControlButton
              icon={MoreVertical}
              onClick={() => {}}
              label="More options"
              size="sm"
            />
          </div>

          {/* Divider */}
          <div className="w-px h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1" role="separator" aria-hidden="true" />

          {/* End call */}
          <ControlButton
            icon={PhoneOff}
            isDestructive
            onClick={handleEndCall}
            label="Leave call"
            size="md"
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
                <DevConsolePanel 
                  compact 
                  allowedTabs={['logs', 'network', 'github', 'actions', 'notes', 'settings']}
                />
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
            searchTerm={transcriptSearchTerm}
          />
        )}
      </AnimatePresence>
      
      {/* Insights Panel Sidebar */}
      <AnimatePresence>
        {isInsightsPanelOpen && (
          <InsightsPanel
            isOpen={isInsightsPanelOpen}
            onClose={() => setIsInsightsPanelOpen(false)}
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

