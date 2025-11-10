/**
 * AI Components
 * Barrel export for clean imports
 */

export { AIPowerBadge } from './AIPowerBadge';
export { AIActionButton } from './AIActionButton';
export { AIDownloadProgress } from './AIDownloadProgress';
export { AIInsightPanel } from './AIInsightPanel';
export { AIUnsupportedNotice } from './AIUnsupportedNotice';
export { AIFirstUsePrompt } from './AIFirstUsePrompt';
export { CopyAIPromptButton } from './CopyAIPromptButton';

// Individual AI API Cards (each manages its own state via hooks)
export { SummarizerCard } from './SummarizerCard';
export { PromptAPICard } from './PromptAPICard';
export { TranslatorCard } from './TranslatorCard';
export { LanguageDetectorCard } from './LanguageDetectorCard';

// Legacy - no longer used in AIPanel but kept for backward compatibility
export { AICard } from './AICard';

export type {
  AIAvailability,
  AIPowerBadgeProps,
  AIActionButtonProps,
  AIDownloadProgressProps,
  AIInsightPanelProps,
  AIUnsupportedNoticeProps,
  AIFirstUsePromptProps
} from './types';
