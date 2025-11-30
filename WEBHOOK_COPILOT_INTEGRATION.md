# Webhook Copilot Integration

DevConsole integrates with the Webhook Copilot VS Code extension to send logs and notes to GitHub Copilot.

---

## ⚠️ Key Limitations

Before implementing, understand these constraints:

| Limitation | Impact |
|------------|--------|
| **Response doesn't return to client** | Prompt streams to VS Code Chat UI only. User must look at VS Code. |
| **`chat.busy` is approximate** | Only tracks `@webhook` participant. Won't detect manual Copilot usage or other extensions. |
| **"completed" ≠ AI finished** | Status "completed" means "sent to chat", not that Copilot finished responding. |
| **No timeout protection** | If LM call hangs, busy state could get stuck. Check `lastActivity`. |
| **Extension restart = 404** | If extension restarts mid-request, status polling returns 404. |

---

## Our Integration Points

| Source | Button | Action |
|--------|--------|--------|
| Logs Panel | "Copilot" | Send selected log with smart prompt |
| Sticky Notes | Code `</>` | Send note content as task/question |

**Routing logic**:
- Errors/warnings → `execute_task` (fix intent)
- Info/questions → `copilot_chat` (explain intent)

---

## Client Flow

```
User clicks "Copilot"
         │
         ▼
    GET /health
         │
         ├── status !== 'ok' → "VS Code not ready"
         │
         ├── workspace.ready = false → Copy to clipboard
         │
         ├── chat.busy = true → Show "Copilot busy" + wait/retry
         │
         └── All good ──────────────────────────────┐
                                                    │
                                                    ▼
                                            POST /webhook
                                                    │
                                                    ▼
                                        Show "Check VS Code!"
                                        (response streams there)
```

---

## Implementation

### Health Check First (All Three Conditions)

```typescript
const health = await webhookCopilot.getHealth();

// 1. Extension not running
if (!health || health.status !== 'ok') {
  await navigator.clipboard.writeText(prompt);
  showToast('📋 VS Code not ready. Prompt copied!');
  return;
}

// 2. No workspace open
if (!health.workspace?.ready) {
  await navigator.clipboard.writeText(prompt);
  showToast('📋 Open a folder in VS Code. Prompt copied!');
  return;
}

// 3. Copilot is busy (approximate - only @webhook participant)
if (health.chat?.busy) {
  // Option A: Wait and retry
  // Option B: Show message and let user retry
  showToast('⏳ Copilot is processing another request...');
  return;
}
```

### Stuck Busy Detection

```typescript
// If busy but lastActivity was >60s ago, assume stuck
if (health.chat?.busy && health.chat?.lastActivity) {
  const stuckThreshold = 60000; // 60 seconds
  const timeSinceActivity = Date.now() - health.chat.lastActivity;
  
  if (timeSinceActivity > stuckThreshold) {
    // Treat as not busy - may have gotten stuck
    console.warn('Chat appears stuck, proceeding anyway');
  }
}
```

### Send to Copilot

```typescript
// For errors/warnings
await webhookCopilot.executeTask(prompt, { requireApproval: true });

// For questions/info
await webhookCopilot.copilotChat(prompt);
```

### Handle Response

```typescript
const response = await fetch('/webhook', {
  method: 'POST',
  body: JSON.stringify({ action: 'execute_task', task: prompt })
});

if (response.status === 503) {
  // NO_WORKSPACE - copy fallback
  await navigator.clipboard.writeText(prompt);
  showToast('No workspace - copied to clipboard');
} else if (response.ok) {
  const { requestId } = await response.json();
  // IMPORTANT: Response streams to VS Code, not back here!
  showToast('✓ Sent! Check VS Code for Copilot\'s response');
}
```

### Handle Connection Failures

```typescript
try {
  await fetch('http://localhost:9090/health');
} catch {
  // VS Code not running or extension not active
  await navigator.clipboard.writeText(prompt);
  showToast('📋 VS Code not connected. Copied to clipboard!');
}
```

---

## Code Actions Tracking

We track all requests client-side:

```typescript
interface CodeAction {
  id: string;
  source: 'logs' | 'sticky-notes';
  status: 'sending' | 'sent_to_vscode' | 'failed' | 'copied_fallback';
  promptPreview: string;
  requestId?: string;    // From extension response
  error?: string;
  timestamp: number;
}
```

**Note**: Status `'sent_to_vscode'` means the prompt was delivered - NOT that Copilot finished responding.

**Planned UI**:
```
┌─────────────────────────────────────────────────────────┐
│ Code Actions                             [Clear All]   │
├─────────────────────────────────────────────────────────┤
│ ✓ 2m ago │ logs   │ "Debug TypeError..."  │ In VS Code │
│ ◐ now    │ sticky │ "Create hook..."      │ Sending... │
│ ✗ 5m ago │ logs   │ "Fix build error"     │ Retry      │
│ 📋 1m ago│ logs   │ "Analyze leak"        │ Copied     │
└─────────────────────────────────────────────────────────┘
```

**Note**: "In VS Code" means sent successfully - user should check VS Code for Copilot's response.

---

## Prompt Building

For logs, we build structured prompts:

```typescript
function buildCopilotPrompt(log: LogEntry, aiExplanation?: string): string {
  return `
I encountered this ${log.level} in my application:

**Message**: ${log.message}
${log.stack ? `**Stack**: ${log.stack}` : ''}
${log.source ? `**Source**: ${log.source}` : ''}
${aiExplanation ? `\n**AI Analysis**: ${aiExplanation}` : ''}

Please help me understand and fix this issue.
  `.trim();
}
```

---

## Status Polling (With Caveats)

After sending, you can poll for status - but understand the limitations:

```typescript
async function pollStatus(requestId: string) {
  try {
    const res = await fetch(`/webhook/${requestId}/status`);
    
    // Extension restarted - stop polling
    if (res.status === 404) {
      console.log('Request not found - extension may have restarted');
      return { stop: true };
    }
    
    const status = await res.json();
    
    // "completed" = sent to chat, NOT that Copilot finished responding
    if (status.status === 'completed') {
      updateCodeAction(requestId, { status: 'sent_to_vscode' });
    } else if (status.status === 'failed') {
      updateCodeAction(requestId, { status: 'failed', error: status.error });
    }
    
    return status;
  } catch {
    // Connection lost
    return { stop: true };
  }
}
```

---

## Busy State Handling

The extension exposes Copilot's busy state via `/health`:

```json
GET /health
{
  "status": "ok",
  "workspace": { "ready": true, "folders": [...] },
  "chat": {
    "busy": false,
    "currentRequestId": null,
    "lastActivity": 1699123456789
  }
}
```

### Limitations of `chat.busy`

| What it detects | What it DOESN'T detect |
|-----------------|------------------------|
| `@webhook` participant actively streaming | User manually typing in Copilot Chat |
| | Other extensions using Copilot |
| | Regular `@workspace` or other participants |
| | Copilot processing from the editor |

### Stuck State Detection

```typescript
const { chat } = await webhookCopilot.getHealth();

if (chat?.busy && chat?.lastActivity) {
  const stuckThreshold = 60000; // 60 seconds
  const timeSinceActivity = Date.now() - chat.lastActivity;
  
  if (timeSinceActivity > stuckThreshold) {
    // Busy state appears stuck - proceed anyway
    console.warn('Chat busy state appears stuck, ignoring');
  }
}
```

### CopilotChatInput Behavior

The UI automatically:
1. Shows "Copilot is busy..." status when chat is processing
2. Polls every 2s to detect when chat becomes available
3. If user sends while busy, waits up to 15s for chat to be ready
4. Falls back to clipboard if chat stays busy
5. **Always tells user to check VS Code** for Copilot's response

---

## Roadmap

**Done**: 
- Webhook service integration
- Health checks before sending (workspace + chat busy + status)
- Clipboard fallback for NO_WORKSPACE
- Logs Panel "Copilot" button
- Sticky Notes "Code" button
- Busy state detection (chat.busy from /health)
- Auto-wait for busy Copilot (with timeout)
- Stuck state detection (>60s with no activity)
- Clear "Check VS Code" messaging
- `sent_to_vscode` status in Code Actions

**Architectural Decisions**:
- Response streams to VS Code only (no return to client)
- Status "completed" = sent to chat, not AI finished
- We accept chat.busy limitations (only tracks @webhook)

**Future Considerations**:
- Return response to client (requires architecture change)
- Track when Copilot actually finishes responding
- Better busy detection across all Copilot usage
