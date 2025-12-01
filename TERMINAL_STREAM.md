# Terminal Stream Integration

Real-time terminal output streaming from VS Code to DevConsole.

## Overview

The Terminal Stream feature allows you to view live terminal output from VS Code directly in your browser's DevConsole panel. This is useful for:

- Monitoring build processes and test runs remotely
- Viewing command output alongside your application logs
- Debugging terminal-based workflows without switching contexts

## ⚡ Managed Terminals (Recommended)

For **guaranteed output streaming**, use **Managed Terminals**. These are terminals created through DevConsole that bypass VS Code's proposed API limitations.

### Why Managed Terminals?

| Feature | Managed Terminals | Existing Terminals |
|---------|------------------|--------------------|
| Output Streaming | ✅ Guaranteed | ⚠️ Requires proposed API |
| Auto-Subscribed | ✅ Yes | ❌ Manual |
| Reliability | ✅ High | ⚠️ Variable |
| ID Format | `managed-1`, `managed-2` | `terminal-0-zsh` |

### Creating a Managed Terminal

```typescript
// From the store
const { createTerminal } = useTerminalStreamStore();

createTerminal({
  terminalName: "Build Terminal",
  cwd: "/path/to/project"
});

// Or directly via service
terminalStream.createTerminal({ terminalName: "My Terminal" });
```

### UI Flow
1. Connect to Terminal Stream server
2. Click **"Create Terminal"** button (or use the "+ New" in dropdown)
3. A managed terminal opens in VS Code with full output capture
4. Output streams immediately - no subscription needed!

## Architecture

```
VS Code (Webhook Copilot)          DevConsole (Chrome Extension)
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Terminal Stream Server │◄──────►│   Terminal Stream Client     │
│  (WebSocket :9091)      │        │   (WebSocket connection)     │
├─────────────────────────┤        ├──────────────────────────────┤
│  • Monitors all terms   │        │  • Connects to server        │
│  • Creates managed terms│        │  • Creates managed terminals │
│  • Captures output      │        │  • Subscribes to terminals   │
│  • Broadcasts via WS    │        │  • Displays output in UI     │
└─────────────────────────┘        └──────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `src/lib/webhookCopilot/terminalStreamService.ts` | WebSocket client service |
| `src/utils/stores/terminalStream.ts` | Zustand store for terminal state |
| `src/components/DevConsole/panels/TerminalPanel.tsx` | UI component |

## API Reference

### Terminal Stream Service

```typescript
import { terminalStream } from '@/lib/webhookCopilot/terminalStreamService';

// Connect to server
terminalStream.connect();

// Check health
const health = await terminalStream.checkHealth();
// { available: true, status: 'ok' }

// Create a managed terminal (RECOMMENDED)
terminalStream.createTerminal({
  terminalName: "Build Terminal",
  cwd: "/path/to/project"  // optional
});

// Send input to a terminal
terminalStream.sendInput('managed-1', 'npm run build\n');

// Subscribe to all existing terminals
terminalStream.subscribeAll();

// Subscribe to specific terminal
terminalStream.subscribe('terminal-0-zsh');

// Disconnect
terminalStream.disconnect();
```

### Store Usage

```typescript
import { useTerminalStreamStore } from '@/utils/stores/terminalStream';

function MyComponent() {
  const {
    connectionStatus,      // 'disconnected' | 'connecting' | 'connected' | 'error'
    terminals,             // TerminalInfo[]
    activeTerminalId,      // string | null
    connect,               // () => void
    disconnect,            // () => void
    createTerminal,        // (options?) => void  - Creates managed terminal
    sendInput,             // (terminalId, data) => void
    subscribeAll,          // () => void
    getActiveTerminalOutput, // () => TerminalOutputLine[]
  } = useTerminalStreamStore();
  
  // ...
}
```

## Settings

Terminal Stream settings are available in Settings → Webhook Copilot:

| Setting | Default | Description |
|---------|---------|-------------|
| WebSocket URL | `ws://localhost:9091` | Terminal Stream server URL |
| Max Lines | 1000 | Maximum lines to keep per terminal |
| Strip ANSI | false | Remove color/formatting codes |
| Auto-Subscribe | true | Subscribe to all terminals on connect |
| Auto-Connect | false | Connect when panel opens |

## Message Protocol

### Client → Server

| Type | Fields | Description |
|------|--------|-------------|
| `list` | - | Request terminal list |
| `create_terminal` | `terminalName`, `cwd?` | **Create managed terminal** |
| `input` | `terminalId`, `data` | Send input to terminal |
| `subscribe` | `terminalId` | Subscribe to one terminal |
| `subscribe_all` | - | Subscribe to all terminals |
| `unsubscribe` | `terminalId` | Stop receiving from terminal |

### Server → Client

| Type | Fields | Description |
|------|--------|-------------|
| `terminals` | `terminals[]` | List of available terminals |
| `terminal_created` | `terminalId`, `terminalName` | **Managed terminal created** |
| `output` | `terminalId`, `terminalName`, `data`, `timestamp` | Terminal output |
| `terminal_opened` | `terminalId`, `terminalName` | New terminal created |
| `terminal_closed` | `terminalId`, `terminalName` | Terminal closed |
| `subscribed` | `terminalId` | Subscription confirmed |
| `error` | `data` | Error message |

## Prerequisites

1. **Webhook Copilot Extension**: Must be installed in VS Code
2. **Terminal Stream Enabled**: Ensure the feature is enabled in Webhook Copilot settings
3. **Port 9091 Available**: The WebSocket server runs on port 9091

## Quick Start

### Option 1: Managed Terminal (Recommended)
1. Open VS Code with Webhook Copilot extension active
2. Open DevConsole in your browser's DevTools
3. Navigate to the **Terminal** tab
4. Click **Connect to Terminal Stream**
5. Click **Create Terminal** to create a managed terminal
6. Output streams immediately!

### Option 2: Existing Terminals
1. Connect to Terminal Stream server
2. Use the dropdown to select an existing terminal
3. Note: Requires VS Code's proposed API which may not work in all environments

## Features

### Real-time Output
Output streams as it happens, with optional timestamps for each line.

### Managed Terminal Badges
Managed terminals are marked with a ⚡ icon and "managed" badge for easy identification.

### ANSI Color Support
Terminal colors and formatting are preserved and rendered in the output.

### Multi-terminal Support
Switch between multiple terminals using the dropdown selector.

### Auto-scroll
Automatically scrolls to new output, with pause detection when you scroll up.

### Live Indicator
Green pulsing dot shows when output is actively streaming.

### Configurable Buffer
Set how many lines to keep per terminal (100-10,000).

## Troubleshooting

### Cannot Connect
- Verify VS Code is running with Webhook Copilot active
- Check if Terminal Stream is enabled in Webhook Copilot settings
- Test the health endpoint: `curl http://localhost:9091/health`
- Check for port conflicts: `lsof -ti:9091`

### No Output
- Ensure you've subscribed (click Connect, which auto-subscribes)
- Verify the terminal has output (try running `echo test`)
- Check the terminal selector for the correct terminal

### High Memory Usage
- Reduce Max Lines per Terminal in settings
- Clear terminal output periodically
- Enable Strip ANSI Codes to reduce data size

## Related Documentation

- [WEBHOOK_COPILOT_INTEGRATION.md](./WEBHOOK_COPILOT_INTEGRATION.md) - Webhook Copilot overview
- [SETTINGS_GUIDE.md](./SETTINGS_GUIDE.md) - Settings configuration
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
