# Rooms with Memory - Implementation Guide

## Overview

This feature transforms LiveKit video calls into intelligent "Team Sync Rooms" with persistent memory powered by Raindrop SmartMemory. Each call is a recorded episode; transcripts fuel a SmartMemory "brain" that remembers, summarizes, and surfaces context.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   CustomVideoConference                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  useTranscription()        useCallMemoryBridge()            │ │
│  │        │                          │                          │ │
│  │        ▼                          ▼                          │ │
│  │  TranscriptMessage[]    TranscriptMemoryStream               │ │
│  │        │                          │                          │ │
│  │        └──────────────────────────┼─────────────────────────┘ │
│  │                                   ▼                           │
│  │                           SmartMemory Session                 │
│  │                           (via Raindrop SDK)                  │
└──┼───────────────────────────────────────────────────────────────┘
   │
   ▼
LiveKit Room                                      Raindrop Backend
(Real-time STT)                                  ┌──────────────────┐
                                                 │ Working Memory   │
                                                 │ Episodic Memory  │
                                                 │ Semantic Memory  │
                                                 │ Procedural Memory│
                                                 └──────────────────┘
```

## Data Flow

1. **LiveKit Agent** (Deepgram STT) → Real-time transcription
2. **useTranscription** hook → Consolidates transcript messages
3. **useCallMemoryBridge** → Pipes transcripts to SmartMemory
4. **TranscriptMemoryStream** → Batches & stores with retry logic
5. **SmartMemory Working Memory** → Active call context
6. **On call end** → Flush to Episodic Memory (searchable episode)

## Files Created

### Core Library (`src/videocall/lib/`)

| File | Purpose |
|------|---------|
| `callMemoryTypes.ts` | TypeScript types for memory system |
| `TranscriptMemoryStream.ts` | Debounced batch storage with retry |
| `index.ts` | Library exports |

### Hooks (`src/videocall/hooks/`)

| File | Purpose |
|------|---------|
| `useCallMemory.ts` | SmartMemory session lifecycle management |

### Components (`src/videocall/components/`)

| File | Purpose |
|------|---------|
| `CallMemoryBridge.tsx` | Bridges transcription → memory |
| `MemoryStatusIndicator.tsx` | UI status badges |

### Raindrop Manifest

| File | Purpose |
|------|---------|
| `video-call-memory/raindrop.manifest` | SmartMemory deployment config |

## Deployment Steps

### 1. Deploy the SmartMemory Application

```bash
cd video-call-memory
raindrop build
raindrop deploy
```

After deployment, you'll get a version ID. Update it in `callMemoryTypes.ts`:

```typescript
export const CALL_MEMORY_CONFIG = {
  name: 'call-memory',
  applicationName: 'video-call-memory',
  version: '<YOUR_DEPLOYED_VERSION_ID>',  // ← Update this!
  // ...
};
```

### 2. Configure Raindrop in Extension Settings

1. Open DevConsole Settings → Raindrop tab
2. Enable Raindrop integration
3. Add your Raindrop API key

### 3. Rebuild Extension

```bash
npm run build
```

### 4. Reload Extension in Chrome

1. Go to `chrome://extensions/`
2. Click refresh on the DevConsole extension

## Usage

### Automatic Memory

When Raindrop is configured:
- Memory session starts automatically when you join a call
- Transcripts are batched and synced every 3 seconds
- A "Memory" badge appears in the call header showing status
- On call end, session is flushed to episodic memory

### Memory States

| State | Badge Color | Meaning |
|-------|-------------|---------|
| `connected` | Green | Memory active, ready to sync |
| `syncing` | Blue (pulsing) | Currently storing batch |
| `flushing` | Purple | Saving to episodic memory |
| `error` | Red | Sync failed (with retry) |
| `not-configured` | Gray | Raindrop not set up |

## Memory Structure

### Session Metadata (timeline: `metadata`)

```json
{
  "type": "session_metadata",
  "roomId": "team-room-123",
  "roomName": "Team Sync",
  "participants": ["Alice", "Bob"],
  "localParticipantName": "Alice",
  "startedAt": "2024-01-15T10:00:00Z"
}
```

### Transcript Batch (timeline: `conversation`)

```json
{
  "type": "transcript_batch",
  "roomId": "team-room-123",
  "batch": [
    {
      "id": "msg-1",
      "participantIdentity": "alice",
      "participantName": "Alice",
      "text": "Let's discuss the API design.",
      "timestamp": 1705312800000,
      "isLocal": true
    }
  ],
  "batchIndex": 0,
  "batchTimestamp": "2024-01-15T10:00:05Z",
  "speakerCount": 2
}
```

## Error Handling

The `TranscriptMemoryStream` includes:
- **Retry Queue**: Failed writes retry up to 3 times
- **Exponential Backoff**: Delay doubles each retry
- **Local Backup**: Falls back to localStorage if retries exhausted
- **Callbacks**: `onError`, `onRetry` for UI feedback

## Future Enhancements

### Phase 2: Enhanced Storage
- Multiple timelines (action-items, decisions, questions)
- Real-time action item detection
- Topic markers for navigation

### Phase 3: Query & Recall
- Search within current call: `searchSession(query)`
- Search past calls: `searchEpisodicMemory(query)`
- "What did we discuss about X?" queries

### Phase 4: Intelligence Layer
- AI-powered post-call summaries
- Semantic memory extraction (decisions → permanent knowledge)
- Procedural templates for meeting workflows

## API Reference

### useCallMemory Hook

```typescript
const {
  isConfigured,    // Raindrop configured?
  isAvailable,     // Configured + session active?
  state,           // Current memory state
  sessionInfo,     // Active session details
  syncStats,       // Batches/turns stored
  error,           // Error message if any
  
  startSession,    // (roomId, roomName, displayName) => Promise<boolean>
  addTranscripts,  // (turns: TranscriptTurn[]) => void
  endSession,      // (flush?: boolean) => Promise<boolean>
  flushBatch,      // () => Promise<void>
  searchSession,   // (query: string) => Promise<string[]>
  clearError,      // () => void
} = useCallMemory();
```

### useCallMemoryBridge Hook

```typescript
const {
  isConfigured,
  isActive,
  sessionId,
  state,
  syncStats,
  error,
} = useCallMemoryBridge({
  roomName: 'Team Sync',
  displayName: 'Alice',
  enabled: true,  // Toggle memory on/off
});
```

## Troubleshooting

### Memory Not Starting
- Check Settings → Raindrop is enabled with valid API key
- Verify `CALL_MEMORY_CONFIG.version` matches deployed version
- Check browser console for `[useCallMemory]` logs

### Sync Errors
- Check network connectivity
- Verify Raindrop API key hasn't expired
- Look for `[TranscriptMemoryStream]` error logs

### Badge Not Showing
- Ensure Raindrop is configured in settings
- Check `callMemory.isConfigured` is true in component

## Testing

1. Configure Raindrop with valid API key
2. Start a video call
3. Speak to generate transcriptions
4. Watch for "Memory" badge status changes
5. End call and verify flush completes
6. (Future) Query episodic memory to verify episode created
