# DevConsole

> Advanced Chrome DevTools with AI-powered debugging, GraphQL explorer, and smart form autofill

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=google-chrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)

## Quick Start (3 Steps)

### 1. Clone & Install
```bash
git clone https://github.com/johnnonsoBetter/DevConsole.git
cd DevConsole
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist` folder from this project

✅ **Done!** Open Chrome DevTools (F12) and look for the **DevConsole** tab

---

## What You Get

### 🎯 Enhanced Console
- Captures all `console.*` logs with filtering and search
- Custom loggers: `console.ui()`, `console.api()`, `console.db()`
- Persistent history across page reloads

### 🌐 Network Monitor
- Automatically detects and labels GraphQL operations
- View full request/response with headers and body
- Filter by method, status, or URL

### ⚡ GraphQL Explorer
- Full GraphiQL IDE built-in
- Test queries without leaving DevTools
- Schema introspection and autocomplete

### 📝 Notes & Documentation
- **Rich text note-taking** powered by ProseMirror
- Markdown support with live preview
- Organize with colors and pinned notes
- Full-text search across all notes
- Persistent storage with auto-save

### 🤖 AI Features (Chrome Canary Only)
- **On-device AI** powered by Gemini Nano
- Summarize errors and logs
- Generate GitHub issues from bugs
- Language translation and detection
- *Requires Chrome Canary with AI flags enabled*

### 📋 Smart Autofill
- Fill forms with realistic test data
- 5 built-in personas that rotate intelligently
- Unsplash integration for image inputs
- Keyboard shortcuts: `Alt+\`` (suggestions), `Ctrl+F` (fill all)

### 🐙 GitHub Integration
- Create issues directly from errors
- Auto-generate bug reports with context
- Include logs, network data, and screenshots

---

## Development Mode

Run with hot reload:
```bash
npm run dev
```

Then in `chrome://extensions/`, click the refresh icon on the DevConsole extension after making changes.

---

## Configuration

### GitHub Issues
1. Click **Settings** tab in DevConsole
2. Add your GitHub username
3. Add repository (`owner/repo-name`)
4. Generate a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo&description=DevConsole) with `repo` scope
5. Test connection and save

### GraphQL Explorer
1. Click **Settings** tab
2. Enter your GraphQL endpoint (e.g., `https://api.example.com/graphql` or `/graphql`)
3. Test connection and save

### Unsplash (Optional)
1. Get a free API key from [Unsplash Developers](https://unsplash.com/developers)
2. Add in Settings under "Unsplash Integration"

---

## Chrome AI Setup (Optional)

To use AI features, you need Chrome Canary:

1. Download [Chrome Canary](https://www.google.com/chrome/canary/)
2. Open `chrome://flags/#optimization-guide-on-device-model`
3. Set to **Enabled**
4. Open `chrome://flags/#prompt-api-for-gemini-nano`
5. Set to **Enabled**
6. Restart Chrome Canary
7. Open DevConsole AI panel - models will download on first use

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **Zustand** (state management)
- **Framer Motion** (animations)
- **GraphiQL** (GraphQL IDE)
- **Chrome Manifest V3**

---

## Project Structure

```
src/
├── background/         # Service worker
├── content/            # Content scripts (page injection)
├── devtools/           # DevTools panel
├── components/         # React components
│   └── DevConsole/     # Main console UI
├── hooks/              # Custom React hooks
├── lib/                # Core libraries
│   ├── autofill/       # Form autofill system
│   └── devConsole/     # Console/network interceptors
└── utils/              # Utilities and stores
```

---

## Troubleshooting

### Extension doesn't appear in DevTools
- Make sure you built with `npm run build`
- Refresh the extension at `chrome://extensions/`
- Close and reopen DevTools (F12)

### AI features not working
- Chrome AI requires Chrome Canary (not stable Chrome)
- Check flags are enabled at `chrome://flags`
- Models download on first use (check AI panel for progress)

### Autofill not showing
- Check console for errors
- Ensure content scripts are injected (refresh page after loading extension)

### Network/Console not capturing
- Open DevConsole **before** loading the page you want to monitor
- Check Settings panel - ensure capture is enabled

---

## License

MIT

---

## Contributing

Issues and PRs welcome! This is a development tool built for developers.

---

**Made with ❤️ for developers who want better debugging tools**
