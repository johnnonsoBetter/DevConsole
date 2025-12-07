/**
 * Video Call Popup Entry Point
 * This runs in a separate popup window with full media permissions
 */

import '@livekit/components-styles';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { VideoCallApp } from './VideoCallApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VideoCallApp />
  </React.StrictMode>
);
