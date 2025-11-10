/**
 * AI Hooks
 * Custom React hooks for Chrome's Built-in AI APIs
 */

export { usePromptModel } from './usePromptModel';
export type { PromptAPIAvailability } from './usePromptModel';

export { useSummarizerModel } from './useSummarizerModel';
export type { SummarizerAvailability, SummarizerOptions, ErrorSummary } from './useSummarizerModel';

export { useTranslatorModel } from './useTranslatorModel';
export type { TranslatorAvailability, TranslatorOptions } from './useTranslatorModel';

export { useLanguageDetectorModel } from './useLanguageDetectorModel';
export type { LanguageDetectorAvailability, DetectedLanguage } from './useLanguageDetectorModel';

export { useGitHubIssueGenerator } from './useGitHubIssueGenerator';
export type { GitHubIssueInput, GeneratedIssue } from './useGitHubIssueGenerator';
