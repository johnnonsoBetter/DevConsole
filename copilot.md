# DevConsole Copilot Playbook

## Mission Snapshot
- **Product**: Chrome DevTools extension that captures console + network data, injects a React DevConsole UI, and layers in AI tooling, GitHub automation, GraphQL exploration, and smart autofill.
- **Stack**: Vite + React 18 + TypeScript, Zustand, TailwindCSS, Framer Motion, Manifest V3 service worker, Chrome storage/messaging, GraphiQL, Vercel `ai` SDK, Unsplash integration.
- **Experience Pillars**: Observability (Logs/Network), Collaboration (context packs, GitHub issues), Intelligence (AI explainers + Chrome on-device models), Productivity (Autofill + Playground tools).
- **Primary Flow**: `page-hook-logic.ts` (capture) → `content/index.ts` (batch + relay + Autofill bootstrap) → `background/service-worker.ts` (state + storage) → `src/devtools` bridge → `src/components/DevConsole` tabs.

## Architecture in Motion
The extension runs three coordinated contexts:
1. **Page context hooks** instrument `console.*`, `fetch`, and XHR, redact payloads, and emit `window.postMessage` events.
2. **Content script** injects hooks, batches events via `DEVCONSOLE_BATCH` config, initializes Autofill UI, and forwards messages to the background worker.
3. **Service worker** (MV3) persists logs/network/settings through `StateManager` + `StorageService`, notifies DevTools via typed messaging, and fan-outs updates to Zustand stores consumed by the React panel.

### Message & Data Flow
```
Page Hooks  ──┐ (console/network payloads)
              │ window.postMessage
Content Script ├─ batch/redact → chrome.runtime.sendMessage
              │
Service Worker ── StateManager + StorageService
              │   ↓ DEVTOOLS_UPDATE / COMMAND messages
DevTools Bridge → Zustand Stores → React DevConsole Tabs
```
- **State ownership**: Logs & network live in `StateManager`. UI-only preferences belong in dedicated Zustand stores under `src/utils/stores` and sync to chrome.storage via helper selectors.
- **Storage rules**: Always go through `src/core/storage` or `src/utils/extensionSettings.ts` for debounced, schema-aware persistence.
- **Messaging contracts**: Define payloads in `src/core/messaging/types.ts`, send with `MessageSender`, receive via `MessageReceiver` in both background and DevTools contexts.

## Module Map & Responsibilities
- `manifest.json`: MV3 permissions (`storage`, `activeTab`, `<all_urls>`), background service worker entry, content + DevTools scripts.
- `src/content/`: `page-hook-logic.ts`, relay `index.ts`, Autofill bootstrap, injection helpers.
- `src/background/`: `service-worker.ts` + `StateManager`, storage wiring, message handlers.
- `src/devtools/`: Panel registration (`devtools.ts`, `DevToolsPanel.tsx`), bridge that hydrates Zustand stores.
- `src/components/DevConsole/`: DevConsole shell, tabs (Logs, Network, GraphQL, Tools, Settings), AI widgets, GitHub/GraphQL panels, shared UI primitives.
- `src/lib/devConsole/`: Console/network interceptors, AI client/log explainer, GitHub + GraphQL helpers, context packer, prompt formatter.
- `src/lib/autofill/`: `datastore.ts`, `fieldDetector.ts`, `fillLogic.ts`, `uiManager.ts`, `unsplashService.ts`; orchestrated via `initializeAutofill()`.
- `src/core/`: Messaging + storage abstractions used across contexts.
- `src/utils/`: Shared helpers (`extensionSettings`, `jsonSanitizer`, `browserSupport`, `timeUtils`) plus Zustand stores.
- `src/hooks/`: Convenience hooks for AI availability, GitHub settings normalization, theme/media queries.
- `src/components/ui/` and `ui/better-tabs.tsx`: Tab primitives, mobile sheet, chips, sparkline micro-viz.

## Messaging & State Contracts
- **One source of truth per payload**: Logs/network remain in the background; UI stores hold presentation-only state. When bridging, emit typed deltas (`DEVTOOLS_UPDATE`) instead of whole snapshots when possible.
- **Batch aggressively**: Honor `MAX_BATCH_SIZE` & `BATCH_INTERVAL_MS` to avoid saturating the MV3 messaging quota. Never send unbatched bursts from content scripts.
- **Serialization**: Use `serializeConsoleArguments` + `redactSensitiveData` before leaving the page context. Payloads must be JSON-serializable—no DOM nodes, functions, or circular refs.
- **StorageService**: Prefer `StorageService.setState` over direct `chrome.storage` writes to keep caching, debouncing, and error logging consistent.
- **Cleanup**: When adding message handlers or listeners, mirror teardown paths (`chrome.runtime.onMessage.removeListener`, tab removal hooks) to avoid leaks after DevTools closes.

## UI & Design System Essentials (LinkVybe Premium V2)
This repo aligns with the LinkVybe Premium Design System V2 described in `design-guide.md`. Treat these rules as non-negotiable:

### Palette & Semantics
- **Color tokens**: `--primary` (Purple hsl(262,83%,58%)/dark hsl(262,80%,65%)), `--secondary` (Indigo hsl(221,83%,53%)), `--success`, `--warning`, `--destructive`, `--info` as documented. Keep tokens in Tailwind config + CSS vars.
- **60/30/10 rule**: 60% neutral surfaces, 30% supporting tones, 10% accent. Avoid additional accent colors unless mapping to semantic state.
- **State shifts**: Hover = ±10% lightness, Active = ±20%, Disabled = 40% opacity + no shadows, Focus = 2px primary outline. Never rely on color alone for state changes.

### Cards, Layout, and Spacing
- **Card anatomy**: Header (bold title), body (grouped info on 8px grid), optional media slot, footer actions (short labels, logical order). Use subtle borders/shadows; no heavy blurs.
- **Grid discipline**: Everything rides the 8px baseline. Align labels above inputs, left-align values, and group by semantic sections.
- **Navigation**: Keep 5–7 primary items. In DevConsole, that means limited tab additions—prefer nested panels over new primary tabs unless workflow warrants it.
- **Responsive rules**: Collapse secondary metadata first; stack cards instead of squeezing typography below 14px.

### Typography & Motion
- **Fonts**: Stick to system stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`) or the approved pairing (headers semi-bold, body regular). 3–4 sizes per screen, 1.5× line height, 45–75 char lines.
- **Motion**: Use Framer Motion/Tailwind transitions for <200 ms fade/slide entrances or 5–10% interactive feedback. No loops, bounces, or attention-grabbing effects in diagnostic views.

### Accessibility Guardrails
- WCAG 2.1 AA contrast (4.5:1 body, 3:1 large text). Validate both light/dark themes.
- Targets ≥44px, keyboard operable, visible focus indicators using the primary outline rule.
- Provide non-color affordances (icons, labels, helper text) for all semantic states.

## Implementation Recipes
- **Add a message type**: Extend `src/core/messaging/types.ts`, update `MessageReceiver`/`MessageSender`, wire background handler in `service-worker.ts`, surface payload via Zustand selectors, and document in `ARCHITECTURE.md` if externally consumable.
- **Introduce a DevConsole tab/section**: Build component under `src/components/DevConsole/panels/`, register in `CONSOLE_TABS`, choose `lucide-react` icon, and guard heavy bundles with `lazy()`.
- **Persist new settings**: Update `ExtensionSettings` schema + helper functions, ensure `StateManager.updateSettings` respects new flags, add UI controls in `UnifiedSettingsPanel` with optimistic loading + validation per `SETTINGS_IMPLEMENTATION.md`.
- **Extend AI providers**: Add adapter in `src/lib/ai/services/aiClient.ts`, expose config in `AISettingsPanel` + store, support streaming responses, and gate UI with availability checks from `useChromeAI` or provider metadata.
- **Autofill persona/data tweaks**: Modify `src/lib/autofill/datastore.ts`, keep schema docs in `Input.md` synchronized, and verify overlay styles stay compliant with LinkVybe tone.
- **GraphQL endpoints**: Use `graphqlSettings.ts` helpers to normalize/test URIs, update Unified Settings forms, and ensure GraphiQL default headers remain redaction-safe.
- **Chrome AI panel updates**: Respect Canary flag detection (`useChromeAI`), display download states, and never surface actions if on-device models unavailable.

## Testing & Validation Ladder
1. `npm run type-check` (tsc noEmit) for regressions.
2. `npm run dev` and reload via `chrome://extensions` → verify DevConsole tab loads cleanly.
3. Console + network capture sanity: trigger `console.log` + `fetch` on inspected page.
4. AI flows: configure provider (or on-device flags) → run "Explain with AI" + Chrome AI cards.
5. GraphQL explorer: set endpoint, execute sample query, confirm schema explorer loads.
6. Autofill: open multi-field form, ensure suggestion icons, Fill-All CTA, Unsplash picker follow checklist in `Input.md`.
7. Popup + onboarding: load `dist/` to confirm instructions + version stamp.

## Documentation Radar
- `ARCHITECTURE.md`: canonical flow diagrams + messaging contracts.
- `design-guide.md`: LinkVybe design requirements (keep this doc in sync when UI conventions change).
- `AI_FEATURE_SUMMARY.md`, `AI_LOG_EXPLAINER.md`, `AI_QUICK_START.md`: AI UX & troubleshooting.
- `SETTINGS_*` trio: architecture, implementation, and UX rationale for the unified settings surface.
- `Input.md`: Autofill personas, schema, and debugging flow.
- `TESTING.md`: Extended manual regression lists.

## Guardrails & Best Practices
- Use `StorageService` + `extensionSettings` helpers instead of raw `chrome.storage` to keep caching/debouncing unified.
- Maintain batching + redaction; never post raw request bodies or personal data through messaging.
- Keep manifest permissions minimal and document any additions in `README.md` + `copilot.md`.
- When touching AI output, ensure provider-agnostic interfaces and streaming UX stay intact—never hardcode API keys or sample secrets.
- Lazy-load heavyweight modules (GraphiQL, Sandpack, AI markdown renderers) and memoize expensive selectors to keep DevTools responsive.
- Update adjacent documentation whenever behavior shifts—these markdown files are the knowledge graph for both humans and agents.

## Fast Reference Commands
```bash
npm install         # bootstrap deps
npm run dev         # watch + rebuild extension
npm run build       # production bundle for Load Unpacked
npm run type-check  # tsc noEmit gate before committing TS changes
```

---
_Last updated: 2025-02-15_
