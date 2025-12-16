import * as vscode from "vscode";
import { WebhookServer } from "./webhookServer";
import { WebhookChatParticipant } from "./webhookChatParticipant";
import { TerminalStreamServer } from "./terminalStreamServer";

let webhookServer: WebhookServer;
let chatParticipant: WebhookChatParticipant;
let terminalStreamServer: TerminalStreamServer;

// Fallback summary shown when no workspace or context file is available
const DEFAULT_CONTEXT_SUMMARY = `# Codebase Context - Quick Guide

If you don't have a workspace open, you can still learn how to use the Webhook Copilot extension.

Key points:
- Use HTTP POST to send structured payloads to the webhook server at http://localhost:9090/webhook
- Provide a 'context' object with optional fields: workspace, files, currentFile, branch, codebase
- Example payload (minimal):
  {
    "action": "execute_task",
    "task": "Add types to API",
    "context": { "files": ["src/api/users.ts"], "currentFile": "src/api/users.ts" },
    "options": { "openFiles": true }
  }

Commands:
- Run the command "Webhook Copilot: Open Context" to re-open the guide once you open a workspace.
`;

async function openCodebaseContext(
  outputChannel: vscode.OutputChannel,
  forcePrompt: boolean = false
) {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine("No workspace folder open");
    return;
  }

  let selectedFolder: vscode.WorkspaceFolder | undefined;

  // Find workspaces that have CODEBASE_CONTEXT.md
  const foldersWithContext: vscode.WorkspaceFolder[] = [];
  for (const folder of workspaceFolders) {
    const contextFilePath = vscode.Uri.joinPath(
      folder.uri,
      "CODEBASE_CONTEXT.md"
    );
    try {
      await vscode.workspace.fs.stat(contextFilePath);
      foldersWithContext.push(folder);
    } catch {
      // File doesn't exist in this workspace
    }
  }

  if (foldersWithContext.length === 0) {
    outputChannel.appendLine(
      "CODEBASE_CONTEXT.md not found in any workspace folder"
    );
    return;
  }

  // Auto-select if only one workspace has the file
  if (foldersWithContext.length === 1 && !forcePrompt) {
    selectedFolder = foldersWithContext[0];
    outputChannel.appendLine(`Auto-selected workspace: ${selectedFolder.name}`);
  } else if (foldersWithContext.length > 1) {
    // Multiple workspaces have the file - let user choose
    const items = foldersWithContext.map((folder) => ({
      label: folder.name,
      description: folder.uri.fsPath,
      folder: folder,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Multiple workspaces have CODEBASE_CONTEXT.md - choose one",
      title: "Webhook Copilot - Select Workspace",
    });

    if (!selected) {
      outputChannel.appendLine("Workspace selection cancelled");
      return;
    }

    selectedFolder = selected.folder;
    outputChannel.appendLine(`Selected workspace: ${selectedFolder.name}`);
  }

  if (!selectedFolder) return;

  const contextFilePath = vscode.Uri.joinPath(
    selectedFolder.uri,
    "CODEBASE_CONTEXT.md"
  );

  try {
    const doc = await vscode.workspace.openTextDocument(contextFilePath);

    // Find the "Examples" section to highlight
    const text = doc.getText();
    const examplesIndex = text.indexOf("## Examples");

    if (examplesIndex !== -1) {
      // Find the end of the Examples section (next ## heading or end of file)
      const nextSectionIndex = text.indexOf("\n## ", examplesIndex + 1);
      const endIndex = nextSectionIndex !== -1 ? nextSectionIndex : text.length;

      // Convert character positions to line/character positions
      const startPos = doc.positionAt(examplesIndex);
      const endPos = doc.positionAt(endIndex);

      // Open document and select the Examples section
      const editor = await vscode.window.showTextDocument(doc, {
        preview: false,
        selection: new vscode.Range(startPos, endPos),
      });

      // Scroll to show the selection
      editor.revealRange(
        new vscode.Range(startPos, endPos),
        vscode.TextEditorRevealType.InCenter
      );
      outputChannel.appendLine(
        `Opened CODEBASE_CONTEXT.md from ${selectedFolder.name} with Examples highlighted`
      );
    } else {
      // If Examples section not found, just open the document
      await vscode.window.showTextDocument(doc, { preview: false });
      outputChannel.appendLine(
        `Opened CODEBASE_CONTEXT.md from ${selectedFolder.name}`
      );
    }
  } catch (error) {
    outputChannel.appendLine(`Error opening CODEBASE_CONTEXT.md: ${error}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Webhook Copilot Trigger extension is now active");

  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel("Webhook Copilot");
  context.subscriptions.push(outputChannel);

  // Initialize chat participant (provides @webhook in chat)
  chatParticipant = new WebhookChatParticipant(outputChannel);
  chatParticipant.register(context);

  // Initialize webhook server with chat participant for busy state
  webhookServer = new WebhookServer(outputChannel, chatParticipant);

  // Initialize terminal stream server
  terminalStreamServer = new TerminalStreamServer(outputChannel);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("webhook-copilot.start", async () => {
      try {
        await webhookServer.start();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to start webhook server: ${error}`
        );
      }
    })
  );

  

  context.subscriptions.push(
    vscode.commands.registerCommand("webhook-copilot.stop", async () => {
      await webhookServer.stop();
      vscode.window.showInformationMessage("Webhook server stopped");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("webhook-copilot.restart", async () => {
      await webhookServer.stop();
      await webhookServer.start();
      vscode.window.showInformationMessage("Webhook server restarted");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("webhook-copilot.openContext", async () => {
      await openCodebaseContext(outputChannel, true);
    })
  );

  // Terminal stream server commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "webhook-copilot.startTerminalStream",
      async () => {
        try {
          await terminalStreamServer.start();
          const status = terminalStreamServer.getStatus();
          vscode.window.showInformationMessage(
            `Terminal stream server started on port ${status.port}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to start terminal stream server: ${error}`
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "webhook-copilot.stopTerminalStream",
      async () => {
        await terminalStreamServer.stop();
        vscode.window.showInformationMessage("Terminal stream server stopped");
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "webhook-copilot.terminalStreamStatus",
      async () => {
        const status = terminalStreamServer.getStatus();
        if (status.running) {
          vscode.window.showInformationMessage(
            `Terminal Stream: Running on port ${status.port} | ` +
              `${status.terminals} terminal(s) | ${status.clients} client(s)`
          );
        } else {
          vscode.window.showInformationMessage("Terminal Stream: Not running");
        }
      }
    )
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("webhookCopilot")) {
        webhookServer.updateConfig();
        terminalStreamServer.updateConfig();
      }
    })
  );

  // Auto-start servers if configured
  const config = vscode.workspace.getConfiguration("webhookCopilot");

  if (config.get("autoStart", true)) {
    outputChannel.appendLine("Auto-starting webhook server...");
    webhookServer.start().catch((error) => {
      outputChannel.appendLine(`Failed to auto-start webhook server: ${error}`);
    });
  }

  if (config.get("terminalStreamAutoStart", true)) {
    outputChannel.appendLine("Auto-starting terminal stream server...");
    terminalStreamServer.start().catch((error) => {
      outputChannel.appendLine(
        `Failed to auto-start terminal stream: ${error}`
      );
    });
  }

  outputChannel.appendLine("Webhook Copilot extension activated");
  outputChannel.show();

  // Open CODEBASE_CONTEXT.md on activation with workspace selection
  openCodebaseContext(outputChannel);
}

export function deactivate() {
  if (webhookServer) {
    webhookServer.stop();
  }
  if (terminalStreamServer) {
    terminalStreamServer.stop();
  }
}
