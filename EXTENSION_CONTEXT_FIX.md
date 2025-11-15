# Extension Context Invalidation Fix

## Problem

When the Chrome extension is reloaded while DevTools is open, the extension context becomes invalidated. This causes errors when trying to access Chrome APIs like `chrome.storage` or `chrome.runtime`, resulting in messages like:

```
Failed to load GitHub settings: Error: Extension context invalidated.
```

## Root Cause

Chrome extensions operate in separate contexts that communicate via message passing. When an extension is reloaded:
1. The old context is destroyed
2. Any pending operations fail with "Extension context invalidated"
3. The DevTools panel tries to access `chrome.storage` which is no longer available

## Solution

The fix implements graceful error handling at multiple levels:

### 1. **Hook Level (`useGitHubSettings.ts`)**

- Added runtime validation checks before accessing Chrome APIs
- Provides user-friendly error messages when context is invalidated
- Gracefully handles cleanup when extension is reloaded

**Changes:**
```typescript
// Check if extension context is valid before storage access
if (!chrome?.runtime?.id) {
  throw new Error('Extension context invalidated. Please close and reopen DevTools.');
}
```

### 2. **Storage Service Level (`storage/service.ts`)**

- Returns cached values when context is invalidated
- Silently handles write failures during context invalidation
- Prevents errors from propagating to the UI

**Changes:**
```typescript
// Return cached value if context is invalidated
if (!chrome?.runtime?.id) {
  console.warn(`[Storage] Extension context invalidated - returning cached value`);
  return cached ?? null;
}
```

### 3. **UI Level (`GitHubSettingsPanel.tsx`)**

- Displays clear error messages to users
- Provides actionable instructions to fix the issue
- Shows loading states appropriately

**Added:**
```tsx
{/* Extension Context Error */}
{loadError && (
  <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
    <div className="flex items-start gap-3">
      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-destructive mb-1">
          Connection Error
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {loadError}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>To fix this:</strong> Close DevTools completely, then reopen it by pressing F12 or right-click → Inspect.
        </p>
      </div>
    </div>
  </div>
)}
```

## User Experience

### Before Fix
- ❌ Cryptic error messages in console
- ❌ No indication of how to fix the issue
- ❌ Settings panel appears broken
- ❌ Errors propagate and break the UI

### After Fix
- ✅ Clear, actionable error messages
- ✅ Instructions on how to recover
- ✅ Graceful degradation using cached data
- ✅ UI remains functional where possible

## How to Test

1. **Open DevTools:**
   - Load the extension
   - Open DevTools and navigate to the DevConsole tab

2. **Trigger Context Invalidation:**
   - Go to `chrome://extensions/`
   - Click the reload button for the extension
   - Return to the DevTools panel

3. **Expected Behavior:**
   - Error banner appears at top of Settings → GitHub panel
   - Error message: "Extension was reloaded. Please close and reopen DevTools to reconnect."
   - Cached settings (if any) are still displayed
   - Other tabs continue to work with cached data

4. **Recovery:**
   - Close DevTools (Ctrl/Cmd + Shift + I or close the window)
   - Reopen DevTools (F12 or right-click → Inspect)
   - All functionality restored

## Technical Details

### Context Validation Pattern

All Chrome API calls now follow this pattern:

```typescript
// Check context validity
if (!chrome?.runtime?.id) {
  // Handle invalidated context
  return fallbackValue;
}

// Safe to use Chrome APIs
await chrome.storage.local.get(key);
```

### Error Message Mapping

| Technical Error | User-Friendly Message |
|----------------|----------------------|
| `Extension context invalidated` | "Extension was reloaded. Please close and reopen DevTools to reconnect." |
| `message port closed` | "Extension was reloaded. Please close and reopen DevTools to reconnect." |
| Generic storage error | Shows the actual error message |

## Files Modified

1. **src/hooks/useGitHubSettings.ts**
   - Added context validation to all storage operations
   - Improved error messages for users
   - Added graceful cleanup in useEffect

2. **src/core/storage/service.ts**
   - Return cached values when context is invalidated
   - Silent handling of write failures
   - Better logging for debugging

3. **src/components/DevConsole/GitHubSettingsPanel.tsx**
   - Display extension context errors prominently
   - Show loading states
   - Provide recovery instructions

## Related Issues

This fix also improves handling of:
- Extension updates during active sessions
- Browser back/forward cache interactions
- Network disconnections during API calls
- Race conditions during extension reload

## Prevention

To minimize context invalidation issues during development:

1. **Avoid reloading the extension while DevTools is open**
   - Close DevTools before reloading
   - Or accept that you'll need to reopen DevTools

2. **Use hot reload carefully**
   - Hot reload can work for content changes
   - Service worker changes require full extension reload

3. **Development workflow:**
   ```bash
   # Make changes
   npm run build
   # Close DevTools
   # Reload extension at chrome://extensions/
   # Reopen DevTools
   ```

## Future Improvements

Potential enhancements to consider:

1. **Auto-reconnection**: Automatically attempt to reconnect when context is restored
2. **Background sync**: Keep a background connection alive to detect context changes
3. **State persistence**: More aggressive caching of critical state
4. **Connection health indicator**: Show connection status in the UI

## References

- [Chrome Extension Context Invalidation](https://stackoverflow.com/questions/53939205/how-to-avoid-extension-context-invalidated-errors-when-messaging-in-a-chrome)
- [Chrome Extension Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Storage API Best Practices](https://developer.chrome.com/docs/extensions/reference/storage/)
