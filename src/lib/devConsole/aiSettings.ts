/**
 * AI Settings Storage Utility
 * Manages AI provider configuration for Chrome Extension
 */

const STORAGE_KEY = "devconsole_ai_settings";

export interface AISettings {
  enabled: boolean;
  provider: "openai" | "anthropic" | "gemini" | "cohere" | "openrouter";
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  useGateway: boolean;
  gatewayApiKey: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "",
  temperature: 0.7,
  maxTokens: 1000,
  useGateway: false,
  gatewayApiKey: "",
};

/**
 * Save AI settings to chrome.storage.local
 */
export async function saveAISettings(settings: AISettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error("Failed to save AI settings:", error);
    throw new Error("Failed to save AI settings");
  }
}

/**
 * Load AI settings from chrome.storage.local
 */
export async function loadAISettings(): Promise<AISettings | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  } catch (error) {
    console.error("Failed to load AI settings:", error);
    return null;
  }
}

/**
 * Clear AI settings from chrome.storage.local
 */
export async function clearAISettings(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear AI settings:", error);
  }
}

/**
 * Validate AI settings
 */
export function validateAISettings(settings: Partial<AISettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings.provider) {
    errors.push("AI provider is required");
  }

  if (!settings.model?.trim()) {
    errors.push("Model selection is required");
  }

  // If gateway is not being used, API key is required
  if (!settings.useGateway && !settings.apiKey?.trim()) {
    errors.push("API key is required when not using gateway");
  }

  // If gateway is being used, gateway API key is required
  if (settings.useGateway && !settings.gatewayApiKey?.trim()) {
    errors.push("Gateway API key is required when using AI Gateway");
  }

  if (settings.temperature !== undefined) {
    if (settings.temperature < 0 || settings.temperature > 2) {
      errors.push("Temperature must be between 0 and 2");
    }
  }

  if (settings.maxTokens !== undefined) {
    if (settings.maxTokens < 100 || settings.maxTokens > 4000) {
      errors.push("Max tokens must be between 100 and 4000");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Test AI provider connection
 */
export async function testAIConnection(settings: AISettings): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // This is a placeholder - implement actual provider-specific tests
    if (settings.useGateway) {
      if (!settings.gatewayApiKey) {
        return { valid: false, error: "Gateway API key is required" };
      }
      // Test gateway connection here
    } else {
      if (!settings.apiKey) {
        return { valid: false, error: "API key is required" };
      }
      // Test provider-specific connection here
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

/**
 * Get provider-specific configuration
 */
export function getProviderConfig(provider: AISettings["provider"]): {
  name: string;
  requiresApiKey: boolean;
  defaultModel: string;
  supportedModels: string[];
} {
  const configs = {
    openai: {
      name: "OpenAI",
      requiresApiKey: true,
      defaultModel: "gpt-4o-mini",
      supportedModels: [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
      ],
    },
    anthropic: {
      name: "Anthropic",
      requiresApiKey: true,
      defaultModel: "claude-3-5-sonnet-20241022",
      supportedModels: [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
      ],
    },
    gemini: {
      name: "Google Gemini",
      requiresApiKey: true,
      defaultModel: "gemini-2.0-flash-exp",
      supportedModels: [
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ],
    },
    cohere: {
      name: "Cohere",
      requiresApiKey: true,
      defaultModel: "command-r-plus",
      supportedModels: ["command-r-plus", "command-r", "command"],
    },
    openrouter: {
      name: "OpenRouter",
      requiresApiKey: true,
      defaultModel: "openai/gpt-4o-mini",
      supportedModels: [
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-pro",
      ],
    },
  };

  return configs[provider] || configs.openai;
}
