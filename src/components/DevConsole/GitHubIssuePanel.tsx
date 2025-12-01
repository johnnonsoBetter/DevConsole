
import { useGitHubIssueSlideoutStore } from "@/utils/stores";
import DOMPurify from "dompurify";
import { AlertCircle, CheckCircle, Code, Eye, Github, Loader, Send, Settings } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGitHubSettings } from "../../hooks/useGitHubSettings";
import { createContextPack, generateGitHubIssueMarkdown } from "../../lib/devConsole/contextPacker";
import { createGitHubIssue } from "../../lib/devConsole/githubApi";
import { cn } from "../../utils";

// ============================================================================
// GITHUB ISSUE PANEL
// ============================================================================

export function GitHubIssuePanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  // GitHub Settings Hook
  const { settings,  } = useGitHubSettings();
  const [attachments, setAttachments] = useState<{ dataUrl: string; filename?: string }[]>([]);
  const [isReadingImage, setIsReadingImage] = useState(false);

  // Zustand Store - Centralized state management (same as slideout)
  const {
    title,
    body,
    activeView,
    isPublishing,
    publishStatus,
    screenshot,
    setTitle,
    setBody,
    setScreenshot,
    setActiveView,
    setIsPublishing,
    setPublishStatus,
    updateContent,
    resetContent,
  } = useGitHubIssueSlideoutStore();

  const handleGenerateFromContext = async () => {
    setPublishStatus({ type: null, message: "" });

    try {
      const pack = await createContextPack({
        includeScreenshot: false,
        eventCount: 20,
        networkCount: 10,
      });

      const generated = generateGitHubIssueMarkdown(pack, {
        description: "Issue detected in application",
      });

      // Update content using Zustand store action (same as slideout)
      updateContent({
        title: generated.title,
        body: generated.body,
      });
    } catch (error) {
      console.error("Failed to generate issue:", error);
      setPublishStatus({
        type: "error",
        message: "Failed to generate issue. Check console for details.",
      });
    }
  };

  const handleImageUpload = (file?: File | null) => {
    if (!file) return;
    if (!settings) {
      setPublishStatus({
        type: "error",
        message: "GitHub settings not configured. Configure before adding images.",
      });
      return;
    }

    setIsReadingImage(true);
    setPublishStatus({ type: null, message: "" });

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAttachments((prev) => [...prev, { dataUrl: result, filename: file.name }]);
        setPublishStatus({
          type: "success",
          message: "Image added. It will upload when you publish.",
          issueUrl: undefined,
        });
      }
      setIsReadingImage(false);
    };
    reader.onerror = () => {
      setIsReadingImage(false);
      setPublishStatus({
        type: "error",
        message: "Failed to read image. Please try again.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    // Check if settings are configured
    if (!settings) {
      setPublishStatus({
        type: "error",
        message: "GitHub settings not configured. Click the settings button to configure.",
      });
      return;
    }

    if (!title.trim()) {
      setPublishStatus({
        type: "error",
        message: "Please provide an issue title.",
      });
      return;
    }

    if (!body.trim()) {
      setPublishStatus({
        type: "error",
        message: "Please provide an issue body.",
      });
      return;
    }

    setIsPublishing(true);
    setPublishStatus({ type: null, message: "" });

    try {
      const response = await createGitHubIssue(settings, {
        title: title.trim(),
        body: body.trim(),
        screenshot: screenshot || undefined,
        attachments: attachments.map((att, index) => ({
          dataUrl: att.dataUrl,
          filename: att.filename || `attachment-${index + 1}.png`,
        })),
        labels: ["bug", "auto-generated"],
      });

      setPublishStatus({
        type: "success",
        message: `Issue #${response.number} created successfully!`,
        issueUrl: response.html_url,
      });
      setAttachments([]);

      // Clear form after successful publish using Zustand action
      setTimeout(() => {
        resetContent();
      }, 2000);
    } catch (error) {
      setPublishStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create issue",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const sanitizedMarkdown = DOMPurify.sanitize(body);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Create GitHub Issue
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="GitHub Settings"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
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
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {activeView === "edit" ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Quick Context Generator */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Github className="w-4 h-4" />
                Quick Context Generator
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Generate a complete issue with context from the current app state (logs, network, errors).
              </p>

              <button
                onClick={handleGenerateFromContext}
                className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Github className="w-4 h-4" />
                Generate Issue from Context
              </button>
            </div>

            {/* Issue Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            {/* Issue Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Body (Markdown) <span className="text-destructive">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="## Description&#10;&#10;Describe the issue in detail...&#10;&#10;## Steps to Reproduce&#10;&#10;1. &#10;2. &#10;&#10;## Expected Behavior&#10;&#10;## Actual Behavior"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm resize-none"
                rows={16}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Supports GitHub Flavored Markdown (tables, task lists, code blocks, etc.)
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Screenshot / Image
              </label>
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:border-primary/60">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                  Upload image
                </label>
                {isReadingImage && (
                  <span className="text-xs text-muted-foreground">Reading image...</span>
                )}
                {screenshot && (
                  <button
                    type="button"
                    onClick={() => setScreenshot("")}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                  <p className="text-xs text-muted-foreground mb-1">Preview</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <img
                        key={idx}
                        src={att.dataUrl}
                        alt={att.filename || `attachment-${idx + 1}`}
                        className="max-h-40 rounded-md object-contain border border-gray-200 dark:border-gray-700"
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Images are uploaded to the repo (issue-assets/) and embedded in the issue body.
              </p>
            </div>
          </div>
        ) : (
          // Preview Mode
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {title || "Issue Title"}
              </h1>
              <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden break-words [&_pre]:overflow-x-auto [&_code]:break-all [&_a]:break-all">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sanitizedMarkdown || "*No content*"}
                </ReactMarkdown>
              </div>
              {(attachments.length > 0 || screenshot) && (
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
                    {screenshot && (
                      <img
                        src={screenshot}
                        alt="screenshot"
                        className="max-h-32 rounded-md object-contain border border-gray-200 dark:border-gray-700"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Publish */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900">
        {/* Status Message */}
        {publishStatus.type && (
          <div
            className={cn(
              "mb-3 p-3 rounded-lg flex items-start gap-2 text-sm",
              publishStatus.type === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            )}
          >
            {publishStatus.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p>{publishStatus.message}</p>
              {publishStatus.issueUrl && (
                <a
                  href={publishStatus.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline mt-1 inline-block"
                >
                  View Issue #{publishStatus.issueUrl.split("/").pop()}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {(() => {
              
              return settings ? (
                <span>
                  Publishing to: <span className="font-mono">{settings.repo}</span>
                </span>
              ) : (
                <span className="text-warning">⚠️ GitHub settings not configured</span>
              );
            })()}
          </div>

          <button
            onClick={handlePublish}
            disabled={isPublishing || !title.trim() || !body.trim()}
            className="px-6 py-2 bg-success hover:bg-success/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publish Issue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
