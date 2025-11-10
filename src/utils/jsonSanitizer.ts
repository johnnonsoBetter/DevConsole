/**
 * JSON Sanitizer Utility
 * Safely converts any data into a valid JSON-serializable object
 * for use with react-json-view and other JSON display components
 */

/**
 * Sanitizes data to be safe for JSON serialization
 * Handles circular references, undefined values, functions, and other non-JSON types
 */
export function sanitizeForJson(data: any, maxDepth = 10, currentDepth = 0): any {
  // Handle primitives and null
  if (data === null) return null;
  if (data === undefined) return { __type: 'undefined' };
  
  const type = typeof data;
  
  // Primitives that are JSON-safe
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return data;
  }
  
  // Handle functions
  if (type === 'function') {
    return { __type: 'function', __name: data.name || 'anonymous' };
  }
  
  // Handle symbols
  if (type === 'symbol') {
    return { __type: 'symbol', __value: data.toString() };
  }
  
  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return { __type: 'max-depth-reached' };
  }
  
  // Handle dates
  if (data instanceof Date) {
    return {
      __type: 'Date',
      __value: data.toISOString(),
      __timestamp: data.getTime()
    };
  }
  
  // Handle RegExp
  if (data instanceof RegExp) {
    return { __type: 'RegExp', __value: data.toString() };
  }
  
  // Handle Error objects
  if (data instanceof Error) {
    return {
      __type: 'Error',
      name: data.name,
      message: data.message,
      stack: data.stack
    };
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForJson(item, maxDepth, currentDepth + 1));
  }
  
  // Handle objects (including circular references)
  if (type === 'object') {
    const seen = new WeakSet();
    
    const sanitizeObject = (obj: any, depth: number): any => {
      // Check for circular reference
      if (seen.has(obj)) {
        return { __type: 'circular-reference' };
      }
      
      seen.add(obj);
      
      // Prevent too deep nesting
      if (depth >= maxDepth) {
        return { __type: 'max-depth-reached' };
      }
      
      const result: Record<string, any> = {};
      
      try {
        // Get all enumerable properties
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            try {
              const value = obj[key];
              result[key] = sanitizeForJson(value, maxDepth, depth + 1);
            } catch (error) {
              result[key] = { __type: 'error-reading-property', __error: String(error) };
            }
          }
        }
      } catch (error) {
        return { __type: 'error-iterating-object', __error: String(error) };
      }
      
      return result;
    };
    
    return sanitizeObject(data, currentDepth);
  }
  
  // Fallback for unknown types
  return { __type: 'unknown', __value: String(data) };
}

/**
 * Ensures data is a valid object for react-json-view
 * Returns a safe default if data is invalid
 */
export function ensureJsonObject(data: any): object {
  // If data is null or undefined, return empty object
  if (data == null) {
    return {};
  }
  
  // If already a plain object or array, sanitize it
  if (typeof data === 'object') {
    try {
      return sanitizeForJson(data);
    } catch (error) {
      return {
        __error: 'Failed to sanitize data',
        __message: String(error),
        __originalType: typeof data
      };
    }
  }
  
  // For primitives, wrap them in an object
  return {
    value: data,
    __type: typeof data
  };
}

/**
 * Safe JSON stringify with circular reference handling
 */
export function safeJsonStringify(data: any, indent = 2): string {
  try {
    const sanitized = sanitizeForJson(data);
    return JSON.stringify(sanitized, null, indent);
  } catch (error) {
    return JSON.stringify({
      __error: 'Failed to stringify',
      __message: String(error)
    }, null, indent);
  }
}

/**
 * Check if data is safe for JSON serialization
 */
export function isJsonSafe(data: any): boolean {
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}
