/**
 * InCallView Component
 * Active video call interface with LiveKit room
 */

import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { CustomVideoConference } from './CustomVideoConference';

interface InCallViewProps {
  token: string;
  roomName: string;
  serverUrl: string;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export function InCallView({
  token,
  roomName,
  serverUrl,
  onDisconnected,
  onError,
  onClose,
}: InCallViewProps) {
  return (
    <div className="h-screen w-screen bg-gray-900">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={onDisconnected}
        onError={onError}
        style={{ height: '100%' }}
        data-lk-theme="default"
      >
        <CustomVideoConference
          roomName={roomName}
          onLeave={onDisconnected}
          onClose={onClose}
        />
      </LiveKitRoom>
    </div>
  );
}
