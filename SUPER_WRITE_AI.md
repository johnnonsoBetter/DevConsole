# Super Write AI Feature

## Overview

Super Write AI is an intelligent GitHub issue enhancement feature that transforms and enhances issue titles and bodies using advanced AI. It analyzes whatever information is available (title, body, or both) and produces a well-structured, professional GitHub issue following best practices.

## Features

- **Smart Enhancement**: Works with any amount of input - title only, body only, or both
- **Context-Aware**: Adapts output structure based on available information
- **Technical Translation**: Converts non-technical language into clear technical context
- **Dynamic Structure**: Only includes relevant sections (steps to reproduce, environment, etc.)
- **FAB Button**: Floating Action Button with beautiful gradient and animations
- **Real-time Feedback**: Toast notifications for success/error states
- **Streaming Support**: Uses configured AI provider for generation

## User Interface

### FAB Button

The Super Write AI feature appears as a purple-to-pink gradient Floating Action Button (FAB) in the GitHub Issue Slideout footer. It includes:

- **Icon**: Magic wand (Wand2) icon
- **Text**: "Super Write" label (hidden on small screens)
- **Animation**: Hover scale effect and pulsing sparkle indicator
- **States**: 
  - Normal: Shows "Super Write" with wand icon
  - Loading: Shows "Enhancing..." with spinner
  - Disabled: Grayed out when AI not configured

### Location

The button appears in the GitHub Issue Slideout footer, next to the repository information and action buttons:

```
[Super Write AI] | Publishing to: owner/repo | [Cancel] [Publish Issue]
```

### Visibility

The button only appears when:
1. GitHub is properly configured (username, repo, token)
2. Issue content is not currently being auto-generated
3. The slideout is in edit or preview mode

## How It Works

### Input Analysis

The AI analyzes the current issue content:

1. **Title**: Examines if title is present and meaningful
2. **Body**: Analyzes body content for context
3. **Type Detection**: Determines if it's a bug, feature, question, etc.
4. **Technical Level**: Identifies if reporter is technical or non-technical

### Enhancement Process

1. User clicks the "Super Write" FAB button
2. System validates AI configuration (API keys, provider)
3. Current title and body are sent to the AI with the enhancement prompt
4. AI generates enhanced title and body following best practices
5. Enhanced content is applied to the issue form
6. Success notification appears

### Output Structure

The enhanced issue includes only relevant sections:

- **Title**: Refined format like `[Bug] Component: Brief description`
- **Summary**: 2-3 sentence overview
- **Problem Description**: Clear explanation of the issue
- **User Impact**: Who is affected and how (if discernible)
- **Steps to Reproduce**: Extracted from input (if available)
- **Expected Behavior**: What should happen (if clear)
- **Environment**: Browser, OS, versions (if mentioned)
- **Technical Notes**: Possible causes and affected components
- **Missing Information**: Explicit list of what's needed
- **Suggested Labels**: Bug, enhancement, needs-triage, etc.

## Prerequisites

### AI Configuration Required

Before using Super Write AI, configure your AI settings in **Settings → AI**:

1. **Enable AI Features**: Toggle AI on
2. **Choose Provider**: OpenAI, Anthropic, Google, etc.
3. **API Key**: Provide your API key or gateway key
4. **Model**: Select appropriate model (gpt-4, claude-3, etc.)

### GitHub Configuration

The feature only activates when GitHub is configured:

1. **Username**: Your GitHub username
2. **Repository**: Target repo in `owner/repo` format
3. **Personal Access Token**: With `repo` scope

## Usage

### Basic Usage

1. Open GitHub Issue Slideout (click "Create Issue" button)
2. Fill in title and/or body with any information
3. Click the **Super Write** FAB button (purple gradient button)
4. Wait for AI to enhance (shows "Enhancing..." with spinner)
5. Review enhanced content in preview or edit mode
6. Make any additional tweaks
7. Publish to GitHub

### Example Scenarios

#### Scenario 1: Sparse Input

**Input:**
```
Title: button broken
Body: the submit button doesn't work
```

**Enhanced Output:**
```
Title: [Bug] Submit Button: Unresponsive to click events

Summary:
User reports that the submit button is not responding to user interactions...

Problem Description:
> "the submit button doesn't work"

The submit button appears to be unresponsive...

Missing Information:
- [ ] Which page/form is affected?
- [ ] Does the button show any visual feedback on click?
- [ ] Are there any console errors?
```

#### Scenario 2: Detailed Technical Input

**Input:**
```
Title: Memory leak in useEffect cleanup
Body: When navigating between pages rapidly, memory usage increases...
```

**Enhanced Output:**
```
Title: [Bug] Memory Management: Memory leak in useEffect cleanup function

Summary:
A memory leak occurs when users rapidly navigate between pages...

Problem Description:
[Detailed technical explanation with code references]

Steps to Reproduce:
1. Navigate to /dashboard
2. Rapidly switch between tabs...

Environment:
- React 18.2.0
- Chrome 120.0
...
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "AI features are disabled" | AI toggle is off | Enable in Settings → AI |
| "AI API key not configured" | Missing API key | Add API key in Settings → AI |
| "Please provide at least a title or body" | Empty form | Add some content first |
| "Failed to parse AI response" | AI returned invalid format | Try again or adjust settings |

### Toast Notifications

- **Success**: ✨ Green toast with "Issue enhanced successfully!"
- **Error**: 🚫 Red toast with specific error message
- **Auto-dismiss**: Notifications disappear after 3 seconds
- **Manual Close**: Click X button to dismiss immediately

## Technical Details

### Component Architecture

```
SuperWriteAI.tsx (FAB Component)
  ├── State Management
  │   ├── isEnhancing (loading state)
  │   ├── showToast (notification state)
  │   └── toastMessage/Type
  ├── AI Integration
  │   ├── useAISettingsStore (settings)
  │   └── createAIClient (API client)
  └── UI Elements
      ├── FAB Button (gradient, animated)
      └── Toast Notification (success/error)
```

### Integration Points

**In GitHubIssueSlideout.tsx:**

```tsx
<SuperWriteAI
  currentTitle={title}
  currentBody={body}
  onEnhanced={(enhanced) => {
    updateContent({
      title: enhanced.title,
      body: enhanced.body,
    });
  }}
/>
```

### AI Prompt

The feature uses a comprehensive system prompt that:

- Analyzes available information dynamically
- Adapts structure based on content type
- Preserves original reporter's intent
- Translates non-technical to technical language
- Marks uncertainties explicitly
- Suggests missing information

See `SuperWriteAI.tsx` for the full prompt text.

### Response Parsing

The AI response is parsed using multiple strategies:

1. **JSON Extraction**: Looks for `{ "title": "...", "body": "..." }`
2. **Markdown Headers**: Falls back to extracting from markdown structure
3. **Error Recovery**: Returns null if parsing fails, shows error toast

## Styling

### FAB Button

- **Colors**: Purple to pink gradient (`from-purple-500 to-pink-500`)
- **Size**: `px-4 py-3` with responsive text (hidden on mobile)
- **Shadow**: `shadow-lg` with `hover:shadow-xl`
- **Animation**: Scale on hover (1.05), scale on tap (0.95)
- **Sparkle**: Pulsing yellow dot on top-right corner

### Toast

- **Position**: Fixed bottom-right corner
- **Colors**: Success (green) or Error (red)
- **Animation**: Slide up from bottom with scale effect
- **Icon**: Checkmark for success, alert circle for error

## Best Practices

### When to Use

- ✅ Quick bug reports that need structure
- ✅ Non-technical user reports needing clarification
- ✅ Sparse information that needs expansion
- ✅ Feature requests needing formal structure
- ✅ Any issue that could benefit from professional formatting

### When Not to Use

- ❌ Already well-structured issues
- ❌ Issues with sensitive information (AI sees the content)
- ❌ When you want complete manual control
- ❌ Empty forms (provide at least basic info first)

## Troubleshooting

### Button Not Appearing

**Check:**
1. Is GitHub configured? (username, repo, token)
2. Is the slideout fully loaded? (not in generating state)
3. Is there an error in the console?

### Enhancement Not Working

**Check:**
1. AI settings enabled?
2. API key configured?
3. Sufficient API quota/credits?
4. Network connectivity?
5. Console for detailed error messages

### Poor Enhancement Quality

**Try:**
1. Provide more context in the original input
2. Use a more capable AI model (GPT-4, Claude 3 Opus)
3. Adjust temperature in AI settings (0.7 recommended)
4. Run enhancement multiple times for different results

## Future Enhancements

Potential improvements for future versions:

- [ ] **Custom Templates**: User-defined enhancement templates
- [ ] **Multi-Language**: Support for non-English issues
- [ ] **Batch Enhancement**: Enhance multiple issues at once
- [ ] **Enhancement History**: Track and compare enhancement versions
- [ ] **Smart Suggestions**: AI-powered label and priority suggestions
- [ ] **Auto-Attach Context**: Automatically include relevant logs/network data
- [ ] **Tone Customization**: Formal, casual, technical, user-friendly modes

## Related Documentation

- [AI_LOG_EXPLAINER.md](./AI_LOG_EXPLAINER.md) - General AI feature documentation
- [AI_QUICK_START.md](./AI_QUICK_START.md) - AI setup guide
- [SETTINGS_GUIDE.md](./SETTINGS_GUIDE.md) - Settings configuration
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture

## Keyboard Shortcuts

Currently none. Future enhancement:

- `Cmd/Ctrl + Shift + E` - Trigger enhancement
- `Cmd/Ctrl + Z` - Undo enhancement (revert to original)

## Privacy & Security

### Data Handling

- Issue content is sent to your configured AI provider
- No data is stored on DevConsole servers
- API keys are stored locally in chrome.storage
- Use AI Gateway for additional privacy controls

### Recommendations

1. **Review before publishing**: Always review enhanced content
2. **Avoid secrets**: Don't include API keys or passwords in issues
3. **Use gateway**: Consider using AI Gateway for better privacy
4. **Check provider terms**: Understand your AI provider's data policies

## Support

If you encounter issues with Super Write AI:

1. Check this documentation
2. Verify AI settings configuration
3. Check browser console for errors
4. Review AI provider status/quotas
5. Create an issue on GitHub (ironic, use Super Write for it! 😄)
