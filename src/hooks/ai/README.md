# AI Hooks

Custom React hooks for Chrome's Built-in AI APIs (Gemini Nano).

## Available Hooks

### `usePromptModelAvailability`

Monitor and control the Prompt API (Gemini Nano) availability and download state.

#### Usage

```tsx
import { usePromptModelAvailability } from 'src/hooks/ai'

function MyComponent() {
  const {
    availability, // Current state: "unknown" | "unavailable" | "after-download" | "downloading" | "readily"
    isReady, // true if model is readily available
    isDownloading, // true if currently downloading
    isDownloadable, // true if download is available
    progress, // Download progress percentage (0-100)
    checkAvailability, // Function to manually recheck
    downloadModel, // Function to trigger download
  } = usePromptModelAvailability()

  // Auto-check on mount
  if (availability === 'unknown') {
    return <div>Checking AI availability...</div>
  }

  // Model not available
  if (availability === 'unavailable') {
    return <div>AI not available on this device</div>
  }

  // Model needs download
  if (availability === 'after-download') {
    return <button onClick={downloadModel}>Download AI Model (Required)</button>
  }

  // Model downloading
  if (isDownloading) {
    return <div>Downloading model... {progress}%</div>
  }

  // Model ready
  if (isReady) {
    return <div>AI is ready to use!</div>
  }
}
```

#### States Explained

| State            | Description                              |
| ---------------- | ---------------------------------------- |
| `unknown`        | Initial state, checking availability     |
| `unavailable`    | AI not supported on this device/browser  |
| `after-download` | AI available but requires download first |
| `downloading`    | Model currently downloading              |
| `readily`        | Model ready to use immediately           |

#### API Reference

**Returns:**

- `availability: PromptAPIAvailability` - Current availability state
- `isReady: boolean` - Convenience flag for "readily" state
- `isDownloading: boolean` - Convenience flag for "downloading" state
- `isDownloadable: boolean` - Convenience flag for "after-download" state
- `progress: number | null` - Download progress (0-100) or null
- `checkAvailability: () => Promise<void>` - Manually recheck availability
- `downloadModel: () => Promise<Session>` - Trigger download and create session

#### Browser Support

- **Chrome 138+** on desktop (Windows, Mac, Linux)
- Requires **~22GB free disk space** for model download
- Not available in incognito mode
- Requires user gesture for first download

#### Related Documentation

- [Chrome Prompt API Docs](https://developer.chrome.com/docs/ai/prompt-api)
- [Built-in AI Overview](https://developer.chrome.com/docs/ai/built-in)
