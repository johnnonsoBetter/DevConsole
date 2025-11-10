/**
 * useChromeAI
 *
 * Unified hook for managing Chrome Built-in AI APIs.
 * One hook to rule them all.
 *
 * Pass the desired AIModel to get availability checks and session creation
 * for that specific model.
 *
 * Usage:
 * const { availability, checkAvailability, createSession } = useChromeAI(AIModel.SUMMARIZER);
 */

import { useCallback, useState } from 'react';

export enum AIModel {
  SUMMARIZER = 'Summarizer',
  TRANSLATOR = 'Translator',
  LANGUAGE_DETECTOR = 'LanguageDetector',
  PROMPT = 'Prompt',
  LANGUAGE_MODEL = 'LanguageModel',
}

export type AIAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface AIModelStatus {
  availability: AIAvailability;
  downloadProgress: number;
  error: string | null;
}

export interface SummarizerOptions {
  type?: 'tldr' | 'teaser' | 'key-points' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
}

export interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

export interface PromptOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
}

const initialModelStatus: AIModelStatus = {
  availability: 'unavailable',
  downloadProgress: 0,
  error: null,
};

export function useChromeAI(model: AIModel, options?: TranslatorOptions) {
  const [availability, setAvailability] = useState<AIAvailability>(initialModelStatus.availability);
  const [downloadProgress, setDownloadProgress] = useState<number>(
    initialModelStatus.downloadProgress
  );
  const [error, setError] = useState<string | null>(initialModelStatus.error);

  // Download progress handler
  const handleDownloadProgress = useCallback((loaded: number) => {
    const progress = Math.round(loaded * 100);
    setDownloadProgress(progress);
    setAvailability(progress < 100 ? 'downloading' : 'available');
  }, []);

  const getAvailability: () => Promise<AIAvailability> = async () => {
    if (model === AIModel.TRANSLATOR)
      return await (self as any)[model].availability({
        sourceLanguage: options?.sourceLanguage || 'en',
        targetLanguage: options?.targetLanguage || 'es',
      });
    else return await (self as any)[model].availability();
  };

  // ============================================================================
  // SUMMARIZER API
  // ============================================================================

  const createSummarizeSession = useCallback(
    async (options: {
      sharedContext: string;
      type: string;
      format: string;
      length: 'short' | 'medium' | 'long';
    }) => {
      const session = await (self as any)[model].create({
        ...options,
        monitor: (m: any) => {
          m.addEventListener('downloadprogress', (e: any) => {
            handleDownloadProgress(e.loaded / e.total);
          });
        },
      });

      return session;
    },
    []
  );
  const checkAvailability = useCallback(async (): Promise<AIAvailability> => {
    if (!(`${model}` in (self as any))) {
      return 'unavailable';
    }

    try {
      const status = await getAvailability();
      return status;
    } catch (err) {
      console.error('Summarizer API error:', err);
      const error = err instanceof Error ? err.message : 'Summarizer API not available';
      setError(error);
      return 'unavailable';
    }
  }, [setError, model]);

  const createSession = useCallback(
    async (options?: TranslatorOptions) => {
      const availability = await getAvailability();

      if (availability === 'unavailable') {
        throw new Error(
          `Translator not available for ${options?.sourceLanguage} → ${options?.targetLanguage}`
        );
      }

      try {
        const session = await (self as any)[model].create({
          monitor: (m: any) => {
            m.addEventListener('downloadprogress', (e: any) => {
              handleDownloadProgress(e.loaded / e.total);
            });
          },
        });

        return session;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to create translator';
        setError(error);
        throw err;
      }
    },
    [, handleDownloadProgress, model]
  );

  return {
    availability,
    downloadProgress,
    isLoading: availability === 'downloading',
    error,
    checkAvailability,
    createSession,
    createSummarizeSession,
  };
}
