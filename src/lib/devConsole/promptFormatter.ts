/**
 * AI Prompt Formatter
 * Converts log entries into optimized AI prompts
 */

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: number;
  args?: any[];
  stack?: string;
  source?: string;
  count?: number;
}

/**
 * Format a log entry into an AI-ready prompt
 */
export function formatLogAsAIPrompt(log: LogEntry): string {
  const timestamp = new Date(log.timestamp).toLocaleString();

  let prompt = `# Debug Assistance Request

## Error Overview
**Severity:** ${log.level.toUpperCase()}
**Timestamp:** ${timestamp}
**Occurrence Count:** ${log.count || 1}

## Error Message
\`\`\`
${log.message}
\`\`\`
`;

  // Add stack trace if available
  if (log.stack) {
    prompt += `\n## Stack Trace
\`\`\`
${log.stack}
\`\`\`
`;
  }

  // Add arguments if available
  if (log.args && log.args.length > 0) {
    prompt += `\n## Additional Context
\`\`\`json
${JSON.stringify(log.args, null, 2)}
\`\`\`
`;
  }

  // Add source if available
  if (log.source) {
    prompt += `\n## Source Location
\`\`\`
${log.source}
\`\`\`
`;
  }

  // Add request section
  prompt += `\n## What I Need Help With

Please analyze this error and provide:

1. **Root Cause Analysis**
   - What is causing this error?
   - Why is it happening?

2. **Impact Assessment**
   - How critical is this issue?
   - What functionality is affected?

3. **Solution**
   - Step-by-step fix instructions
   - Code examples if applicable
   - Best practices to prevent this in the future

4. **Testing**
   - How to verify the fix works
   - Edge cases to consider

## Additional Information
- Browser: ${navigator.userAgent}
`;

  return prompt;
}

/**
 * Format log as a concise AI prompt (shorter version)
 */
export function formatLogAsCompactPrompt(log: LogEntry): string {
  let prompt = `I'm getting this ${log.level} in my app:\n\n`;

  prompt += `Error: ${log.message}\n\n`;

  if (log.stack) {
    const stackLines = log.stack.split('\n').slice(0, 5).join('\n');
    prompt += `Stack trace:\n${stackLines}\n\n`;
  }

  prompt += `How do I fix this?`;

  return prompt;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback method
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      return false;
    }
  }
}
