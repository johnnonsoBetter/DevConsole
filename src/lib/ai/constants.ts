/**
 * AI Provider Constants
 * Simplified with 3 key providers: OpenAI, Anthropic, DeepSeek
 */

import type { AIProvider } from "./types";

// ============================================================================
// PROVIDER DEFINITIONS
// ============================================================================

export const AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    website: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5", name: "GPT-5" },
      { id: "gpt-5-mini", name: "GPT-5 Mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🔷",
    website: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-4-5-sonnet", name: "Claude 4.5" },
      { id: "claude-haiku", name: "Claude Haiku" },
    ],
  },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getProviderInfo(provider: AIProvider) {
  return AI_PROVIDERS.find((p) => p.id === provider);
}

export function getProviderModels(provider: AIProvider) {
  const p = AI_PROVIDERS.find((p) => p.id === provider);
  return p?.models ?? [];
}

export const DEFAULT_PROVIDER: AIProvider = "openai";
export const DEFAULT_MODEL = "gpt-5-mini";

export const DEFAULT_AI_SETTINGS = {
  enabled: false,
  provider: DEFAULT_PROVIDER,
  model: DEFAULT_MODEL,
  apiKey: "",
  temperature: 0.7,
  maxTokens: 2048,
};
