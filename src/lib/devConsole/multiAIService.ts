/**
 * Extended AI Service with Multi-API Support
 * Manages all Chrome Built-in AI APIs
 */

import { aiService as baseSingletonService } from './aiService';
import type { AIAvailability } from './aiService';

// ============================================================================
// AI API METADATA
// ============================================================================

export interface AIAPIMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  stability: 'stable' | 'origin-trial' | 'extension-only';
  chromeVersion: string;
  modelSize: string;
  apiKey: string; // The global API key in window/self
}

export const AI_APIS: AIAPIMetadata[] = [
  {
    id: 'summarizer',
    name: 'Summarizer',
    description: 'Summarize long text into concise key points, headlines, or teasers',
    icon: '📝',
    stability: 'stable',
    chromeVersion: '138+',
    modelSize: '~22GB',
    apiKey: 'Summarizer'
  },
  {
    id: 'translator',
    name: 'Translator',
    description: 'Translate text between multiple languages on-device',
    icon: '🌐',
    stability: 'stable',
    chromeVersion: '138+',
    modelSize: '~100MB per language pair',
    apiKey: 'Translator'
  },
  {
    id: 'languageDetector',
    name: 'Language Detector',
    description: 'Detect the language of text automatically',
    icon: '🔍',
    stability: 'stable',
    chromeVersion: '138+',
    modelSize: '~10MB',
    apiKey: 'LanguageDetector'
  },
  {
    id: 'writer',
    name: 'Writer',
    description: 'Generate creative content, emails, articles, and more',
    icon: '✍️',
    stability: 'origin-trial',
    chromeVersion: '137-148',
    modelSize: '~22GB',
    apiKey: 'Writer'
  },
  {
    id: 'rewriter',
    name: 'Rewriter',
    description: 'Rewrite text in different tones and styles',
    icon: '🔄',
    stability: 'origin-trial',
    chromeVersion: '137-148',
    modelSize: '~22GB',
    apiKey: 'Rewriter'
  },
  {
    id: 'prompt',
    name: 'Prompt API',
    description: 'General-purpose AI prompting for custom tasks',
    icon: '💬',
    stability: 'origin-trial',
    chromeVersion: '138+',
    modelSize: '~22GB',
    apiKey: 'LanguageModel'
  },
  {
    id: 'proofreader',
    name: 'Proofreader',
    description: 'Check grammar, spelling, and suggest improvements',
    icon: '✅',
    stability: 'origin-trial',
    chromeVersion: '141-145',
    modelSize: '~5GB',
    apiKey: 'Proofreader'
  }
];

// ============================================================================
// MULTI-API SERVICE CLASS
// ============================================================================

class MultiAIService {
  private downloadProgressCallbacks: Map<string, (progress: number) => void> = new Map();
  private apiInstances: Map<string, any> = new Map();

  /**
   * Check availability for a specific AI API
   */
  async checkAvailability(apiId: string): Promise<AIAvailability> {
    const api = AI_APIS.find(a => a.id === apiId);
    if (!api) return 'unavailable';

    // @ts-ignore - Chrome AI APIs
    const apiConstructor = self[api.apiKey];

    if (!apiConstructor) {
      return 'unavailable';
    }

    try {
      // Check if API has availability method
      if (typeof apiConstructor.availability === 'function') {
        const availability = await apiConstructor.availability();
        return availability as AIAvailability;
      }

      // Some APIs might not have availability method
      return 'available';
    } catch (error) {
      console.error(`Failed to check ${api.name} availability:`, error);
      return 'unavailable';
    }
  }

  /**
   * Check availability for all AI APIs
   */
  async checkAllAvailability(): Promise<Record<string, AIAvailability>> {
    const results: Record<string, AIAvailability> = {};

    await Promise.all(
      AI_APIS.map(async (api) => {
        results[api.id] = await this.checkAvailability(api.id);
      })
    );

    return results;
  }

  /**
   * Activate/download a specific AI API
   */
  async activateAPI(apiId: string): Promise<void> {
    const api = AI_APIS.find(a => a.id === apiId);
    if (!api) throw new Error(`Unknown API: ${apiId}`);

    // @ts-ignore - Chrome AI APIs
    const apiConstructor = self[api.apiKey];

    if (!apiConstructor) {
      throw new Error(`${api.name} is not available in this browser`);
    }

    try {
      const options: any = {
        monitor: (m: any) => {
          m.addEventListener('downloadprogress', (e: any) => {
            const progress = Math.round(e.loaded * 100);
            const callback = this.downloadProgressCallbacks.get(apiId);
            callback?.(progress);
          });
        }
      };

      // Create instance based on API type
      let instance;

      if (api.id === 'summarizer') {
        instance = await apiConstructor.create({
          ...options,
          type: 'key-points',
          format: 'markdown',
          length: 'medium'
        });
      } else if (api.id === 'translator') {
        // Translator requires source and target languages
        instance = await apiConstructor.create({
          ...options,
          sourceLanguage: 'en',
          targetLanguage: 'es'
        });
      } else if (api.id === 'languageDetector') {
        instance = await apiConstructor.create(options);
      } else {
        // For other APIs (Writer, Rewriter, Prompt, Proofreader)
        instance = await apiConstructor.create(options);
      }

      this.apiInstances.set(apiId, instance);
    } catch (error) {
      console.error(`Failed to activate ${api.name}:`, error);
      throw error;
    }
  }

  /**
   * Set download progress callback for a specific API
   */
  setDownloadProgressCallback(apiId: string, callback: (progress: number) => void) {
    this.downloadProgressCallbacks.set(apiId, callback);
  }

  /**
   * Get instance of a specific API (if already created)
   */
  getInstance(apiId: string): any | null {
    return this.apiInstances.get(apiId) || null;
  }

  /**
   * Destroy instance of a specific API
   */
  destroyInstance(apiId: string) {
    const instance = this.apiInstances.get(apiId);
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy();
    }
    this.apiInstances.delete(apiId);
  }

  /**
   * Destroy all API instances
   */
  destroyAll() {
    this.apiInstances.forEach((instance, apiId) => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    this.apiInstances.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const multiAIService = new MultiAIService();

// Re-export single AI service for backward compatibility
export { baseSingletonService as aiService };
