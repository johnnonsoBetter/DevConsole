# DevConsole LiveKit Agent

This is a LiveKit Agent that provides real-time speech-to-text transcription for video calls. It uses Deepgram for STT and automatically publishes transcriptions to the `lk.transcription` topic, which is consumed by the `useTranscriptions` hook in the frontend.

## Setup

### 1. Install Dependencies

```bash
cd livekit-agent
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

- **LIVEKIT_URL**: Your LiveKit Cloud WebSocket URL (e.g., `wss://your-project.livekit.cloud`)
- **LIVEKIT_API_KEY**: Your LiveKit API key
- **LIVEKIT_API_SECRET**: Your LiveKit API secret
- **DEEPGRAM_API_KEY**: Your Deepgram API key for transcription

Get LiveKit credentials from: https://cloud.livekit.io
Get Deepgram API key from: https://console.deepgram.com

### 3. Download Required Models

Before running the agent, download the required models (Silero VAD):

```bash
npm run download-files
```

### 4. Run the Agent Locally (Development)

```bash
npm run dev
```

The agent will connect to LiveKit Cloud and wait for rooms to join.

## Deploying to LiveKit Cloud

LiveKit Cloud handles all the infrastructure for you. No Dockerfile needed!

### Prerequisites

1. Install the LiveKit CLI:
   ```bash
   brew install livekit-cli  # macOS
   # or download from https://github.com/livekit/livekit-cli
   ```

2. Authenticate with LiveKit Cloud:
   ```bash
   lk cloud auth
   ```

### Deploy Your Agent

1. Navigate to this directory:
   ```bash
   cd livekit-agent
   ```

2. Create and deploy the agent:
   ```bash
   lk agent create
   ```
   This will:
   - Register your agent with LiveKit Cloud
   - Create a `livekit.toml` configuration file
   - Build and deploy your agent automatically

3. For subsequent deployments (after code changes):
   ```bash
   lk agent deploy
   ```

### Monitor Your Agent

- Check agent status:
  ```bash
  lk agent status
  ```

- View agent logs:
  ```bash
  lk agent logs
  ```

- Rollback to previous version (paid plans only):
  ```bash
  lk agent rollback
  ```

## How It Works

1. When a video call room is created, the agent automatically joins
2. The agent listens to all participant audio streams
3. Speech is transcribed in real-time using Deepgram
4. Transcriptions are published to the `lk.transcription` topic
5. The DevConsole frontend receives transcriptions via the `useTranscriptions` hook

## Frontend Integration

The frontend uses the `useTranscriptions` hook from `@livekit/components-react`:

```tsx
import { useTranscriptions } from '@livekit/components-react';

function TranscriptPanel() {
  const transcriptions = useTranscriptions();
  
  return (
    <div>
      {transcriptions.map((t, i) => (
        <p key={i}>{t.text}</p>
      ))}
    </div>
  );
}
```

## Troubleshooting

### Agent not joining rooms
- Verify your LIVEKIT_URL, API_KEY, and API_SECRET are correct
- Check that agent dispatch is enabled in your LiveKit Cloud project
- Run `lk agent status` to check if the agent is running

### No transcriptions appearing
- Verify DEEPGRAM_API_KEY is set correctly
- Check browser console for errors in useTranscriptions hook
- Ensure participants have microphone enabled
- Check agent logs with `lk agent logs`

### Transcription delay
- Deepgram nova-3 provides low latency
- `interimResults: true` is enabled for real-time feedback
- Check your network connection

## References

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Text & Transcriptions Guide](https://docs.livekit.io/agents/build/text/)
- [Deploying to LiveKit Cloud](https://docs.livekit.io/agents/ops/deployment/)
- [useTranscriptions Hook](https://docs.livekit.io/reference/components/react/hook/usetranscriptions/)
