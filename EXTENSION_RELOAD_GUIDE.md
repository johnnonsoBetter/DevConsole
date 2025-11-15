# 🔧 DevConsole Extension Reload Instructions

## The Problem
After rebuilding the extension, Chrome needs to reload the updated files. Simply refreshing the page is NOT enough.

## ✅ Complete Reload Steps

### 1. Reload the Extension in Chrome
1. Open `chrome://extensions/` in Chrome
2. Find **DevConsole** extension
3. Click the **🔄 Reload** button (circular arrow icon)
4. Wait for the reload to complete

### 2. Close and Reopen DevTools
1. Close Chrome DevTools completely (X button or Cmd+Option+I)
2. Reopen DevTools (F12 or Cmd+Option+I)
3. Navigate to the **DevConsole** tab

### 3. Hard Refresh the Page
1. With DevTools open, right-click the browser's refresh button
2. Select **Empty Cache and Hard Reload**
   - Or use: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)

### 4. Verify Installation
Open the regular Console tab in DevTools and look for:
```
[DevConsole] 🔧 Injecting page script from: chrome-extension://...
[DevConsole] ✅ Page hook script loaded successfully
[DevConsole] ✅ Control API detected on window
🔧 DevConsole Extension Active Console hooks installed.
```

If you see these messages, the extension is working correctly.

## 🔍 Diagnostic Steps

### Check Extension Status
```javascript
// Run in browser console
console.log('Extension ID:', chrome?.runtime?.id);
console.log('Control API:', typeof window.__devConsoleControl);
```

Expected output:
```
Extension ID: [some-id-string]
Control API: object
```

### Test Log Capture
```javascript
// Run in browser console
console.log('TEST: This should appear in DevConsole panel');
console.warn('TEST: Warning message');
console.error('TEST: Error message');
```

These should appear in both:
- Regular Chrome Console
- DevConsole panel → Logs tab

### Test Network Capture
```javascript
// Run in browser console
fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then(r => r.json())
  .then(d => console.log('Fetch complete:', d));
```

This should appear in:
- DevConsole panel → Network tab
- Shows method, URL, status, duration

### Check Runtime Control
```javascript
// Run in browser console
__devConsoleControl.status();
```

Should output current capture stats.

## ❌ Common Issues & Solutions

### Issue: "No Console Logs Yet"
**Causes:**
- Extension not reloaded after rebuild
- DevTools opened before page loaded
- Page on blocklist (chrome://, about:, etc.)

**Solutions:**
1. Follow complete reload steps above
2. Open DevConsole tab BEFORE generating logs
3. Test on a regular website (not chrome:// URLs)

### Issue: Control API Not Found
**Error:** `Uncaught ReferenceError: __devConsoleControl is not defined`

**Solutions:**
1. Reload extension at `chrome://extensions/`
2. Check manifest.json includes `page-hook-logic.js` in `web_accessible_resources`
3. Verify file exists: `dist/page-hook-logic.js`
4. Check browser console for injection errors

### Issue: Network Tab Empty
**Causes:**
- Requests made before DevConsole loaded
- Capture disabled via control API

**Solutions:**
1. Open DevConsole BEFORE making requests
2. Check capture is enabled: `__devConsoleControl.status()`
3. Enable if needed: `__devConsoleControl.enable()`

### Issue: Extension Not Visible in DevTools
**Causes:**
- DevTools open before extension reload
- Extension failed to build correctly

**Solutions:**
1. Close DevTools completely
2. Reload extension at `chrome://extensions/`
3. Reopen DevTools
4. Check for errors in extension service worker

## 🧪 Use Diagnostic Page

Open the included diagnostic page:
```bash
open diagnose.html
```

Or in browser:
```
file:///path/to/ripe-console/diagnose.html
```

Run each diagnostic test to identify the issue.

## 🚀 Quick Reset (Nuclear Option)

If nothing works:

1. **Remove extension completely:**
   - Go to `chrome://extensions/`
   - Click **Remove** on DevConsole
   
2. **Rebuild:**
   ```bash
   cd /path/to/ripe-console
   rm -rf dist node_modules
   npm install
   npm run build
   ```

3. **Reinstall:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `dist/` folder

4. **Open fresh page:**
   - Open a new tab
   - Navigate to test page
   - Open DevTools → DevConsole tab

## 📋 Verification Checklist

- [ ] Ran `npm run build` successfully
- [ ] Reloaded extension at `chrome://extensions/`
- [ ] Closed and reopened DevTools
- [ ] Hard refreshed the page (Cmd+Shift+R)
- [ ] See injection messages in console
- [ ] DevConsole tab appears in DevTools
- [ ] Logs appear when running `console.log('test')`
- [ ] Network requests appear when running `fetch(...)`
- [ ] Control API available: `__devConsoleControl.status()`

## 🆘 Still Not Working?

1. Check Chrome version (requires Chrome 88+)
2. Disable other console extensions
3. Check for service worker errors:
   - `chrome://extensions/` → DevConsole → **Inspect views: service worker**
4. Check content script errors:
   - Regular DevTools Console → Look for `[DevConsole]` messages
5. Review build output for errors:
   ```bash
   npm run build 2>&1 | grep -i error
   ```

## 📞 Debug Information to Collect

If reporting an issue, include:

```javascript
// Run in browser console
console.log({
  chromeRuntime: typeof chrome?.runtime,
  extensionId: chrome?.runtime?.id,
  controlAPI: typeof window.__devConsoleControl,
  restoreAPI: typeof window.__devConsole_restore,
  documentState: document.readyState,
  url: window.location.href
});
```

---

**Remember:** After any code changes, always:
1. Build (`npm run build`)
2. Reload extension
3. Close/reopen DevTools
4. Hard refresh page
