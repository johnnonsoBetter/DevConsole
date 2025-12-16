import { motion, useInView } from 'framer-motion';
import { Brain, CheckCircle2, HelpCircle, Lightbulb, ListTodo, Search } from 'lucide-react';
import React, { useRef } from 'react';
import { fadeInUp, scaleIn, staggerContainer } from './animations';

export const RoomsWithMemorySection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const insights = [
    { type: 'question', icon: HelpCircle, label: 'Questions', count: 3, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { type: 'decision', icon: CheckCircle2, label: 'Decisions', count: 2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { type: 'action', icon: ListTodo, label: 'Action Items', count: 4, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { type: 'topic', icon: Lightbulb, label: 'Key Topics', count: 5, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <section id="rooms-with-memory" className="py-32 px-6 lg:px-10 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Section Header */}
        <motion.div className="text-center mb-16" variants={fadeInUp}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Powered by SmartMemory</span>
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Rooms with Memory
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Video calls that remember every decision, action item, and key topic. 
            Never lose context from your team syncs again.
          </p>
        </motion.div>

        {/* Main Visual - Video Call Screenshot */}
        <motion.div 
          className="relative mb-16"
          variants={scaleIn}
        >
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 rounded-3xl blur-2xl" />
          
          {/* Screenshot Container */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-700/50 shadow-2xl">
            <img 
              src="/store-assets/screenshot-1-video-call-memory.png" 
              alt="Video call with memory insights"
              className="w-full h-auto"
            />
            
            {/* Overlay gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
            
            {/* Live indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/90 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-white">LIVE</span>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
        >
          {insights.map((insight, index) => (
            <motion.div
              key={insight.type}
              className="relative group"
              variants={fadeInUp}
              custom={index}
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl ${insight.bg} flex items-center justify-center mb-4`}>
                  <insight.icon className={`w-6 h-6 ${insight.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{insight.label}</h3>
                <p className="text-sm text-gray-400">
                  Automatically extracted from your conversations in real-time
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-2xl font-bold ${insight.color}`}>{insight.count}</span>
                  <span className="text-xs text-gray-500">detected</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Features */}
        <motion.div 
          className="mt-16 grid md:grid-cols-3 gap-8"
          variants={staggerContainer}
        >
          <motion.div className="flex items-start gap-4" variants={fadeInUp}>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Mic className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Live Transcription</h4>
              <p className="text-sm text-gray-400">Deepgram-powered speech-to-text captures every word in real-time</p>
            </div>
          </motion.div>

          <motion.div className="flex items-start gap-4" variants={fadeInUp}>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Persistent Memory</h4>
              <p className="text-sm text-gray-400">SmartMemory stores and indexes conversations across sessions</p>
            </div>
          </motion.div>

          <motion.div className="flex items-start gap-4" variants={fadeInUp}>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Searchable History</h4>
              <p className="text-sm text-gray-400">"What did we decide last week?" — get instant answers</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};
