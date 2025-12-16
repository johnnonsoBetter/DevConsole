import { motion, useInView } from 'framer-motion';
import { ArrowRight, Bug, CheckCircle2, Code2, GitBranch, Sparkles, Terminal, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { fadeInUp, staggerContainer } from './animations';

// Animated typing effect for console lines
const TypewriterLine: React.FC<{ 
  text: string; 
  delay: number; 
  className?: string;
  prefix?: React.ReactNode;
}> = ({ text, delay, className = '', prefix }) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayText(text.slice(0, i));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 25);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {prefix}
      <span>{displayText}</span>
      {!isComplete && <span className="animate-pulse">▋</span>}
    </div>
  );
};

// Console window component
const ConsoleWindow: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => setPhase(5), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 via-blue-500/15 to-emerald-500/20 rounded-3xl blur-2xl" />
      
      {/* Terminal Window */}
      <div className="relative bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Window Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
            </div>
            <div className="ml-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500 font-mono">devconsole — zsh</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded">LIVE</span>
          </div>
        </div>

        {/* Console Content */}
        <div className="p-5 font-mono text-[13px] leading-relaxed min-h-[380px] overflow-hidden">
          {/* Command line */}
          {phase >= 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-gray-300 mb-4"
            >
              <span className="text-emerald-400">❯</span>
              <span className="text-purple-400">devconsole</span>
              <span className="text-gray-500">build</span>
            </motion.div>
          )}

          {/* Build output */}
          {phase >= 2 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2 mb-4"
            >
              <div className="text-gray-500">
                <span className="text-blue-400">●</span> Bundling modules...
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span className="text-gray-300">tsc && concurrently "npm run build"</span>
              </div>
            </motion.div>
          )}

          {/* Module bundling */}
          {phase >= 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1 mb-4 pl-4 border-l-2 border-gray-800"
            >
              <div className="text-gray-400">
                <span className="text-yellow-500">[0]</span> <span className="text-cyan-400">[343ms]</span> bundle 3867 modules
              </div>
              <div className="text-gray-400">
                <span className="text-yellow-500">[0]</span> Built version <span className="text-purple-400">0.2.67-dev.shade3f2f0</span>
              </div>
              <div className="text-emerald-400">
                <span className="text-yellow-500">[0]</span> npm run build exited with code <span className="text-emerald-400 font-bold">0</span>
              </div>
            </motion.div>
          )}

          {/* Test results */}
          {phase >= 4 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1 mb-4"
            >
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>Running tests...</span>
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">(pass)</span>
                  <span className="text-gray-300">allowedTools CLI flag › should restrict tools</span>
                  <span className="text-gray-600">[2.58ms]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">(pass)</span>
                  <span className="text-gray-300">allowedTools CLI flag › should allow tools specified</span>
                  <span className="text-gray-600">[0.20ms]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">(pass)</span>
                  <span className="text-gray-300">allowedTools CLI flag › should combine configs</span>
                  <span className="text-gray-600">[0.47ms]</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Success message */}
          {phase >= 5 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            >
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">All tests passing</span>
                <span className="text-emerald-400/60">• 47 tests in 3.2s</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Feature card component
const FeatureCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}> = ({ icon: Icon, title, description, color }) => {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-500',
    blue: 'bg-blue-500/10 text-blue-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
  };

  return (
    <motion.div 
      className="group relative"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
          <Icon className="w-6 h-6" />
        </div>
        <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export const ConsoleFeatureSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: Code2,
      title: 'Code onboarding',
      description: 'DevConsole maps and explains entire codebases in seconds. It uses agentic search to understand project structure.',
      color: 'purple',
    },
    {
      icon: GitBranch,
      title: 'Turn issues into PRs',
      description: 'Stop bouncing between tools. DevConsole integrates with GitHub to handle reading issues, writing code, and submitting PRs.',
      color: 'blue',
    },
    {
      icon: Sparkles,
      title: 'Make powerful edits',
      description: 'DevConsole\'s understanding of your codebase enables it to make powerful, multi-file edits that work.',
      color: 'emerald',
    },
  ];

  return (
    <section className="py-32 px-6 lg:px-10 bg-gray-50 overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1400px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Console Window */}
          <motion.div variants={fadeInUp}>
            <ConsoleWindow />
          </motion.div>

          {/* Right - Features */}
          <motion.div variants={fadeInUp}>
            {/* Section Header */}
            <div className="mb-10">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5" />
                Console Superpowers
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
                Debug faster with<br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">intelligent insights</span>
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                Transform your debugging workflow with AI-powered log analysis, 
                instant issue creation, and context-aware code suggestions.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
