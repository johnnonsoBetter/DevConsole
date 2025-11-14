/**
 * AI Client Service
 * Unified client for making AI requests across different providers
 * Supports OpenAI, Anthropic, Google, and others via AI Gateway
 */

import type {
  AISettings,
  TextGenerationOptions,
  TextGenerationResult,
} from "../types";

// ============================================================================
// AI CLIENT
// ============================================================================

export class AIClient {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  /**
   * Generate text completion using configured provider
   */
  async generateText(
    options: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const {
      prompt,
      systemPrompt,
      temperature = this.settings.temperature || 0.7,
      maxTokens = this.settings.maxTokens || 2000,
      model = this.settings.model,
    } = options;

    if (this.settings.useGateway) {
      return this.generateViaGateway({
        prompt,
        systemPrompt,
        temperature,
        maxTokens,
        model,
      });
    }

    // Direct provider calls
    return this.generateDirect({
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      model,
    });
  }

  /**
   * Stream text generation with real-time chunks
   */
  async *streamText(options: TextGenerationOptions): AsyncGenerator<string> {
    const {
      prompt,
      systemPrompt,
      temperature = this.settings.temperature || 0.7,
      maxTokens = this.settings.maxTokens || 2000,
      model = this.settings.model,
    } = options;

    if (this.settings.useGateway) {
      yield* this.streamViaGateway({
        prompt,
        systemPrompt,
        temperature,
        maxTokens,
        model,
      });
    } else {
      yield* this.streamDirect({
        prompt,
        systemPrompt,
        temperature,
        maxTokens,
        model,
      });
    }
  }

  /**
   * Generate via AI Gateway (recommended)
   */
  private async generateViaGateway(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): Promise<TextGenerationResult> {
    if (!this.settings.gatewayApiKey) {
      throw new Error("AI Gateway API key not configured");
    }

    const response = await fetch("https://api.vercel.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.gatewayApiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          ...(options.systemPrompt
            ? [{ role: "system", content: options.systemPrompt }]
            : []),
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content || "";

    return {
      text: message,
      finishReason: data.choices[0]?.finish_reason || "stop",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Stream via AI Gateway
   */
  private async *streamViaGateway(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): AsyncGenerator<string> {
    if (!this.settings.gatewayApiKey) {
      throw new Error("AI Gateway API key not configured");
    }

    const response = await fetch("https://api.vercel.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.gatewayApiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          ...(options.systemPrompt
            ? [{ role: "system", content: options.systemPrompt }]
            : []),
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Generate via direct provider API
   */
  private async generateDirect(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): Promise<TextGenerationResult> {
    const provider = this.settings.provider;

    switch (provider) {
      case "openai":
        return this.generateOpenAI(options);
      case "anthropic":
        return this.generateAnthropic(options);
      default:
        throw new Error(
          `Direct API not implemented for provider: ${provider}. Please use AI Gateway.`
        );
    }
  }

  /**
   * Stream via direct provider API
   */
  private async *streamDirect(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): AsyncGenerator<string> {
    const provider = this.settings.provider;

    switch (provider) {
      case "openai":
        yield* this.streamOpenAI(options);
        break;
      case "anthropic":
        yield* this.streamAnthropic(options);
        break;
      default:
        throw new Error(
          `Direct streaming not implemented for provider: ${provider}. Please use AI Gateway.`
        );
    }
  }

  /**
   * OpenAI API implementation
   */
  private async generateOpenAI(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): Promise<TextGenerationResult> {
    if (!this.settings.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model?.replace("openai/", "") || "gpt-4o-mini",
        messages: [
          ...(options.systemPrompt
            ? [{ role: "system", content: options.systemPrompt }]
            : []),
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content || "";

    return {
      text: message,
      finishReason: data.choices[0]?.finish_reason || "stop",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * OpenAI streaming implementation
   */
  private async *streamOpenAI(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): AsyncGenerator<string> {
    if (!this.settings.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model?.replace("openai/", "") || "gpt-4o-mini",
        messages: [
          ...(options.systemPrompt
            ? [{ role: "system", content: options.systemPrompt }]
            : []),
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Anthropic API implementation
   */
  private async generateAnthropic(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): Promise<TextGenerationResult> {
    if (!this.settings.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.settings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:
          options.model?.replace("anthropic/", "") || "claude-3-haiku-20240307",
        messages: [{ role: "user", content: options.prompt }],
        system: options.systemPrompt,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const message = data.content[0]?.text || "";

    return {
      text: message,
      finishReason: data.stop_reason || "stop",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  /**
   * Anthropic streaming implementation
   */
  private async *streamAnthropic(
    options: Omit<TextGenerationOptions, "userId" | "tags">
  ): AsyncGenerator<string> {
    if (!this.settings.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.settings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:
          options.model?.replace("anthropic/", "") || "claude-3-haiku-20240307",
        messages: [{ role: "user", content: options.prompt }],
        system: options.systemPrompt,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "content_block_delta" && data.delta?.text) {
              yield data.delta.text;
            }
          } catch (e) {
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Create AI client from settings store
 */
export function createAIClient(settings: AISettings): AIClient {
  return new AIClient(settings);
}
