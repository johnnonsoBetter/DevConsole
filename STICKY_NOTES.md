# Sticky Notes Feature 📝

## Overview

The Sticky Notes feature provides a quick, intuitive note-taking interface directly within the DevConsole. Notes appear as draggable, colorful sticky notes that mimic physical sticky notes, making it easy to jot down thoughts, bugs, or ideas while debugging.

**New in Latest Update:**
- ✨ **Minimize Mode**: Collapse notes to just the title bar to reduce screen clutter
- 📸 **Screenshot Capture**: Take and attach screenshots directly to notes for visual context
- 🖼️ **Screenshot Preview**: View captured images inline with quick removal option

## Features

### ✨ Quick Access
- **Global Button**: Located next to the "Create Issue" button in the DevConsole header
- **Always Available**: Access from any tab within DevConsole
- **One-Click Creation**: Instantly create a new sticky note

### 🎨 Sticky Note Interface
- **Draggable**: Click and drag notes anywhere on the screen
- **Resizable**: Toggle between compact (320×380px) and expanded (500×600px) views
- **Minimizable**: Collapse to title bar only (280×48px) to reduce clutter
- **Color Customization**: Choose from 5 colors (yellow, pink, blue, green, purple)
- **Pin Notes**: Keep important notes visible and prioritized
- **Screenshot Capture**: Take screenshots of the current tab and attach them to notes
- **Auto-Save**: Notes automatically save after 1 second of inactivity

### 💾 Persistence
- **Chrome Storage**: All notes persist across browser sessions
- **Real-time Updates**: Changes are immediately saved
- **Data Structure**: Uses the Notes feature architecture (store + service)

## Usage

### Creating a Sticky Note

1. Click the **"Sticky Note"** button in the DevConsole header (yellow button with sticky note icon)
2. A new sticky note appears with:
   - Empty title field (focused automatically)
   - Empty content area
   - Default yellow color
   - Compact size

### Editing a Note

1. **Title**: Click the title field and start typing
2. **Content**: Click the content area to write your note (supports multi-line text)
3. **Auto-Save**: Changes are automatically saved after 1 second

### Customizing a Note

**Color**: Click any color circle in the footer to change the note color:
- 🟡 Yellow (default)
- 🩷 Pink
- 🔵 Blue
- 🟢 Green
- 🟣 Purple

**Pin**: Click the pin icon (📌) to keep the note prioritized

**Resize**: Click the maximize/minimize icon to toggle between compact and expanded sizes

**Minimize**: Click the minus icon (−) to collapse the note to just the title bar

**Screenshot**: Click the camera icon (📷) to capture the current tab and attach it to the note

### Moving Notes

1. Click and hold anywhere on the note (except inputs/buttons)
2. Drag to desired position
3. Release to place

### Deleting a Note

1. Click the trash icon (🗑️) in the note header
2. Confirm deletion in the browser prompt
3. Note is permanently removed from storage

### Managing Screenshots

1. **Capture**: Click the camera icon (📷) in the note header
2. **View**: Click on the screenshot preview to open it in a new tab at full resolution
3. **Remove**: Hover over the screenshot and click the red X button in the top-right corner
4. **Auto-Save**: Screenshots are stored as base64 data URLs and persist with the note

### Minimizing a Note

1. Click the minus icon (−) in the note header
2. Note collapses to just the title bar (280×48px wide)
3. Click the minus icon again to restore the note to its previous size
4. Minimized notes remain draggable

### Closing a Note

Click the X icon (✕) in the note header to close the sticky note UI (note data is still saved)

## Architecture

### Components

```
src/features/notes/components/
├── StickyNote.tsx          # Draggable sticky note UI
└── StickyNoteButton.tsx    # Global button to create notes
```

### Data Flow

1. **User clicks "Sticky Note" button** → `StickyNoteButton` component
2. **Create temporary note ID** → Track active notes in component state
3. **Render `StickyNote` component** → Display draggable UI
4. **User edits note** → Local state updates
5. **Auto-save triggers** (1s debounce) → `NotesService.createNote()` or `NotesService.updateNote()`
6. **Service updates store** → Zustand store (immediate, optimistic)
7. **Service persists to storage** → `StorageService.set()` (async, background)

### State Management

- **Local State**: Sticky note position, drag state, UI state
- **Global State**: Note data (title, content, color, pinned) via `useNotesStore`
- **Persistence**: Chrome Storage API via `StorageService`

## Integration Points

### DevConsolePanel Integration

```tsx
// src/components/DevConsole/DevConsolePanel.tsx

import { StickyNoteButton } from '../../features/notes';

// In the header, next to Create Issue button:
<StickyNoteButton />
```

### Notes Service

All data operations go through `NotesService`:
- `createNote()` - Create new note
- `updateNote()` - Update existing note
- `deleteNote()` - Remove note

### Storage Schema

```typescript
interface Note {
  id: string;              // "note-{timestamp}-{random}"
  title: string;           // Note title
  content: string;         // Note content (plain text)
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
  tags: string[];          // Currently unused in sticky notes
  pinned: boolean;         // Pin status
  color?: string;          // Color name (yellow, pink, blue, etc.)
  screenshot?: string;     // Base64 data URL of attached screenshot
}
```

## Technical Details

### Dragging Implementation

- Uses native mouse events (`mousedown`, `mousemove`, `mouseup`)
- Calculates drag offset to maintain grab position
- Prevents dragging when interacting with inputs/buttons
- Visual feedback: cursor changes to `grabbing`, scale increases to 1.05

### Auto-Save Mechanism

- Debounced with 1-second delay using `setTimeout`
- Cleans up timeout on component unmount
- Only saves if title or content is not empty
- Shows "Saving..." indicator during save

### Positioning

- New notes cascade: each subsequent note is offset by 30px (x and y)
- Position stored in local component state (not persisted)
- Default initial position: `{ x: 100, y: 100 }`

### Screenshot Capture

- Uses Chrome's `chrome.tabs.captureVisibleTab()` API
- Captures the visible area of the current tab
- Stores as PNG format base64 data URL
- No external image hosting required
- Full resolution preserved in storage
- Click screenshot preview to view full-size in new tab
- Remove button appears on hover

### Styling

- Uses Tailwind utility classes
- Color-coded backgrounds with matching borders
- Glassmorphism effect in header/footer (`from-white/40 to-transparent`)
- Shadow and scale animations on hover/drag

## Keyboard Shortcuts

- **Tab**: Move between title and content fields
- **Enter** (in title): Move focus to content area
- **Escape**: Close the note (planned feature)
- **Click Screenshot**: Open full-size view in new tab

## Accessibility

- **ARIA Labels**: Buttons have descriptive `aria-label` attributes
- **Title Attributes**: Hover tooltips on all interactive elements
- **Keyboard Navigation**: Full keyboard support for inputs
- **Focus Management**: Auto-focus on title for new notes

## Future Enhancements

- [x] Minimize functionality
- [x] Screenshot capture and preview
- [ ] Markdown support in content area
- [ ] Rich text formatting
- [ ] Note search/filter in dedicated Notes tab
- [ ] Keyboard shortcut to create sticky note (e.g., `Ctrl+Shift+N`)
- [ ] Drag to resize (not just toggle)
- [ ] Multiple sticky notes visible simultaneously (currently supported)
- [ ] Sticky note templates
- [ ] Export individual sticky notes
- [ ] Link sticky notes to specific log entries or network requests
- [ ] Collaboration features (share notes with team)
- [ ] Annotate screenshots with drawings/text
- [ ] Record video clips instead of just screenshots

## Troubleshooting

### Sticky note doesn't appear

- Check browser console for errors
- Ensure DevConsole is fully loaded
- Try refreshing the extension

### Notes not saving

- Check if storage quota is exceeded (`chrome://settings/content/all`)
- Verify extension has storage permissions in `manifest.json`
- Check browser console for storage errors

### Dragging is choppy

- Reduce number of open sticky notes
- Check browser performance (high CPU/memory usage)
- Try closing other browser tabs

### Color not changing

- Ensure you're clicking the color button (not just hovering)
- Check if auto-save is stuck (wait 2-3 seconds)
- Manually close and reopen the note

## UI Controls Reference

### Header Buttons (Left to Right)
1. **📌 Pin** - Toggle pin status (turns red when pinned)
2. **"Saving..."** - Auto-save indicator (appears during save)

### Header Buttons (Right Side)
1. **📷 Camera** - Capture screenshot of current tab
2. **⤢ Maximize/Minimize** - Toggle between compact and expanded view
3. **− Minus** - Minimize to title bar only
4. **🗑️ Trash** - Delete note (with confirmation)
5. **✕ Close** - Hide sticky note (data preserved)

### Footer Controls
- **5 Color Circles** - Click to change note color (ring appears on selected color)

### Screenshot Controls
- **Click Screenshot** - Open full-size in new tab
- **Hover Screenshot** - Shows red X button in top-right corner to remove

## Best Practices

1. **Keep notes concise** - Sticky notes are for quick thoughts, not long documentation
2. **Use colors meaningfully** - e.g., pink for bugs, blue for ideas, yellow for reminders
3. **Pin important notes** - Pinned notes appear first in the Notes tab
4. **Minimize when not editing** - Reduce visual clutter while keeping notes accessible
5. **Capture screenshots early** - Take screenshots before the bug/issue changes
6. **Move notes out of the way** - Drag notes to the side when they block content
7. **Use screenshot annotations** - Click to open full-size view with context

## Examples

### Bug Note with Screenshot
```
Title: Login Button Bug
Content: Button doesn't work on mobile Safari.
Need to check touch event handlers.
Screenshot: [Captured screenshot of the broken login page]
Color: Pink (for urgent)
Pinned: Yes
```

### Idea Note
```
Title: Feature Idea
Content: Add dark mode toggle in settings.
Users have requested this multiple times.
Color: Blue (for ideas)
Pinned: No
```

### Reminder Note
```
Title: TODO
Content: 
- Fix network panel filter
- Update GraphQL schema
- Test on Firefox
Color: Yellow (default)
Pinned: No
```

---

**Built with**: React, TypeScript, Tailwind CSS, Zustand, Chrome Storage API
