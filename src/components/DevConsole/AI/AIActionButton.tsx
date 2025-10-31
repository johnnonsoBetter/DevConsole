/**
 * AI Action Button Component
 * Consistent button styling for AI-powered actions
 */

import { Loader, Sparkles } from 'lucide-react';
import { cn } from 'src/utils';
import type { AIActionButtonProps } from './types';

export function AIActionButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'AI Summarize',
  loadingLabel = 'Analyzing...',
  variant = 'primary',
  size = 'md'
}: AIActionButtonProps) {
  const variantStyles = {
    primary: 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20',
    secondary: 'bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/20',
    success: 'bg-success/10 hover:bg-success/20 text-success border-success/20'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-2 rounded-lg font-medium transition-all border',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:scale-105 active:scale-95',
        variantStyles[variant],
        sizeStyles[size]
      )}
    >
      {loading ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
