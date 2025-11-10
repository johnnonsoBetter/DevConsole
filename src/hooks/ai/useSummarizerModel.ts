/**
 * useSummarizerModel
 *
 * React hook that wraps the Chrome Summarizer API to power
 * AI-assisted log analysis and text summarization in DevConsole.
 *
 * Responsibilities:
 * - Track Summarizer API availability/download status
 * - Expose helpers for creating Summarizer sessions
 * - Provide higher-level helpers for analyzing logs and errors
 */

import { useCallback, useEffect, useState } from 'react';
import { AIModel, useChromeAI } from '../useChromeAI';

export type SummarizerAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface SummarizerOptions {
  type?: 'tldr' | 'teaser' | 'key-points' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
}

export interface ErrorSummary {
  summary: string;
  possibleCauses: string[];
  suggestedFixes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function useSummarizerModel({
  logMessage,
  logLevel,
  stackTrace,
  additionalContext,
}: {
  logMessage?: string;
  logLevel?: string;
  stackTrace?: string;
  additionalContext?: string;
} = {}) {
  const [summarizing, setSummarizing] = useState<boolean>(false);
  const [summarizeError, setSummarizeError] = useState<Error | null>(null);
  const [summarizeData, setSummarizeData] = useState<string | null>(null);
  const {
    availability,
    downloadProgress: progress,
    checkAvailability,
    error,
    createSummarizeSession,
  } = useChromeAI(AIModel.SUMMARIZER);

  // Auto-analyze when log details change
  useEffect(() => {
    if (!logMessage || !logLevel || availability !== 'available') {
      return;
    }

    const analyze = async () => {
      // Determine summarizer context based on log level
      let sharedContext =
        'This is a log entry from a JavaScript web application. Provide clear, actionable insights.';
      let summarizerType: SummarizerOptions['type'] = 'key-points';

      if (logLevel.toLowerCase() === 'error') {
        sharedContext =
          'This is an error from a JavaScript web application. Explain what caused it and how to fix it.';
        summarizerType = 'key-points';
      } else if (logLevel.toLowerCase() === 'warn') {
        sharedContext =
          'This is a warning from a JavaScript web application. Explain potential implications and whether action is needed.';
        summarizerType = 'key-points';
      }

      // Build comprehensive context
      let fullContext = `Log Level: ${logLevel}\nLog Message: ${logMessage}`;

      if (stackTrace) {
        const stackLines = stackTrace.split('\n').slice(0, 3).join('\n');
        fullContext += `\n\nStack Trace Preview:\n${stackLines}`;
      }

      if (additionalContext) {
        fullContext += `\n\nAdditional Context: ${additionalContext}`;
      }

      try {
        setSummarizeError(null);
        setSummarizeData(null);
        
        let analysisPrompt =
          'Analyze this log entry and explain what it means, what might have triggered it, and any relevant insights. Be specific and practical.';

        if (logLevel.toLowerCase() === 'error') {
          analysisPrompt =
            'Analyze this error log and explain what it means, what might have caused it, and how to fix it. Be specific and practical.';
        } else if (logLevel.toLowerCase() === 'warn') {
          analysisPrompt =
            'Analyze this warning log and explain what it means, potential implications, and whether action is needed. Be specific and practical.';
        }

        setSummarizing(true);
        const session = await createSummarizeSession({
          type: summarizerType,
          length: 'medium',
          format: 'markdown',
          sharedContext,
        });

        const result = await session.summarize(analysisPrompt + '\n\n' + fullContext, {
          context: fullContext,
        });
        
        setSummarizeData(result);
      } catch (err) {
        console.error('Failed to analyze log:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setSummarizeError(error);
      } finally {
        setSummarizing(false);
      }
    };

    analyze();
  }, [logMessage, logLevel, stackTrace, additionalContext, availability, createSummarizeSession]);

  const summarizeNetworkChain = useCallback(async (
    networkRequests: Array<{ url: string; method: string; status: number; duration: number }>
  ) => {
    try {
      setSummarizeError(null);
      setSummarizeData(null);
      setSummarizing(true);
      
      const requestSummary = networkRequests
        .map((req, idx) => `${idx + 1}. ${req.method} ${req.url} - Status: ${req.status}, Duration: ${req.duration}ms`)
        .join('\n');

      const session = await createSummarizeSession({
        type: 'key-points',
        length: 'medium',
        format: 'markdown',
        sharedContext: 'This is a network request chain from a web application. Identify patterns, issues, and performance concerns.',
      });

      const result = await session.summarize(
        `Analyze this network request chain:\n\n${requestSummary}`,
        { context: 'Network performance analysis' }
      );

      setSummarizeData(result);
      return result;
    } catch (err) {
      console.error('Failed to summarize network chain:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setSummarizeError(error);
      throw err;
    } finally {
      setSummarizing(false);
    }
  }, [createSummarizeSession]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Compute derived states
  const isAvailable = availability === 'available';
  const isDownloading = availability === 'downloading';
  const isDownloadRequired = availability === 'downloadable';

  return {
    availability,
    isAvailable,
    isDownloading,
    isDownloadRequired,
    downloadProgress: progress,
    error,
    summarizeNetworkChain,
    checkAvailability,
    summarizing,
    summarizeData,
    summarizeError,
  };
}
