# Webhook Copilot Integration

DevConsole integrates with the Webhook Copilot VS Code extension to send logs and notes to GitHub Copilot.

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
         ├── workspace.ready = false
         │        └── Copy to clipboard + notify
         │
         └── workspace.ready = true
                  │
                  ▼
           POST /webhook
                  │
                  ├── 202 → Success toast + track requestId
                  └── 503 NO_WORKSPACE → Clipboard fallback
```

---

## Implementation

### Health Check First

```typescript
const health = await webhookCopilot.getHealth();

if (!health.workspace?.ready) {
  await navigator.clipboard.writeText(prompt);
  showToast('📋 No workspace open. Prompt copied!');
  return;
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
  showToast('✓ Sent to Copilot');
  // Optionally poll GET /webhook/:requestId/status
}
```

---

## Code Actions Tracking

We track all requests client-side:

```typescript
interface CodeAction {
  id: string;
  source: 'logs' | 'sticky-notes';
  status: 'sending' | 'completed' | 'failed' | 'copied_fallback';
  promptPreview: string;
  requestId?: string;    // From extension response
  error?: string;
  timestamp: number;
}
```

**Planned UI**:
```
┌────────────────────────────────────────────────────┐
│ Code Actions                          [Clear All] │
├────────────────────────────────────────────────────┤
│ ✓ 2m ago │ logs   │ "Debug TypeError..."  │ Done  │
│ ◐ now    │ sticky │ "Create hook..."      │ ...   │
│ ✗ 5m ago │ logs   │ "Fix build error"     │ Retry │
│ 📋 1m ago│ logs   │ "Analyze leak"        │ Copy  │
└────────────────────────────────────────────────────┘
```

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

## Status Polling (Optional)

After sending, we can poll for completion:

```typescript
async function pollStatus(requestId: string) {
  const status = await fetch(`/webhook/${requestId}/status`).then(r => r.json());
  
  if (status.status === 'completed') {
    updateCodeAction(requestId, { status: 'completed' });
  } else if (status.status === 'failed') {
    updateCodeAction(requestId, { status: 'failed', error: status.error });
  }
}
```

---

## Roadmap

**Done**: 
- Webhook service integration
- Health checks before sending
- Clipboard fallback for NO_WORKSPACE
- Logs Panel "Copilot" button
- Sticky Notes "Code" button

**Next**:
- Code Actions tab UI
- Request history persistence  
- Status polling integration
- Retry failed actions
