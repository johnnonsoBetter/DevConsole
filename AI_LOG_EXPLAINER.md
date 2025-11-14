# AI Log Explainer Feature

## Overview

The **AI Log Explainer** feature provides intelligent, context-aware explanations of console logs using AI. When enabled, developers can click a button to get instant insights about errors, warnings, and other console messages.

## Features

### 🧠 Smart Analysis
- **Error Diagnosis**: Identifies root causes of errors with stack trace analysis
- **Warning Insights**: Explains why warnings appear and their implications
- **Info Context**: Provides context for info and debug logs
- **Severity Assessment**: Rates issues as low, medium, high, or critical

### ⚡ Real-time Streaming
- **Live Feedback**: See explanations generated in real-time
- **Progressive Display**: Content appears as it's generated
- **Better UX**: No waiting for complete response before seeing results

### 🎯 Actionable Insights
- **Possible Causes**: List of potential reasons for the log
- **Suggested Fixes**: Concrete steps to resolve or investigate
- **Technical Details**: Deep dive into what's happening
- **Best Practices**: References to common patterns and solutions

### 🔌 Provider Agnostic
Works with any configured AI provider:
- OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku)
- Google AI (Gemini 2.0 Flash, Gemini 1.5 Pro)
- xAI (Grok)
- Mistral AI
- Groq
- And more via AI Gateway

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DevConsole UI                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  LogDetailsContent                                     │ │
│  │  • Shows "Explain with AI" button                     │ │
│  │  • Displays explanation with LogExplanation component │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Services Layer                              │
│  ┌──────────────────┐         ┌────────────────────────┐   │
│  │  LogExplainer    │──────▶  │     AIClient           │   │
│  │  • Formats log   │         │  • Handles provider    │   │
│  │  • Builds prompt │         │  • Manages streaming   │   │
│  │  • Parses result │         │  • Error handling      │   │
│  └──────────────────┘         └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Providers                             │
│  • OpenAI API          • Anthropic API                      │
│  • Google AI           • AI Gateway (recommended)           │
│  • xAI, Mistral, Groq, and more                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action**: Developer clicks "Explain with AI" button on a selected log
2. **Preparation**: Log data (message, args, stack trace, source) is formatted
3. **AI Request**: LogExplainer sends structured prompt to AI via AIClient
4. **Streaming**: AI response streams back in real-time chunks
5. **Display**: LogExplanation component shows streaming text
6. **Parsing**: Complete response is parsed into structured sections
7. **Enhancement**: Explanation shows summary, causes, fixes, and severity

## Usage

### Setup

1. **Enable AI Features**
   - Go to Settings tab → AI Provider Settings
   - Toggle "AI Features" to On

2. **Choose Provider Method**
   - **Option A: AI Gateway (Recommended)**
     - Enable "Use AI Gateway"
     - Add your Vercel AI Gateway API key
     - Automatic fallbacks and unified access
   
   - **Option B: Direct Provider**
     - Select your AI provider (OpenAI, Anthropic, etc.)
     - Add provider-specific API key
     - Direct API calls to provider

3. **Select Model**
   - Choose from available models
   - Consider cost vs. capability
   - Recommended: GPT-4o-mini or Claude 3 Haiku for speed

### Using the Feature

1. **Navigate to Logs Tab**
   - View console logs in the DevConsole
   
2. **Select a Log**
   - Click any log entry to see details
   - Works with errors, warnings, info, and debug logs

3. **Explain**
   - Click the "Explain with AI" button (purple gradient)
   - Watch as explanation streams in real-time
   - Sparkle icon indicates AI is active

4. **Review Insights**
   - Read the summary for quick understanding
   - Expand "Possible Causes" for root cause analysis
   - Check "Suggested Fixes" for actionable solutions
   - Note the severity rating

5. **Close or Re-explain**
   - Click × to dismiss explanation
   - Button reappears to explain again if needed

## Components

### LogExplainer Service
**Location**: `src/lib/ai/services/logExplainer.ts`

Main service for explaining logs:
- `explainLog(log)`: Get complete explanation (non-streaming)
- `streamExplanation(log)`: Stream explanation in real-time
- Formats log data with context (stack, args, source)
- Parses AI response into structured sections

### AIClient Service
**Location**: `src/lib/ai/services/aiClient.ts`

Unified client for AI providers:
- `generateText(options)`: Single completion request
- `streamText(options)`: Streaming completion
- Supports AI Gateway and direct provider APIs
- Handles OpenAI, Anthropic, and more

### LogExplanation Component
**Location**: `src/components/DevConsole/LogExplanation.tsx`

Visual display component:
- Shows loading states with animations
- Displays streaming text with cursor
- Structured output with collapsible sections
- Severity badges and icons
- Error handling with user-friendly messages

## Configuration

### AI Settings Store
**Location**: `src/utils/stores/aiSettings.ts`

Persisted settings:
```typescript
{
  enabled: boolean;           // Master switch for AI features
  provider: AIProvider;       // Selected provider
  model: string;              // Model ID
  apiKey: string;             // Provider API key
  temperature: number;        // 0.0 - 2.0 (default: 0.3 for logs)
  maxTokens: number;          // Max response length
  useGateway: boolean;        // Use AI Gateway?
  gatewayApiKey: string;      // Gateway API key
}
```

### Prompt Engineering

The system prompt ensures consistent, developer-friendly explanations:
- Expert software engineer persona
- Focus on actionable insights
- Structured markdown format
- Clear section separation
- Professional but friendly tone

## Best Practices

### For Users

1. **Start with AI Gateway**: Easier setup, automatic fallbacks
2. **Choose Fast Models**: GPT-4o-mini, Claude Haiku for quick explanations
3. **Use on Errors First**: Most value for bugs and issues
4. **Review Suggestions**: AI insights are helpful but verify before implementing
5. **Combine with Stack Trace**: Use both for complete understanding

### For Developers

1. **Keep Prompts Focused**: Include only relevant log context
2. **Handle Streaming**: Show progress to improve perceived performance
3. **Parse Intelligently**: Extract structured data from markdown responses
4. **Error Gracefully**: Show clear error messages if AI fails
5. **Respect Limits**: Use lower temperature for consistent explanations

## API Examples

### Basic Explanation
```typescript
import { createLogExplainer } from '@/lib/ai/services/logExplainer';

const explainer = createLogExplainer(aiSettings);

const explanation = await explainer.explainLog({
  level: 'error',
  message: 'Cannot read property "id" of undefined',
  args: [{ user: null }],
  stack: 'TypeError: Cannot read property...',
  timestamp: Date.now()
});

console.log(explanation.summary);
console.log(explanation.suggestedFixes);
```

### Streaming Explanation
```typescript
for await (const chunk of explainer.streamExplanation(logData)) {
  // Update UI with each chunk
  displayText += chunk;
}
```

### Direct AI Client
```typescript
import { createAIClient } from '@/lib/ai/services/aiClient';

const client = createAIClient(aiSettings);

const result = await client.generateText({
  prompt: 'Explain this error...',
  systemPrompt: 'You are a debugging assistant',
  temperature: 0.3,
  maxTokens: 1500
});
```

## Performance

### Metrics
- **Initial Response**: ~200-500ms (streaming starts)
- **Complete Response**: ~2-4 seconds (depending on log complexity)
- **Token Usage**: ~300-800 tokens per explanation
- **Cost**: ~$0.0001 - $0.0005 per explanation (using mini models)

### Optimization Tips
1. Use streaming for better perceived performance
2. Cache explanations for identical logs (future enhancement)
3. Batch multiple logs for bulk analysis (future enhancement)
4. Use faster models (GPT-4o-mini, Claude Haiku)

## Troubleshooting

### "Failed to generate explanation"
- Check AI settings are enabled
- Verify API key is correct
- Ensure internet connection
- Check provider rate limits

### "AI Gateway API key not configured"
- Go to Settings → AI Provider Settings
- Enable "Use AI Gateway"
- Add your Vercel AI Gateway API key

### Button doesn't appear
- Ensure AI features are enabled in settings
- Verify API key is configured (gateway or provider)
- Check that a log is selected

### Streaming is slow
- Try a faster model (GPT-4o-mini instead of GPT-4o)
- Check internet connection speed
- Consider using AI Gateway for better routing

## Future Enhancements

- [ ] Caching for identical logs
- [ ] Batch explanation for multiple logs
- [ ] Custom prompt templates
- [ ] Explanation history
- [ ] Copy explanation to clipboard
- [ ] Export explanations with logs
- [ ] Suggested code fixes with diffs
- [ ] Link to related documentation
- [ ] Multi-language support
- [ ] Voice-based explanations

## Security

- **Local Storage**: API keys stored in browser extension storage
- **No Server**: Keys never sent to our servers
- **Direct Calls**: Requests go directly to AI provider or gateway
- **User Control**: Full control over when AI is used
- **Transparent**: Open source implementation

## Support

For issues or questions:
- Check Settings → AI Provider Settings for configuration status
- Review error messages in browser console
- Verify API key permissions with provider
- Check rate limits and billing status

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: ✅ Production Ready
