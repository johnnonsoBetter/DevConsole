# JSON Sanitizer Utility

## Problem
`react-json-view` throws an error: **"src property must be a valid json object"** when it receives invalid JSON data such as:
- Circular references
- Undefined values
- Functions
- Symbols
- Special objects (Date, RegExp, Error)

## Solution
A comprehensive JSON sanitization utility that safely converts any data into JSON-serializable objects.

## Files Created
- `src/utils/jsonSanitizer.ts` - Core utility functions
- `src/utils/jsonSanitizer.examples.ts` - Usage examples

## API

### `ensureJsonObject(data: any): object`
**Most commonly used** - Ensures data is safe for react-json-view.
```typescript
import { ensureJsonObject } from '@/utils/jsonSanitizer';

const safeData = ensureJsonObject(data);
<ReactJson src={safeData} />
```

### `sanitizeForJson(data: any, maxDepth?: number): any`
Deep sanitization with configurable depth limit (default: 10).
```typescript
const safe = sanitizeForJson(complexData, 5);
```

### `safeJsonStringify(data: any, indent?: number): string`
Safe JSON.stringify with circular reference handling.
```typescript
const jsonString = safeJsonStringify(data);
```

### `isJsonSafe(data: any): boolean`
Check if data can be safely stringified.
```typescript
if (!isJsonSafe(data)) {
  data = sanitizeForJson(data);
}
```

## What It Handles

| Type | Conversion |
|------|------------|
| Circular References | `{ __type: 'circular-reference' }` |
| Undefined | `{ __type: 'undefined' }` |
| Functions | `{ __type: 'function', __name: 'functionName' }` |
| Symbols | `{ __type: 'symbol', __value: 'Symbol(...)' }` |
| Date | `{ __type: 'Date', __value: '2025-01-01T...', __timestamp: ... }` |
| RegExp | `{ __type: 'RegExp', __value: '/pattern/flags' }` |
| Error | `{ __type: 'Error', name: '...', message: '...', stack: '...' }` |
| Max Depth | `{ __type: 'max-depth-reached' }` |

## Usage in DevConsolePanel

The `LazyReactJson` component now automatically uses `ensureJsonObject`:

```typescript
const LazyReactJson = memo(({ data, isDarkMode, name }) => {
  const safeData = useMemo(() => ensureJsonObject(data), [data]);
  return <ReactJson src={safeData} ... />;
});
```

## Example: Before & After

### Before (Error)
```typescript
const circularObj = { name: 'John' };
circularObj.self = circularObj;

<ReactJson src={circularObj} /> // ❌ Error!
```

### After (Works)
```typescript
const circularObj = { name: 'John' };
circularObj.self = circularObj;
const safe = ensureJsonObject(circularObj);

<ReactJson src={safe} /> // ✅ Works!
// Displays: { name: 'John', self: { __type: 'circular-reference' } }
```

## Benefits

✅ **Zero Errors** - Never crashes on invalid JSON  
✅ **Informative** - Shows type information for non-JSON values  
✅ **Circular Safe** - Handles circular references gracefully  
✅ **Deep Protection** - Prevents infinite recursion with max depth  
✅ **Type Aware** - Preserves structure while marking special types  
✅ **Performance** - Memoized in components for efficiency

## Import Options

```typescript
// Direct import
import { ensureJsonObject } from '@/utils/jsonSanitizer';

// Or from index
import { ensureJsonObject } from '@/utils';
```

## See Also
- `src/utils/jsonSanitizer.examples.ts` - Comprehensive usage examples
- `src/components/DevConsole/DevConsolePanel.tsx` - Real-world implementation
