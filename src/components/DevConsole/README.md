# 🚀 LinkVybe Developer Console

A premium, in-app developer debugging cockpit for the LinkVybe RedwoodJS application. Inspired by Chrome DevTools, Linear.app, and Apple HIG design principles.

---

## 🎯 Overview

The Developer Console is a **development-only** overlay that provides:

- **Console Logging** with custom log types (UI, API, DB)
- **Network Inspection** for REST and GraphQL requests
- **Error Boundary** with automatic error capture
- **Command Palette** (Cmd+K) for quick actions
- **State Tracking** (coming soon)
- **Performance Metrics** (coming soon)

---

## ✨ Features

### 1. Console Hijacking

Captures all `console.log`, `console.warn`, `console.error`, and `console.info` calls while preserving native browser logging.

**Custom Log Types:**

```typescript
console.ui('Button clicked', { buttonId: 'submit' })
console.api('Fetching user data', { userId: 123 })
console.db('Query executed', { table: 'users', duration: '45ms' })
```

### 2. Network Interception

Automatically captures:

- **Fetch** requests
- **XMLHttpRequest** calls
- **GraphQL** operations (queries, mutations, subscriptions)

Displays:

- Request/response headers
- Request/response bodies
- Status codes
- Duration
- Errors

### 3. Error Boundary

Catches React render errors and:

- Displays detailed error UI
- Logs to DevConsole automatically
- Opens console on error
- Shows component stack trace

### 4. Command Palette

Press `Cmd+K` or `Ctrl+K` to access:

- Clear all data
- Export logs
- Toggle capture settings
- Switch between tabs
- Copy logs to clipboard

### 5. Premium UI/UX

- **Glassmorphism** background with backdrop blur
- **Smooth animations** via Framer Motion
- **Draggable panel** (coming soon)
- **Responsive design** following LinkVybe Design System
- **Dark mode support**
- **Semantic color coding** (errors = red, success = green, etc.)

---

## ⌨️ Keyboard Shortcuts

| Shortcut       | Action                   |
| -------------- | ------------------------ |
| `Ctrl + ~`     | Toggle DevConsole        |
| `Cmd/Ctrl + K` | Open Command Palette     |
| `ESC`          | Close Console/Palette    |
| `↑ / ↓`        | Navigate commands        |
| `Enter`        | Execute selected command |

---

## 🔧 Installation

The DevConsole is **already integrated** into the app via `App.tsx`.

```tsx
import { DevConsole, DevConsoleErrorBoundary } from './components/DevConsole'

;<Theme>
  <DevConsoleErrorBoundary>
    <Routes />
    <Toaster />
    <DevConsole />
  </DevConsoleErrorBoundary>
</Theme>
```

---

## 🎨 Architecture

### Core Files

```
web/src/
├── components/DevConsole/
│   ├── index.tsx                  # Main entry point
│   ├── DevConsolePanel.tsx        # Main panel UI (tabs, logs, network)
│   ├── DevConsoleBadge.tsx        # Floating error badge
│   └── CommandPalette.tsx         # Cmd+K palette
├── lib/devConsole/
│   ├── consoleInterceptor.ts      # Console hijacking
│   ├── networkInterceptor.ts      # Fetch/XHR interception
│   └── ErrorBoundary.tsx          # React error boundary
└── utils/stores/
    └── devConsole.ts              # Zustand store
```

### State Management

Uses **Zustand** with persistence:

```typescript
import { useDevConsoleStore } from '../../utils/stores/devConsole'

const { isOpen, logs, networkRequests, toggleConsole } = useDevConsoleStore()
```

### Data Flow

```
User Action → Interceptor → Zustand Store → UI Component → Display
                ↓
          Native Console (preserved)
```

---

## 📊 Components

### DevConsole (Main)

Root component that:

- Installs interceptors on mount
- Handles keyboard shortcuts
- Renders all sub-components

### DevConsolePanel

The main overlay with:

- **5 Tabs:** Logs, Network, State, Performance, Tools
- **Filters:** Search, log level filtering
- **Actions:** Clear, export, download

### DevConsoleErrorBadge

Floating notification badge that appears when:

- Errors occur while console is closed
- Shows unread error count
- Click to open console

### CommandPalette

Cmd+K style interface with:

- Fuzzy search
- Keyboard navigation
- Categorized commands
- Quick actions

### DevConsoleErrorBoundary

React ErrorBoundary that:

- Catches render errors
- Displays error details
- Logs to DevConsole
- Provides recovery options

---

## 🎯 Usage Examples

### Basic Logging

```typescript
// Standard logs
console.log('User logged in', { userId: 123 })
console.warn('API rate limit approaching')
console.error('Failed to fetch data', error)

// Custom logs
console.ui('Modal opened', { modalId: 'welcome' })
console.api('GraphQL mutation', { operation: 'createCampaign' })
console.db('Database query', { table: 'campaigns', rows: 15 })
```

### Network Inspection

Automatically captured:

```typescript
// REST API
fetch('/api/users/123')

// GraphQL
fetch('/graphql', {
  method: 'POST',
  body: JSON.stringify({
    query: 'query GetUser($id: ID!) { user(id: $id) { name } }',
    variables: { id: 123 },
  }),
})
```

### Programmatic Control

```typescript
import { useDevConsoleStore } from "src/utils/stores/devConsole";

function MyComponent() {
  const { toggleConsole, addLog } = useDevConsoleStore();

  const handleDebug = () => {
    addLog({
      level: "info",
      message: "Debug button clicked",
      args: [{ timestamp: Date.now() }]
    });
    toggleConsole(); // Open console
  };

  return <button onClick={handleDebug}>Debug</button>;
}
```

---

## 🚦 Environment Gating

The DevConsole **only activates** in:

- `NODE_ENV === "development"`
- Hostnames containing `"staging"`
- Hostnames containing `"localhost"`

In production, it's completely disabled.

---

## 🎨 Design System Integration

Follows **LinkVybe Premium Design System V2**:

### Colors

- **Primary**: `hsl(262, 83%, 58%)` - Purple brand
- **Success**: `hsl(142, 76%, 36%)` - Green confirmations
- **Warning**: `hsl(32, 95%, 44%)` - Amber alerts
- **Destructive**: `hsl(0, 84%, 60%)` - Red errors
- **Info**: `hsl(199, 89%, 48%)` - Blue information

### Typography

- **Font Family**: System fonts (SF Pro, Inter, Segoe UI)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)
- **Sizes**: xs (12px), sm (14px), base (16px)

### Spacing

- **8px baseline grid**
- Consistent padding: 8px, 16px, 24px, 32px
- Border radius: 8px, 12px, 16px, 24px

### Animations

- **Spring physics**: `damping: 25, stiffness: 300`
- **Duration**: 200-300ms for UI transitions
- **Easing**: `easeInOut` for smooth motion

---

## 🔮 Future Enhancements

### Phase 2 (Coming Soon)

- [ ] **State Tracking** - Zustand store snapshots
- [ ] **Performance Metrics** - Component render times
- [ ] **Draggable Panel** - Repositionable overlay
- [ ] **Screenshot Tool** - Capture + report generator
- [ ] **IndexedDB Persistence** - Cross-session log history
- [ ] **Mini Terminal** - Inline JavaScript REPL
- [ ] **GraphQL Schema Explorer**
- [ ] **Network Request Replay**
- [ ] **Custom Filters** - Save filter presets
- [ ] **Export Formats** - JSON, CSV, Markdown

### Phase 3 (Vision)

- [ ] **Redux DevTools Integration**
- [ ] **React Query Inspector**
- [ ] **WebSocket Monitoring**
- [ ] **Lighthouse Integration**
- [ ] **Accessibility Checker**
- [ ] **Bundle Size Analyzer**
- [ ] **Hot Module Reload Stats**

---

## 🐛 Troubleshooting

### Console not opening?

1. Check you're in development mode
2. Verify keyboard shortcut: `Ctrl + ~`
3. Check browser console for errors
4. Ensure `DevConsole` is imported in `App.tsx`

### Logs not appearing?

1. Check capture is enabled (Cmd+K → Toggle Console Capture)
2. Verify log level filters (buttons in Logs panel)
3. Clear search filter

### Network requests missing?

1. Enable network capture (Cmd+K → Toggle Network Capture)
2. Refresh page to reinstall interceptors
3. Check request is using `fetch` or `XMLHttpRequest`

---

## 🤝 Contributing

When adding new features:

1. Follow **LinkVybe Design System** tokens
2. Use **Zustand** for state management
3. Apply **Framer Motion** for animations
4. Maintain **keyboard accessibility**
5. Add **TypeScript types**
6. Test in both **light** and **dark** modes

---

## 📚 References

- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Framer Motion](https://www.framer.com/motion/)
- [LinkVybe Design System](../docs/design-system.md)
- [RedwoodJS](https://redwoodjs.com/)

---

## 📄 License

Part of the LinkVybe platform. Internal use only.

---

**Built with ❤️ by the LinkVybe team**

_"Every tap, transition, and panel should feel elegant, real-time, and purposeful."_
