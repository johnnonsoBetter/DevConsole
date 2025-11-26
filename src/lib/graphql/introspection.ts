/**
 * GraphQL Schema Introspection
 * 
 * Handles fetching the complete GraphQL schema via introspection query.
 * This is the foundation for SmartMemory - capturing all schema elements.
 */

import type { GraphQLIntrospectionResult } from './types';

// ============================================================================
// Full Introspection Query
// ============================================================================

/**
 * Complete introspection query that fetches ALL schema elements:
 * - All types (objects, interfaces, unions, enums, input types, scalars)
 * - All fields with their arguments
 * - All directives
 * - Root operation types (Query, Mutation, Subscription)
 */
export const FULL_INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Lightweight introspection for quick schema validation
 */
export const LIGHT_INTROSPECTION_QUERY = `
  query LightIntrospection {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        kind
        name
        description
      }
    }
  }
`;

// ============================================================================
// Introspection Fetcher
// ============================================================================

export interface IntrospectionOptions {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Custom headers (e.g., Authorization) */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Include credentials (cookies) */
  credentials?: RequestCredentials;
}

export interface IntrospectionResult {
  success: boolean;
  data?: GraphQLIntrospectionResult;
  error?: string;
  timing?: {
    startedAt: number;
    completedAt: number;
    durationMs: number;
  };
}

/**
 * Fetch complete schema introspection from a GraphQL endpoint
 */
export async function fetchSchemaIntrospection(
  options: IntrospectionOptions
): Promise<IntrospectionResult> {
  const {
    endpoint,
    headers = {},
    timeout = 30000,
    credentials = 'include',
  } = options;

  const startedAt = Date.now();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query: FULL_INTROSPECTION_QUERY,
        operationName: 'IntrospectionQuery',
      }),
      credentials,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timing: {
          startedAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt,
        },
      };
    }

    const json = await response.json();

    // Check for GraphQL errors
    if (json.errors && json.errors.length > 0) {
      const errorMessages = json.errors
        .map((e: { message: string }) => e.message)
        .join('; ');
      
      // If we have partial data, still return it
      if (json.data?.__schema) {
        return {
          success: true,
          data: json.data as GraphQLIntrospectionResult,
          error: `Partial success with warnings: ${errorMessages}`,
          timing: {
            startedAt,
            completedAt: Date.now(),
            durationMs: Date.now() - startedAt,
          },
        };
      }

      return {
        success: false,
        error: `GraphQL errors: ${errorMessages}`,
        timing: {
          startedAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt,
        },
      };
    }

    // Validate response structure
    if (!json.data?.__schema) {
      return {
        success: false,
        error: 'Invalid introspection response: missing __schema',
        timing: {
          startedAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt,
        },
      };
    }

    return {
      success: true,
      data: json.data as GraphQLIntrospectionResult,
      timing: {
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.name === 'AbortError'
          ? `Request timeout after ${timeout}ms`
          : error.message
        : 'Unknown error during introspection';

    return {
      success: false,
      error: errorMessage,
      timing: {
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

/**
 * Quick check if an endpoint supports introspection
 */
export async function checkIntrospectionSupport(
  endpoint: string,
  headers?: Record<string, string>
): Promise<{ supported: boolean; error?: string }> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query: '{ __schema { queryType { name } } }',
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        supported: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const json = await response.json();

    if (json.errors) {
      // Check for introspection disabled error
      const isDisabled = json.errors.some(
        (e: { message: string }) =>
          e.message.toLowerCase().includes('introspection') &&
          (e.message.toLowerCase().includes('disabled') ||
            e.message.toLowerCase().includes('not allowed'))
      );

      if (isDisabled) {
        return {
          supported: false,
          error: 'Introspection is disabled on this endpoint',
        };
      }

      return {
        supported: false,
        error: json.errors[0]?.message || 'Unknown GraphQL error',
      };
    }

    return {
      supported: !!json.data?.__schema?.queryType,
    };
  } catch (error) {
    return {
      supported: false,
      error: error instanceof Error ? error.message : 'Failed to check endpoint',
    };
  }
}

/**
 * Generate a hash for schema comparison (detect changes)
 */
export function generateSchemaHash(introspectionData: GraphQLIntrospectionResult): string {
  const schema = introspectionData.__schema;
  
  // Create a deterministic string from schema structure
  const typeNames = schema.types
    .filter(t => !t.name.startsWith('__'))
    .map(t => `${t.kind}:${t.name}:${t.fields?.length || 0}:${t.inputFields?.length || 0}`)
    .sort()
    .join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < typeNames.length; i++) {
    const char = typeNames.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}
