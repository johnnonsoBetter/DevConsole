import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Chrome, Github, Sparkles, Terminal, Video, Zap } from 'lucide-react';
import React, { useState } from 'react';

// ============================================
// CLEAN, MINIMAL HERO SECTION
// ============================================

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// Hero Mockup - Clean DevTools preview
const HeroMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Logs' | 'AI Analysis'>('Logs');
  const [selectedLog, setSelectedLog] = useState<number>(2);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="relative my-6"
    >
      {/* Soft glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-transparent rounded-3xl blur-2xl" />
      
      <div className="relative bg-[#0d1117] rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Window chrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-gray-800">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-1 bg-[#0d1117] rounded-md text-[11px] text-gray-500 font-mono border border-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              DevConsole
            </div>
          </div>
        </div>
        
        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-800">
          {(['Logs', 'AI Analysis'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-all ${
                activeTab === tab 
                  ? 'text-purple-400 bg-purple-500/10 border-b-2 border-purple-500' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4 min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'Logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <LogEntry 
                  type="info" 
                  time="12:34:56" 
                  message="App initialized successfully"
                  isSelected={selectedLog === 0}
                  onClick={() => setSelectedLog(0)}
                />
                <LogEntry 
                  type="warn" 
                  time="12:34:57" 
                  message="Deprecated API in auth.js"
                  isSelected={selectedLog === 1}
                  onClick={() => setSelectedLog(1)}
                />
                <LogEntry 
                  type="error" 
                  time="12:34:58" 
                  message="Network error fetching /api/user"
                  isSelected={selectedLog === 2}
                  onClick={() => setSelectedLog(2)}
                />
                
                {/* AI Analysis Panel */}
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400">AI Analysis</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {selectedLog === 2 
                      ? "Network error indicates the API endpoint is unreachable. Check if the server is running and CORS is configured correctly."
                      : selectedLog === 1 
                      ? "Consider migrating to the new Auth API before v3.0 deprecation deadline."
                      : "Application started with all modules loaded successfully."}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 bg-purple-500 text-white text-[10px] font-medium rounded-lg">
                      Apply Fix
                    </button>
                    <button className="px-3 py-1.5 bg-white/5 text-gray-400 text-[10px] font-medium rounded-lg">
                      Create Issue
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
            
            {activeTab === 'AI Analysis' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-gray-300">Error Analysis</span>
                  </div>
                  <p className="text-[11px] text-gray-500">3 errors analyzed, 2 fixes available</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium text-gray-300">Performance Insights</span>
                  </div>
                  <p className="text-[11px] text-gray-500">2 optimization suggestions</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// Log Entry Component
interface LogEntryProps {
  type: 'info' | 'warn' | 'error';
  time: string;
  message: string;
  isSelected: boolean;
  onClick: () => void;
}

const LogEntry: React.FC<LogEntryProps> = ({ type, time, message, isSelected, onClick }) => {
  const colors = {
    info: 'text-sky-400 bg-sky-500/10',
    warn: 'text-amber-400 bg-amber-500/10',
    error: 'text-red-400 bg-red-500/10',
  };

  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
        isSelected 
          ? 'bg-white/5 border-purple-500/30' 
          : 'border-transparent hover:bg-white/5'
      }`}
    >
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${colors[type]}`}>
        {type}
      </span>
      <span className="text-[10px] text-gray-600 font-mono">{time}</span>
      <span className="flex-1 text-xs text-gray-300 font-mono truncate">{message}</span>
      <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-gray-600'}`} />
    </motion.div>
  );
};

// Feature pills
const FeaturePill: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <motion.div 
    variants={fadeIn}
    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-xs text-gray-600"
  >
    {icon}
    <span>{label}</span>
  </motion.div>
);

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-gradient-to-br from-purple-100/40 via-blue-100/30 to-transparent rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          
          {/* Left: Content */}
          <motion.div 
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div 
              variants={fadeIn}
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 sm:mb-6 bg-purple-50 border border-purple-100 rounded-full"
            >
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-purple-700">
                Now with on-device AI
              </span>
            </motion.div>
            
            {/* Headline */}
            <motion.h1 
              variants={fadeIn}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-4 sm:mb-6"
            >
              DevTools that
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                actually help
              </span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p 
              variants={fadeIn}
              className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0"
            >
              Console logs, network requests, video calls with memory — 
              all enhanced with AI that understands your debugging context.
            </motion.p>
            
            {/* CTAs */}
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8 sm:mb-10">
              <a
                href="https://github.com/nicholasxjy/devconsole"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Chrome className="w-4 h-4" />
                <span>Add to Chrome</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="#devtools"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-white text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span>See Features</span>
              </a>
            </motion.div>
            
            {/* Feature pills */}
            <motion.div 
              variants={staggerChildren}
              className="flex flex-wrap gap-2 justify-center lg:justify-start"
            >
              <FeaturePill icon={<Terminal className="w-3.5 h-3.5" />} label="Console Logs" />
              <FeaturePill icon={<Sparkles className="w-3.5 h-3.5" />} label="AI Analysis" />
              <FeaturePill icon={<Video className="w-3.5 h-3.5" />} label="Video Calls" />
              <FeaturePill icon={<Github className="w-3.5 h-3.5" />} label="GitHub Issues" />
            </motion.div>
          </motion.div>
          
          {/* Right: Mockup - Hidden on very small screens, scaled on medium */}
          <div className="hidden sm:block lg:pl-8">
            <HeroMockup />
          </div>
        </div>
        
        {/* Trust indicators */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 sm:mt-20 pt-8 sm:pt-12 border-t border-gray-100"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Privacy First</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Works Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Free to Use</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
