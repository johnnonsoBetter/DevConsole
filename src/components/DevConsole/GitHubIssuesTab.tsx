import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Github,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tag,
} from "lucide-react";
import { cn } from "@/utils";
import {
  listGitHubIssues,
  updateGitHubIssue,
  type GitHubConfig,
  type GitHubIssue,
} from "@/lib/devConsole/githubApi";
import { useGitHubIssueSlideoutStore, useGitHubSettingsStore } from "@/utils/stores";

type IssueState = "open" | "closed" | "all";

interface GitHubIssuesTabProps {
  githubConfig?: GitHubConfig | null;
  onOpenSettings?: () => void;
}

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function IssueStateBadge({ state }: { state: "open" | "closed" }) {
  const isOpen = state === "open";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
        isOpen ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", isOpen ? "bg-success" : "bg-destructive")} />
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

export function GitHubIssuesTab({ githubConfig, onOpenSettings }: GitHubIssuesTabProps) {
  const githubSettings = useGitHubSettingsStore();
  const slideoutStore = useGitHubIssueSlideoutStore();

  const resolvedConfig = useMemo<GitHubConfig | null>(() => {
    if (githubConfig) return githubConfig;
    if (githubSettings.username && githubSettings.repo && githubSettings.token) {
      return {
        username: githubSettings.username,
        repo: githubSettings.repo,
        token: githubSettings.token,
      };
    }
    return null;
  }, [githubConfig, githubSettings.repo, githubSettings.token, githubSettings.username]);

  const [repoInput, setRepoInput] = useState(resolvedConfig?.repo || "");
  const [stateFilter, setStateFilter] = useState<IssueState>("open");
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editState, setEditState] = useState<"open" | "closed">("open");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const selectedIssueNumberRef = useRef<number | null>(null);
  const repoInputRef = useRef(repoInput);

  useEffect(() => {
    setRepoInput(resolvedConfig?.repo || "");
  }, [resolvedConfig]);

  useEffect(() => {
    repoInputRef.current = repoInput;
  }, [repoInput]);

  useEffect(() => {
    if (selectedIssue) {
      setEditTitle(selectedIssue.title);
      setEditBody(selectedIssue.body || "");
      setEditState(selectedIssue.state === "closed" ? "closed" : "open");
      selectedIssueNumberRef.current = selectedIssue.number;
    } else {
      selectedIssueNumberRef.current = null;
    }
  }, [selectedIssue]);

  const fetchIssues = useCallback(
    async (repoOverride?: string) => {
      if (!resolvedConfig) {
        setError("GitHub not configured. Add settings to load issues.");
        return;
      }

      const repoToUse = (repoOverride ?? repoInputRef.current).trim() || resolvedConfig.repo;
      if (!repoToUse) {
        setError("Repository is required to load issues.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setStatusMessage("");

      try {
        const results = await listGitHubIssues(
          { ...resolvedConfig, repo: repoToUse },
          { state: stateFilter, perPage: 30 }
        );
        setIssues(results);

        const selectedIssueNumber = selectedIssueNumberRef.current;
        if (selectedIssueNumber) {
          const refreshed = results.find((issue) => issue.number === selectedIssueNumber) || null;
          setSelectedIssue(refreshed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      } finally {
        setIsLoading(false);
      }
    },
    [resolvedConfig, stateFilter]
  );

  useEffect(() => {
    if (resolvedConfig) {
      fetchIssues(resolvedConfig.repo);
    }
  }, [fetchIssues, resolvedConfig]);

  const filteredIssues = useMemo(() => {
    if (!searchTerm.trim()) return issues;
    return issues.filter((issue) =>
      issue.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );
  }, [issues, searchTerm]);

  const handleUpdateIssue = async () => {
    if (!resolvedConfig || !selectedIssue) return;

    setIsUpdating(true);
    setError(null);
    setStatusMessage("");

    try {
      const updated = await updateGitHubIssue(
        { ...resolvedConfig, repo: (repoInput.trim() || resolvedConfig.repo) },
        selectedIssue.number,
        {
          title: editTitle.trim() || selectedIssue.title,
          body: editBody,
          state: editState,
        }
      );

      setSelectedIssue(updated);
      setIssues((prev) => prev.map((issue) => (issue.number === updated.number ? updated : issue)));
      setStatusMessage("Issue updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!resolvedConfig) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-8">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Github className="w-6 h-6 text-gray-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Connect GitHub to manage issues
          </h3>
          <p className="text-sm text-muted-foreground">
            Add your GitHub repository and token in Settings to list, create, and update issues
            without leaving the DevConsole.
          </p>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Open Settings
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-apple-sm">
            <Github className="w-5 h-5 text-gray-800 dark:text-gray-200" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Repository</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {repoInput || resolvedConfig.repo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["open", "closed", "all"] as IssueState[]).map((state) => (
              <button
                key={state}
                onClick={() => setStateFilter(state)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  stateFilter === state
                    ? "bg-primary text-white shadow-apple-sm"
                    : "bg-white/80 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => slideoutStore.open()}
            className="px-3 py-2 rounded-lg bg-success text-white text-sm font-medium flex items-center gap-2 shadow-apple-sm hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Issue
          </button>
          <button
            onClick={() => fetchIssues()}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/70 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Two-panel layout: list on the left, detail side panel on select */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden bg-gray-50/60 dark:bg-gray-950/40">
        {/* Issues list */}
        <div className="card flex flex-col overflow-hidden flex-[1.1] min-w-[320px]">
          <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search issues by title..."
                className="w-full bg-transparent focus:outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repo (leave empty to use saved repo)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
              <button
                onClick={() => fetchIssues(repoInput)}
                disabled={isLoading}
                className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                Load
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && filteredIssues.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading issues...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground text-center px-4">
                No issues found for this filter.
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const isActive = selectedIssue?.id === issue.id;
                return (
                  <button
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors flex flex-col gap-2",
                      isActive && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <IssueStateBadge state={issue.state === "closed" ? "closed" : "open"} />
                        <span className="text-xs font-semibold text-muted-foreground">#{issue.number}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Updated {formatRelative(issue.updated_at)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                      {issue.title}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor: `#${label.color}22`,
                            color: `#${label.color}`,
                          }}
                        >
                          <Tag className="w-3 h-3" />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Details side panel */}
        <div
          className={cn(
            "flex w-full lg:w-[42%] min-w-[320px] lg:min-w-[380px] max-w-[520px] flex-col border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden",
            !selectedIssue && "hidden lg:flex"
          )}
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 min-w-0">
              <Github className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {selectedIssue ? `Issue #${selectedIssue.number}` : "Select an issue"}
              </h3>
            </div>
            {selectedIssue ? (
              <div className="flex items-center gap-2">
                <a
                  href={selectedIssue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View on GitHub
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Close details"
                >
                  ×
                </button>
              </div>
            ) : null}
          </div>

          {selectedIssue ? (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-gray-50/60 dark:bg-gray-900/60">
                  <p className="text-xs text-muted-foreground mb-1">State</p>
                  <div className="flex items-center gap-2">
                    {(["open", "closed"] as const).map((state) => (
                      <button
                        key={state}
                        onClick={() => setEditState(state)}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                          editState === state
                            ? "bg-primary text-white border-primary"
                            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {state === "open" ? "Open" : "Closed"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Description (Markdown)</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <IssueStateBadge state={selectedIssue.state === "closed" ? "closed" : "open"} />
                  <span>Updated {formatRelative(selectedIssue.updated_at)}</span>
                  <span className="truncate">by {selectedIssue.user.login}</span>
                </div>

                {statusMessage && (
                  <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    {statusMessage}
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end bg-gray-50/70 dark:bg-gray-900/40">
                <button
                  onClick={handleUpdateIssue}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-muted-foreground">
              <Github className="w-6 h-6" />
              <p className="text-sm">Select an issue from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
