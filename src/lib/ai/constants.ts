/**
 * AI Provider Constants
 * Definitions of available AI providers and their models
 */

import type { ProviderInfo } from "./types";

// ============================================================================
// PROVIDER DEFINITIONS
// ============================================================================

export const AI_PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    description: "GPT-4 and GPT-3.5 models with strong reasoning capabilities",
    requiresApiKey: true,
    website: "https://platform.openai.com",
    models: [
      {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        description: "Most capable model, best for complex tasks",
        contextWindow: 128000,
        inputPricing: "$2.50 / 1M tokens",
        outputPricing: "$10.00 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
      {
        id: "openai/gpt-5",
        name: "GPT-5",
        description:
          "Next-generation model with advanced reasoning and creativity",
        contextWindow: 256000,
        inputPricing: "$5.00 / 1M tokens",
        outputPricing: "$20.00 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
      {
        id: "openai/gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "Fast and affordable, great for most tasks",
        contextWindow: 128000,
        inputPricing: "$0.15 / 1M tokens",
        outputPricing: "$0.60 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
      {
        id: "openai/gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and cost-effective for simpler tasks",
        contextWindow: 16385,
        inputPricing: "$0.50 / 1M tokens",
        outputPricing: "$1.50 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "json-mode",
        ],
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🔷",
    description: "Claude models with enhanced safety and reasoning",
    requiresApiKey: true,
    website: "https://console.anthropic.com",
    models: [
      {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        description: "Best balance of intelligence and speed",
        contextWindow: 200000,
        inputPricing: "$3.00 / 1M tokens",
        outputPricing: "$15.00 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
      {
        id: "anthropic/claude-3-haiku",
        name: "Claude 3 Haiku",
        description: "Fastest model, great for quick responses",
        contextWindow: 200000,
        inputPricing: "$0.25 / 1M tokens",
        outputPricing: "$1.25 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    icon: "🌟",
    description: "Gemini models with multimodal capabilities",
    requiresApiKey: true,
    website: "https://ai.google.dev",
    models: [
      {
        id: "google/gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "Latest Gemini model with enhanced performance",
        contextWindow: 1000000,
        inputPricing: "$0.10 / 1M tokens",
        outputPricing: "$0.40 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
      {
        id: "google/gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "Advanced reasoning with large context",
        contextWindow: 2000000,
        inputPricing: "$1.25 / 1M tokens",
        outputPricing: "$5.00 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "vision",
          "json-mode",
        ],
      },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    icon: "✖️",
    description: "Grok models with real-time information",
    requiresApiKey: true,
    website: "https://x.ai",
    models: [
      {
        id: "xai/grok-beta",
        name: "Grok Beta",
        description: "Latest Grok model with enhanced capabilities",
        contextWindow: 131072,
        capabilities: ["text-generation", "streaming", "function-calling"],
      },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    icon: "🌊",
    description: "Open-source models with strong performance",
    requiresApiKey: true,
    website: "https://mistral.ai",
    models: [
      {
        id: "mistral/mistral-large",
        name: "Mistral Large",
        description: "Most capable Mistral model",
        contextWindow: 128000,
        inputPricing: "$2.00 / 1M tokens",
        outputPricing: "$6.00 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "json-mode",
        ],
      },
      {
        id: "mistral/mistral-small",
        name: "Mistral Small",
        description: "Fast and affordable",
        contextWindow: 32000,
        inputPricing: "$0.20 / 1M tokens",
        outputPricing: "$0.60 / 1M tokens",
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "json-mode",
        ],
      },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    description: "Ultra-fast inference with LPU technology",
    requiresApiKey: true,
    website: "https://groq.com",
    models: [
      {
        id: "groq/llama-3.3-70b",
        name: "Llama 3.3 70B",
        description: "Latest Llama model, blazing fast",
        contextWindow: 128000,
        capabilities: [
          "text-generation",
          "streaming",
          "function-calling",
          "json-mode",
        ],
      },
      {
        id: "groq/mixtral-8x7b",
        name: "Mixtral 8x7B",
        description: "Fast mixture-of-experts model",
        contextWindow: 32768,
        capabilities: ["text-generation", "streaming", "function-calling"],
      },
    ],
  },
];

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_AI_SETTINGS = {
  enabled: false,
  provider: "openai" as const,
  model: "openai/gpt-4o-mini",
  apiKey: "",
  temperature: 0.7,
  maxTokens: 2000,
  fallbackModels: ["openai/gpt-3.5-turbo"],
  useGateway: false,
  gatewayApiKey: "",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getProviderById(providerId: string): ProviderInfo | undefined {
  return AI_PROVIDERS.find((p) => p.id === providerId);
}

export function getModelById(
  modelId: string
): { provider: ProviderInfo; model: any } | undefined {
  for (const provider of AI_PROVIDERS) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) {
      return { provider, model };
    }
  }
  return undefined;
}

export function getProviderModels(providerId: string) {
  const provider = getProviderById(providerId);
  return provider?.models || [];
}
