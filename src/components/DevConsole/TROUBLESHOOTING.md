# 🔧 Developer Console - Troubleshooting & FAQ

Common issues, solutions, and frequently asked questions.

---

## 🐛 Common Issues

### Issue: Console Won't Open

**Symptoms:**

- Pressing `Ctrl + ~` does nothing
- No console panel appears

**Solutions:**

1. **Check environment:**

   ```bash
   # Ensure you're in development mode
   yarn rw dev

   # NOT production build
   # yarn rw build && yarn rw serve
   ```

2. **Check browser console for errors:**
   - Open native browser DevTools (F12)
   - Look for errors in Console tab
   - Common error: Import/module not found

3. **Verify integration:**

   ```tsx
   // Check web/src/App.tsx contains:
   import { DevConsole, DevConsoleErrorBoundary } from './components/DevConsole'

   // And in the component tree:
   ;<DevConsoleErrorBoundary>
     <Routes />
     <DevConsole />
   </DevConsoleErrorBoundary>
   ```

4. **Try refreshing the page:**
   - Hard refresh: `Ctrl + Shift + R`
   - Clears any cached state

---

### Issue: No Logs Appearing

**Symptoms:**

- Console opens but shows "No logs to display"
- Logs visible in browser console but not DevConsole

**Solutions:**

1. **Check log level filters:**
   - Look for grayed-out filter buttons at top of Logs panel
   - Click to enable all levels (info, warn, error)

2. **Clear search filter:**
   - Empty the search box at top of Logs panel

3. **Verify capture is enabled:**

   ```bash
   Cmd/Ctrl + K → type "console capture" → enable
   ```

4. **Check if interceptor installed:**
   - Browser console should show:
     "🔧 DevConsole: Console interceptor installed"
   - If not, refresh page

5. **Try logging manually:**

   ```typescript
   import { useDevConsoleStore } from 'src/utils/stores/devConsole'

   const { addLog } = useDevConsoleStore.getState()
   addLog({
     level: 'info',
     message: 'Manual test log',
     args: [],
   })
   ```

---

### Issue: Network Requests Not Captured

**Symptoms:**

- Making API calls but Network panel is empty

**Solutions:**

1. **Enable network capture:**

   ```bash
   Cmd/Ctrl + K → type "network capture" → enable
   ```

2. **Check request method:**
   - Only `fetch()` and `XMLHttpRequest` are captured
   - Axios, jQuery.ajax, etc. should work (use XHR internally)
   - WebSockets not yet supported

3. **Verify interceptor installed:**
   - Browser console should show:
     "🌐 DevConsole: Network interceptor installed"

4. **Test with simple fetch:**

   ```typescript
   fetch('https://jsonplaceholder.typicode.com/todos/1')
     .then((res) => res.json())
     .then((data) => console.log('Fetch test:', data))
   ```

5. **Check for errors in browser console:**
   - Network interceptor might have failed to install

---

### Issue: Command Palette Won't Open

**Symptoms:**

- Pressing `Cmd/Ctrl + K` does nothing

**Solutions:**

1. **Check for conflicting shortcuts:**
   - Some browser extensions override `Cmd+K`
   - Try disabling extensions temporarily

2. **Verify keyboard event listener:**
   - Check browser console for errors
   - DevConsole should log initialization message

3. **Try alternative:**
   - Open DevConsole (`Ctrl + ~`)
   - Click Tools tab
   - Commands available there too

---

### Issue: Errors Not Triggering Badge

**Symptoms:**

- Calling `console.error()` but no floating badge appears

**Solutions:**

1. **Check if console is open:**
   - Badge only shows when console is CLOSED
   - Close console first, then trigger error

2. **Verify error count:**

   ```typescript
   const { unreadErrorCount } = useDevConsoleStore.getState()
   console.log('Unread errors:', unreadErrorCount)
   ```

3. **Check badge visibility:**
   - Badge positioned at bottom-right (z-index 9998)
   - Might be hidden behind other elements

---

### Issue: Console Lags with Many Logs

**Symptoms:**

- Console becomes slow after many logs
- UI freezes or stutters

**Solutions:**

1. **Clear logs:**

   ```bash
   Cmd/Ctrl + K → "Clear Logs"
   ```

2. **Reduce max log limit:**

   ```typescript
   const { updateSettings } = useDevConsoleStore.getState()
   updateSettings({ maxLogs: 500 }) // Default is 1000
   ```

3. **Use log level filters:**
   - Filter out verbose `log` entries
   - Show only `warn` and `error`

4. **Disable verbose logging temporarily:**
   ```typescript
   const { updateSettings } = useDevConsoleStore.getState()
   updateSettings({ captureConsole: false })
   // Do your work
   updateSettings({ captureConsole: true })
   ```

---

## ❓ Frequently Asked Questions

### Q: Will this work in production?

**A:** No. The DevConsole is automatically disabled in production environments. It only activates when:

- `NODE_ENV === "development"`, OR
- Hostname includes `"staging"`, OR
- Hostname includes `"localhost"`

This ensures zero performance impact and no security risk in production.

---

### Q: Can I use custom log types?

**A:** Yes! We provide three custom log types:

```typescript
console.ui('UI event', { component: 'Button', action: 'click' })
console.api('API call', { endpoint: '/users', method: 'GET' })
console.db('DB query', { table: 'campaigns', duration: '45ms' })
```

These show up with distinct colors and icons in the DevConsole.

---

### Q: Does this replace browser DevTools?

**A:** No, it complements them. The DevConsole:

- ✅ Provides in-app debugging experience
- ✅ Custom log types and filtering
- ✅ Persistent log history across reloads
- ✅ GraphQL operation detection
- ✅ Command palette for quick actions

But browser DevTools still offer:

- ✅ Element inspector
- ✅ Debugger with breakpoints
- ✅ Performance profiler
- ✅ Memory analyzer
- ✅ Coverage reports

Use both for maximum productivity!

---

### Q: How do I export logs for bug reports?

**A:** Three ways:

1. **Command Palette:**

   ```bash
   Cmd/Ctrl + K → "Export All Data" → Downloads JSON file
   ```

2. **Clipboard:**

   ```bash
   Cmd/Ctrl + K → "Copy Logs to Clipboard" → Paste in Slack/Discord
   ```

3. **Programmatically:**
   ```typescript
   const { exportAll } = useDevConsoleStore.getState()
   const logsJSON = exportAll()
   // Send to backend, save to file, etc.
   ```

---

### Q: Can I filter logs by time range?

**A:** Yes, programmatically:

```typescript
const { setFilter } = useDevConsoleStore.getState()

// Last 5 minutes
setFilter({
  timeRange: {
    start: Date.now() - 5 * 60 * 1000,
    end: Date.now(),
  },
})

// Clear time filter
setFilter({ timeRange: undefined })
```

UI for time range picker coming in Phase 2.

---

### Q: How do I track Zustand state changes?

**A:** State tracking is planned for Phase 2. Meanwhile, you can manually log:

```typescript
import { useAppStore } from 'src/utils/stores/app'

const prevState = useAppStore.getState()

// After action
const newState = useAppStore.getState()
console.db('State changed', {
  before: prevState,
  after: newState,
})
```

---

### Q: Can I customize the console position?

**A:** Not yet via UI, but programmatically:

```typescript
const { setPosition } = useDevConsoleStore.getState()

setPosition('bottom') // Default - docked at bottom
setPosition('left') // Docked at left
setPosition('right') // Docked at right
setPosition('floating') // Floating panel (coming soon)
```

Draggable panel coming in Phase 2.

---

### Q: Does it capture GraphQL errors?

**A:** Yes! GraphQL errors are automatically:

- Logged to console with `console.api()`
- Shown in Network panel with error badge
- Displayed in response body
- Include operation name and type

Example:

```
✗ QUERY GetUser
{
  duration: "120ms",
  status: 200,
  errors: [{ message: "User not found", path: ["user"] }]
}
```

---

### Q: How do I clear persisted logs?

**A:** Logs are persisted in localStorage. To clear:

1. **Via Command Palette:**

   ```bash
   Cmd/Ctrl + K → "Clear All Data"
   ```

2. **Via Browser:**
   - Open browser DevTools
   - Go to Application → Storage → Local Storage
   - Find key: `dev-console-store`
   - Delete it

3. **Programmatically:**
   ```typescript
   const { clearAll } = useDevConsoleStore.getState()
   clearAll()
   localStorage.removeItem('dev-console-store')
   ```

---

### Q: Can I disable persistence?

**A:** Yes:

```typescript
const { updateSettings } = useDevConsoleStore.getState()
updateSettings({ persistLogs: false })
```

Now logs won't persist across page reloads.

---

### Q: How do I test error boundary?

**A:** Visit the demo page:

```
http://localhost:8910/dev-console-demo
```

Click "Test Error Boundary" button. This will:

1. Throw an error in React component tree
2. Trigger ErrorBoundary
3. Log error to DevConsole
4. Show error UI with stack trace

---

### Q: Can I add custom commands to palette?

**A:** Not yet via API, but you can modify:

```typescript
// web/src/components/DevConsole/CommandPalette.tsx
const commands: CommandAction[] = [
  // Add your custom command here
  {
    id: 'my-action',
    label: 'My Custom Action',
    description: 'Does something cool',
    icon: Zap,
    keywords: ['custom', 'action'],
    action: () => {
      // Your code here
      console.log('Custom action executed!')
      toggleCommandPalette()
    },
    category: 'tools',
  },
  // ... existing commands
]
```

Custom command API coming in Phase 2.

---

### Q: Is there a performance impact?

**A:** Minimal in development:

- < 5ms overhead per log
- Efficient Zustand state management
- Limits: 1000 logs, 500 network requests
- Old entries automatically pruned

Zero impact in production (disabled completely).

---

### Q: How do I contribute features?

**A:** Follow these steps:

1. **Read the architecture:**
   - `web/src/components/DevConsole/README.md`
   - `DEVELOPER_CONSOLE_IMPLEMENTATION_SUMMARY.md`

2. **Study existing code:**
   - All components in `web/src/components/DevConsole/`
   - Zustand store: `web/src/utils/stores/devConsole.ts`

3. **Follow patterns:**
   - Use Zustand for state
   - Apply LinkVybe Design System
   - Add TypeScript types
   - Use Framer Motion for animations

4. **Test thoroughly:**
   - Light and dark modes
   - All keyboard shortcuts
   - Edge cases (empty states, errors)

5. **Document:**
   - Update README.md
   - Add comments for complex logic
   - Update VISUAL_GUIDE.md if UI changes

---

## 🆘 Still Having Issues?

If none of the above solutions work:

1. **Check GitHub Issues:**
   - Search for similar problems
   - Create new issue with details

2. **Provide Debug Info:**

   ```typescript
   // Run in browser console
   const state = useDevConsoleStore.getState()
   console.log('DevConsole State:', {
     isOpen: state.isOpen,
     captureConsole: state.captureConsole,
     captureNetwork: state.captureNetwork,
     logCount: state.logs.length,
     networkCount: state.networkRequests.length,
   })
   ```

3. **Include:**
   - Browser version
   - Operating system
   - Node version (`node -v`)
   - Yarn version (`yarn -v`)
   - Steps to reproduce
   - Error messages (full stack trace)
   - Screenshots/videos if possible

4. **Contact:**
   - Internal Slack channel: `#dev-tools`
   - Email: dev-team@linkvybe.com

---

**Happy Debugging! 🐛🔧**
