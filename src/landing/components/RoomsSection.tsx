import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ArrowRight, Brain, CheckCircle2, FileText, ListTodo, MessageSquare, Mic, Search, Users, Video } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ============================================
// MOCKUP COMPONENTS
// ============================================

// Video Call Mockup
const VideoCallMockup: React.FC = () => {
  const [activeSpeaker, setActiveSpeaker] = useState(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSpeaker(prev => prev === 4 ? 1 : prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const participants = [
    { initials: 'JD', name: 'John', gradient: 'from-blue-600 to-purple-600' },
    { initials: 'SC', name: 'Sarah', gradient: 'from-pink-600 to-rose-600' },
    { initials: 'MW', name: 'Mike', gradient: 'from-emerald-600 to-teal-600' },
    { initials: 'AK', name: 'Alex', gradient: 'from-orange-600 to-amber-600' },
  ];

  return (
    <div className="bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-800 overflow-hidden">
      {/* Video Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gray-800/80 backdrop-blur border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white">Team Standup</div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 flex items-center gap-1 sm:gap-2">
              <Users className="w-3 h-3" />
              <span className="hidden xs:inline">4 participants •</span> 23:45
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[9px] sm:text-[11px] font-bold text-red-400">REC</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-2 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3">
        {participants.map((p, i) => (
          <motion.div 
            key={i}
            animate={{ 
              scale: activeSpeaker === i + 1 ? 1.02 : 1,
              borderColor: activeSpeaker === i + 1 ? 'rgb(16, 185, 129)' : 'transparent',
            }}
            className={`rounded-lg sm:rounded-xl overflow-hidden border-2 transition-colors ${activeSpeaker === i + 1 ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent'}`}
          >
            <div className={`aspect-video bg-gradient-to-br ${p.gradient} flex flex-col items-center justify-center relative`}>
              <span className="text-white text-lg sm:text-2xl font-bold">{p.initials}</span>
              <span className="text-white/70 text-[9px] sm:text-[10px] mt-0.5 sm:mt-1">{p.name}</span>
              {activeSpeaker === i + 1 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-emerald-500 rounded-full"
                >
                  <Mic className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                  <span className="text-[8px] sm:text-[9px] text-white font-bold hidden xs:inline">Speaking</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gray-800/80 backdrop-blur border-t border-gray-700 flex items-center justify-center gap-2 sm:gap-4">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
        >
          <Video className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-10 sm:w-14 sm:h-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        >
          <span className="text-[10px] sm:text-xs font-bold">END</span>
        </motion.button>
      </div>
    </div>
  );
};

// Transcript Mockup
const TranscriptMockup: React.FC = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines(v => v < 4 ? v + 1 : v);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const lines = [
    { speaker: 'John', color: 'blue', text: "Let's discuss the Q4 roadmap priorities." },
    { speaker: 'Sarah', color: 'pink', text: "I think we should focus on mobile first." },
    { speaker: 'Mike', color: 'emerald', text: "Analytics show 60% mobile traffic now." },
    { speaker: 'John', color: 'blue', text: "Okay, let's prioritize mobile." },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    pink: 'bg-pink-500',
    emerald: 'bg-emerald-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-gray-900">Live Transcript</div>
            <div className="text-[10px] sm:text-[11px] text-gray-500">Deepgram • Real-time</div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-100 rounded-full">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-bold text-purple-600">LIVE</span>
        </div>
      </div>

      <div className="p-3 sm:p-5 space-y-2.5 sm:space-y-4">
        {lines.slice(0, visibleLines).map((line, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2 sm:gap-3"
          >
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold text-white flex-shrink-0 ${colorMap[line.color]}`}>
              {line.speaker[0]}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 block mb-0.5">{line.speaker}</span>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{line.text}</p>
            </div>
          </motion.div>
        ))}
        
        {visibleLines >= 4 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 sm:gap-2 text-gray-400 text-[10px] sm:text-xs"
          >
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 rounded-full animate-pulse" />
            <span>Listening...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Insights Mockup
const InsightsMockup: React.FC = () => {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const insights = [
    { type: 'Decision', icon: CheckCircle2, text: 'Prioritize mobile experience for Q4', color: 'emerald', bg: 'bg-emerald-50 border-emerald-200' },
    { type: 'Action Item', icon: ListTodo, text: 'Sarah to draft mobile specs by Friday', color: 'amber', bg: 'bg-amber-50 border-amber-200' },
    { type: 'Question', icon: MessageSquare, text: "What's the timeline for API v2?", color: 'blue', bg: 'bg-blue-50 border-blue-200' },
  ];

  const iconColors: Record<string, string> = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100 flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <div className="text-xs sm:text-sm font-bold text-gray-900">SmartMemory Insights</div>
          <div className="text-[10px] sm:text-[11px] text-gray-500">Auto-extracted</div>
        </div>
      </div>

      <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
        <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2 sm:mb-4">Extracted from this call</div>
        
        {insights.map((insight, i) => (
          phase >= i + 1 && (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-colors ${insight.bg}`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${iconColors[insight.color]}`}>
                  <insight.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${iconColors[insight.color]}`}>{insight.type}</span>
                  <p className="text-xs sm:text-sm font-medium text-gray-800 mt-0.5 truncate sm:whitespace-normal">{insight.text}</p>
                </div>
              </div>
            </motion.div>
          )
        ))}
      </div>
    </div>
  );
};

// Memory Search Mockup
const MemorySearchMockup: React.FC = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  useEffect(() => {
    const timer1 = setTimeout(() => setIsSearching(true), 500);
    const timer2 = setTimeout(() => {
      setIsSearching(false);
      setShowResults(true);
    }, 1500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const results = [
    { date: 'Dec 15', meeting: 'Team Standup', snippet: '...prioritize mobile experience...', match: 'mobile experience' },
    { date: 'Dec 10', meeting: 'Product Review', snippet: '...mobile traffic at 60%...', match: 'mobile traffic' },
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100 flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <div className="text-xs sm:text-sm font-bold text-gray-900">Memory Search</div>
          <div className="text-[10px] sm:text-[11px] text-gray-500">Search all conversations</div>
        </div>
      </div>

      <div className="p-3 sm:p-5">
        {/* Search Input */}
        <div className="relative mb-4 sm:mb-6">
          <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-lg sm:rounded-xl border-2 transition-colors ${isSearching ? 'border-emerald-400 ring-2 sm:ring-4 ring-emerald-100' : 'border-gray-200'}`}>
            <Search className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isSearching ? 'text-emerald-500' : 'text-gray-400'}`} />
            <span className="text-xs sm:text-sm text-gray-600 truncate">What did we decide about mobile?</span>
            {isSearching && (
              <div className="ml-auto w-4 h-4 sm:w-5 sm:h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 sm:space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider font-bold">Results</span>
                <span className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold">2 matches</span>
              </div>
              
              {results.map((result, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl cursor-pointer transition-all border border-transparent hover:border-emerald-200"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono">{result.date}</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-900 truncate">{result.meeting}</span>
                    <span className="ml-auto px-1.5 sm:px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] sm:text-[9px] font-bold rounded-full flex-shrink-0">Match</span>
                  </div>
                  <p className="text-[10px] sm:text-sm text-gray-600 truncate">
                    {result.snippet}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// FEATURE CONFIGURATION
// ============================================

const roomsFeatures = {
  video: {
    id: 'video',
    label: 'Video',
    icon: Video,
    color: 'pink',
    mockup: VideoCallMockup,
    title: 'HD video conferencing',
    description: 'Crystal clear video calls powered by LiveKit. Share screens, collaborate in real-time, and never worry about call quality.',
    bullets: [
      'LiveKit-powered HD video & audio',
      'Screen sharing and collaboration',
      'Works in any browser, no plugins needed',
    ],
  },
  transcript: {
    id: 'transcript',
    label: 'Transcript',
    icon: Mic,
    color: 'purple',
    mockup: TranscriptMockup,
    title: 'Live transcription',
    description: 'Every word captured in real-time with Deepgram integration. Never miss a detail from your team conversations.',
    bullets: [
      'Real-time speech-to-text',
      'Automatic speaker identification',
      'Fully searchable transcript history',
    ],
  },
  insights: {
    id: 'insights',
    label: 'Insights',
    icon: Brain,
    color: 'amber',
    mockup: InsightsMockup,
    title: 'Smart extraction',
    description: 'AI automatically extracts decisions, action items, and key topics from your conversations. Stay organized without effort.',
    bullets: [
      'Auto-detect decisions and action items',
      'Key topic and theme extraction',
      'Meeting summaries generated automatically',
    ],
  },
  memory: {
    id: 'memory',
    label: 'Memory',
    icon: Search,
    color: 'emerald',
    mockup: MemorySearchMockup,
    title: 'Searchable history',
    description: '"What did we decide last week?" — get instant answers. SmartMemory stores and indexes everything for instant recall.',
    bullets: [
      'Search across all conversations',
      'Find any past decision instantly',
      'Build a persistent team knowledge base',
    ],
  },
};

type FeatureId = keyof typeof roomsFeatures;

// ============================================
// MAIN COMPONENT
// ============================================

export const RoomsSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFeature, setActiveFeature] = useState<FeatureId>('video');

  const feature = roomsFeatures[activeFeature];
  const Mockup = feature.mockup;

  return (
    <section id="rooms" className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-10 bg-gray-50 overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Section Header */}
        <motion.div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 lg:mb-12" variants={fadeInUp}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-2 sm:mb-4">
            Rooms with Memory
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-500 px-2">
            HD video with live transcription, AI insights, and searchable memory.
          </p>
        </motion.div>

        {/* Mobile Feature Tabs - 2x2 Grid */}
        <motion.div className="sm:hidden mb-6" variants={fadeInUp}>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(roomsFeatures).map((f) => {
              const isActive = activeFeature === f.id;
              const Icon = f.icon;
              
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFeature(f.id as FeatureId)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Desktop Feature Tabs */}
        <motion.div className="hidden sm:block mb-8 lg:mb-10" variants={fadeInUp}>
          <div className="flex justify-center">
            <div className="inline-flex gap-1 p-1 bg-white rounded-lg border border-gray-200">
              {Object.values(roomsFeatures).map((f) => {
                const isActive = activeFeature === f.id;
                const Icon = f.icon;
                
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFeature(f.id as FeatureId)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Mobile Content - Stacked Layout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Mobile Layout */}
            <div className="lg:hidden">
              {/* Info Card */}
              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.bullets.slice(0, 2).map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Mockup */}
              <div className="rounded-xl overflow-hidden">
                <Mockup />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-16 items-center">
              {/* Left - Content */}
              <div className="lg:pt-4">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed mb-8">
                  {feature.description}
                </p>

                <ul className="space-y-4">
                  {feature.bullets.map((bullet, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-base text-gray-700">{bullet}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-10"
                >
                  <button className="group flex items-center gap-2 text-gray-900 font-semibold hover:text-purple-600 transition-colors">
                    <span>Learn more about {feature.label}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>

              {/* Right - Mockup */}
              <div>
                <Mockup />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

export default RoomsSection;
