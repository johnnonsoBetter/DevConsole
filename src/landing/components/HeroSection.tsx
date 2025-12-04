import { AnimatePresence, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { Download, Sparkles } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { staggerContainer, tabVariants } from './animations';

// =============================================
// Hero Section
// =============================================
export const HeroSection: React.FC = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  
  // Magnetic button effect
  const magneticX = useMotionValue(0);
  const magneticY = useMotionValue(0);
  const springX = useSpring(magneticX, { stiffness: 150, damping: 15 });
  const springY = useSpring(magneticY, { stiffness: 150, damping: 15 });
  
  const handleMagneticMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    magneticX.set((e.clientX - centerX) * 0.2);
    magneticY.set((e.clientY - centerY) * 0.2);
  };
  
  const handleMagneticLeave = () => {
    magneticX.set(0);
    magneticY.set(0);
  };

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center pt-32 pb-20 overflow-hidden bg-white">
      {/* Subtle animated dot pattern background */}
      <motion.div 
        className="absolute inset-0 dot-pattern opacity-[0.15]" 
        style={{ y, opacity }}
      />
      
      {/* Floating gradient orbs - very subtle */}
      <motion.div 
        className="absolute top-1/4 right-[15%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[100px]"
        animate={{ 
          y: [0, -30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-1/4 left-[10%] w-[400px] h-[400px] bg-purple-400/5 rounded-full blur-[100px]"
        animate={{ 
          y: [0, 30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ 
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
        {/* Badge */}
        <motion.div 
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200/60 rounded-full mb-8 shadow-sm"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span 
            className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[13px] font-medium text-gray-600">Now with Chrome Built-in AI</span>
        </motion.div>
        
        {/* Main Headline with character animation */}
        <motion.h1 
          className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-gray-900 tracking-tight mb-8 leading-[1.1]"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Experience{' '}
          </motion.span>
          <motion.span
            className="bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent pb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            liftoff
          </motion.span>
        </motion.h1>
        
        <motion.p 
          className="text-xl sm:text-2xl lg:text-3xl text-gray-500 font-light mb-12 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          with the next-generation DevTools
        </motion.p>
        
        {/* CTAs with magnetic effect */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.a 
            href="https://github.com/johnnonsoBetter/DevConsole"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white text-[15px] font-semibold rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden"
            style={{ x: springX, y: springY }}
            onMouseMove={handleMagneticMove}
            onMouseLeave={handleMagneticLeave}
            whileTap={{ scale: 0.98 }}
          >
            <motion.span 
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <Download className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Download for Chrome</span>
            <motion.span 
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%', skewX: -20 }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
          </motion.a>
          <motion.a 
            href="#use-cases"
            className="flex items-center gap-2 px-8 py-4 bg-white text-gray-700 text-[15px] font-semibold rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Explore use cases</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </motion.a>
        </motion.div>
        
        {/* Browser Mockup */}
        <motion.div 
          className="max-w-6xl mx-auto perspective-1000"
          initial={{ opacity: 0, y: 60, rotateX: 10 }}
          animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroMockup />
        </motion.div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
};

// =============================================
// Hero Mockup
// =============================================
const HeroMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Logs' | 'Network' | 'AI Panel' | 'GitHub' | 'GraphQL'>('Logs');
  const [selectedLog, setSelectedLog] = useState<number>(2);
  const [showAIAnalysis, setShowAIAnalysis] = useState(true);
  
  const tabs = ['Logs', 'Network', 'AI Panel', 'GitHub', 'GraphQL'] as const;
  
  return (
    <motion.div 
      className="relative group rounded-2xl"
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.4 }}
    >
      {/* Glow effect on hover */}
      <motion.div 
        className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 rounded-[20px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      
      <div className="relative bg-[#0F1117] rounded-xl shadow-2xl overflow-hidden border border-gray-800/50 ring-1 ring-white/10">
        {/* Browser Chrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#161821] border-b border-gray-800/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-sm" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1.5 bg-[#0F1117] rounded-md text-[12px] text-gray-500 font-mono border border-gray-800/50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse" />
              DevConsole — Chrome DevTools
            </div>
          </div>
          <div className="w-20" />
        </div>
        
        {/* DevTools Content */}
        <div className="bg-[#0F1117] p-6 min-h-[480px]">
          {/* Tab Bar */}
          <div className="flex gap-1 mb-6 border-b border-gray-800/50 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-all relative ${
                  activeTab === tab 
                    ? 'text-purple-400 bg-gray-800/30 border-b-2 border-purple-500' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/20'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'Logs' && (
              <motion.div
                key="logs"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Log Entries */}
                <motion.div 
                  className="space-y-2 mb-6"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <LogEntryInteractive 
                    type="info" 
                    time="12:34:56" 
                    message="Application initialized successfully"
                    isSelected={selectedLog === 0}
                    onClick={() => { setSelectedLog(0); setShowAIAnalysis(true); }}
                  />
                  <LogEntryInteractive 
                    type="warn" 
                    time="12:34:57" 
                    message="Deprecated API usage detected in auth.js"
                    isSelected={selectedLog === 1}
                    onClick={() => { setSelectedLog(1); setShowAIAnalysis(true); }}
                  />
                  <LogEntryInteractive 
                    type="error" 
                    time="12:34:58" 
                    message="Failed to fetch user data: Network error"
                    isSelected={selectedLog === 2}
                    onClick={() => { setSelectedLog(2); setShowAIAnalysis(true); }}
                  />
                </motion.div>
                
                {/* AI Analysis Panel */}
                <AnimatePresence>
                  {showAIAnalysis && (
                    <AIAnalysisPanel 
                      logType={selectedLog === 0 ? 'info' : selectedLog === 1 ? 'warn' : 'error'}
                      onClose={() => setShowAIAnalysis(false)}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
            
            {/* Other tabs placeholders for brevity, can be expanded similarly */}
            {activeTab !== 'Logs' && (
               <motion.div
                key="placeholder"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center justify-center h-64 text-gray-600"
               >
                 <div className="text-center">
                   <p className="text-sm">Interactive demo for {activeTab}</p>
                   <p className="text-xs mt-2 opacity-50">Coming soon</p>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// Interactive Log Entry Component
interface LogEntryInteractiveProps {
  type: 'info' | 'warn' | 'error';
  time: string;
  message: string;
  isSelected: boolean;
  onClick: () => void;
}

const LogEntryInteractive: React.FC<LogEntryInteractiveProps> = ({ type, time, message, isSelected, onClick }) => {
  const badgeStyles = {
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer border ${
        isSelected ? 'bg-white/5 border-purple-500/30 ring-1 ring-purple-500/20' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
      }`}
    >
      <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border ${badgeStyles[type]}`}>
        {type}
      </span>
      <span className="text-[11px] text-gray-600 font-mono">{time}</span>
      <span className="flex-1 text-sm text-gray-300 font-mono">{message}</span>
      <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
        isSelected 
          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
          : 'bg-white/5 text-gray-400 hover:bg-purple-500 hover:text-white'
      }`}>
        <Sparkles className="w-3 h-3" />
        Explain
      </button>
    </div>
  );
};

// AI Analysis Panel Component
interface AIAnalysisPanelProps {
  logType: 'info' | 'warn' | 'error';
  onClose: () => void;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ logType, onClose }) => {
  const content = {
    info: {
      title: 'Initialization Complete',
      desc: 'Your application has successfully started. All modules loaded correctly.',
      items: ['All dependencies resolved', 'Service workers registered', 'Cache initialized'],
    },
    warn: {
      title: 'Deprecated API Warning',
      desc: 'This code uses APIs that are scheduled for removal. Consider updating:',
      items: ['Replace componentWillMount with useEffect', 'Use fetch() instead of XMLHttpRequest', 'Migrate to new routing syntax'],
    },
    error: {
      title: 'Network Error Detected',
      desc: 'This error indicates a network connectivity issue. Possible causes:',
      items: ['Server unavailability or downtime', 'CORS configuration issues', 'Network timeout exceeded'],
    },
  };
  
  const data = content[logType];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-5 mt-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-400">AI Analysis</span>
        <span className="ml-auto text-xs text-gray-500 font-mono">Gemini Nano</span>
        <button onClick={onClose} className="ml-2 text-gray-500 hover:text-white transition-colors">×</button>
      </div>
      <h4 className="text-sm font-semibold text-white mb-2">{data.title}</h4>
      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{data.desc}</p>
      <ul className="text-sm text-gray-400 space-y-1.5 mb-4">
        {data.items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {item}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20">
          Apply Fix
        </button>
        <button className="px-4 py-2 text-gray-400 text-xs font-medium hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg">
          Create GitHub Issue
        </button>
      </div>
    </motion.div>
  );
};
