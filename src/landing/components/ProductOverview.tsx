import { motion, useInView } from 'framer-motion';
import { Brain, Bug, Code2, Github, Network, Video } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { fadeInUp, scaleIn, staggerContainer } from './animations';

export const ProductOverview: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState<'devtools' | 'video'>('devtools');

  const tabs = [
    { id: 'devtools', label: 'DevTools Enhancement', icon: Code2 },
    { id: 'video', label: 'Rooms with Memory', icon: Video },
  ] as const;

  const features = {
    devtools: [
      { icon: Bug, title: 'AI Log Analysis', desc: 'Get instant root cause analysis for any error' },
      { icon: Network, title: 'Network Monitor', desc: 'Auto-detect GraphQL operations' },
      { icon: Github, title: 'GitHub Issues', desc: 'One-click bug reports with full context' },
    ],
    video: [
      { icon: Video, title: 'HD Video Calls', desc: 'LiveKit-powered conferencing' },
      { icon: Brain, title: 'SmartMemory', desc: 'Every conversation stored and indexed' },
      { icon: Code2, title: 'Live Insights', desc: 'Questions, decisions, action items extracted' },
    ],
  };
  
  return (
    <section id="product" className="py-32 px-6 lg:px-10 bg-white">
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Section Header */}
        <motion.div 
          className="max-w-3xl mb-12"
          variants={fadeInUp}
        >
          <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">
            Two Powerful Pillars
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            DevTools + Video Calls
          </h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            Enhanced debugging inside Chrome DevTools, plus video calls that remember 
            every decision your team makes.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div 
          className="flex gap-2 p-1.5 bg-gray-100 rounded-xl w-fit mb-10"
          variants={fadeInUp}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>
        
        {/* Screenshot Display */}
        <motion.div 
          className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-2xl shadow-purple-900/10 mb-12"
          variants={scaleIn}
        >
          <img 
            src={activeTab === 'devtools' 
              ? '/store-assets/screenshot-1280x800.png' 
              : '/store-assets/screenshot-2-video-tab.png'
            }
            alt={activeTab === 'devtools' ? 'DevConsole DevTools Panel' : 'Video Calls with Memory'}
            className="w-full h-auto"
          />
        </motion.div>

        {/* Feature Pills */}
        <motion.div 
          className="grid md:grid-cols-3 gap-6"
          variants={staggerContainer}
        >
          {features[activeTab].map((feature) => (
            <motion.div
              key={feature.title}
              className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              variants={fadeInUp}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};
