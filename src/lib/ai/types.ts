/**
 * AI Configuration Types
 * Type definitions for AI providers, models, and settings
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "mistral"
  | "deepseek"
  | "groq"
  | "cohere"
  | "perplexity";

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  icon: string;
  description: string;
  requiresApiKey: boolean;
  website: string;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  inputPricing?: string;
  outputPricing?: string;
  capabilities: ModelCapability[];
}

export type ModelCapability =
  | "text-generation"
  | "streaming"
  | "function-calling"
  | "vision"
  | "json-mode";

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface AISettings {
  enabled: boolean;
  provider: AIProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  fallbackModels?: string[];
  useGateway: boolean;
  gatewayApiKey?: string;
}

export interface AICredits {
  balance: number;
  totalUsed: number;
}

// ============================================================================
// USAGE TRACKING TYPES
// ============================================================================

export interface AIUsageOptions {
  user?: string;
  tags?: string[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  userId?: string;
  tags?: string[];
}

export interface TextGenerationResult {
  text: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamTextOptions extends TextGenerationOptions {
  onChunk?: (text: string) => void;
}
