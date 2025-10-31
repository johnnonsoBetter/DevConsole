# 🎨 Developer Console - Visual Feature Guide

A visual reference showing all UI components and interactions.

---

## 🖼️ Main Console Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔧 Developer Console                          💾 🗑️ ⬇️ ✖️      │
│ development • 10:34:52 AM                                       │
├─────────────────────────────────────────────────────────────────┤
│ [📝 Logs] [🌐 Network] [💾 State] [⚡ Performance] [🔧 Tools]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔍 [Search logs...]              [ℹ️] [⚠️] [❌] [🗑️]           │
│                                                                 │
│  ℹ️  10:34:52  User logged in                                  │
│     { userId: 123, timestamp: "..." }                          │
│                                                                 │
│  ⚠️  10:34:53  API rate limit approaching                      │
│     { remaining: 10, limit: 100 }                              │
│                                                                 │
│  ❌  10:34:54  Failed to fetch data                            │
│     Error: Network request failed                              │
│     at fetchUserData (App.tsx:45:12)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- Glassmorphism background with backdrop blur
- Gradient header (primary → secondary)
- Tab system with animated indicator
- Search bar with filter buttons
- Color-coded log icons
- Expandable log details
- Source file tracking

---

## 🌐 Network Panel

```
┌──────────────────────────────┬──────────────────────────────────┐
│ Requests (15)         🗑️     │ Request Details                  │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│ GET 200 45ms                 │ [Headers] [Body] [Response]      │
│ /api/users/123               │                                  │
│ 10:34:52                     │ {                                │
│                              │   "id": 123,                     │
│ POST 201 120ms GraphQL       │   "name": "John Doe",            │
│ /graphql                     │   "email": "john@example.com"    │
│ 10:34:53                     │ }                                │
│                              │                                  │
│ GET 404 80ms                 │                                  │
│ /api/campaigns/999           │                                  │
│ 10:34:54                     │                                  │
│                              │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

**Features:**

- Split-pane layout (list + details)
- HTTP method color coding (GET=blue, POST=green, DELETE=red)
- Status code indicators (200s=green, 400s=red)
- Duration badges
- GraphQL operation labels
- 3-section details view (headers, body, response)
- Pretty-printed JSON

---

## 🎯 Command Palette

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Type a command or search...                          [ESC]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ DATA MANAGEMENT                                                 │
│                                                                 │
│  🗑️  Clear All Data                                      [↵]    │
│     Remove all logs, network requests, and state snapshots     │
│                                                                 │
│  📝  Clear Logs                                                │
│     Remove all console logs                                    │
│                                                                 │
│ EXPORT                                                          │
│                                                                 │
│  💾  Export All Data                                           │
│     Download all console data as JSON                          │
│                                                                 │
│  📋  Copy Logs to Clipboard                                    │
│     Copy all logs as formatted JSON                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [↑↓] Navigate  [↵] Execute                      4 commands     │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- Backdrop blur overlay
- Fuzzy search
- Keyboard navigation (↑↓, Enter, ESC)
- Categorized commands
- Visual selection indicator
- Command descriptions
- Keyboard hint badges

---

## 🔴 Error Badge (Floating)

```
                                      ┌─────────────────────────┐
                                      │ ⚠️  3 New Errors        │
                                      │ Click to view in        │
                                      │ DevConsole          [✖️] │
                                      │        ◉ 3              │
                                      └─────────────────────────┘
```

**Features:**

- Appears bottom-right when errors occur
- Pulsing animation (scale + opacity)
- Gradient background (destructive red)
- Unread count badge
- Click to open console
- Dismiss button

---

## 🔑 Hotkey Indicator

```
┌──────────────────────────────────────┐
│ [Ctrl] + [~] to open DevConsole      │
└──────────────────────────────────────┘
```

**Features:**

- Appears bottom-left (only in dev mode)
- Fades in after 2 seconds
- Glassmorphism background
- Keyboard key badges

---

## 🎨 Color Coding

### Log Levels

| Level   | Icon | Color              |
| ------- | ---- | ------------------ |
| `log`   | ℹ️   | Gray               |
| `info`  | ℹ️   | Blue (Info)        |
| `warn`  | ⚠️   | Amber (Warning)    |
| `error` | ❌   | Red (Destructive)  |
| `debug` | 🐛   | Purple             |
| `ui`    | 🎨   | Purple (Primary)   |
| `api`   | 🌐   | Indigo (Secondary) |
| `db`    | 💾   | Green (Success)    |

### HTTP Methods

| Method   | Color              |
| -------- | ------------------ |
| `GET`    | Blue (Info)        |
| `POST`   | Green (Success)    |
| `PUT`    | Amber (Warning)    |
| `DELETE` | Red (Destructive)  |
| `PATCH`  | Indigo (Secondary) |

### Status Codes

| Range   | Color | Meaning         |
| ------- | ----- | --------------- |
| 200-299 | Green | Success         |
| 400-499 | Red   | Client Error    |
| 500-599 | Red   | Server Error    |
| Other   | Amber | Unknown/Pending |

---

## ✨ Animations

### Panel Open/Close

```
Easing: Spring (damping: 25, stiffness: 300)
Duration: ~400ms
Transform: opacity 0→1, translateY 100→0
```

### Tab Switching

```
Easing: Spring (damping: 25, stiffness: 300)
Duration: ~300ms
Transform: opacity 0→1, translateX 20→0
Layout animation for active indicator
```

### Log Entry Appear

```
Easing: EaseOut
Duration: 200ms
Transform: opacity 0→1, translateY -10→0
```

### Error Badge Pulse

```
Loop: Infinite
Duration: 2s per cycle
Scale: 1 → 1.3 → 1
Opacity: 0.5 → 0 → 0.5
```

### Command Palette Hover

```
Duration: 150ms
Transform: translateX 0→4px
```

---

## 📐 Layout Specifications

### Console Panel

- **Width:** 100% (bottom position) or 1200px (floating)
- **Height:** 400px (bottom) or 80vh max
- **Position:** Bottom-0, Left-0, Right-0 (docked)
- **Border Radius:** 24px (top corners only)
- **Shadow:** shadow-2xl
- **Background:** white/95 with backdrop-blur-xl

### Tabs

- **Height:** 48px
- **Padding:** 16px horizontal, 8px vertical
- **Gap:** 4px between tabs
- **Active Indicator:** Full background, shadow-sm

### Log Entries

- **Padding:** 10px (2.5 \* 4px)
- **Gap:** 12px between icon and content
- **Icon Size:** 16px (w-4 h-4)
- **Font:** Monospace for code, System for UI text

### Network Request List

- **Item Height:** Auto (min 80px)
- **Border:** 1px bottom between items
- **Selected:** 4px left border (primary color)

---

## 🎭 States

### Panel States

- **Closed:** Hidden (opacity 0, translateY 100)
- **Open:** Visible (opacity 1, translateY 0)
- **Minimized:** Header only (height 48px)

### Tab States

- **Default:** Gray text, transparent background
- **Hover:** White/50 background
- **Active:** White background, primary text, shadow

### Log Entry States

- **Default:** Transparent background
- **Hover:** Gray-50 background
- **Expanded:** Shows args/details below

### Command States

- **Default:** Transparent background
- **Hover:** Gray-50 background
- **Selected:** Primary/10 background, 4px left border

---

## 🔧 Responsive Behavior

### Desktop (1200px+)

- Full console panel (1200px width)
- Split network panel (50/50)
- All features visible

### Tablet (768px - 1199px)

- Full width console
- Network panel stack on mobile
- Reduced padding

### Mobile (<768px)

- Full screen overlay
- Single column layout
- Larger touch targets (44px min)

---

**This visual guide complements the technical documentation and provides designers/developers with a clear reference for the UI implementation.**
