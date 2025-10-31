# 🔧 DevConsole Extension - Testing Guide

## ✅ Step-by-Step Setup

### 1. Load the Extension

1. Open Chrome and go to: `chrome://extensions/`
2. **Enable "Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select: `/Users/chinonsojohn/ripe-console/dist`
5. Click "Select"

### 2. Verify Extension Loaded

You should see:
- ✅ Extension card showing "DevConsole" with blue icon
- ✅ No errors in red text
- ✅ Status shows "On" (toggle is blue)

### 3. Test the Popup

1. Look for the DevConsole icon in your Chrome toolbar (blue square with "DC")
2. If you don't see it, click the **puzzle piece (🧩)** icon and pin DevConsole
3. **Click the DevConsole icon** → You should see a popup with instructions
4. ✅ If popup appears → Extension is working!

### 4. Test the DevTools Panel

1. Visit **any website** (try https://google.com)
2. Press **F12** or right-click → "Inspect"
3. In DevTools, look for tabs at the top: Elements | Console | Sources | **DevConsole** ← Look here!
4. Click the **DevConsole** tab
5. You should see: "DevConsole" title and "Status: Connected/Disconnected"

### 5. Test Console Logging

1. Keep DevTools open with DevConsole tab visible
2. Switch to the **Console** tab
3. Type: `console.log("Hello from DevConsole!")`
4. Press Enter
5. Switch back to the **DevConsole** tab
6. ✅ You should see your log appear!

## 🚨 Troubleshooting

### Extension Not Loading?
- **Error: "Manifest file is missing or unreadable"**
  - Make sure you selected the `dist` folder, NOT the root folder
  
- **Error: "Service worker registration failed"**
  - Check Chrome version (need Chrome 88+)
  - Try reloading: Click the refresh icon (🔄) on the extension card

### Popup Not Showing?
- Click the puzzle piece (🧩) icon in toolbar
- Find "DevConsole" in the list
- Click the pin icon to pin it to toolbar
- Now click the DevConsole icon

### DevTools Panel Not Showing?
- Make sure you're on a regular website (not chrome:// pages)
- Try refreshing the page (F5)
- Close and reopen DevTools (F12)
- Check the extension is enabled at chrome://extensions/

### No Logs Appearing?
- Make sure you're in the DevConsole tab (not Console tab)
- Try: `console.error("test")` or `console.warn("test")`
- Check browser console for errors (F12 → Console tab)

## 📊 Current Status

After following the steps above, you should have:
- ✅ Extension loaded in Chrome
- ✅ Popup showing when clicking extension icon
- ✅ DevTools panel visible when inspecting pages
- 🚧 Console logs being captured (basic implementation)
- 🚧 Network monitoring (in progress)

## 🎯 What Should Work Now

1. **Popup**: Click extension icon → See instructions
2. **DevTools Panel**: F12 → DevConsole tab → See UI
3. **Console Intercept**: Type logs in browser console → See in DevConsole tab

## 📝 Next Development Steps

Once confirmed working:
- [ ] Add your existing UI components (LogsPanel, NetworkPanel, AIPanel)
- [ ] Implement Zustand store with Chrome storage
- [ ] Add filtering and search
- [ ] Integrate AI features
- [ ] Add GraphQL explorer

---

**Need help?** Check the extension's details page at chrome://extensions/ for any error messages.