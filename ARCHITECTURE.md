# DevConsole Architecture

## Overview

DevConsole is a Chrome extension that provides developer tools with console logging, network monitoring, GraphQL exploration, and AI-powered features.

## Architecture

```
┌─────────────────┐
│   Web Page      │
│  (page-hook)    │ ← Intercepts console & network
└────────┬────────┘
         │ window.postMessage
         ↓
┌─────────────────┐
│ Content Script  │ ← Relays messages
└────────┬────────┘
         │ chrome.runtime.sendMessage
         ↓
┌─────────────────┐
│   Background    │ ← Stores data
│ Service Worker  │
└────────┬────────┘
         │ chrome.runtime.sendMessage
         ↓
┌─────────────────┐
│  DevTools Panel │ ← Displays UI
└─────────────────┘
```

## Key Components

### 1. Page-Level Hooks
**Location:** `src/content/page-hook-logic.ts`

- Runs in the page's context
- Intercepts `console.*` and network requests (fetch/XHR)
- Posts messages to window for content script

### 2. Content Script
**Location:** `src/content/index.ts`

- Acts as a message relay
- Listens to window messages from page hooks
- Batches and sends to background script
- Filters sensitive data

### 3. Background Service Worker
**Location:** `src/background/index.ts`

- Central state management
- Stores logs and network requests
- Handles message routing
- Syncs with chrome.storage

### 4. DevTools Panel
**Location:** `src/devtools/`

- React-based UI
- Connects to background via messaging bridge
- Real-time updates from background
- Tab-specific data filtering

## Core Services

### Messaging Service
**Location:** `src/core/messaging/`

Type-safe wrapper around `chrome.runtime.sendMessage`:

```typescript
import { MessageSender } from '@/core/messaging';

// Send a message
await MessageSender.send({
  type: 'CONSOLE_LOG',
  payload: { ... }
});

// Receive messages
MessageReceiver.on('CONSOLE_LOG', (message) => {
  // Handle message
});
```

### Storage Service
**Location:** `src/core/storage/`

Efficient storage with caching:

```typescript
import { StorageService } from '@/core/storage';

// Get value
const value = await StorageService.get('devConsole_logs');

// Set value (debounced)
await StorageService.set('devConsole_logs', logs);

// Set immediately
await StorageService.set('devConsole_logs', logs, true);
```

## Data Flow

### Console Logs

1. **Page Hook** intercepts `console.log()`
2. **Content Script** receives via `window.postMessage`
3. **Background** stores and broadcasts
4. **DevTools** displays in UI

### Network Requests

1. **Page Hook** intercepts `fetch()` / `XMLHttpRequest`
2. **Content Script** batches requests
3. **Background** stores and deduplicates
4. **DevTools** shows in Network tab

## File Structure

```
src/
├── background/          # Service worker
│   └── index.ts
├── content/             # Content scripts
│   ├── index.ts         # Main relay
│   └── page-hook-logic.ts  # Page hooks
├── devtools/            # DevTools panel
│   ├── bridge.ts        # Background bridge
│   └── DevToolsPanel.tsx
├── components/          # React components
│   └── DevConsole/      # Main console UI
├── core/                # Core services
│   ├── messaging/       # Message handling
│   ├── storage/         # Storage with cache
│   └── performance/     # Performance utilities
├── lib/                 # Libraries
│   └── devConsole/      # Console interceptors
├── hooks/               # React hooks
├── utils/               # Utilities
│   └── stores/          # Zustand stores
└── types/               # TypeScript types
```

## Best Practices

### 1. Message Passing
- Always use the messaging service
- Handle errors gracefully
- Use batching for high-frequency messages

### 2. Storage
- Use the storage service for persistence
- Cache frequently accessed data
- Debounce writes to reduce API calls

### 3. Performance
- Lazy load large components
- Use React.memo for expensive renders
- Batch DOM updates
- Limit stored data (maxLogs setting)

### 4. Error Handling
- Catch and log all errors
- Provide fallbacks for missing data
- Handle extension context invalidation

## Common Tasks

### Adding a New Message Type

1. Define type in `src/core/messaging/types.ts`
2. Add handler in `src/background/index.ts`
3. Send from content/page using messaging service
4. Receive in DevTools bridge if needed

### Adding a New Feature Tab

1. Create component in `src/components/DevConsole/`
2. Add tab to `CONSOLE_TABS` in `DevConsolePanel.tsx`
3. Add icon from `lucide-react`
4. Implement tab content with data from store

### Debugging

- Check background service worker console
- Use Chrome extension debugging tools
- Enable verbose logging in development
- Check message flow with console.log

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

## Performance Considerations

### Current Optimizations

- Message batching (120ms window)
- Storage debouncing (500ms)
- React.memo for expensive components
- Virtualized lists for large datasets
- Lazy loading for heavy components

### Memory Management

- Limit log history (default: 1000 entries)
- Clear data on tab navigation
- Remove data on tab close
- Debounce storage writes

## Security

- All data captured for local debugging (no redaction - this is a client-side debugging tool)
- Validate message sources
- Use Content Security Policy
- Limit permissions to necessary APIs

## Future Improvements

- [ ] IndexedDB for large datasets
- [ ] Service worker state persistence
- [ ] Advanced filtering and search
- [ ] Export/import functionality
- [ ] Performance profiling
- [ ] Custom log formatters
