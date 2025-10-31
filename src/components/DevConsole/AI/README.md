# AI Components - Log Analyzer

## 📁 Directory Structure

```
web/src/
├── components/DevConsole/AI/          # AI UI Components
│   ├── index.ts                       # Barrel exports
│   ├── types.ts                       # Shared TypeScript types
│   ├── AIPowerBadge.tsx              # AI status indicator
│   ├── AIActionButton.tsx            # Consistent AI action button
│   ├── AIDownloadProgress.tsx        # Model download progress
│   ├── AIInsightPanel.tsx            # AI-generated insights display
│   ├── AIUnsupportedNotice.tsx       # Browser compatibility notice
│   ├── AIFirstUsePrompt.tsx          # First-time activation UI
│   └── CopyAIPromptButton.tsx        # Copy prompt for external AI
├── hooks/
│   └── useAI.ts                      # AI state management hook
└── lib/devConsole/
    └── aiService.ts                  # Core AI service
```

## 🎯 Overview

The AI Log Analyzer provides intelligent, context-aware analysis of **all log entries** (not just errors) using Chrome's built-in AI (Gemini Nano). It analyzes logs based on their level and content to provide relevant insights, explanations, and actionable information.

## 🔬 Log Analysis Features

### Multi-Level Log Analysis

The AI analyzer adapts its analysis based on log level:

- **Error Logs**: Explains causes, provides fixes, identifies patterns
- **Warning Logs**: Explains implications, suggests preventive actions
- **Info/Log**: Explains system behavior and state changes
- **Debug**: Explains debugging information and system state
- **UI/DB/API**: Context-aware analysis for specific subsystems

## 📦 Component Overview

### AIPowerBadge

**Purpose:** Display AI availability status in the DevConsole header

**Props:**

- `status`: 'available' | 'downloading' | 'downloadable' | 'unavailable'
- `progress?`: Download progress percentage (0-100)

**Usage:**

```tsx
import { AIPowerBadge } from './AI'
;<AIPowerBadge status={aiAvailability} progress={50} />
```

---

### AIActionButton

**Purpose:** Consistent button for triggering AI actions

**Props:**

- `onClick`: Function to call when clicked
- `loading?`: Show loading state
- `disabled?`: Disable button
- `label?`: Button text (default: "AI Summarize")
- `loadingLabel?`: Loading text (default: "Analyzing...")
- `variant?`: 'primary' | 'secondary' | 'success'
- `size?`: 'sm' | 'md'

**Usage:**

```tsx
import { AIActionButton } from './AI'
;<AIActionButton
  onClick={handleAISummarize}
  loading={isGeneratingAI}
  label="AI Analyze"
  variant="primary"
/>
```

---

### AIInsightPanel

**Purpose:** Display AI-generated log insights with markdown formatting

**Props:**

- `summary`: The AI-generated markdown text
- `loading?`: Show loading skeleton
- `error?`: Error message to display
- `title?`: Panel title (default: "🤖 AI Log Analysis")

**Usage:**

```tsx
import { AIInsightPanel } from './AI'
;<AIInsightPanel
  summary={aiSummary}
  loading={isGeneratingAI}
  error={aiError}
  title="🤖 AI Log Analysis"
/>
```

**Features:**

- Markdown rendering with syntax highlighting
- Loading skeleton with animation
- Error state with actionable messages
- Privacy badge (Chrome AI, on-device)
- Adaptive analysis based on log level

---

### AIFirstUsePrompt

**Purpose:** Onboarding UI for first-time AI activation

**Props:**

- `onActivate`: Function to call when user clicks activate
- `loading?`: Show activation in progress

**Usage:**

```tsx
import { AIFirstUsePrompt } from './AI'
;<AIFirstUsePrompt onActivate={handleActivateAI} loading={isActivating} />
```

**Features:**

- Clear explanation of AI log analysis benefits
- Privacy-focused messaging (on-device processing)
- One-click activation with progress feedback

---

### AIDownloadProgress

**Purpose:** Visual indicator for AI model download

**Props:**

- `progress`: Download percentage (0-100)
- `modelName?`: Name of the model (default: "Gemini Nano")

**Usage:**

```tsx
import { AIDownloadProgress } from './AI'
;<AIDownloadProgress progress={75} modelName="Gemini Nano" />
```

---

### AIUnsupportedNotice

**Purpose:** Show browser compatibility requirements

**Props:**

- `reason`: Why AI is unavailable
- `browserName`: Current browser name/version

**Usage:**

```tsx
import { AIUnsupportedNotice } from './AI'
;<AIUnsupportedNotice reason="Chrome 138+ required" browserName="Chrome 137" />
```

---

## 🪝 useAI Hook

**Purpose:** Centralized AI state management for log analysis

**Returns:**

```tsx
{
  availability: AIAvailability;          // Current AI status
  isLoading: boolean;                    // Any AI operation in progress
  error: string | null;                  // Error message if any
  summary: string | null;                // AI-generated analysis
  browserSupport: BrowserSupportInfo;    // Browser compatibility info
  checkAvailability: () => Promise<...>; // Check AI status
  analyzeLog: (msg, level, stack?, ctx?) => Promise<void>;  // Analyze any log entry
  summarizeError: (msg, stack?, ctx?) => Promise<void>;     // Deprecated - use analyzeLog
  activateAI: () => Promise<void>;       // First-time activation
  reset: () => void;                     // Reset all state
}
```

**Usage Example:**

```tsx
import { useAI } from 'src/hooks/useAI'

function MyComponent() {
  const {
    availability,
    isLoading,
    error,
    summary,
    analyzeLog,
    activateAI,
    reset,
  } = useAI({
    autoCheck: true, // Auto-check availability on mount
    onDownloadProgress: (progress) => console.log(`${progress}%`),
  })

  const handleAnalyze = async (log) => {
    await analyzeLog(
      log.message,
      log.level, // 'error', 'warn', 'info', 'debug', etc.
      log.stack, // Optional stack trace
      'Additional context' // Optional context
    )
  }

  return (
    <>
      <AIPowerBadge status={availability} />
      <AIActionButton
        onClick={() => handleAnalyze(selectedLog)}
        loading={isLoading}
      />
      {summary && <AIInsightPanel summary={summary} />}
    </>
  )
}
```

---

## 🔌 Integration Guide

### Before (Monolithic)

```tsx
import {
  AIActionButton,
  AIInsightPanel,
  AIUnsupportedNotice,
  AIFirstUsePrompt,
  AIPowerBadge,
} from './AIComponents'
```

### After (Modular)

```tsx
// Import only what you need
import { AIActionButton, AIInsightPanel, AIPowerBadge } from './AI'

// Or import specific components
import { AIActionButton } from './AI/AIActionButton'
import { AIInsightPanel } from './AI/AIInsightPanel'
```

---

## ✅ Benefits of This Structure

### 1. **Better Code Organization**

- Clear separation of concerns
- Easy to locate specific components
- Follows React best practices

### 2. **Improved Maintainability**

- Single file changes for single component updates
- Reduced merge conflicts
- Easier to track component history in git

### 3. **Enhanced Developer Experience**

- Tree-shaking: only import what you use
- Better IDE support (Go to Definition works per component)
- Easier to write unit tests for individual components

### 4. **Scalability**

- Easy to add new AI components
- Can add component-specific utilities/helpers
- Clear pattern for future AI features

### 5. **Type Safety**

- Centralized types prevent duplications
- Consistent prop interfaces
- Better TypeScript inference

---

## 🧪 Testing Strategy

Each component can now be tested independently:

```tsx
// AIPowerBadge.test.tsx
import { render } from '@redwoodjs/testing/web'
import { AIPowerBadge } from './AIPowerBadge'

describe('AIPowerBadge', () => {
  it('shows available status', () => {
    const { getByText } = render(<AIPowerBadge status="available" />)
    expect(getByText('AI Ready')).toBeInTheDocument()
  })
})
```

---

## 🚀 Future Enhancements

This modular structure makes it easy to add:

1. **AI Chat Component** (`AIChatPanel.tsx`)
   - Full conversational AI interface
   - Context-aware responses

2. **AI Code Suggestion** (`AICodeSuggestion.tsx`)
   - Inline code fix suggestions
   - Auto-apply fixes

3. **AI Network Analyzer** (`AINetworkInsights.tsx`)
   - Request chain explanations
   - Performance recommendations

4. **AI Pattern Detection** (`AIPatternDetector.tsx`)
   - Detect recurring log patterns
   - Identify anomalies and trends

5. **AI Performance Insights** (`AIPerformanceInsights.tsx`)
   - Analyze performance logs
   - Suggest optimizations

---

## 📝 Migration Checklist

- [x] Create `/AI` directory structure
- [x] Extract types to `types.ts`
- [x] Split components into individual files
- [x] Create `useAI` custom hook
- [x] Create barrel export (`index.ts`)
- [x] Update imports in `DevConsolePanel.tsx`
- [x] Remove old `AIComponents.tsx`
- [x] Verify no TypeScript errors
- [ ] Add unit tests for each component
- [ ] Add Storybook stories for components
- [ ] Update main DevConsole documentation

---

## 💡 Development Tips

1. **Adding a new AI component:**

   ```bash
   # Create component file
   touch web/src/components/DevConsole/AI/AINewFeature.tsx

   # Add types to types.ts
   # Add component code
   # Export in index.ts
   ```

2. **Using the AI hook:**

   ```tsx
   // Simple usage - analyze any log entry
   const { analyzeLog, summary } = useAI()

   await analyzeLog(log.message, log.level, log.stack)

   // With options
   const ai = useAI({
     autoCheck: false, // Manual availability check
     onDownloadProgress: (p) => setProgress(p),
   })
   ```

3. **Composing AI features:**
   ```tsx
   // Combine components for rich UX
   {
     availability === 'unavailable' && (
       <AIUnsupportedNotice {...browserSupport} />
     )
   }
   {
     availability === 'downloadable' && (
       <AIFirstUsePrompt onActivate={activateAI} />
     )
   }
   {
     availability === 'available' && summary && (
       <AIInsightPanel summary={summary} />
     )
   }
   ```

---

**The AI Log Analyzer provides intelligent, context-aware analysis for all log types, helping developers understand system behavior, debug issues, and gain insights from their application logs using Chrome's built-in AI (Gemini Nano) - 100% on-device and private.**
