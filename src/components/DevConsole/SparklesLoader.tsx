/**
 * SparklesLoader Component
 * A beautiful loading animation with sparkle effects for AI analysis
 * Lightweight CSS-based implementation without heavy dependencies
 */

import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { memo, useMemo } from 'react';
import { cn } from '../../utils';

// ============================================================================
// TYPES
// ============================================================================

interface SparklesLoaderProps {
  /** Title to display */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// SPARKLE PARTICLE
// ============================================================================

interface SparkleProps {
  delay: number;
  size: number;
  x: number;
  y: number;
  color: string;
}

const Sparkle = memo(({ delay, size, x, y, color }: SparkleProps) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left: `${x}%`,
      top: `${y}%`,
      backgroundColor: color,
      boxShadow: `0 0 ${size * 2}px ${color}`,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
    }}
    transition={{
      duration: 1.5,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
));

Sparkle.displayName = 'Sparkle';

// ============================================================================
// FLOATING DOTS
// ============================================================================

const FloatingDots = memo(() => {
  const dots = useMemo(() => 
    Array.from({ length: 3 }).map((_, i) => ({
      delay: i * 0.15,
    })), 
  []);

  return (
    <div className="flex items-center gap-1">
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400"
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            delay: dot.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

FloatingDots.displayName = 'FloatingDots';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SparklesLoader = memo(({
  title = 'Analyzing...',
  subtitle = 'AI is processing your request',
  size = 'md',
  className,
}: SparklesLoaderProps) => {
  // Generate random sparkles
  const sparkles = useMemo(() => {
    const colors = [
      '#a855f7', // purple-500
      '#8b5cf6', // violet-500
      '#6366f1', // indigo-500
      '#3b82f6', // blue-500
      '#ec4899', // pink-500
    ];
    
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 2,
      size: 2 + Math.random() * 4,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  const sizeConfig = {
    sm: {
      container: 'p-3',
      icon: 'w-8 h-8',
      iconInner: 'w-4 h-4',
      title: 'text-xs',
      subtitle: 'text-[10px]',
      sparkleArea: 'w-16 h-16',
    },
    md: {
      container: 'p-4',
      icon: 'w-12 h-12',
      iconInner: 'w-6 h-6',
      title: 'text-sm',
      subtitle: 'text-xs',
      sparkleArea: 'w-24 h-24',
    },
    lg: {
      container: 'p-6',
      icon: 'w-16 h-16',
      iconInner: 'w-8 h-8',
      title: 'text-base',
      subtitle: 'text-sm',
      sparkleArea: 'w-32 h-32',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50',
        'dark:from-purple-900/10 dark:via-gray-800/50 dark:to-blue-900/10',
        'border border-purple-100 dark:border-purple-800/30',
        'rounded-lg overflow-hidden',
        className
      )}
    >
      <div className={cn('flex flex-col items-center justify-center', config.container)}>
        {/* Sparkle Animation Area */}
        <div className={cn('relative mb-3', config.sparkleArea)}>
          {/* Sparkle particles */}
          {sparkles.map((sparkle) => (
            <Sparkle key={sparkle.id} {...sparkle} />
          ))}
          
          {/* Central Icon */}
          <motion.div
            className={cn(
              'absolute inset-0 m-auto',
              'rounded-xl',
              'bg-gradient-to-br from-purple-500 to-indigo-600',
              'shadow-lg shadow-purple-500/25',
              'flex items-center justify-center',
              config.icon
            )}
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 10px 15px -3px rgba(168, 85, 247, 0.25)',
                '0 10px 20px -3px rgba(168, 85, 247, 0.4)',
                '0 10px 15px -3px rgba(168, 85, 247, 0.25)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Bot className={cn('text-white', config.iconInner)} />
            </motion.div>
          </motion.div>

          {/* Orbiting sparkle */}
          <motion.div
            className="absolute w-2 h-2"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: -4,
              marginTop: -4,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <motion.div
              className="absolute"
              style={{
                left: size === 'sm' ? 20 : size === 'md' ? 32 : 44,
              }}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
            </motion.div>
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h4 className={cn('font-semibold text-gray-900 dark:text-gray-100', config.title)}>
              {title}
            </h4>
            <FloatingDots />
          </div>
          <p className={cn('text-gray-500 dark:text-gray-400', config.subtitle)}>
            {subtitle}
          </p>
        </div>

        {/* Progress shimmer bar */}
        <div className="w-full max-w-[200px] mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 rounded-full"
            style={{ backgroundSize: '200% 100%' }}
            animate={{
              backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>
      </div>
    </div>
  );
});

SparklesLoader.displayName = 'SparklesLoader';

// ============================================================================
// INLINE SPARKLES LOADER (for smaller contexts)
// ============================================================================

interface InlineSparklesLoaderProps {
  text?: string;
  className?: string;
}

export const InlineSparklesLoader = memo(({ 
  text = 'Analyzing', 
  className 
}: InlineSparklesLoaderProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.div
        className="relative w-5 h-5"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="w-5 h-5 text-purple-500" />
      </motion.div>
      <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>
      <FloatingDots />
    </div>
  );
});

InlineSparklesLoader.displayName = 'InlineSparklesLoader';

export default SparklesLoader;
