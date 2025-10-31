/**
 * AI Component Types
 * Shared type definitions for DevConsole AI components
 */

export type AIAvailability = 'available' | 'downloading' | 'downloadable' | 'unavailable';

export interface AIPowerBadgeProps {
  status: AIAvailability;
  progress?: number;
}

export interface AIActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md';
}

export interface AIDownloadProgressProps {
  progress: number;
  modelName?: string;
}

export interface AIInsightPanelProps {
  summary: string;
  loading?: boolean;
  error?: string | null;
  title?: string;
}

export interface AIUnsupportedNoticeProps {
  reason: string;
  browserName: string;
}

export interface AIFirstUsePromptProps {
  onActivate: () => void;
  loading?: boolean;
}
