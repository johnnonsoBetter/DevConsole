/**
 * JSON Sanitizer Usage Examples
 * 
 * This file demonstrates how to use the JSON sanitizer utilities
 * to safely handle data for react-json-view and other JSON displays.
 */

import {
    ensureJsonObject,
    isJsonSafe,
    safeJsonStringify,
    sanitizeForJson
} from '../utils/jsonSanitizer';

// ============================================================================
// EXAMPLE 1: Handling Circular References
// ============================================================================

const circularObj: any = { name: 'John' };
circularObj.self = circularObj; // Creates circular reference

// ❌ This would throw an error:
// JSON.stringify(circularObj); // Error: Converting circular structure to JSON

// ✅ Safe approach:
const safeCircular = sanitizeForJson(circularObj);
console.log(safeCircular);
// Output: { name: 'John', self: { __type: 'circular-reference' } }

// ============================================================================
// EXAMPLE 2: Handling Undefined and Null
// ============================================================================

const dataWithUndefined = {
  name: 'John',
  age: undefined,
  address: null,
};

const safe = ensureJsonObject(dataWithUndefined);
console.log(safe);
// Output: { name: 'John', age: { __type: 'undefined' }, address: null }

// ============================================================================
// EXAMPLE 3: Handling Functions and Symbols
// ============================================================================

const objectWithFunctions = {
  name: 'Calculator',
  add: function add(a: number, b: number) { return a + b; },
  symbol: Symbol('unique'),
};

const safeFunctions = sanitizeForJson(objectWithFunctions);
console.log(safeFunctions);
// Output: { 
//   name: 'Calculator', 
//   add: { __type: 'function', __name: 'add' },
//   symbol: { __type: 'symbol', __value: 'Symbol(unique)' }
// }

// ============================================================================
// EXAMPLE 4: Handling Dates and Special Objects
// ============================================================================

const dataWithDates = {
  createdAt: new Date('2025-01-01'),
  pattern: /[a-z]+/gi,
  error: new Error('Something went wrong'),
};

const safeDates = sanitizeForJson(dataWithDates);
console.log(safeDates);
// Output: {
//   createdAt: { __type: 'Date', __value: '2025-01-01T00:00:00.000Z', __timestamp: ... },
//   pattern: { __type: 'RegExp', __value: '/[a-z]+/gi' },
//   error: { __type: 'Error', name: 'Error', message: 'Something went wrong', stack: '...' }
// }

// ============================================================================
// EXAMPLE 5: Safe Stringify
// ============================================================================

const complexData = {
  name: 'Test',
  circular: circularObj,
  func: () => 'hello',
};

// ✅ Safe stringify:
const jsonString = safeJsonStringify(complexData);
console.log(jsonString);

// ============================================================================
// EXAMPLE 6: Check if data is JSON-safe
// ============================================================================

console.log(isJsonSafe({ name: 'John' })); // true
console.log(isJsonSafe(circularObj)); // false
console.log(isJsonSafe({ func: () => {} })); // false

// ============================================================================
// EXAMPLE 7: Using with React Json View
// ============================================================================

/**
 * Example React component (see DevConsolePanel.tsx for actual implementation)
 * 
 * import ReactJson from '@microlink/react-json-view';
 * 
 * function SafeJsonDisplay({ data }: { data: any }) {
 *   const safeData = ensureJsonObject(data);
 *   
 *   return (
 *     <ReactJson
 *       src={safeData}
 *       theme="monokai"
 *       collapsed={1}
 *       displayDataTypes={false}
 *       enableClipboard={true}
 *     />
 *   );
 * }
 */

// ============================================================================
// EXAMPLE 8: Handling Deep Nesting
// ============================================================================

const deeplyNested = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      level11: 'too deep'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const safeDeep = sanitizeForJson(deeplyNested, 5); // Max depth of 5
console.log(safeDeep);
// After level 5, you'll see: { __type: 'max-depth-reached' }
