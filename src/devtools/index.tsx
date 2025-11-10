import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import DevToolsPanel from './DevToolsPanel';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <DevToolsPanel />
  </React.StrictMode>
);