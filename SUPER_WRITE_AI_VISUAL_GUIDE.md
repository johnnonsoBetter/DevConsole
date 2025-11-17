# Super Write AI - Visual Guide

## UI Components

### 1. FAB Button (Normal State)

```
┌────────────────────────────────────────┐
│  GitHub Issue Slideout                 │
├────────────────────────────────────────┤
│                                        │
│  [Title Input]                         │
│  [Body Textarea]                       │
│                                        │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ Footer                                 │
├────────────────────────────────────────┤
│  ┌──────────────┐                     │
│  │ ✨ Super Write│  Publishing to:     │
│  └──────────────┘  owner/repo          │
│                                        │
│           [Cancel] [Publish Issue]    │
└────────────────────────────────────────┘
```

**Styling:**
- Purple-to-pink gradient background
- White text with magic wand icon
- Rounded-full shape (pill button)
- Pulsing yellow sparkle on top-right
- Shadow-lg with hover:shadow-xl
- Scale animation on hover (1.05x)

---

### 2. FAB Button (Enhancing State)

```
┌────────────────────────────────────────┐
│ Footer                                 │
├────────────────────────────────────────┤
│  ┌────────────────┐                   │
│  │ ⟳ Enhancing... │  Publishing to:   │
│  └────────────────┘  owner/repo        │
│                                        │
│           [Cancel] [Publish Issue]    │
└────────────────────────────────────────┘
```

**Changes:**
- Spinner icon (animated rotation)
- Text changes to "Enhancing..."
- Button disabled (opacity 50%)
- No sparkle effect
- No hover animation

---

### 3. Success Toast Notification

```
┌────────────────────────────────────────┐
│                           ┌──────────┐ │
│                           │ ✓  Issue │ │
│                           │ enhanced │ │
│                           │ success! │ │
│                           │       ✕  │ │
│                           └──────────┘ │
└────────────────────────────────────────┘
```

**Position:** Fixed bottom-right (6 units from edges)
**Styling:**
- Green background (success color)
- White text
- Checkmark icon on left
- Close button (X) on right
- Rounded-lg with shadow-xl
- Slides up from bottom with scale
- Auto-dismisses after 3 seconds

---

### 4. Error Toast Notification

```
┌────────────────────────────────────────┐
│                           ┌──────────┐ │
│                           │ ⚠  AI    │ │
│                           │ API key  │ │
│                           │ not      │ │
│                           │ config'd │ │
│                           │       ✕  │ │
│                           └──────────┘ │
└────────────────────────────────────────┘
```

**Position:** Fixed bottom-right (same as success)
**Styling:**
- Red background (destructive color)
- White text
- Alert circle icon on left
- Close button (X) on right
- Same animations as success toast

---

## Button Visibility Logic

### When FAB Shows

```
✓ GitHub configured (username + repo + token)
✓ Not in generating state (isGenerating = false)
✓ Slideout is open
```

### When FAB Hides

```
✗ GitHub not configured
✗ Issue being auto-generated (isGenerating = true)
✗ Slideout is closed
```

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ 1. User Opens GitHub Issue Slideout            │
│    ↓                                            │
│    Auto-generates basic issue from context      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. User Reviews Generated Content               │
│    - Title: "Console error in component"       │
│    - Body: Basic context pack markdown          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. User Clicks "Super Write" FAB Button        │
│    ✨ Super Write                               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. AI Enhancement Process                       │
│    [====================] Enhancing...          │
│    - Analyzes title + body                      │
│    - Applies best practices                     │
│    - Structures content                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. Enhanced Content Applied                     │
│    Title: "[Bug] Component: Console error..."   │
│    Body: Structured markdown with sections      │
│                                                  │
│    ✓ Issue enhanced successfully! (toast)      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. User Reviews & Publishes                     │
│    - Preview enhanced content                   │
│    - Make any final edits                       │
│    - Click "Publish Issue"                      │
└─────────────────────────────────────────────────┘
```

---

## Before/After Example

### BEFORE Enhancement

```markdown
Title: button broken

Body:
the submit button doesn't work when i click it
nothing happens
```

### AFTER Enhancement (Super Write AI)

```markdown
Title: [Bug] Submit Button: Unresponsive to click events

Body:
## Summary

User reports that the submit button is not responding to click events. 
The button appears to be non-functional with no visible feedback or 
action occurring upon interaction.

## Problem Description

> "the submit button doesn't work when i click it nothing happens"

The submit button appears to be unresponsive when clicked. The user 
observes no visual feedback, state changes, or form submission occurring.

## User Impact

- Users cannot complete form submissions
- Workflow is completely blocked
- No workaround available from UI

## Missing Information

To help investigate this issue, please provide:

- [ ] Which page/form is this occurring on?
- [ ] What browser and version are you using?
- [ ] Are there any console errors when clicking the button?
- [ ] Does the button show any visual feedback (hover, active states)?
- [ ] When did this issue start occurring?

## Suggested Labels

- `bug`
- `ui`
- `needs-reproduction`
- `needs-more-info`

**Priority:** Medium (needs more information to assess)
```

---

## Color Palette

### FAB Button
```
Normal State:
  Background: linear-gradient(to right, #a855f7, #ec4899)
             (purple-500 → pink-500)
  Hover:      linear-gradient(to right, #9333ea, #db2777)
             (purple-600 → pink-600)
  Text:       #ffffff (white)
  
Sparkle Dot:
  Color:      #fde047 (yellow-300)
  Animation:  pulse (scale 1 → 1.5 → 1, opacity 0.8 → 0 → 0.8)
  Duration:   2 seconds, infinite
```

### Toast Notifications
```
Success:
  Background: #22c55e (green-500/success)
  Icon:       CheckCircle
  
Error:
  Background: #ef4444 (red-500/destructive)
  Icon:       AlertCircle

Both:
  Text:       #ffffff (white)
  Shadow:     shadow-xl
  Border:     rounded-lg
```

---

## Responsive Behavior

### Desktop (≥640px)
```
┌──────────────┐
│ ✨ Super Write│  ← Full text visible
└──────────────┘
```

### Mobile (<640px)
```
┌─────┐
│ ✨   │  ← Icon only, text hidden
└─────┘
```

---

## Animation Timeline

### Button Hover
```
Time: 0ms → 150ms
Transform: scale(1) → scale(1.05)
Shadow: shadow-lg → shadow-xl
```

### Button Click (Tap)
```
Time: 0ms → 100ms → 200ms
Transform: scale(1) → scale(0.95) → scale(1)
```

### Toast Entrance
```
Time: 0ms → 300ms
Opacity: 0 → 1
Y Position: 50px → 0
Scale: 0.9 → 1
Easing: spring (damping: 30, stiffness: 300)
```

### Toast Exit
```
Time: 0ms → 300ms
Opacity: 1 → 0
Y Position: 0 → 50px
Scale: 1 → 0.9
Easing: spring
```

---

## Keyboard & Accessibility

### ARIA Labels
```html
<button
  aria-label="Enhance issue with AI"
  title="Enhance issue with AI"
>
  ✨ Super Write
</button>
```

### Disabled State
```html
<button
  disabled
  aria-disabled="true"
  title="AI is currently enhancing your issue"
>
  ⟳ Enhancing...
</button>
```

### Toast Screen Reader
```html
<div role="alert" aria-live="polite">
  ✓ Issue enhanced successfully!
</div>
```

---

## Error States Visuals

### AI Not Configured
```
┌─────────────────────────────────────┐
│  ⚠  AI features are disabled.       │
│     Enable in Settings → AI.        │
│                              ✕      │
└─────────────────────────────────────┘
```

### API Key Missing
```
┌─────────────────────────────────────┐
│  ⚠  AI API key not configured.      │
│     Set up in Settings → AI.        │
│                              ✕      │
└─────────────────────────────────────┘
```

### Empty Form
```
┌─────────────────────────────────────┐
│  ⚠  Please provide at least a       │
│     title or body to enhance.       │
│                              ✕      │
└─────────────────────────────────────┘
```

### Parse Error
```
┌─────────────────────────────────────┐
│  ⚠  Failed to parse AI response.    │
│     Please try again.               │
│                              ✕      │
└─────────────────────────────────────┘
```

---

## Integration Points Visual

```
GitHubIssueSlideout.tsx
├── Header
│   ├── Title: "GitHub Issue Preview"
│   └── View Toggle: [Preview | Edit]
│
├── Content Area
│   ├── Settings Form (if not configured)
│   ├── Loading Spinner (if generating)
│   └── Issue Preview/Edit (normal state)
│
└── Footer
    ├── Left Section
    │   ├── SuperWriteAI FAB ← NEW!
    │   └── "Publishing to: owner/repo"
    │
    └── Right Section
        ├── Cancel Button
        └── Publish Issue Button

SuperWriteAI.tsx (FAB Component)
├── Button State Management
├── AI Client Integration
├── Content Enhancement Logic
└── Toast Notification System
```

---

## Testing Checklist Visual

```
Manual Testing Steps:

□ 1. Open DevConsole → Settings → AI
  □ Enable AI features
  □ Configure API key
  □ Select model

□ 2. Open DevConsole → Settings → GitHub
  □ Add username
  □ Add repository (owner/repo)
  □ Add personal access token
  □ Test connection

□ 3. Click "Create Issue" button
  □ Slideout opens
  □ Super Write FAB button appears
  □ FAB has purple-pink gradient
  □ Sparkle animation visible

□ 4. Test Enhancement Flow
  □ Add minimal title/body
  □ Click Super Write button
  □ Button shows "Enhancing..." with spinner
  □ Wait for completion
  □ Enhanced content appears
  □ Success toast shows

□ 5. Test Error Cases
  □ Disable AI → error toast appears
  □ Clear API key → error toast appears
  □ Empty form → error toast appears
  □ Click toast X to dismiss

□ 6. Test Responsive
  □ Resize window < 640px
  □ Button text disappears (icon only)
  □ Resize window ≥ 640px
  □ Button text reappears

□ 7. Test Dark Mode
  □ Toggle theme
  □ FAB colors unchanged (always gradient)
  □ Toast readable in both modes

□ 8. Test Enhancement Quality
  □ Sparse input → structured output
  □ Technical input → enhanced format
  □ Non-technical input → translated
  □ Multiple runs → different results
```
