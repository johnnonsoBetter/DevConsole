# Settings Panel Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    UnifiedSettingsPanel                         │
│  Main container with sidebar navigation + content area          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─── Sidebar Navigation
                 │    ├─── GitHub Integration (SettingsNavItem)
                 │    ├─── GraphQL Explorer (SettingsNavItem)
                 │    └─── General Settings (SettingsNavItem)
                 │
                 └─── Content Area (Dynamic based on selection)
                      │
                      ├─── GitHubSettingsSection
                      │    ├─── Header (Icon + Title)
                      │    ├─── Form Fields
                      │    │    ├─── Username Input
                      │    │    ├─── Repository Input
                      │    │    └─── Token Input (with show/hide)
                      │    ├─── Status Messages (StatusBanner)
                      │    ├─── Action Buttons
                      │    │    ├─── Save Button
                      │    │    ├─── Test Connection Button
                      │    │    └─── Clear Button
                      │    └─── Help Cards
                      │         ├─── Setup Guide
                      │         └─── Best Practices
                      │
                      ├─── GraphQLSettingsSection
                      │    ├─── Header (Icon + Title)
                      │    ├─── Form Fields
                      │    │    └─── Endpoint URL Input
                      │    ├─── Status Messages (StatusBanner)
                      │    ├─── Action Buttons
                      │    │    ├─── Save Button
                      │    │    ├─── Test Connection Button
                      │    │    └─── Clear Button
                      │    └─── Help Cards
                      │         ├─── Examples
                      │         └─── Usage Guide
                      │
                      └─── GeneralSettingsSection
                           ├─── Header (Icon + Title)
                           ├─── Coming Soon Message
                           └─── Feature Preview Cards
                                ├─── Theme Preferences
                                ├─── Keyboard Shortcuts
                                ├─── Data Export
                                └─── Notifications
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Actions                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─── Input Changes
                 │    └──> Local State Update (useState)
                 │
                 ├─── Test Connection Click
                 │    ├──> Validation Check
                 │    ├──> API Call (GitHub/GraphQL)
                 │    └──> Status Update (Success/Error)
                 │
                 ├─── Save Settings Click
                 │    ├──> Validation Check
                 │    ├──> Normalization (if needed)
                 │    ├──> Chrome Storage Save
                 │    ├──> Hook Update (useGitHubSettings)
                 │    └──> Success Message
                 │
                 └─── Clear Settings Click
                      ├──> Confirmation Dialog
                      ├──> Chrome Storage Clear
                      ├──> State Reset
                      └──> UI Update
```

## Data Flow

```
┌──────────────────┐
│  Chrome Storage  │ ←─── Settings persistence
└────────┬─────────┘
         │
         ├─── Load on Mount
         │    └──> useEffect → loadSettings()
         │         └──> Update form state
         │
         ├─── Save Action
         │    └──> saveSettings()
         │         ├──> Validate
         │         ├──> Normalize
         │         └──> Store
         │
         └─── Clear Action
              └──> clearSettings()
                   └──> Remove from storage
```

## Validation Pipeline

```
User Input
    │
    ├──> Field Validation
    │    ├─── Required check
    │    ├─── Format check
    │    └─── Length check
    │
    ├──> Normalization
    │    ├─── URL formatting
    │    ├─── Whitespace trimming
    │    └─── Case handling
    │
    ├──> Connection Test (Optional)
    │    ├─── GitHub API call
    │    ├─── GraphQL introspection
    │    └─── Status feedback
    │
    └──> Save to Storage
         ├─── Success → Show banner
         └─── Error → Show error message
```

## UI Responsiveness

```
Desktop (≥768px)
┌─────────────────────────────────────────────────┐
│  Sidebar    │  Content Area                     │
│  (256px)    │  (Flexible, max 768px centered)   │
│             │                                    │
│  • GitHub   │  GitHub Settings Form              │
│  • GraphQL  │  ┌──────────────────────────────┐ │
│  • General  │  │ Username:     [__________]   │ │
│             │  │ Repository:   [__________]   │ │
│             │  │ Token:        [__________] 👁 │ │
│             │  │ [Save] [Test] [Clear]        │ │
│             │  └──────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Mobile (<768px)
┌─────────────────────────────────────────────────┐
│  Sidebar (Horizontal Tabs)                      │
│  [ GitHub ] [ GraphQL ] [ General ]             │
├─────────────────────────────────────────────────┤
│  Content Area (Full Width)                      │
│  ┌──────────────────────────────────────────┐  │
│  │ Username:     [_________________]        │  │
│  │ Repository:   [_________________]        │  │
│  │ Token:        [_________________] 👁      │  │
│  │ [Save] [Test] [Clear]                    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Settings Panel Integration

```
DevConsolePanel
    │
    ├──> BetterTabs Component
    │    ├─── Logs Tab
    │    ├─── Network Tab
    │    ├─── GraphQL Tab
    │    ├─── AI APIs Tab
    │    ├─── Tools Tab
    │    └─── Settings Tab ──> UnifiedSettingsPanel
    │                               │
    │                               ├─── GitHub Section
    │                               ├─── GraphQL Section
    │                               └─── General Section
    │
    └──> Uses effectiveGithubConfig
         (from hook or prop)
```

## Key Features Map

```
┌───────────────────────────────────────────────────────────┐
│                  Unified Settings Panel                   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  GitHub Integration               GraphQL Explorer       │
│  ─────────────────────           ───────────────────     │
│  ✓ Username config                ✓ Endpoint config      │
│  ✓ Repository config              ✓ URL validation       │
│  ✓ Token management               ✓ Connection test      │
│  ✓ Connection test                ✓ Examples             │
│  ✓ Auto-normalization             ✓ Relative paths       │
│  ✓ Secure storage                 ✓ Absolute URLs        │
│  ✓ Setup guide                    ✓ Usage guide          │
│  ✓ Error handling                 ✓ Error handling       │
│                                                           │
│                  General Settings                         │
│                  ────────────────                         │
│                  ⏳ Coming Soon                           │
│                  • Theme config                           │
│                  • Shortcuts                              │
│                  • Export options                         │
│                  • Notifications                          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```
