# 🚀 Developer Console - Quick Start Guide

Get up and running with the LinkVybe Developer Console in 60 seconds.

---

## ⚡ Instant Access

1. **Start your dev server:**

   ```bash
   yarn rw dev
   ```

2. **Open your app:**

   ```
   http://localhost:8910
   ```

3. **Toggle the console:**
   - Press `Ctrl + ~` (Windows/Linux)
   - Press `Control + ~` (Mac)

**That's it!** The DevConsole is now active and capturing logs.

---

## 🎯 Common Actions

### View Logs

```bash
Ctrl + ~  # Open console
```

Click **Logs** tab to see all console output.

### Search Logs

Type in the search box at the top of the Logs panel.

### Filter by Log Level

Click the icon buttons (info, warn, error) to toggle visibility.

### View Network Requests

Click **Network** tab to see all fetch/XHR requests.

### Quick Commands

```bash
Cmd/Ctrl + K  # Open command palette
```

Type to search, use ↑↓ to navigate, Enter to execute.

### Export Data

```bash
Cmd/Ctrl + K → type "export"
```

---

## 📝 Custom Logging

### UI Events

```typescript
console.ui('Button clicked', { buttonId: 'submit', userId: 123 })
```

### API Calls

```typescript
console.api('Fetching user data', { endpoint: '/api/users', method: 'GET' })
```

### Database Operations

```typescript
console.db('Query executed', { table: 'campaigns', duration: '45ms' })
```

---

## 🧪 Test Drive

Visit the **interactive demo page:**

```
http://localhost:8910/dev-console-demo
```

Click buttons to generate logs, network requests, and errors.

---

## 🎨 Keyboard Shortcuts Cheat Sheet

| Action            | Shortcut       |
| ----------------- | -------------- |
| Toggle Console    | `Ctrl + ~`     |
| Command Palette   | `Cmd/Ctrl + K` |
| Close             | `ESC`          |
| Navigate Commands | `↑ ↓`          |
| Execute Command   | `Enter`        |

---

## 🔍 Troubleshooting

**Console not opening?**

- Ensure you're in development mode (`yarn rw dev`)
- Check browser console for errors
- Try refreshing the page

**No logs appearing?**

- Check log level filters (buttons in Logs panel)
- Clear search filter
- Verify capture is enabled: `Cmd+K → "Toggle Console Capture"`

**Network requests missing?**

- Enable network capture: `Cmd+K → "Toggle Network Capture"`
- Ensure request uses `fetch()` or `XMLHttpRequest`

---

## 📚 Full Documentation

For advanced features and configuration:

- [Full README](./README.md)
- [Implementation Summary](../../../DEVELOPER_CONSOLE_IMPLEMENTATION_SUMMARY.md)

---

**Happy Debugging! 🎉**
