/**
 * useAI - Simplified React Hook for AI Text Generation using Vercel AI SDK
 *
 * Uses the lightweight useVercelAi hook for AI functionality.
 * Provides specialized hooks for common DevConsole use cases.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, streamText } from "ai";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";

import type { AIProvider } from "../lib/ai/types";
import { useAISettingsStore } from "../utils/stores/aiSettings";

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

/**
 * Creates an AI SDK model instance based on provider type and API key
 */
function createModel(provider: AIProvider, apiKey: string, modelId: string) {
  const cleanModelId = modelId.includes("/")
    ? modelId.split("/").pop()!
    : modelId;

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(cleanModelId);

    case "anthropic":
      return createAnthropic({ apiKey })(cleanModelId);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAI(
  options: {
    systemPrompt?: string;
    onComplete?: (text: string) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const settings = useAISettingsStore();
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isConfigured =
    settings.enabled && Boolean(settings.apiKey) && Boolean(settings.model);

  /**
   * Generate text (non-streaming)
   */
  const generate = useCallback(
    async (prompt: string, systemPrompt?: string): Promise<string> => {
      if (!isConfigured) {
        const err = new Error(
          "AI not configured. Set API key and model in settings."
        );
        setError(err);
        options.onError?.(err);
        throw err;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setOutput("");

      try {
        const model = createModel(
          settings.provider,
          settings.apiKey,
          settings.model
        );
        const result = await generateText({
          model,
          system: systemPrompt || options.systemPrompt,
          prompt,
          abortSignal: abortRef.current.signal,
        });

        setOutput(result.text);
        options.onComplete?.(result.text);
        return result.text;
      } catch (err) {
        if ((err as Error).name === "AbortError") return output;
        const error =
          err instanceof Error ? err : new Error("Generation failed");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured, settings, options, output]
  );

  /**
   * Stream text generation
   */
  const stream = useCallback(
    async (
      prompt: string,
      systemPrompt?: string,
      onChunk?: (chunk: string) => void
    ): Promise<string> => {
      if (!isConfigured) {
        const err = new Error(
          "AI not configured. Set API key and model in settings."
        );
        setError(err);
        options.onError?.(err);
        throw err;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setIsStreaming(true);
      setError(null);
      setOutput("");

      let fullText = "";

      try {
        const model = createModel(
          settings.provider,
          settings.apiKey,
          settings.model
        );
        const result = streamText({
          model,
          system: systemPrompt || options.systemPrompt,
          prompt,
          abortSignal: abortRef.current.signal,
        });

        for await (const chunk of result.textStream) {
          fullText += chunk;
          setOutput(fullText);
          onChunk?.(chunk);
        }

        options.onComplete?.(fullText);
        return fullText;
      } catch (err) {
        if ((err as Error).name === "AbortError") return fullText;
        const error = err instanceof Error ? err : new Error("Stream failed");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [isConfigured, settings, options]
  );

  /**
   * Generate structured object with Zod schema
   */
  const generateObj = useCallback(
    async <T>(
      prompt: string,
      schema: z.ZodType<T>,
      systemPrompt?: string
    ): Promise<T> => {
      if (!isConfigured) {
        const err = new Error("AI not configured");
        setError(err);
        options.onError?.(err);
        throw err;
      }

      setIsLoading(true);
      setError(null);

      try {
        const model = createModel(
          settings.provider,
          settings.apiKey,
          settings.model
        );
        const result = await generateObject({
          model,
          schema,
          system: systemPrompt || options.systemPrompt,
          prompt,
        });

        return result.object;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Object generation failed");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured, settings, options]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setOutput("");
    setError(null);
  }, []);

  return {
    output,
    isLoading,
    isStreaming,
    error,
    generate,
    stream,
    generateObj,
    stop,
    clear,
    isConfigured,
    isEnabled: settings.enabled,
    provider: settings.provider,
    model: settings.model,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for explaining console logs and errors
 */
export function useLogExplainer() {
  const systemPrompt = `You are a helpful assistant that explains console logs and errors.
When given a log entry, provide:
1. A clear explanation of what the log means
2. If it's an error, potential causes and solutions
3. Context about the technology/framework if relevant
Be concise but thorough.`;

  const ai = useAI({ systemPrompt });

  return {
    explain: (log: string) => ai.generate(log),
    explainStream: (log: string, onChunk?: (chunk: string) => void) =>
      ai.stream(log, undefined, onChunk),
    ...ai,
  };
}

/**
 * Hook for analyzing network requests
 */
export function useNetworkAnalyzer() {
  const systemPrompt = `You are a network analysis assistant.
When given network request/response data, provide:
1. Summary of what the request does
2. Analysis of headers and payload
3. Performance observations
4. Security considerations if relevant
Be technical but accessible.`;

  const ai = useAI({ systemPrompt });

  return {
    analyze: (request: string) => ai.generate(request),
    analyzeStream: (request: string, onChunk?: (chunk: string) => void) =>
      ai.stream(request, undefined, onChunk),
    ...ai,
  };
}

/**
 * Hook for generating GitHub issues from errors/logs
 */
export function useIssueGenerator() {
  const systemPrompt = `You are a technical writer that creates well-structured GitHub issues.
When given a description of a problem or feature request, generate:
1. Clear, concise title
2. Problem description with context
3. Steps to reproduce (if applicable)
4. Expected vs actual behavior
5. Suggested solution or approach
Format the output as markdown.`;

  const { generate, stream, generateObj, ...rest } = useAI({ systemPrompt });

  const issueSchema = z.object({
    title: z.string(),
    body: z.string(),
    labels: z.array(z.string()).optional(),
  });

  return {
    generateIssue: (description: string) => generate(description),
    generateIssueStream: (
      description: string,
      onChunk?: (chunk: string) => void
    ) => stream(description, undefined, onChunk),
    generateStructured: (description: string) =>
      generateObj(description, issueSchema),
    ...rest,
  };
}

/**
 * Hook for code explanation and documentation
 */
export function useCodeExplainer() {
  const systemPrompt = `You are a code documentation expert.
When given code, provide:
1. What the code does (high-level summary)
2. Key functions/methods explained
3. Potential improvements or issues
4. Usage examples if applicable
Be clear and developer-friendly.`;

  const ai = useAI({ systemPrompt });

  return {
    explain: (code: string) => ai.generate(code),
    explainStream: (code: string, onChunk?: (chunk: string) => void) =>
      ai.stream(code, undefined, onChunk),
    ...ai,
  };
}

export default useAI;
