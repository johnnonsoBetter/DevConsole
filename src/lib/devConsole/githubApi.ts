/**
 * GitHub API Integration
 * Handles creating issues on GitHub
 */

import axios from 'axios';

export interface GitHubConfig {
  username: string;
  repo: string;
  token: string;
}

export interface CreateIssueParams {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  screenshot?: string; // base64 data URL
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  labels: { id: number; name: string; color: string; description?: string }[];
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}

export interface GitHubIssueResponse {
  html_url: string;
  number: number;
  title: string;
  state: string;
}

export interface ListIssuesParams {
  state?: 'open' | 'closed' | 'all';
  page?: number;
  perPage?: number;
}

export interface UpdateIssueParams {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
}

function parseRepo(config: GitHubConfig): { owner: string; repo: string } {
  const [owner, repo] = config.repo.split('/');

  if (!owner || !repo) {
    throw new Error('Invalid repository format. Expected: owner/repo');
  }

  return { owner, repo };
}

function buildHeaders(token: string) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

function handleGitHubApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const errors = error.response?.data?.errors;

    console.error('GitHub API Error:', {
      status,
      message,
      errors,
      data: error.response?.data,
    });

    if (status === 401) {
      throw new Error('Invalid GitHub token. Please check your settings.');
    } else if (status === 404) {
      throw new Error('Repository not found. Please check your settings.');
    } else if (status === 403) {
      throw new Error('Permission denied. Token may lack required scopes.');
    } else if (status === 422) {
      const errorDetails = errors
        ? errors.map((e: any) => e.message || e.code).join(', ')
        : 'Invalid data';
      throw new Error(`Validation Failed: ${errorDetails}. ${message}`);
    } else {
      throw new Error(`GitHub API error: ${message}`);
    }
  }

  throw error instanceof Error ? error : new Error('Unknown GitHub API error');
}

/**
 * Create a GitHub issue
 */
export async function createGitHubIssue(
  config: GitHubConfig,
  params: CreateIssueParams
): Promise<GitHubIssueResponse> {
  const { owner, repo } = parseRepo(config);

  // Base64 screenshots are too large for GitHub API
  // Instead, add a note about the screenshot
  let bodyWithScreenshot = params.body;
  if (params.screenshot) {
    // Note: We can't include the base64 screenshot directly due to size limits
    // Users can download it separately or we could upload to an image hosting service
    bodyWithScreenshot = `> **Note:** A screenshot was captured. Download it from the DevConsole before closing.\n\n${params.body}`;
  }

  try {
    const response = await axios.post<GitHubIssueResponse>(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        title: params.title,
        body: bodyWithScreenshot,
        labels: params.labels || [],
        assignees: params.assignees || [],
      },
      {
        headers: {
          ...buildHeaders(config.token),
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    handleGitHubApiError(error);
  }
}

/**
 * Test GitHub credentials
 */
export async function testGitHubConnection(
  config: GitHubConfig
): Promise<{ valid: boolean; error?: string }> {
  let owner: string;
  let repo: string;

  try {
    ({ owner, repo } = parseRepo(config));
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid repository format',
    };
  }

  try {
    await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        ...buildHeaders(config.token),
      },
    });

    return { valid: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        return { valid: false, error: 'Invalid token' };
      } else if (status === 404) {
        return { valid: false, error: 'Repository not found' };
      }
      return { valid: false, error: 'Connection failed' };
    }
    return { valid: false, error: 'Unknown error' };
  }
}

/**
 * List GitHub issues for a repository
 */
export async function listGitHubIssues(
  config: GitHubConfig,
  params: ListIssuesParams = {}
): Promise<GitHubIssue[]> {
  const { owner, repo } = parseRepo(config);
  const { state = 'open', page = 1, perPage = 20 } = params;

  try {
    const response = await axios.get<GitHubIssue[]>(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        params: {
          state,
          page,
          per_page: perPage,
        },
        headers: buildHeaders(config.token),
      }
    );

    // Filter out pull requests to only show issues
    return response.data.filter((issue) => !issue.pull_request);
  } catch (error) {
    handleGitHubApiError(error);
  }
}

/**
 * Update an existing GitHub issue
 */
export async function updateGitHubIssue(
  config: GitHubConfig,
  issueNumber: number,
  updates: UpdateIssueParams
): Promise<GitHubIssue> {
  const { owner, repo } = parseRepo(config);

  try {
    const response = await axios.patch<GitHubIssue>(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        ...updates,
      },
      {
        headers: {
          ...buildHeaders(config.token),
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    handleGitHubApiError(error);
  }
}
