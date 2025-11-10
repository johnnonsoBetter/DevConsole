/**
 * usePromptModel
 *
 * React hook that wraps the Chrome Prompt API (LanguageModel) to power
 * AI-assisted features inside the DevConsole.
 *
 * Responsibilities:
 * - Track Prompt API availability/download status
 * - Expose helpers for creating Prompt sessions
 * - Provide AI generation capabilities
 *
 * @example
 * ```tsx
 * const { promptAi, prompting, promptData, promptError } = usePromptModel();
 * 
 * // Simple usage
 * const result = await promptAi("Explain this error");
 * 
 * // With custom system prompt
 * const result = await promptAi(
 *   "What's causing this bug?",
 *   "You are a debugging expert. Analyze errors and suggest fixes."
 * );
 * ```
 */

import { useCallback, useEffect, useState } from "react";

export type PromptAPIAvailability =
  | "unknown"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

type PromptSession = {
  prompt: (userPrompt: string, options?: Record<string, unknown>) => Promise<string>;
  destroy?: () => void;
};

export function usePromptModel() {
  const [availability, setAvailability] = useState<PromptAPIAvailability>("unknown");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [promptData, setPromptData] = useState<string | null>(null);
  const [prompting, setPrompting] = useState<boolean>(false)
  const [promptError, setPromptError] = useState(null)
  const mapAvailability = useCallback((status: string): PromptAPIAvailability => {
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

  const checkAvailability = useCallback(async (): Promise<PromptAPIAvailability> => {
    if (!("LanguageModel" in self)) {
      setAvailability("unavailable");
      return "unavailable";
    }

    try {
      const status = await (self as any).LanguageModel.availability();
      const mapped = mapAvailability(status);
      setAvailability(mapped);
      setError(null);
      return mapped;
    } catch (err) {
      console.error("Prompt API not available:", err);
      setAvailability("unavailable");
      setError(err instanceof Error ? err.message : "Prompt API not available");
      return "unavailable";
    }
  }, [mapAvailability]);

  const createSession = useCallback(
    async (systemPrompt: string): Promise<PromptSession> => {
      const currentAvailability = await checkAvailability();
      if (currentAvailability === "unavailable") {
        throw new Error("Prompt API is not available on this device");
      }

      try {
        const session: PromptSession = await (self as any).LanguageModel.create({
          initialPrompts: [
            {
              role: "system",
              content: systemPrompt,
            },
          ],
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              handleDownloadProgress(e.loaded);
            });
          },
        });

        setAvailability("available");
        setError(null);
        return await session;
      } catch (err) {
        console.error("Error creating Prompt session:", err);
        const message = err instanceof Error ? err.message : "Failed to create Prompt session";
        setError(message);
        throw err;
      }
    },
    [checkAvailability, handleDownloadProgress]
  );

  const downloadModel = useCallback(async () => {
    // Trigger a lightweight session to initiate download if required
    const session = await createSession("Prepare the AI model for upcoming tasks.");
    session.destroy?.();
  }, [createSession]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const promptAi = useCallback(async (userPrompt: string, systemPrompt?: string) => {
    setPrompting(true);
    setPromptError(null);
    setPromptData(null);

    try {
      const session = await createSession(systemPrompt || "You are a helpful AI assistant.");
      const result = await session.prompt(userPrompt);
      
      setPromptData(result);
      setPrompting(false);
      
      // Clean up session
      session.destroy?.();
      
      return result;
    } catch (err) {
      console.error("Error prompting AI:", err);
      const message = err instanceof Error ? err.message : "Failed to prompt AI";
      setPromptError(message as any);
      setPrompting(false);
      throw err;
    }
  }, [createSession]);

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
    promptData,
    prompting,
    promptError,
    checkAvailability,
    downloadModel,
    createSession,
    promptAi,
  };
}
