# Content Script Optimizations

## Overview
Enhanced the message batching and relay system in `src/content/index.ts` with advanced optimization features for better performance, reliability, and security.

## Implemented Optimizations

### 1. Message Size Estimation
**Purpose**: Prevent oversized batches that could fail or cause memory issues

**Implementation**:
- Added `MAX_BATCH_BYTES = 512000` (500KB) limit per batch
- `estimateMessageSize()` function calculates approximate UTF-16 byte size
- Batch construction now respects both count (`MAX_BATCH_SIZE`) and size limits
- Early flush triggered when size threshold reached

**Benefits**:
- Prevents Chrome extension message size limit errors
- Reduces memory pressure on service worker
- More predictable network payload sizes

### 2. Enhanced Privacy Redaction
**Purpose**: Protect sensitive data from being captured in logs and network requests

**Improvements**:
- **Expanded field pattern detection**:
  - Original: `pass|pwd|token|secret|auth|cookie|authorization|ssn|credit|api[_-]?key`
  - Enhanced: Added `bearer`, `private_key`, `access_key`, `client_secret`, `session`, `cvv`, `pin`, `account_number`, `routing_number`, etc.

- **Value-based detection**: New patterns catch sensitive values regardless of key name:
  - Long alphanumeric strings (20+ chars) → likely tokens
  - Stripe-like secret keys (`sk_*`)
  - JWT tokens (standard format)
  - GitHub personal access tokens (`ghp_*`)
  - Slack tokens (`xox[bp]-*`)

- **Header redaction**: New `redactSensitiveHeaders()` function for HTTP headers:
  - `Authorization`, `Cookie`, `Set-Cookie`
  - `X-API-Key`, `X-Auth-Token`, `X-CSRF-Token`, etc.

- **Depth limiting**: Prevents infinite recursion (max depth: 10 levels)

**Benefits**:
- Comprehensive privacy protection
- Catches more edge cases (value-based detection)
- Prevents accidental sensitive data leaks
- Complies with data protection best practices

### 3. Retry Logic with Exponential Backoff
**Purpose**: Handle transient failures and improve message delivery reliability

**Implementation**:
- `MAX_RETRY_ATTEMPTS = 3` retries per batch
- `RETRY_BASE_DELAY = 100ms` starting delay
- Exponential backoff: 100ms → 200ms → 400ms
- Async `sendMessageWithRetry()` function with Promise-based retry chain
- Failed high-priority messages re-queued (up to 10 messages)

**Benefits**:
- Handles temporary network/context issues gracefully
- Reduces message loss during extension reloads
- Prioritizes error preservation
- Non-blocking (async, doesn't hold up message collection)

### 4. Priority Batching for Errors
**Purpose**: Ensure critical error messages are sent faster than routine logs

**Implementation**:
- Messages tagged with priority: `"high"` (errors/warnings) or `"normal"`
- `PRIORITY_BATCH_THRESHOLD = 5` → flush immediately with 5+ high-priority messages
- Priority sorting before sending (high-priority first)
- Size-aware batching respects priority order
- Failed high-priority messages re-queued on retry exhaustion

**Behavior**:
- Error logs sent within ~120ms or immediately if threshold met
- Normal logs batched for efficiency
- BeforeUnload prioritizes high-priority messages
- Maintains chronological order within priority levels

**Benefits**:
- Critical errors captured before page navigation
- Developers see errors faster
- Better debugging experience for crashes/failures
- Reduced latency for actionable messages

## Performance Characteristics

### Batch Timing
- **Normal batching**: 120ms collection window
- **Priority flush**: Immediate (when 5+ errors or 500KB reached)
- **BeforeUnload**: Synchronous immediate flush (priority-sorted)

### Memory Management
- **Per-message limit**: ~1MB (enforced in page-hook-logic.ts)
- **Per-batch limit**: 500KB (prevents oversized batches)
- **Total capture limit**: 50MB (enforced in page-hook-logic.ts)
- **Buffer state tracking**: `currentBatchSize` tracks approximate memory usage

### Retry Strategy
```
Attempt 1: Immediate
Attempt 2: +100ms delay
Attempt 3: +200ms delay
Attempt 4: +400ms delay
Total max: ~700ms before giving up
```

## Configuration Constants

```typescript
const BATCH_INTERVAL_MS = 120;           // Batch collection window
const MAX_BATCH_SIZE = 1000;             // Max messages per batch
const MAX_BATCH_BYTES = 512000;          // 500KB max per batch
const MAX_RETRY_ATTEMPTS = 3;            // Retry attempts
const RETRY_BASE_DELAY = 100;            // Base exponential backoff delay
const PRIORITY_BATCH_THRESHOLD = 5;      // Priority flush trigger
```

## Data Structures

### PriorityMessage Interface
```typescript
interface PriorityMessage {
  message: any;                // Transformed DevConsole message
  priority: "high" | "normal"; // Message priority
  retries: number;             // Failed send attempts
}
```

### Enhanced Redaction Patterns

**Sensitive field names** (case-insensitive):
```regex
/pass(word)?|pwd|token|secret|auth|cookie|authorization|bearer|
 api[_-]?key|private[_-]?key|access[_-]?key|client[_-]?secret|
 session|ssn|social[_-]?security|credit[_-]?card|card[_-]?number|
 cvv|pin|account[_-]?number|routing[_-]?number/i
```

**Sensitive value patterns**:
```typescript
/^[A-Za-z0-9_-]{20,}$/                          // Long tokens
/^sk_[a-z]+_[A-Za-z0-9]{20,}$/                  // Stripe keys
/^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/  // JWT
/^ghp_[A-Za-z0-9]{36}$/                          // GitHub PAT
/^xox[bp]-[A-Za-z0-9-]+$/                       // Slack tokens
```

**Sensitive headers** (case-insensitive):
```typescript
authorization, cookie, set-cookie, x-api-key, x-auth-token,
x-csrf-token, x-access-token, api-key, apikey, auth-token
```

## Testing Recommendations

### Manual Validation
1. **Size limits**: Generate large log entries (>500KB) → verify batching splits correctly
2. **Priority flushing**: Log 5+ errors rapidly → verify immediate send
3. **Retry logic**: Reload extension while logging → verify retries and re-queuing
4. **Redaction**: Log objects with tokens/passwords → verify `[REDACTED]` output
5. **BeforeUnload**: Navigate away while logging → verify high-priority preservation

### Performance Testing
```javascript
// Test batch size limiting
for (let i = 0; i < 100; i++) {
  console.log({
    test: 'size-limit',
    data: 'x'.repeat(10000),
    index: i
  });
}

// Test priority flushing
for (let i = 0; i < 10; i++) {
  console.error('Critical error', i);
}

// Test retry logic (disable network, then re-enable)
console.error('Test retry behavior');
```

### Security Testing
```javascript
// Verify redaction works
console.log({
  password: 'secret123',
  apiKey: 'sk_live_abcdef123456789',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  userToken: 'ghp_1234567890123456789012345678901234',
  normalField: 'this should NOT be redacted'
});

// Verify header redaction
fetch('/api/test', {
  headers: {
    'Authorization': 'Bearer secret-token',
    'X-API-Key': 'api-key-12345',
    'Content-Type': 'application/json'
  }
});
```

## Migration Notes

### Breaking Changes
None - all changes are backward compatible.

### Behavioral Changes
- **Faster error delivery**: Errors now sent more aggressively (may appear sooner in DevConsole)
- **Better privacy**: More fields/values redacted (may see more `[REDACTED]` in captures)
- **Retry attempts**: Failed sends now retry up to 3 times (may see brief delays on network issues)

### Configuration Tuning
Adjust constants if needed:
- Increase `PRIORITY_BATCH_THRESHOLD` for less aggressive priority flushing
- Increase `MAX_BATCH_BYTES` if comfortable with larger batches
- Adjust `RETRY_BASE_DELAY` for different retry timing characteristics

## Future Enhancements

### Potential Improvements
1. **Dynamic batch sizing**: Adjust batch size based on network conditions
2. **Compression**: Gzip batches before sending for bandwidth savings
3. **Persistent queue**: Use IndexedDB to survive extension restarts
4. **Telemetry**: Track batch sizes, retry rates, redaction counts
5. **Configurable priorities**: User-defined priority rules in settings
6. **Smart throttling**: Adaptive rate limiting during high-volume logging

### Monitoring Opportunities
- Message loss rate (retry exhaustion)
- Average batch size (bytes and count)
- Priority vs normal message ratio
- Redaction frequency
- Retry attempt distribution

## Related Files
- `src/content/index.ts` - Main content script with optimizations
- `src/content/page-hook-logic.ts` - Page-context injection (message size limits)
- `src/background/service-worker.ts` - Receives batched messages
- `src/core/messaging/types.ts` - Message type definitions

## References
- Chrome Extension messaging limits: https://developer.chrome.com/docs/extensions/mv3/messaging/
- Exponential backoff best practices: https://en.wikipedia.org/wiki/Exponential_backoff
- Data privacy patterns: OWASP Security Guidelines
