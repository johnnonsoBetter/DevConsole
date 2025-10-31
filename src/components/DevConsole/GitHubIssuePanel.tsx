import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";
import { Github, Eye, Code, Send, Settings, CheckCircle, AlertCircle, Loader, Sparkles } from "lucide-react";
import { cn } from "src/utils";
import { createContextPack, generateGitHubIssueMarkdown } from "../../lib/devConsole/contextPacker";
import { createGitHubIssue } from "../../lib/devConsole/githubApi";
import { loadGitHubSettings } from "../../lib/devConsole/githubSettings";
import type { GitHubSettings } from "../../lib/devConsole/githubSettings";
import { useAI } from "../../hooks/useAI";
import { AIActionButton } from "./AI";
import { useGitHubIssueSlideoutStore } from "../../utils/stores";

// ============================================================================
// GITHUB ISSUE PANEL
// ============================================================================

export function GitHubIssuePanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  // Zustand Store - Centralized state management (same as slideout)
  const {
    title,
    body,
    activeView,
    isGenerating,
    isPublishing,
    publishStatus,
    setTitle,
    setBody,
    setActiveView,
    setIsGenerating,
    setIsPublishing,
    setPublishStatus,
    updateContent,
    resetContent,
  } = useGitHubIssueSlideoutStore();

  // AI Hook for intelligent issue generation
  const {
    availability: aiAvailability,
    isLoading: isAIGenerating,
    analyzeLog,
    summary: aiSummary,
    reset: resetAI,
  } = useAI({ autoCheck: true });

  // Load GitHub settings (not stored in Zustand, loaded fresh each time)
  useEffect(() => {
    // Settings are loaded from localStorage on demand
  }, []);

  const handleGenerateFromContext = async () => {
    setIsGenerating(true);
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
    } finally {
      setIsGenerating(false);
    }
  };

  // AI-powered issue generation (consistent with slideout)
  const handleAIGenerate = async () => {
    if (!body) {
      // If no body yet, generate from context first
      await handleGenerateFromContext();
      return;
    }

    setPublishStatus({ type: null, message: "" });

    try {
      // Use existing body content for AI analysis (same format as slideout)
      await analyzeLog(
        body,
        'info',
        undefined,
        `You are generating a GitHub issue. Follow these strict formatting rules:

1. TITLE (First line only):
   - Start with "Title: " followed by a short, clear title (max 60 characters)
   - Be specific and descriptive
   - Example: "Title: API request timeout on campaign creation"
   - Example: "Title: Console error when rendering profile page"

2. BODY (GitHub Flavored Markdown):
   - Use proper markdown formatting
   - Start with ## Description
   - Include ## Technical Details with code blocks
   - Add ## Stack Trace (if available) in \`\`\` code blocks
   - Include ## Impact and any other relevant sections
   - Use **bold** for important terms
   - Use \`code\` for file names, variables, functions
   - Use bullet points (-) for lists
   - Use numbered lists (1. 2. 3.) for steps

3. CODE FORMATTING:
   - Wrap all code/stack traces in triple backticks with language
   - Example: \`\`\`javascript\ncode here\n\`\`\`
   - Example: \`\`\`bash\ncommand here\n\`\`\`

4. STRUCTURE:
   - Be concise but comprehensive
   - Focus on actionable information
   - Include error messages verbatim in code blocks
   - Highlight file names and line numbers

Generate now:`
      );
    } catch (error) {
      console.error("Failed to generate AI issue:", error);
      setPublishStatus({
        type: "error",
        message: "AI generation failed. Check console for details.",
      });
    }
  };

  // Update title and body when AI analysis completes (consistent with slideout)
  useEffect(() => {
    if (aiSummary && !isAIGenerating) {
      // Extract title from AI summary (IDENTICAL logic as slideout)
      const lines = aiSummary.split('\n').filter(l => l.trim());
      let extractedTitle = '';
      let extractedBody = '';

      if (lines.length > 0) {
        const firstLine = lines[0].trim();

        // Check for "Title:" prefix (case insensitive)
        if (firstLine.toLowerCase().startsWith('title:')) {
          extractedTitle = firstLine.replace(/^title:\s*/i, '').trim();
          // Rest of the content is the body
          extractedBody = lines.slice(1).join('\n').trim();
        }
        // Check for markdown heading
        else if (firstLine.startsWith('# ')) {
          extractedTitle = firstLine.replace(/^#\s*/, '').trim();
          extractedBody = lines.slice(1).join('\n').trim();
        }
        // Fallback: use first line as title if it's short
        else if (firstLine.length <= 80) {
          extractedTitle = firstLine.replace(/^[#*-]\s*/, '').trim();
          extractedBody = lines.slice(1).join('\n').trim();
        }
        // If first line is too long, extract from content
        else {
          // Try to find a title in the content
          for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().startsWith('title:')) {
              extractedTitle = line.replace(/^title:\s*/i, '').trim();
              // Remove this line from body
              extractedBody = lines.filter((_, idx) => idx !== i).join('\n').trim();
              break;
            }
          }

          // If still no title, generate from content
          if (!extractedTitle) {
            extractedTitle = 'Issue detected in application';
            extractedBody = aiSummary;
          }
        }
      }

      // Limit title length
      if (extractedTitle.length > 80) {
        extractedTitle = extractedTitle.substring(0, 77) + '...';
      }

      // Clean up body - remove any remaining "Title:" lines
      extractedBody = extractedBody.replace(/^title:.*\n?/gim, '').trim();

      // Update content using Zustand action (ensures consistency with slideout)
      updateContent({
        title: extractedTitle || 'Issue detected in application',
        body: extractedBody,
      });

      setPublishStatus({
        type: "success",
        message: "✓ AI-generated issue ready for review!",
      });
    }
  }, [aiSummary, isAIGenerating, updateContent, setPublishStatus]);

  const handlePublish = async () => {
    // Load settings fresh for publishing
    const settings = loadGitHubSettings();

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
        labels: ["bug", "auto-generated"],
      });

      setPublishStatus({
        type: "success",
        message: `Issue #${response.number} created successfully!`,
        issueUrl: response.html_url,
      });

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

          {/* AI Transform Button */}
          {aiAvailability !== 'unavailable' && (
            <AIActionButton
              onClick={handleAIGenerate}
              loading={isAIGenerating}
              label="Transform"
              loadingLabel="Transforming..."
              variant="primary"
              size="sm"
            />
          )}

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
                disabled={isGenerating}
                className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating from Context...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Generate Issue from Context
                  </>
                )}
              </button>

              <div className="mt-3 p-2 bg-info/10 border border-info/20 rounded-lg">
                <p className="text-xs text-info flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Tip: After generating, use the <strong>Transform</strong> button above to refine the issue with AI.</span>
                </p>
              </div>
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
          </div>
        ) : (
          // Preview Mode
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {title || "Issue Title"}
              </h1>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sanitizedMarkdown || "*No content*"}
                </ReactMarkdown>
              </div>
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
              const settings = loadGitHubSettings();
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
