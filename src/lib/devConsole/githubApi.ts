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

export interface GitHubIssueResponse {
  html_url: string;
  number: number;
  title: string;
  state: string;
}

/**
 * Create a GitHub issue
 */
export async function createGitHubIssue(
  config: GitHubConfig,
  params: CreateIssueParams
): Promise<GitHubIssueResponse> {
  const [owner, repo] = config.repo.split('/');

  if (!owner || !repo) {
    throw new Error('Invalid repository format. Expected: owner/repo');
  }

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
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const errors = error.response?.data?.errors;

      // Log detailed error for debugging
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
        // Validation error - provide more details
        const errorDetails = errors
          ? errors.map((e: any) => e.message || e.code).join(', ')
          : 'Invalid data';
        throw new Error(`Validation Failed: ${errorDetails}. ${message}`);
      } else {
        throw new Error(`GitHub API error: ${message}`);
      }
    }
    throw error;
  }
}

/**
 * Test GitHub credentials
 */
export async function testGitHubConnection(
  config: GitHubConfig
): Promise<{ valid: boolean; error?: string }> {
  const [owner, repo] = config.repo.split('/');

  if (!owner || !repo) {
    return { valid: false, error: 'Invalid repository format' };
  }

  try {
    await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
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
