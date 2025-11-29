import { motion, useInView } from 'framer-motion';
import React, { useRef } from 'react';
import { fadeInUp, staggerContainer } from './animations';

export const MassiveStatementSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <section className="py-40 px-6 lg:px-10 bg-white border-t border-gray-100">
      <motion.div 
        ref={ref}
        className="max-w-[1400px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Massive headline with extreme spacing */}
        <motion.h2 
          className="text-[clamp(3rem,8vw,7rem)] font-bold text-gray-900 tracking-[-0.04em] leading-[0.95] mb-16"
          variants={fadeInUp}
        >
          <span className="block">Debug</span>
          <span className="block text-gray-300">with intelligence.</span>
          <span className="block">Build</span>
          <span className="block text-gray-300">with confidence.</span>
        </motion.h2>
        
        {/* Wide-spaced subtext */}
        <motion.p 
          className="text-xl sm:text-2xl lg:text-3xl text-gray-500 font-light max-w-3xl leading-relaxed tracking-wide"
          variants={fadeInUp}
        >
          AI-powered insights that understand your code.
          <span className="block mt-4 text-gray-400">
            Zero context switching. Maximum productivity.
          </span>
        </motion.p>
      </motion.div>
    </section>
  );
};
