# Webhook Copilot Integration

## 🚀 Overview

The DevConsole extension now integrates with **Webhook Copilot** to enable click-to-code functionality directly from sticky notes. This powerful feature lets you send coding tasks and questions to GitHub Copilot in VS Code without manual intervention.

## ✨ Features

### Click-to-Code from Sticky Notes
- **Code Button**: Each sticky note has a Code action button (right side, vertically stacked)
- **Smart Detection**: Automatically determines whether to execute as a task or ask as a question
- **One-Click Execution**: Send note content directly to Copilot with a single click
- **Connection Checking**: Verifies Webhook Copilot is running before sending requests

### 6 Available Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| **Execute Task** | Send coding tasks to Copilot | "Create a login form component" |
| **Copilot Chat** | Ask questions | "How do I use Redux?" |
| **Create File** | Generate new files | Create boilerplate, templates |
| **Modify File** | Edit existing files | Append code, update configs |
| **Run Command** | Execute VS Code commands | Save files, format code |
| **Query Workspace** | Search for files | Find all `.tsx` files |

## 🔧 Setup

### Prerequisites
1. **VS Code** with GitHub Copilot extension
2. **Webhook Copilot extension** installed and active
3. Webhook server running on `http://localhost:9090` (default)

### Configuration Steps

1. **Open DevConsole Settings**
   - Go to DevConsole → Settings tab
   - Click "Webhook Copilot" in the sidebar

2. **Configure Webhook URL**
   - Default: `http://localhost:9090/webhook`
   - Change if your setup uses a different port
   - Click "Save" to persist settings

3. **Test Connection**
   - Click "Test Connection" button
   - Verify you see: ✅ "Webhook Copilot is running and reachable!"
   - If error, ensure VS Code and Webhook Copilot extension are running

## 📝 Usage

### From Sticky Notes

1. **Create a sticky note** with your coding task or question
   - Example: "Create a React component for a user profile card with avatar, name, and bio"
   - Example: "How do I implement authentication in Next.js?"

2. **Click the Code button** (right side of sticky note)
   - Icon: `</>` (Code2 icon)
   - Located in vertical stack with GitHub issue button

3. **Copilot processes your request**
   - Smart detection determines action type
   - Tasks → `execute_task`
   - Questions → `copilot_chat`
   - Ambiguous → Manual prompt to choose

4. **View results in VS Code**
   - Copilot Chat opens with your request
   - Generated code appears in the chat
   - Follow-up and iterate as needed

### Smart Content Detection

The integration automatically analyzes your note content:

**Coding Tasks** (triggers `execute_task`):
- Contains: create, build, implement, add, fix, update, refactor, write, generate
- Example: "Build a authentication service with JWT tokens"

**Questions** (triggers `copilot_chat`):
- Contains: ?, how, what, why, when, where, explain
- Example: "What's the difference between useMemo and useCallback?"

**Ambiguous Content**:
- Prompts user to choose: Execute as Task or Ask as Question

## 🔌 API Integration

### Webhook Service

The integration uses `WebhookCopilotService` class:

```typescript
import { webhookCopilot } from '@/lib/webhookCopilot';

// Execute a task
await webhookCopilot.executeTask('Create a user profile component', true);

// Ask a question
await webhookCopilot.copilotChat('How do I optimize React performance?');

// Create a file
await webhookCopilot.createFile('src/components/Profile.tsx', content);

// Check connection
const isConnected = await webhookCopilot.checkConnection();
```

### Request Flow

```
Sticky Note → Code Button Click → Content Analysis → Webhook Request → VS Code → Copilot
     ↓              ↓                    ↓                 ↓              ↓         ↓
  Content    Smart Detection    Choose Action    HTTP POST    Extension   Generate
   Ready        Pattern             Type          localhost     Receives    Code
              Matching                              :9090       Request
```

## ⚙️ Configuration

### Storage Keys

Settings are persisted in Chrome storage:

```typescript
chrome.storage.local.get(['webhookCopilotUrl'], (result) => {
  // Default: http://localhost:9090/webhook
  const url = result.webhookCopilotUrl || 'http://localhost:9090/webhook';
});
```

### Timeout Settings

- **Request Timeout**: 10 seconds
- **Connection Check**: 2 seconds

### Error Handling

The integration includes comprehensive error handling:

- **Connection Failed**: Prompts user to verify VS Code is running
- **Timeout**: Alerts user that request timed out
- **Empty Content**: Warns user to add content before sending
- **Server Error**: Shows error status code and message

## 🎯 Use Cases

### 1. Quick Code Generation
Write a task in a sticky note → Click Code → Get boilerplate instantly

### 2. Learning & Documentation
Ask "how to" questions → Get explanations with code examples

### 3. Refactoring Ideas
Note refactoring ideas → Send to Copilot → Get suggestions

### 4. Bug Fixes
Describe bug → Send to Copilot → Get fix recommendations

### 5. Code Reviews
Write review notes → Ask Copilot for best practices

## 🛠️ Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Webhook Copilot
**Solutions**:
1. Ensure VS Code is running
2. Verify Webhook Copilot extension is installed and active
3. Check extension is running on port 9090
4. Test connection from Settings → Webhook Copilot

### Request Timeout

**Problem**: Request times out after 10 seconds
**Solutions**:
1. Check VS Code is responsive
2. Verify Copilot extension is not rate-limited
3. Try shorter/simpler requests

### Empty Response

**Problem**: Request succeeds but no response
**Solutions**:
1. Check VS Code Copilot Chat panel
2. Verify Copilot extension has internet connection
3. Check Copilot subscription is active

## 🔐 Security

- **Local Network Only**: Webhook runs on localhost by default
- **No API Keys**: Uses VS Code's Copilot authentication
- **User Approval**: Optional approval mode for sensitive operations
- **No Data Persistence**: Requests are not logged by DevConsole

## 📚 Related Documentation

- [Webhook Copilot Extension](https://github.com/your-repo/webhook-copilot)
- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [Sticky Notes Guide](./STICKY_NOTES.md)
- [Architecture Overview](./ARCHITECTURE.md)

## 🚦 Status & Roadmap

### ✅ Implemented
- [x] Webhook service with 6 actions
- [x] Smart content detection
- [x] Connection checking
- [x] Settings panel integration
- [x] Error handling & user feedback
- [x] Sticky note Code button

### 🔄 In Progress
- [ ] Batch request support
- [ ] Request history tracking
- [ ] Custom action templates

### 📋 Planned
- [ ] Multi-file operations
- [ ] Workspace context injection
- [ ] Response preview in DevConsole
- [ ] Custom webhook endpoints
- [ ] Authentication support

## 💡 Tips

1. **Be Specific**: Detailed requests get better results
2. **Include Context**: Mention frameworks, libraries, or constraints
3. **Iterate**: Use follow-up questions to refine results
4. **Save Good Results**: Pin successful responses in sticky notes
5. **Test Connection**: Verify before important requests

---

**Need Help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open an issue.
