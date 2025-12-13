/**
 * Video Call Popup Entry Point
 * This runs in a separate popup window with full media permissions
 */

import '@livekit/components-styles';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { initExtensionConsoleCapture } from '../utils/extensionConsoleCapture';
import { VideoCallApp } from './VideoCallApp';

// Initialize console capture for extension pages
// This ensures console logs from the video call are captured in DevConsole
initExtensionConsoleCapture();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VideoCallApp />
  </React.StrictMode>
);
