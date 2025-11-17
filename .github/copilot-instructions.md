# DevConsole Repository Instructions

## Summary & Stack

- Chrome DevTools extension that intercepts console/network traffic, injects a React-based DevConsole UI, ships a GraphQL explorer, GitHub issue automation, Chrome on-device AI panels, and a smart autofill assistant.
- Tooling: Node 18+, npm 10+, Vite + React 18 + TypeScript, Zustand stores, TailwindCSS, Framer Motion, GraphiQL, Chrome Manifest V3 service worker, Vercel `ai` SDK, Unsplash integration.
- Core flow: `src/content/page-hook-logic.ts` (page context hooks) → `src/content/index.ts` relay → `src/background/service-worker.ts` state/messaging → `src/devtools` bridge → `src/components/DevConsole` UI tabs.

## Build, Run, and Validate

1. **Bootstrap** (always run after cloning or pulling):
   ```bash
   npm install
   ```
2. **Hot development build** (rebuilds on change, then refresh at `chrome://extensions/` → reload extension):
   ```bash
   npm run dev
   ```
3. **Production build for packaging/loading** (outputs `dist/` used by Chrome "Load unpacked"):
   ```bash
   npm run build
   ```
4. **Type-safety / lint analogue** (tsc noEmit – run before committing TS changes):
   ```bash
   npm run type-check
   ```
5. **Manual validation steps** (run after meaningful UI or background changes):
   - Load `dist/` via `chrome://extensions/` (Developer mode on, Load unpacked).
   - Open DevTools → **DevConsole** tab, ensure UI renders without console errors.
   - Trigger `console.log`/`fetch` on inspected page to confirm Logs/Network tabs update.
   - In Settings tab, confirm AI/GitHub/GraphQL forms mount; run "Test Connection" buttons if logic touched.
   - For AI log explainer changes, configure AI settings → select log → click "Explain with AI" → verify streaming output.
   - For Chrome built-in AI panel work, use Chrome Canary with flags `chrome://flags/#optimization-guide-on-device-model` and `#prompt-api-for-gemini-nano` enabled; check download badges.
   - For Autofill updates, open any multi-field form, ensure suggestion icons, Fill-All CTA, and Unsplash picker still appear (per `Input.md` checklist).

## Project Layout & Pointers

- `manifest.json`: MV3 manifest (permissions: `storage`, `activeTab`, `debugger`, `<all_urls>`). Update this if new capabilities need permissions or resources.
- `public/popup.*`: Toolbar popup instructions/status.
- `src/background/service-worker.ts`: Central state manager, `MessageReceiver` handlers, chrome storage persistence.
- `src/content/`: `page-hook-logic.ts` (console/network interception in page context - injected into page), `index.ts` (message relay with batching + autofill bootstrap), `pageScriptInjector.ts` (creates script tag to inject page-hook-logic).
- `src/devtools/`: DevTools entrypoints (`devtools.ts`, `DevToolsPanel.tsx`, `bridge.ts`, `backgroundBridge.ts`, `theme-init.ts`).
- `src/components/DevConsole/`: Tab components (`DevConsolePanel`, `LogsPanel`, `NetworkPanel`, `GraphQLExplorer`, `AIPanel`, `CodeSandboxPanel`, `UnifiedSettingsPanel`, etc.) plus supporting UI (Chips, ThemeToggle, BetterTabs, `SuperWriteAI` - AI-powered issue enhancement FAB).
- `src/lib/devConsole/`: AI services (`aiClient`, `logExplainer`), GitHub + GraphQL helpers, contextPacker utilities, prompt formatter, settings managers.
- `src/lib/autofill/`: Dataset management, field detection, fill logic, UI manager, Unsplash service, `autofill.css`.
- `src/hooks/`: Chrome AI hooks (`useChromeAI`, `usePromptModel`, etc.), GitHub settings hook, theme/media utilities.
- `src/utils/`: Shared helpers, extension settings persistence, JSON sanitizer, browser support, Zustand stores (`src/utils/stores`).
- Key docs: `README.md` (quick start), `ARCHITECTURE.md` (data flow, best practices), `TESTING.md`, `AI_LOG_EXPLAINER.md`, `AI_QUICK_START.md`, `SETTINGS_*.md`, `Input.md` (autofill deep dive), `SUPER_WRITE_AI.md` (AI-powered issue enhancement).

## Feature Workflows

- **DevConsole tabs**: `CONSOLE_TABS` defined in `DevConsolePanel.tsx`. Add new tabs by appending to this array and creating a component under `src/components/DevConsole/panels/` (or sibling). Use `lucide-react` icons.
- **Messaging**: Add message shapes in `src/core/messaging/types.ts`, handle in `service-worker.ts`, send via `MessageSender`/`MessageReceiver`. Respect batching (`DEVCONSOLE_BATCH`) from content script.
- **Settings**: Use `UnifiedSettingsPanel.tsx` sections (AI, GitHub, GraphQL, Unsplash, General). Persist via helpers in `src/utils/extensionSettings.ts` and ensure `StateManager.updateSettings` stays in sync.
- **AI log explainer**: `src/lib/ai/services/{aiClient,logExplainer}.ts` plus `LogExplanation.tsx`. Keep provider-agnostic interfaces and streaming UI states intact.
- **Chrome built-in AI panel**: `src/components/DevConsole/AIPanel.tsx` with hooks from `src/hooks/useChromeAI.ts`. Ensure availability checks run before enabling actions.
- **GitHub integration**: Settings hook (`src/hooks/useGitHubSettings.ts`), API helpers (`src/lib/devConsole/githubApi.ts`), UI (`GitHubIssuePanel`, `GitHubIssueSlideout`). Personal Access Tokens stored locally; never log them.
- **Super Write AI**: AI-powered GitHub issue enhancement via `SuperWriteAI.tsx` FAB button. Transforms sparse/non-technical issues into well-structured markdown following best practices. Integrated in `GitHubIssueSlideout`; requires AI settings configured. See `SUPER_WRITE_AI.md` for full documentation.
- **GraphQL explorer**: GraphiQL UI under `src/components/DevConsole/GraphQLExplorer.tsx`. Endpoints managed through `src/lib/devConsole/graphqlSettings.ts` (validation/testing).
- **Smart Autofill**: All logic under `src/lib/autofill`. `initializeAutofill()` runs from content script; maintain dataset schema documented in `Input.md`. Keyboard shortcuts: ``Alt+` `` (suggestion overlay) and `Ctrl+F` (Fill All).

## Guardrails & Conventions

- Trust these instructions first; only search when information is missing or inaccurate.
- Always run `npm install` after pulling dependency changes, and run `npm run build` before validating the Chrome extension.
- Keep instructions/documentation (`README`, `ARCHITECTURE`, `AI_*`, `SETTINGS_*`, `Input.md`) in sync with behavior changes.
- Use `StorageService` instead of raw `chrome.storage` for persistence (handles caching/debouncing).
- Preserve batching/redaction logic in `src/content/index.ts` when modifying message relay.
- When touching manifest permissions or Chrome APIs, document the rationale and update onboarding docs.
- Keep AI secrets and Unsplash keys user-supplied; never hardcode secrets or sample keys.
- Favor `lucide-react` icons, Tailwind utility classes, and existing component patterns for consistency.

## Troubleshooting Tips

- Extension not loading: rerun `npm run build`, reload via `chrome://extensions/`, inspect service-worker console for errors.
- DevConsole tab missing: ensure extension reloaded after build, close/reopen DevTools.
- Logs/Network empty: open DevConsole before loading target page; verify `captureConsole`/`captureNetwork` settings are enabled.
- AI features failing: confirm Chrome Canary flags (for on-device features) or API keys (for cloud providers) and consult `AI_LOG_EXPLAINER.md` troubleshooting.
- Autofill glitches: follow `Input.md` debugging checklist (verify dataset storage, DOM mutation observer, Unsplash quota).

## References & Next Actions

- Primary references: `README.md`, `ARCHITECTURE.md`, `TESTING.md`, `AI_LOG_EXPLAINER.md`, `AI_QUICK_START.md`, `SETTINGS_GUIDE.md`, `SETTINGS_ARCHITECTURE.md`, `SETTINGS_IMPLEMENTATION.md`, `Input.md`, `SUPER_WRITE_AI.md`.
- Before sending PRs, document new commands or quirks here if they help future agents avoid trial-and-error.
- Treat this file as the authoritative instruction set for Copilot; update it whenever workflows, commands, or architecture meaningfully change.
