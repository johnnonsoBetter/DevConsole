import { useGitHubIssueSlideoutStore, useGitHubSettingsStore, type GitHubSettings } from "@/utils/stores";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Camera, CheckCircle, Code, Eye, EyeOff, Github, Info, Loader, Save, Send, Settings, TestTube, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createGitHubIssue,
  testGitHubConnection,
  updateGitHubIssue,
  type GitHubConfig,
  type GitHubIssue,
} from "../../lib/devConsole/githubApi";
import { cn } from "../../utils";
import { SuperWriteAI } from "./SuperWriteAI";

// ============================================================================
// EMBEDDED GITHUB SETTINGS FORM
// ============================================================================

type StatusType = 'success' | 'error' | null;

interface StatusMessage {
  type: StatusType;
  message: string;
}

interface EmbeddedGitHubSettingsProps {
  onSettingsSaved: () => void;
}

function EmbeddedGitHubSettings({ onSettingsSaved }: EmbeddedGitHubSettingsProps) {
  const {
    username: storedUsername,
    repo: storedRepo,
    token: storedToken,
    saveSettings,
    validateSettings,
    normalizeRepoFormat,
  } = useGitHubSettingsStore();

  const [username, setUsername] = useState(storedUsername || "");
  const [repo, setRepo] = useState(storedRepo || "");
  const [token, setToken] = useState(storedToken || "");
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusMessage>({ type: null, message: "" });
  const [testStatus, setTestStatus] = useState<StatusMessage>({ type: null, message: "" });

  useEffect(() => {
    setUsername(storedUsername || "");
    setRepo(storedRepo || "");
    setToken(storedToken || "");
  }, [storedUsername, storedRepo, storedToken]);

  const handleSave = async () => {
    setSaveStatus({ type: null, message: "" });
    setTestStatus({ type: null, message: "" });

    const normalizedRepo = normalizeRepoFormat(repo);
    const validation = validateSettings({ username, repo: normalizedRepo, token });

    if (!validation.valid) {
      setSaveStatus({ type: "error", message: validation.errors.join(", ") });
      return;
    }

    setIsSaving(true);

    try {
      const newSettings: GitHubSettings = {
        username: username.trim(),
        repo: normalizedRepo,
        token: token.trim(),
      };

      await saveSettings(newSettings);
      setRepo(normalizedRepo);

      setSaveStatus({ type: "success", message: "Settings saved successfully!" });
      
      setTimeout(() => {
        onSettingsSaved();
      }, 1500);
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestStatus({ type: null, message: "" });

    const normalizedRepo = normalizeRepoFormat(repo);
    const validation = validateSettings({ username, repo: normalizedRepo, token });

    if (!validation.valid) {
      setTestStatus({ type: "error", message: validation.errors.join(", ") });
      return;
    }

    setIsTesting(true);

    try {
      const testSettings: GitHubSettings = {
        username: username.trim(),
        repo: normalizedRepo,
        token: token.trim(),
      };

      const result = await testGitHubConnection(testSettings);

      if (result.valid) {
        setTestStatus({ type: "success", message: "Connection successful! Repository is accessible." });
      } else {
        setTestStatus({ type: "error", message: result.error || "Connection failed" });
      }
    } catch (error) {
      setTestStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Username */}
      <div>
        <label htmlFor="gh-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          GitHub Username <span className="text-destructive">*</span>
        </label>
        <input
          id="gh-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="octocat"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      {/* Repository */}
      <div>
        <label htmlFor="gh-repo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Repository <span className="text-destructive">*</span>
        </label>
        <input
          id="gh-repo"
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onBlur={(e) => {
            const normalized = normalizeRepoFormat(e.target.value);
            if (normalized !== e.target.value) {
              setRepo(normalized);
            }
          }}
          placeholder="owner/repo-name"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Format: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">owner/repo-name</code>
        </p>
      </div>

      {/* Token */}
      <div>
        <label htmlFor="gh-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Personal Access Token <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            id="gh-token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {showToken ? (
              <EyeOff className="w-4 h-4 text-gray-500" />
            ) : (
              <Eye className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=DevConsole"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Create token
          </a>{" "}
          with <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">repo</code> scope
        </p>
      </div>

      {/* Status Messages */}
      {saveStatus.type && (
        <div
          className={cn(
            "p-3 rounded-lg flex items-start gap-2 text-sm",
            saveStatus.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          )}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <p>{saveStatus.message}</p>
        </div>
      )}

      {testStatus.type && (
        <div
          className={cn(
            "p-3 rounded-lg flex items-start gap-2 text-sm",
            testStatus.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          )}
        >
          {testStatus.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <p>{testStatus.message}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </button>

        <button
          onClick={handleTest}
          disabled={isTesting}
          className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTesting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4" />
              Test
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// GITHUB ISSUE SLIDEOUT
// ============================================================================

interface GitHubIssueSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  githubConfig?: GitHubConfig;
  onOpenSettings?: () => void;
}

export function GitHubIssueSlideout({ isOpen, onClose, githubConfig, onOpenSettings }: GitHubIssueSlideoutProps) {
  // GitHub Settings Store
  const githubSettings = useGitHubSettingsStore();

  // Use prop githubConfig if provided, otherwise use settings from store
  const effectiveGithubConfig = githubConfig || (githubSettings.username && githubSettings.repo && githubSettings.token ? {
    username: githubSettings.username,
    repo: githubSettings.repo,
    token: githubSettings.token,
  } : null);

  // Zustand Store - Centralized state management
  const {
    title,
    body,
    screenshot,
    activeView,
    mode,
    editingIssueNumber,
    isGenerating,
    isPublishing,
    publishStatus,
    setTitle,
    setBody,
    setScreenshot,
    setActiveView,
    setIsGenerating,
    setIsPublishing,
    setPublishStatus,
    updateContent,
    resetContent,
  } = useGitHubIssueSlideoutStore();
  const [attachments, setAttachments] = useState<{ dataUrl: string; filename?: string }[]>([]);
  const isEditingExistingIssue = mode === "edit" && typeof editingIssueNumber === "number";

  // Reset state when slideout closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when slideout closes using Zustand action
      resetContent();
      setActiveView("preview");
      setIsGenerating(false);
      setIsPublishing(false);
      setAttachments([]);
    }
  }, [isOpen, resetContent, setActiveView, setIsGenerating, setIsPublishing]);

  const handlePublish = async () => {
    if (!effectiveGithubConfig || !effectiveGithubConfig.token || !effectiveGithubConfig.repo || !effectiveGithubConfig.username) {
      setPublishStatus({
        type: "error",
        message: "GitHub configuration not found. Please configure GitHub settings in the Settings tab.",
      });
      return;
    }

    if (!title.trim() || !body.trim()) {
      setPublishStatus({
        type: "error",
        message: "Title and body are required.",
      });
      return;
    }

    setIsPublishing(true);
    setPublishStatus({ type: null, message: "" });

    try {
      if (isEditingExistingIssue && typeof editingIssueNumber === "number") {
        const updatedIssue = await updateGitHubIssue(effectiveGithubConfig, editingIssueNumber, {
          title: title.trim(),
          body: body.trim(),
        });

        setPublishStatus({
          type: "success",
          message: `Issue #${updatedIssue.number} updated successfully!`,
          issueUrl: updatedIssue.html_url,
        });
        window.dispatchEvent(
          new CustomEvent<{ issue: GitHubIssue }>("github-issue-updated", {
            detail: { issue: updatedIssue },
          })
        );
        setAttachments([]);

        setTimeout(() => {
          onClose();
          resetContent();
        }, 1800);
      } else {
        const response = await createGitHubIssue(effectiveGithubConfig, {
          title: title.trim(),
          body: body.trim(),
          labels: ["bug", "auto-generated"],
          attachments: attachments.map((att, index) => ({
            dataUrl: att.dataUrl,
            filename: att.filename || `attachment-${index + 1}.png`,
          })),
          screenshot: undefined,
        });

        setPublishStatus({
          type: "success",
          message: `Issue #${response.number} created successfully!`,
          issueUrl: response.html_url,
        });
        setAttachments([]);

        // Auto-close after successful publish
        setTimeout(() => {
          onClose();
          // Reset state using Zustand action
          resetContent();
        }, 3000);
      }
    } catch (error) {
      setPublishStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save issue",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCaptureAndAttach = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.windowId) {
        throw new Error("No active tab to capture.");
      }
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      setAttachments((prev) => [...prev, { dataUrl, filename: "screenshot.png" }]);
      setPublishStatus({
        type: "success",
        message: "Screenshot captured. It will upload when you publish.",
        issueUrl: undefined,
      });
    } catch (error) {
      setPublishStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to capture screenshot.",
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[10000]"
          />

          {/* Slideout Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-[10001] flex flex-col border-l border-gray-200 dark:border-gray-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-success/10 to-info/10">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {isGenerating
                    ? "Generating GitHub Issue..."
                    : isEditingExistingIssue
                    ? `Edit Issue${editingIssueNumber ? ` #${editingIssueNumber}` : ""}`
                    : "GitHub Issue Preview"}
                </h3>
              </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveView("preview")}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                      activeView === "preview"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveView("edit")}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                      activeView === "edit"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <Code className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>

                {/* Inline upload button */}
                {/* Capture & attach Screenshot */}
                <button
                  onClick={handleCaptureAndAttach}
                  disabled={isPublishing || isEditingExistingIssue}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  title={
                    isEditingExistingIssue
                      ? "Attachments are disabled when editing existing issues"
                      : "Capture screenshot and attach to issue"
                  }
                >
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                  {!effectiveGithubConfig?.username || !effectiveGithubConfig?.repo || !effectiveGithubConfig?.token ? (
                    /* GitHub Not Configured - Show Settings Form */
                    <div className="max-w-lg mx-auto">
                  <div className="mb-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4 mx-auto">
                      <Settings className="w-8 h-8 text-warning" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Configure GitHub Integration
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Set up your GitHub credentials to create issues directly from DevConsole
                    </p>
                  </div>

                  <EmbeddedGitHubSettings
                    onSettingsSaved={() => {
                      // Force refresh the slideout to show the issue preview
                      // The effectiveGithubConfig will be updated via the hook
                      setPublishStatus({
                        type: "success",
                        message: "GitHub configured! Generating issue preview...",
                      });
                    }}
                  />

                  <div className="mt-6 p-4 bg-info/5 border border-info/20 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-info" />
                      Quick Setup Guide
                    </h4>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Enter your GitHub username</li>
                      <li>Enter repository in <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">owner/repo</code> format</li>
                      <li>Create a <a href="https://github.com/settings/tokens/new?scopes=repo&description=DevConsole" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Personal Access Token</a> with <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">repo</code> scope</li>
                      <li>Test connection, then save</li>
                    </ol>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Generating issue from context...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    📸 Capturing screenshot...
                  </p>
                </div>
              ) : activeView === "edit" ? (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issue Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issue Body (Markdown)
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-xs resize-none"
                      rows={24}
                    />
                  </div>

                  {/* Attachments */}
                  {!isEditingExistingIssue && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Images (upload or capture)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="px-3 py-2 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:border-primary/60">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") {
                                  setAttachments((prev) => [
                                    ...prev,
                                    { dataUrl: reader.result as string, filename: file.name },
                                  ]);
                                  setPublishStatus({
                                    type: "success",
                                    message: "Image added. It will upload when you publish.",
                                    issueUrl: undefined,
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          Upload image
                        </label>
                        <button
                          type="button"
                          onClick={handleCaptureAndAttach}
                          disabled={isPublishing}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                          title="Capture screenshot and attach"
                        >
                          <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      {attachments.length > 0 && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                          <p className="text-xs text-muted-foreground mb-1">Images to attach on publish:</p>
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((att, idx) => (
                              <img
                                key={idx}
                                src={att.dataUrl}
                                alt={att.filename || `attachment-${idx + 1}`}
                                className="max-h-32 rounded-md object-contain border border-gray-200 dark:border-gray-700"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Preview Mode
                <div className="space-y-4">
                  {/* Markdown Preview */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      {title || "Issue Title"}
                    </h1>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-primary prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Customize code blocks
                          code(props) {
                            const { children, className, node, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <code className={className} {...rest}>
                                {children}
                              </code>
                            ) : (
                              <code className={className} {...rest}>
                                {children}
                              </code>
                            );
                          },
                          // Customize links to open in new tab
                          a(props) {
                            const { children, href, ...rest } = props;
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                {...rest}
                              >
                                {children}
                              </a>
                            );
                          },
                          // Customize tables for better styling
                          table(props) {
                            const { children, ...rest } = props;
                            return (
                              <div className="overflow-x-auto">
                                <table className="border-collapse border border-gray-300 dark:border-gray-700" {...rest}>
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          th(props) {
                            const { children, ...rest } = props;
                            return (
                              <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2" {...rest}>
                                {children}
                              </th>
                            );
                          },
                          td(props) {
                            const { children, ...rest } = props;
                            return (
                              <td className="border border-gray-300 dark:border-gray-700 px-3 py-2" {...rest}>
                                {children}
                              </td>
                            );
                          },
                          // Customize blockquotes
                          blockquote(props) {
                            const { children, ...rest } = props;
                            return (
                              <blockquote className="border-l-4 border-primary pl-4 italic text-gray-700 dark:text-gray-300" {...rest}>
                                {children}
                              </blockquote>
                            );
                          },
                        }}
                      >
                        {body || "*No content*"}
                      </ReactMarkdown>
                      {attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs text-muted-foreground">Images to attach on publish:</p>
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((att, idx) => (
                              <img
                                key={idx}
                                src={att.dataUrl}
                                alt={att.filename || `attachment-${idx + 1}`}
                                className="max-h-32 rounded-md object-contain border border-gray-200 dark:border-gray-700"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
              {/* Status Message */}
              {publishStatus.type && (
                <div
                  className={cn(
                    "mb-4 p-4 rounded-xl flex items-start gap-3 text-sm shadow-sm",
                    publishStatus.type === "success"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}
                >
                  {publishStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{publishStatus.message}</p>
                    {publishStatus.issueUrl && (
                      <a
                        href={publishStatus.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium hover:underline mt-2"
                      >
                        View Issue #{publishStatus.issueUrl.split("/").pop()}
                        <Send className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Repository Info & AI Enhancement */}
              <div className="mb-4">
                {effectiveGithubConfig?.repo ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Github className="w-4 h-4" />
                      <span>Publishing to:</span>
                      <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{effectiveGithubConfig.repo}</span>
                    </div>
                    
                    {/* Super Write AI - Only show when GitHub is configured and not generating */}
                    {effectiveGithubConfig?.username && effectiveGithubConfig?.repo && effectiveGithubConfig?.token && !isGenerating && (
                      <SuperWriteAI
                        currentTitle={title}
                        currentBody={body}
                        onEnhanced={(enhanced) => {
                          updateContent({
                            title: enhanced.title,
                            body: enhanced.body,
                          });
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings?.();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl text-sm font-semibold transition-all border border-primary/20 hover:border-primary/30 shadow-sm hover:shadow"
                  >
                    <Settings className="w-4 h-4" />
                    Configure GitHub Settings
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={
                    isPublishing ||
                    !title.trim() ||
                    !body.trim() ||
                    !effectiveGithubConfig?.username ||
                    !effectiveGithubConfig?.repo ||
                    !effectiveGithubConfig?.token
                  }
                  className="flex-[2] px-6 py-3 bg-success hover:bg-success/90 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  title={
                    !effectiveGithubConfig?.username || !effectiveGithubConfig?.repo || !effectiveGithubConfig?.token
                      ? "Configure GitHub settings first"
                      : isEditingExistingIssue
                      ? "Save changes to this GitHub issue"
                      : "Publish issue to GitHub"
                  }
                >
                  {isPublishing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {isEditingExistingIssue ? "Saving..." : "Publishing..."}
                    </>
                  ) : (
                    <>
                      {isEditingExistingIssue ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {isEditingExistingIssue ? "Save Changes" : "Publish Issue"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
