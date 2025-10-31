/**
 * useAI Hook
 * Custom hook for managing AI features in DevConsole
 */

import { useState, useEffect, useCallback } from 'react';
import { aiService, getBrowserSupport } from '../lib/devConsole/aiService';
import type { AIAvailability } from '../lib/devConsole/aiService';

interface UseAIOptions {
  autoCheck?: boolean;
  onDownloadProgress?: (progress: number) => void;
}

interface UseAIReturn {
  availability: AIAvailability;
  isLoading: boolean;
  error: string | null;
  summary: string | null;
  downloadProgress: number;
  browserSupport: ReturnType<typeof getBrowserSupport>;
  checkAvailability: () => Promise<AIAvailability | undefined>;
  analyzeLog: (logMessage: string, logLevel: string, stackTrace?: string, context?: string) => Promise<void>;
  summarizeError: (errorMessage: string, stackTrace?: string, context?: string) => Promise<void>; // Deprecated, kept for backward compatibility
  activateAI: () => Promise<void>;
  reset: () => void;
}

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const { autoCheck = true, onDownloadProgress } = options;

  const [availability, setAvailability] = useState<AIAvailability>('unavailable');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [browserSupport] = useState(() => getBrowserSupport());

  // Check AI availability
  const checkAvailability = useCallback(async () => {
    try {
      const status = await aiService.checkAvailability();
      setAvailability(status);
      return status;
    } catch (err) {
      console.error('Failed to check AI availability:', err);
      setAvailability('unavailable');
    }
  }, []);

  // Auto-check availability on mount
  useEffect(() => {
    if (autoCheck && browserSupport.isSupported) {
      checkAvailability();
    }
  }, [autoCheck, browserSupport.isSupported, checkAvailability]);

  // Set up download progress callback
  useEffect(() => {
    const handleProgress = (progress: number) => {
      setDownloadProgress(progress);

      // Only set to downloading if progress is less than 100%
      if (progress < 100) {
        setAvailability('downloading');
      } else if (progress === 100) {
        // Download completed, re-check availability
        checkAvailability();
      }

      onDownloadProgress?.(progress);
    };

    aiService.setDownloadProgressCallback(handleProgress);
  }, [onDownloadProgress, checkAvailability]);

  // Analyze log with AI
  const analyzeLog = useCallback(async (
    logMessage: string,
    logLevel: string,
    stackTrace?: string,
    context?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const result = await aiService.analyzeLog(logMessage, logLevel, stackTrace, context);
      setSummary(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze log';
      setError(errorMessage);
      setSummary(null);
      console.error('AI log analysis failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Summarize error with AI (deprecated - kept for backward compatibility)
  const summarizeError = useCallback(async (
    errorMessage: string,
    stackTrace?: string,
    context?: string
  ) => {
    return analyzeLog(errorMessage, 'error', stackTrace, context);
  }, [analyzeLog]);

  // Activate AI (first-time use)
  const activateAI = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check availability first
      const status = await aiService.checkAvailability();
      setAvailability(status);

      if (status === 'available') {
        setError(null);
      } else if (status === 'downloading') {
        setError('AI model is downloading. Please wait...');
      } else {
        setError('AI is not available. Please check your browser and system requirements.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate AI';
      setError(errorMessage);
      console.error('AI activation failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSummary(null);
  }, []);

  return {
    availability,
    isLoading,
    error,
    summary,
    downloadProgress,
    browserSupport,
    checkAvailability,
    analyzeLog,
    summarizeError,
    activateAI,
    reset
  };
}
