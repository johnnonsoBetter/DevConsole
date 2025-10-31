# 🚀 DevConsole Chrome Extension

A powerful Chrome DevTools panel for advanced logging, network monitoring, GraphQL exploration, and AI assistance.

## 🏃 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Extension
```bash
npm run build
```

### 3. Load in Chrome

1. **Open Chrome Extensions page:**
   - Navigate to `chrome://extensions/`
   - Or go to: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle "Developer mode" in the top-right corner

3. **Load Extension:**
   - Click "Load unpacked"
   - Select the `dist` folder from this project

4. **Open DevTools:**
   - Visit any website (e.g., `https://google.com`)
   - Press `F12` or right-click → "Inspect"
   - Look for the **"DevConsole"** tab in the DevTools panel

### 4. Test the Extension

1. **Console Logs Test:**
   - Open the browser console (`F12` → Console)
   - Type: `console.log("Hello DevConsole!")`
   - Switch to the **DevConsole** tab
   - You should see the log appear

2. **Network Requests Test:**
   - Visit a website that makes API calls
   - Check the DevConsole panel for captured network activity

## 🛠️ Development

### Build for Development
```bash
npm run dev
```

### Project Structure
```
devconsole-chrome-extension/
├── src/
│   ├── background/          # Service worker
│   ├── content/             # Content scripts (console/network interceptors)
│   ├── devtools/            # DevTools panel UI
│   └── components/          # React components
├── dist/                    # Built extension (load this in Chrome)
└── manifest.json            # Extension configuration
```

## 🎯 Current Features

✅ **Chrome Extension Setup**
- Manifest v3 configuration
- Service worker background script
- Content script injection
- DevTools panel registration

✅ **Basic UI**
- React-based DevTools panel
- Dark theme with Tailwind CSS
- Status indicators

✅ **Console Intercepting**
- Captures all `console.*` calls
- Preserves stack traces
- Handles errors and rejections

🚧 **In Progress**
- Network request monitoring
- AI assistance features
- Advanced filtering and search

## 🔧 Troubleshooting

### Extension Not Loading
- Make sure you're loading the `dist` folder (not the root folder)
- Check Chrome Extensions page for error messages
- Verify Developer Mode is enabled

### DevConsole Tab Not Showing
- Refresh the webpage after loading the extension
- Close and reopen DevTools
- Check the browser console for extension errors

### No Logs Appearing
- Make sure you're on a website (not chrome:// pages)
- Try logging from the browser console: `console.log("test")`
- Check that the extension has proper permissions

## 📚 Next Steps

Once the basic extension is working, you can:

1. **Add Advanced Components** - Migrate your existing LogsPanel, NetworkPanel, AIPanel components
2. **Implement State Management** - Add Zustand store with Chrome storage sync
3. **Add AI Features** - Integrate your AI service and GitHub API utilities
4. **Enhance Network Monitoring** - Add detailed request/response inspection
5. **Add GraphQL Explorer** - Port your existing GraphQL tools

## 🤝 Contributing

This is the foundational structure for porting your existing DevConsole overlay into a Chrome extension. All your existing UI components and utilities can be directly integrated into this structure.

The key architectural changes:
- **From**: Direct function calls → **To**: Chrome extension message passing
- **From**: localStorage → **To**: Chrome storage API
- **From**: In-app overlay → **To**: DevTools panel

**~80% of your existing code is reusable!** 🎉