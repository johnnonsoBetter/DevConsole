import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Code, Send, CheckCircle, AlertCircle, Loader, Camera, Sparkles } from "lucide-react";
import { cn } from "src/utils";
import { createContextPack, generateGitHubIssueMarkdown } from "../../lib/devConsole/contextPacker";
import { createGitHubIssue, type GitHubConfig } from "../../lib/devConsole/githubApi";
import { useGitHubIssueSlideoutStore, type LogEntry } from "../../utils/stores";
import { useAI } from "../../hooks/useAI";
import { AIActionButton } from "./AI";

// ============================================================================
// GITHUB ISSUE SLIDEOUT
// ============================================================================

interface GitHubIssueSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLog?: LogEntry | null;
  githubConfig?: GitHubConfig;
}

export function GitHubIssueSlideout({ isOpen, onClose, selectedLog, githubConfig }: GitHubIssueSlideoutProps) {
  // Zustand Store - Centralized state management
  const {
    title,
    body,
    screenshot,
    activeView,
    isGenerating,
    isCapturingScreenshot,
    isPublishing,
    publishStatus,
    setTitle,
    setBody,
    setScreenshot,
    setActiveView,
    setIsGenerating,
    setIsCapturingScreenshot,
    setIsPublishing,
    setPublishStatus,
    updateContent,
    resetContent,
  } = useGitHubIssueSlideoutStore();

  // AI Hook for intelligent issue generation - MUST be called before any early returns
  const {
    availability: aiAvailability,
    isLoading: isAIGenerating,
    analyzeLog,
    summary: aiSummary,
    reset: resetAI,
  } = useAI({ autoCheck: true });

  // Reset state when slideout closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when slideout closes using Zustand action
      resetContent();
      setActiveView("preview");
      setIsGenerating(false);
      setIsCapturingScreenshot(false);
      setIsPublishing(false);
      resetAI();
    }
  }, [isOpen, resetAI, resetContent, setActiveView, setIsGenerating, setIsCapturingScreenshot, setIsPublishing]);

  // Auto-generate issue when slideout opens OR when selectedLog changes
  useEffect(() => {
    if (isOpen && !isGenerating) {
      // Reset AI state before generating new issue
      resetAI();
      handleGenerateIssue();
    }
  }, [isOpen, selectedLog?.id]); // Regenerate when log changes

  const handleGenerateIssue = async () => {
    setIsGenerating(true);
    setPublishStatus({ type: null, message: "" });

    try {
      // Don't include screenshot in auto-generation
      const pack = await createContextPack({
        includeScreenshot: false,
        eventCount: 20,
        networkCount: 10,
      });

      // Build description from selected log if available
      let description = "";

      if (selectedLog) {
        description = selectedLog.message;
      }

      const generated = generateGitHubIssueMarkdown(pack, {
        description: description || "An issue was detected in the application",
      });

      // Update content using Zustand action
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

  // AI-powered issue generation
  const handleAIGenerate = async () => {
    if (!selectedLog && !body) {
      setPublishStatus({
        type: "error",
        message: "No log selected or existing content to analyze.",
      });
      return;
    }

    setPublishStatus({ type: null, message: "" });

    try {
      // Build comprehensive context for AI analysis
      let contextForAI = "";

      if (selectedLog) {
        contextForAI = `Log Level: ${selectedLog.level}\nMessage: ${selectedLog.message}`;

        if (selectedLog.args && selectedLog.args.length > 0) {
          contextForAI += `\nArguments: ${JSON.stringify(selectedLog.args)}`;
        }

        if (selectedLog.stack) {
          contextForAI += `\nStack Trace: ${selectedLog.stack}`;
        }

        if (selectedLog.source) {
          contextForAI += `\nSource: ${selectedLog.source.file}:${selectedLog.source.line}`;
        }
      } else if (body) {
        // Use existing body content
        contextForAI = body;
      }

      // Analyze with AI to generate comprehensive issue
      await analyzeLog(
        contextForAI,
        selectedLog?.level || 'info',
        selectedLog?.stack,
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

  // Update title and body when AI analysis completes
  useEffect(() => {
    if (aiSummary && !isAIGenerating) {
      // Extract title from AI summary (first line should be "Title: ...")
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

      // Update content using Zustand action
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

  const handleCaptureScreenshot = async () => {
    setIsCapturingScreenshot(true);
    try {
      const pack = await createContextPack({
        includeScreenshot: true,
        eventCount: 0, // Don't need events, just screenshot
        networkCount: 0,
      });

      if (pack.screenshot) {
        setScreenshot(pack.screenshot);
      }
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      setPublishStatus({
        type: "error",
        message: "Failed to capture screenshot. Check console for details.",
      });
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handlePublish = async () => {
    if (!githubConfig || !githubConfig.token || !githubConfig.repo) {
      setPublishStatus({
        type: "error",
        message: "GitHub configuration not found. Please set GITHUB_TOKEN, GITHUB_REPO, and GITHUB_USERNAME environment variables.",
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
      const response = await createGitHubIssue(githubConfig, {
        title: title.trim(),
        body: body.trim(),
        labels: ["bug", "auto-generated"],
        screenshot: screenshot || undefined,
      });

      setPublishStatus({
        type: "success",
        message: `Issue #${response.number} created successfully!`,
        issueUrl: response.html_url,
      });

      // Auto-close after successful publish
      setTimeout(() => {
        onClose();
        // Reset state using Zustand action
        resetContent();
      }, 3000);
    } catch (error) {
      setPublishStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create issue",
      });
    } finally {
      setIsPublishing(false);
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
                  {isGenerating ? "Generating GitHub Issue..." : "GitHub Issue Preview"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* AI Transform Button */}
                {aiAvailability !== 'unavailable' && (
                  <AIActionButton
                    onClick={handleAIGenerate}
                    loading={isAIGenerating}
                    disabled={!selectedLog && !body}
                    label="Transform"
                    loadingLabel="Transforming..."
                    variant="primary"
                    size="sm"
                  />
                )}

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
              {isGenerating ? (
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
                </div>
              ) : (
                // Preview Mode
                <div className="space-y-4">
                  {/* Screenshot Preview */}
                  {screenshot && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Screenshot Preview
                      </h2>
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={screenshot}
                          alt="Page screenshot"
                          className="w-full h-auto"
                        />
                        <div className="absolute top-2 right-2">
                          <a
                            href={screenshot}
                            download={`linkvybe-issue-screenshot-${Date.now()}.png`}
                            className="px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-xs text-warning">
                          ⚠️ <strong>Note:</strong> Screenshot cannot be automatically attached due to GitHub API size limits.
                          Please download it using the button above and manually attach it to the issue after creation.
                        </p>
                      </div>
                    </div>
                  )}

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
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
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
                  {githubConfig?.repo ? (
                    <span>
                      Publishing to: <span className="font-mono">{githubConfig.repo}</span>
                    </span>
                  ) : (
                    <span className="text-warning">⚠️ GitHub config not set in environment variables</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing || !title.trim() || !body.trim()}
                    className="px-6 py-2 bg-success hover:bg-success/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
