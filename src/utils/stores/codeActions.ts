import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// TYPES
// ============================================================================

export type CodeActionStatus =
  | "queued"
  | "sending"
  | "processing"
  | "sent_to_vscode" // Successfully sent - user should check VS Code
  | "completed" // Legacy - kept for backwards compatibility
  | "failed"
  | "copied_fallback";

export type CodeActionSource = "logs" | "sticky-notes" | "manual";
export type CodeActionType = "execute_task" | "copilot_chat";

export interface CodeAction {
  id: string;
  createdAt: number;
  source: CodeActionSource;

  // Request info
  actionType: CodeActionType;
  promptPreview: string; // First 100 chars
  fullPrompt: string;
  imageCount?: number; // Number of images attached to this request

  // Status tracking
  status: CodeActionStatus;
  queuePosition?: number; // Position in server queue (1-based)

  // Response from extension
  requestId?: string;
  error?: string;
  errorCode?: string;
  suggestions?: string[];

  // Context
  workspaceReady: boolean;

  // Timing
  sentAt?: number;
  completedAt?: number;
}

// ============================================================================
// STORE
// ============================================================================

interface CodeActionsState {
  actions: CodeAction[];
  maxActions: number;

  // Actions
  addAction: (action: Omit<CodeAction, "id" | "createdAt">) => string;
  updateAction: (id: string, updates: Partial<CodeAction>) => void;
  removeAction: (id: string) => void;
  clearAll: () => void;
  clearCompleted: () => void;

  // Queries
  getAction: (id: string) => CodeAction | undefined;
  getPendingActions: () => CodeAction[];
  getRecentActions: (limit?: number) => CodeAction[];
}

export const useCodeActionsStore = create<CodeActionsState>()(
  persist(
    (set, get) => ({
      actions: [],
      maxActions: 50, // Keep last 50 actions

      addAction: (actionData) => {
        const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const action: CodeAction = {
          ...actionData,
          id,
          createdAt: Date.now(),
        };

        set((state) => {
          const newActions = [action, ...state.actions];
          // Trim to max size
          if (newActions.length > state.maxActions) {
            newActions.splice(state.maxActions);
          }
          return { actions: newActions };
        });

        return id;
      },

      updateAction: (id, updates) => {
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
      },

      removeAction: (id) => {
        set((state) => ({
          actions: state.actions.filter((a) => a.id !== id),
        }));
      },

      clearAll: () => {
        set({ actions: [] });
      },

      clearCompleted: () => {
        set((state) => ({
          actions: state.actions.filter(
            (a) => a.status !== "completed" && a.status !== "copied_fallback"
          ),
        }));
      },

      getAction: (id) => {
        return get().actions.find((a) => a.id === id);
      },

      getPendingActions: () => {
        return get().actions.filter(
          (a) =>
            a.status === "queued" ||
            a.status === "sending" ||
            a.status === "processing"
        );
      },

      getRecentActions: (limit = 10) => {
        return get().actions.slice(0, limit);
      },
    }),
    {
      name: "devconsole-code-actions",
      partialize: (state) => ({ actions: state.actions }),
    }
  )
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a code action and return its ID for tracking
 */
export function createCodeAction(
  source: CodeActionSource,
  actionType: CodeActionType,
  prompt: string,
  workspaceReady: boolean
): string {
  const store = useCodeActionsStore.getState();

  return store.addAction({
    source,
    actionType,
    promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""),
    fullPrompt: prompt,
    status: "queued",
    workspaceReady,
  });
}

/**
 * Mark action as sending
 */
export function markActionSending(id: string): void {
  useCodeActionsStore.getState().updateAction(id, {
    status: "sending",
    sentAt: Date.now(),
  });
}

/**
 * Mark action as completed with requestId
 */
export function markActionCompleted(id: string, requestId?: string): void {
  useCodeActionsStore.getState().updateAction(id, {
    status: "completed",
    requestId,
    completedAt: Date.now(),
  });
}

/**
 * Mark action as failed
 */
export function markActionFailed(
  id: string,
  error: string,
  errorCode?: string,
  suggestions?: string[]
): void {
  useCodeActionsStore.getState().updateAction(id, {
    status: "failed",
    error,
    errorCode,
    suggestions,
    completedAt: Date.now(),
  });
}

/**
 * Mark action as copied to clipboard (fallback)
 */
export function markActionCopiedFallback(id: string, reason: string): void {
  useCodeActionsStore.getState().updateAction(id, {
    status: "copied_fallback",
    error: reason,
    completedAt: Date.now(),
  });
}
