/**
 * useTranslatorModel
 *
 * React hook that wraps the Chrome Translator API to power
 * on-device translation in DevConsole.
 *
 * Responsibilities:
 * - Track Translator API availability/download status for language pairs
 * - Expose helpers for creating Translator sessions
 * - Provide translation capabilities between languages
 */

import { useCallback, useEffect, useState } from "react";

export type TranslatorAvailability =
  | "unknown"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

export interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

type TranslatorSession = {
  translate: (text: string) => Promise<string>;
  destroy?: () => void;
};

export function useTranslatorModel() {
  const [availability, setAvailability] = useState<TranslatorAvailability>("unknown");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguagePair, setCurrentLanguagePair] = useState<TranslatorOptions | null>(null);

  const mapAvailability = useCallback((status: string): TranslatorAvailability => {
    switch (status) {
      case "ready":
      case "available":
      case "readily":
        return "available";
      case "after-download":
      case "downloadable":
        return "downloadable";
      case "downloading":
        return "downloading";
      default:
        return "unavailable";
    }
  }, []);

  const handleDownloadProgress = useCallback((loaded: number) => {
    const pct = Math.round(loaded * 100);
    setProgress(pct);
    if (pct < 100) {
      setAvailability("downloading");
    } else {
      setAvailability("available");
    }
  }, []);

  const checkAvailability = useCallback(
    async (sourceLanguage = 'en', targetLanguage = 'es'): Promise<TranslatorAvailability> => {
      if (!("Translator" in self)) {
        setAvailability("unavailable");
        return "unavailable";
      }

      try {
        const status = await (self as any).Translator.availability({
          sourceLanguage,
          targetLanguage
        });
        const mapped = mapAvailability(status);
        setAvailability(mapped);
        setCurrentLanguagePair({ sourceLanguage, targetLanguage });
        setError(null);
        return mapped;
      } catch (err) {
        console.error("Translator API not available:", err);
        setAvailability("unavailable");
        setError(err instanceof Error ? err.message : "Translator API not available");
        return "unavailable";
      }
    },
    [mapAvailability]
  );

  const createSession = useCallback(
    async (options: TranslatorOptions): Promise<TranslatorSession> => {
      const currentAvailability = await checkAvailability(
        options.sourceLanguage,
        options.targetLanguage
      );
      
      if (currentAvailability === "unavailable") {
        throw new Error(
          `Translator API is not available for ${options.sourceLanguage} → ${options.targetLanguage}`
        );
      }

      try {
        const session: TranslatorSession = await (self as any).Translator.create({
          sourceLanguage: options.sourceLanguage,
          targetLanguage: options.targetLanguage,
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              handleDownloadProgress(e.loaded);
            });
          },
        });

        setAvailability("available");
        setCurrentLanguagePair(options);
        setError(null);
        return session;
      } catch (err) {
        console.error("Error creating Translator session:", err);
        const message = err instanceof Error ? err.message : "Failed to create Translator session";
        setError(message);
        throw err;
      }
    },
    [checkAvailability, handleDownloadProgress]
  );

  const downloadModel = useCallback(
    async (sourceLanguage = 'en', targetLanguage = 'es') => {
      // Trigger a lightweight session to initiate download if required
      const session = await createSession({ sourceLanguage, targetLanguage });
      session.destroy?.();
    },
    [createSession]
  );

  const translate = useCallback(
    async (text: string, sourceLanguage: string, targetLanguage: string): Promise<string> => {
      const session = await createSession({ sourceLanguage, targetLanguage });

      try {
        const translatedText = await session.translate(text);
        return translatedText;
      } catch (err) {
        console.error('Failed to translate text:', err);
        throw err;
      }
    },
    [createSession]
  );

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Compute derived states
  const isAvailable = availability === "available";
  const isDownloading = availability === "downloading";
  const isDownloadRequired = availability === "downloadable";

  return {
    availability,
    isAvailable,
    isDownloading,
    isDownloadRequired,
    downloadProgress: progress,
    error,
    currentLanguagePair,
    checkAvailability,
    downloadModel,
    createSession,
    translate,
  };
}
