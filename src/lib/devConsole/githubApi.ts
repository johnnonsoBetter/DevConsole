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
  attachments?: IssueAttachment[];
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

export interface GitHubIssueComment {
  id: number;
  body: string;
  user: { login: string; avatar_url: string; html_url: string };
  html_url: string;
  created_at: string;
  updated_at: string;
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

export interface IssueAttachment {
  dataUrl: string;
  filename?: string;
  path?: string;
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
 * Upload an image/asset to the repository using the contents API
 * Returns a public download URL that can be embedded in Markdown.
 */
export async function uploadIssueAttachment(
  config: GitHubConfig,
  attachment: IssueAttachment
): Promise<string> {
  const { owner, repo } = parseRepo(config);

  const match = attachment.dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL for attachment. Expected base64 data URL.');
  }

  const mimeType = match[1] || 'image/png';
  const base64Data = match[2];

  const extensionFromMime = (() => {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    if (mimeType.includes('gif')) return 'gif';
    return 'bin';
  })();

  const baseFilename =
    attachment.filename?.replace(/[^a-zA-Z0-9._-]/g, '_') ||
    `issue-asset.${extensionFromMime}`;
  const uniqueFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}-${baseFilename}`;

  const path = attachment.path || `issue-assets/${uniqueFilename}`;

  try {
    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: `Upload issue asset ${uniqueFilename}`,
        content: base64Data,
        encoding: 'base64',
      },
      {
        headers: {
          ...buildHeaders(config.token),
          'Content-Type': 'application/json',
        },
      }
    );

    const downloadUrl: string | undefined = (response.data as any)?.content?.download_url;
    if (!downloadUrl) {
      throw new Error('Failed to retrieve uploaded image URL from GitHub.');
    }
    return downloadUrl;
  } catch (error) {
    handleGitHubApiError(error);
  }
}

/**
 * Create a GitHub issue
 */
export async function createGitHubIssue(
  config: GitHubConfig,
  params: CreateIssueParams
): Promise<GitHubIssueResponse> {
  const { owner, repo } = parseRepo(config);

  // Upload attachments (including screenshot) first, then embed in body
  const attachmentsToUpload: IssueAttachment[] = [];
  if (params.screenshot) {
    attachmentsToUpload.push({
      dataUrl: params.screenshot,
      filename: 'screenshot.png',
    });
  }
  if (params.attachments?.length) {
    attachmentsToUpload.push(...params.attachments);
  }

  let bodyWithAssets = params.body;
  if (attachmentsToUpload.length > 0) {
    const uploadedMarkdown: string[] = [];
    for (const attachment of attachmentsToUpload) {
      const imageUrl = await uploadIssueAttachment(config, attachment);
      const alt = attachment.filename || 'attachment';
      uploadedMarkdown.push(`![${alt}](${imageUrl})`);
    }

    if (uploadedMarkdown.length > 0) {
      bodyWithAssets = `${params.body}\n\n${uploadedMarkdown.join('\n')}`;
    }
  }

  try {
    const response = await axios.post<GitHubIssueResponse>(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        title: params.title,
        body: bodyWithAssets,
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

/**
 * List comments for a GitHub issue
 */
export async function listGitHubIssueComments(
  config: GitHubConfig,
  issueNumber: number,
  options: { perPage?: number } = {}
): Promise<GitHubIssueComment[]> {
  const { owner, repo } = parseRepo(config);
  const { perPage = 30 } = options;

  try {
    const response = await axios.get<GitHubIssueComment[]>(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        params: { per_page: perPage },
        headers: buildHeaders(config.token),
      }
    );
    return response.data;
  } catch (error) {
    handleGitHubApiError(error);
  }
}

/**
 * Create a new comment on a GitHub issue
 */
export async function createGitHubIssueComment(
  config: GitHubConfig,
  issueNumber: number,
  body: string
): Promise<GitHubIssueComment> {
  const { owner, repo } = parseRepo(config);

  try {
    const response = await axios.post<GitHubIssueComment>(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      { body },
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
