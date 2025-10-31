/**
 * Copy AI Prompt Button Component
 * Formats and copies log as AI-ready prompt
 */

import { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils';
import { formatLogAsAIPrompt, copyToClipboard } from '../../../lib/devConsole/promptFormatter';
import type { LogEntry } from '../../../lib/devConsole/promptFormatter';

interface CopyAIPromptButtonProps {
  log: LogEntry;
  variant?: 'default' | 'compact';
  size?: 'sm' | 'md';
}

export function CopyAIPromptButton({
  log,
  variant = 'default',
  size = 'md'
}: CopyAIPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const prompt = formatLogAsAIPrompt(log);
    const success = await copyToClipboard(prompt);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'rounded-lg font-medium transition-all border flex items-center gap-2',
        'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
        'hover:from-purple-500/20 hover:to-pink-500/20',
        'border-purple-500/20 text-purple-600 dark:text-purple-400',
        'hover:scale-105 active:scale-95',
        sizeClasses[size]
      )}
      title="Copy as AI Prompt - Formatted for ChatGPT, Claude, etc."
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Copied!</span>
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <Copy className="w-3.5 h-3.5" />
            <span>Copy AI Prompt</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
