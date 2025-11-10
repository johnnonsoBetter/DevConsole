/**
 * ClickableStackTrace Component
 * Parses and displays stack traces with formatted output
 * Highlights user code vs library/framework code
 */

import { useCallback } from 'react';
import { cn } from '../../../utils';

interface ClickableStackTraceProps {
  stack: string;
}

export function ClickableStackTrace({ stack }: ClickableStackTraceProps) {
  const lines = stack.split('\n');

  /**
   * Parse a single stack trace line
   * Extracts function name, file path, line and column numbers
   * @returns Parsed stack info or null if line doesn't match pattern
   */
  const parseStackLine = useCallback((line: string) => {
    // Match: at functionName (http://localhost:8912/path/to/file.ts:line:col)
    const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
    if (!match) return null;

    const [, functionName, filePath, lineNum, colNum] = match;
    return {
      functionName: functionName?.trim() || 'anonymous',
      filePath,
      line: parseInt(lineNum, 10),
      column: parseInt(colNum, 10),
      isUserCode:
        !filePath.includes('node_modules') &&
        !filePath.includes('vite') &&
        !filePath.includes('@fs'),
    };
  }, []);

  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const parsed = parseStackLine(line);

        if (!parsed) {
          return (
            <div key={index} className="text-xs font-mono text-gray-700 dark:text-gray-300">
              {line}
            </div>
          );
        }

        const fileName = parsed.filePath.split('/').pop()?.split('?')[0] || parsed.filePath;
        const isClickable = parsed.isUserCode;

        return (
          <div
            key={index}
            className={cn(
              'text-xs font-mono flex items-start gap-2 py-0.5',
              isClickable && 'hover:bg-primary/5 rounded px-1 -mx-1'
            )}
          >
            <span className="text-gray-500 dark:text-gray-400">at</span>
            <span className="text-gray-700 dark:text-gray-300">{parsed.functionName}</span>

            <span className="text-gray-500 dark:text-gray-400">
              {fileName}:{parsed.line}:{parsed.column}
            </span>
          </div>
        );
      })}
    </div>
  );
}
