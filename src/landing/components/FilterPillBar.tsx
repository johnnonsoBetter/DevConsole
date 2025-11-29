import { motion, useInView } from 'framer-motion';
import React, { useRef, useState } from 'react';
import { fadeIn } from './animations';

export const FilterPillBar: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All Features');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const filters = [
    'All Features',
    'AI Powered',
    'Console & Logs',
    'Network',
    'GitHub',
    'GraphQL',
    'Autofill',
  ];

  return (
    <section className="py-12 px-6 lg:px-10 bg-gray-50/50 border-y border-gray-100">
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={fadeIn}
      >
        {/* Pills container with soft shadow */}
        <div className="flex flex-wrap justify-center gap-3">
          {filters.map((filter, index) => (
            <motion.button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                relative px-6 py-3 rounded-full text-sm font-medium transition-all duration-300
                ${activeFilter === filter 
                  ? 'bg-white text-gray-900 shadow-apple-md' 
                  : 'bg-white/60 text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-apple-sm'
                }
              `}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: '0 10px 40px -10px rgba(147, 51, 234, 0.15)'
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Glow effect on active */}
              {activeFilter === filter && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-emerald-500/5"
                  layoutId="activeFilterGlow"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{filter}</span>
            </motion.button>
          ))}
        </div>
        
        {/* Optional: Active filter indicator */}
        <motion.p 
          className="text-center mt-8 text-sm text-gray-500"
          key={activeFilter}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Showing <span className="font-medium text-gray-900">{activeFilter}</span> capabilities
        </motion.p>
      </motion.div>
    </section>
  );
};
