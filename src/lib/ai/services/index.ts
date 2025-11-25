/**
 * AI Services Index
 * Export all AI-related services
 */

export { AIClient, createAIClient } from "./aiClient";
export { createLogExplainer, LogExplainer } from "./logExplainer";
export type { LogData } from "./logExplainer";

// Raindrop / LiquidMetal SmartMemory Integration
export {
  createRaindropClient,
  isRaindropEnabled,
  RaindropClient,
} from "./raindropClient";
export type {
  EpisodicMemoryEntry,
  MemoryEntry,
  ProcedureEntry,
  SemanticSearchResult,
} from "./raindropClient";

// Memory-Enhanced Log Explainer
export {
  createMemoryEnhancedLogExplainer,
  MemoryEnhancedLogExplainer,
} from "./memoryEnhancedLogExplainer";
export type {
  MemoryEnhancedExplanation,
  PastIssue,
} from "./memoryEnhancedLogExplainer";
