/**
 * GraphQL Settings Storage Utility
 * Manages GraphQL endpoint configuration for Chrome Extension
 */

const STORAGE_KEY = 'devconsole_graphql_settings';

export interface GraphQLSettings {
  endpoint: string;
}

/**
 * Save GraphQL settings to chrome.storage.local
 */
export async function saveGraphQLSettings(settings: GraphQLSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error('Failed to save GraphQL settings:', error);
    throw new Error('Failed to save GraphQL settings');
  }
}

/**
 * Load GraphQL settings from chrome.storage.local
 */
export async function loadGraphQLSettings(): Promise<GraphQLSettings | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  } catch (error) {
    console.error('Failed to load GraphQL settings:', error);
    return null;
  }
}

/**
 * Clear GraphQL settings from chrome.storage.local
 */
export async function clearGraphQLSettings(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear GraphQL settings:', error);
  }
}

/**
 * Validate GraphQL endpoint
 */
export function validateGraphQLEndpoint(endpoint: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!endpoint?.trim()) {
    errors.push('GraphQL endpoint URL is required');
    return { valid: false, errors };
  }

  const trimmed = endpoint.trim();

  // Basic URL validation
  try {
    // If it's a relative URL, validate it starts with /
    if (trimmed.startsWith('/')) {
      if (trimmed.length < 2) {
        errors.push('Endpoint path is too short');
      }
    } else {
      // Try to parse as absolute URL
      const url = new URL(trimmed);
      if (!url.protocol.match(/^https?:$/)) {
        errors.push('Endpoint must use HTTP or HTTPS protocol');
      }
    }
  } catch (error) {
    errors.push('Invalid URL format. Use absolute URL (https://...) or relative path (/graphql)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Test GraphQL endpoint connection
 */
export async function testGraphQLConnection(endpoint: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    // Check if response looks like a GraphQL response
    if (data.errors && !data.data) {
      return {
        valid: false,
        error: data.errors[0]?.message || 'GraphQL endpoint returned errors',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to connect to endpoint',
    };
  }
}
