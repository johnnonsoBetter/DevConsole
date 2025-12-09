/**
 * InCallView Component
 * Active video call interface with LiveKit room
 */

import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { useCallback, useState } from 'react';
import { CustomVideoConference } from './CustomVideoConference';
import { LiveKitErrorBoundary } from './LiveKitErrorBoundary';

// Override LiveKit's font styles to use system fonts
const liveKitFontOverride = `
  [data-lk-theme] {
    --lk-font-family: Plus Jakarta Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
  }
  
  [data-lk-theme] *,
  [data-lk-theme] *::before,
  [data-lk-theme] *::after {
    font-family: Plus Jakarta Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  }
`;

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
  const [retryKey, setRetryKey] = useState(0);
  
  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
  }, []);
  
  const handleError = useCallback((error: Error) => {
    console.error('[InCallView] LiveKit error:', error);
    onError(error);
  }, [onError]);

  return (
    <div 
      className="h-screen w-screen bg-gray-900"
      role="application"
      style={{
        fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
      }}
      aria-label="Video call application"
    >
      {/* Override LiveKit's default font styles */}
      <style dangerouslySetInnerHTML={{ __html: liveKitFontOverride }} />
      
      <LiveKitErrorBoundary
        key={retryKey}
        onClose={onClose}
        onRetry={handleRetry}
        fallbackMessage="Unable to connect to the video call. Please check your connection and try again."
      >
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={true}
          audio={true}
          connectOptions={{
            autoSubscribe: true,
          }}
          onDisconnected={onDisconnected}
          onError={handleError}
          style={{ height: '100%', fontFamily: "Plus Jakarta Sans", }}
          data-lk-theme="default"
          
        >
          <CustomVideoConference
            roomName={roomName}
            onLeave={onDisconnected}
            onClose={onClose}
          />
        </LiveKitRoom>
      </LiveKitErrorBoundary>
    </div>
  );
}
