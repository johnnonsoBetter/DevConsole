import { motion, useInView } from 'framer-motion';
import { Play } from 'lucide-react';
import React, { useRef } from 'react';
import { fadeInUp, scaleIn, staggerContainer } from './animations';

export const ProductOverview: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
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
          className="max-w-3xl mb-20"
          variants={fadeInUp}
        >
          <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">
            The Platform
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            An agentic debugging platform
          </h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            DevConsole brings AI-powered debugging directly into Chrome DevTools. 
            Understand errors instantly, create GitHub issues automatically, and explore 
            APIs without leaving your workflow.
          </p>
        </motion.div>
        
        {/* Video Embed Placeholder */}
        <motion.div 
          className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer shadow-2xl shadow-purple-900/10"
          variants={scaleIn}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg"
              whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.2)' }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Play className="w-8 h-8 text-white ml-1 fill-white" />
            </motion.div>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
            <span className="text-white/90 text-sm font-medium">Watch the 90-second overview</span>
            <span className="text-white/70 text-sm font-mono bg-black/30 px-2 py-1 rounded">1:30</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
