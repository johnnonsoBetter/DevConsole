/**
 * useLanguageDetectorModel
 *
 * React hook that wraps the Chrome Language Detector API to power
 * automatic language detection in DevConsole.
 *
 * Responsibilities:
 * - Track Language Detector API availability/download status
 * - Expose helpers for creating Language Detector sessions
 * - Provide language detection capabilities
 */

import { useCallback, useEffect, useState } from "react";

export type LanguageDetectorAvailability =
  | "unknown"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

export interface DetectedLanguage {
  detectedLanguage: string;
  confidence: number;
}

type LanguageDetectorSession = {
  detect: (text: string) => Promise<DetectedLanguage[]>;
  destroy?: () => void;
};

export function useLanguageDetectorModel() {
  const [availability, setAvailability] = useState<LanguageDetectorAvailability>("unknown");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mapAvailability = useCallback((status: string): LanguageDetectorAvailability => {
    switch (status) {
      case "ready":
      case "available":
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

  const checkAvailability = useCallback(async (): Promise<LanguageDetectorAvailability> => {
    if (!("LanguageDetector" in self)) {
      setAvailability("unavailable");
      return "unavailable";
    }

    try {
      const status = await (self as any).LanguageDetector.availability();
      const mapped = mapAvailability(status);
      setAvailability(mapped);
      setError(null);
      return mapped;
    } catch (err) {
      console.error("Language Detector API not available:", err);
      setAvailability("unavailable");
      setError(err instanceof Error ? err.message : "Language Detector API not available");
      return "unavailable";
    }
  }, [mapAvailability]);

  const createSession = useCallback(
    async (): Promise<LanguageDetectorSession> => {
      const currentAvailability = await checkAvailability();
      if (currentAvailability === "unavailable") {
        throw new Error("Language Detector API is not available on this device");
      }

      try {
        const session: LanguageDetectorSession = await (self as any).LanguageDetector.create({
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              handleDownloadProgress(e.loaded);
            });
          },
        });

        setAvailability("available");
        setError(null);
        return session;
      } catch (err) {
        console.error("Error creating Language Detector session:", err);
        const message = err instanceof Error ? err.message : "Failed to create Language Detector session";
        setError(message);
        throw err;
      }
    },
    [checkAvailability, handleDownloadProgress]
  );

  const downloadModel = useCallback(async () => {
    // Trigger a lightweight session to initiate download if required
    const session = await createSession();
    session.destroy?.();
  }, [createSession]);

  const detect = useCallback(
    async (text: string): Promise<DetectedLanguage[]> => {
      const session = await createSession();

      try {
        const results = await session.detect(text);
        return results;
      } catch (err) {
        console.error('Failed to detect language:', err);
        throw err;
      }
    },
    [createSession]
  );

  const detectPrimaryLanguage = useCallback(
    async (text: string): Promise<string | null> => {
      const results = await detect(text);
      if (results.length > 0) {
        return results[0].detectedLanguage;
      }
      return null;
    },
    [detect]
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
    checkAvailability,
    downloadModel,
    createSession,
    detect,
    detectPrimaryLanguage,
  };
}
