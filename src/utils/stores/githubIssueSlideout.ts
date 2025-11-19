import { produce } from "immer";
import { create } from "zustand";
import type { LogEntry } from "./devConsole";

// ============================================================================
// GITHUB ISSUE SLIDEOUT STORE
// ============================================================================
//
// Centralized state management for GitHub Issue Slideout using Zustand + Immer.
//
// BENEFITS:
// - Consistent state updates across all components
// - Immer ensures immutable updates without manual spreading
// - Single source of truth for slideout state
// - Easier testing and debugging
// - Automatic React re-renders only for changed slices
// - Eliminates prop drilling and useState boilerplate
//
// USAGE:
//   const { title, setTitle, updateContent } = useGitHubIssueSlideoutStore();
//
// ============================================================================

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ActiveView = "edit" | "preview";

export interface PublishStatus {
  type: "success" | "error" | null;
  message: string;
  issueUrl?: string;
}

export interface GitHubIssueSlideoutState {
  // Visibility
  isOpen: boolean;
  selectedLog: LogEntry | null;

  // Content
  title: string;
  body: string;
  screenshot: string;

  // UI State
  activeView: ActiveView;

  // Loading States
  isGenerating: boolean;
  isCapturingScreenshot: boolean;
  isPublishing: boolean;

  // Status
  publishStatus: PublishStatus;

  // Actions - Visibility
  open: (
    log?: LogEntry | null,
    content?: { title?: string; body?: string }
  ) => void;
  close: () => void;

  // Actions - Content
  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  setScreenshot: (screenshot: string) => void;

  // Actions - UI
  setActiveView: (view: ActiveView) => void;

  // Actions - Loading
  setIsGenerating: (isGenerating: boolean) => void;
  setIsCapturingScreenshot: (isCapturingScreenshot: boolean) => void;
  setIsPublishing: (isPublishing: boolean) => void;

  // Actions - Status
  setPublishStatus: (status: PublishStatus) => void;

  // Actions - Bulk Updates
  updateContent: (content: { title?: string; body?: string }) => void;

  // Actions - Reset
  reset: () => void;
  resetContent: () => void;
}

const INITIAL_STATE = {
  isOpen: false,
  selectedLog: null,
  title: "",
  body: "",
  screenshot: "",
  activeView: "preview" as ActiveView,
  isGenerating: false,
  isCapturingScreenshot: false,
  isPublishing: false,
  publishStatus: { type: null, message: "" } as PublishStatus,
};

// ============================================================================
// GITHUB ISSUE SLIDEOUT STORE
// ============================================================================

export const useGitHubIssueSlideoutStore = create<GitHubIssueSlideoutState>(
  (set) => ({
    ...INITIAL_STATE,

    // Visibility Actions
    open: (log = null, content) =>
      set(
        produce((draft) => {
          draft.isOpen = true;
          draft.selectedLog = log;
          draft.activeView = "preview";

          // Update content from log if provided
          if (log) {
            // Set title from log message
            draft.title = `[${log.level.toUpperCase()}] ${log.message.substring(0, 72)}`;

            // Build body from log details
            const bodyParts = ["## Description", log.message, ""];

            if (log.stack) {
              bodyParts.push("## Stack Trace", "```", log.stack, "```", "");
            }

            if (log.args && log.args.length > 0) {
              bodyParts.push(
                "## Additional Context",
                "```json",
                JSON.stringify(log.args, null, 2),
                "```",
                ""
              );
            }

            bodyParts.push(
              "## Environment",
              `- Timestamp: ${new Date(log.timestamp).toISOString()}`,
              `- Level: ${log.level}`
            );

            if (log.source) {
              bodyParts.push(`- Source: ${log.source.file}:${log.source.line}`);
            }

            draft.body = bodyParts.join("\n");
          } else if (content) {
            // Opening with custom content (e.g., from notes)
            if (content.title !== undefined) {
              draft.title = content.title;
            }
            if (content.body !== undefined) {
              draft.body = content.body;
            }
          } else {
            // Opening without a log or content - reset to empty
            draft.title = "";
            draft.body = "";
          }

          // Always reset these on open
          draft.screenshot = "";
          draft.publishStatus = { type: null, message: "" };
        })
      ),

    close: () =>
      set(
        produce((draft) => {
          draft.isOpen = false;
          // Don't reset content immediately - let it fade out
          // Content will be reset on next open
        })
      ),

    // Content Actions
    setTitle: (title) =>
      set(
        produce((draft) => {
          draft.title = title;
        })
      ),

    setBody: (body) =>
      set(
        produce((draft) => {
          draft.body = body;
        })
      ),

    setScreenshot: (screenshot) =>
      set(
        produce((draft) => {
          draft.screenshot = screenshot;
        })
      ),

    // UI Actions
    setActiveView: (view) =>
      set(
        produce((draft) => {
          draft.activeView = view;
        })
      ),

    // Loading Actions
    setIsGenerating: (isGenerating) =>
      set(
        produce((draft) => {
          draft.isGenerating = isGenerating;
        })
      ),

    setIsCapturingScreenshot: (isCapturingScreenshot) =>
      set(
        produce((draft) => {
          draft.isCapturingScreenshot = isCapturingScreenshot;
        })
      ),

    setIsPublishing: (isPublishing) =>
      set(
        produce((draft) => {
          draft.isPublishing = isPublishing;
        })
      ),

    // Status Actions
    setPublishStatus: (status) =>
      set(
        produce((draft) => {
          draft.publishStatus = status;
        })
      ),

    // Bulk Update
    updateContent: (content) =>
      set(
        produce((draft) => {
          if (content.title !== undefined) {
            draft.title = content.title;
          }
          if (content.body !== undefined) {
            draft.body = content.body;
          }
        })
      ),

    // Reset Actions
    reset: () => set(INITIAL_STATE),

    resetContent: () =>
      set(
        produce((draft) => {
          draft.title = "";
          draft.body = "";
          draft.screenshot = "";
          draft.publishStatus = { type: null, message: "" };
        })
      ),
  })
);
