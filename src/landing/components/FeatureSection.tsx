import { motion, useInView } from 'framer-motion';
import React, { useRef } from 'react';

interface FeatureSectionProps {
  title: string;
  description: string;
  image?: React.ReactNode;
  align?: 'left' | 'right';
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({ 
  title, 
  description, 
  image, 
  align = 'left' 
}) => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <section ref={containerRef} className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className={`flex flex-col lg:flex-row items-center gap-16 ${align === 'right' ? 'lg:flex-row-reverse' : ''}`}>
          {/* Text Content */}
          <motion.div 
            className="flex-1"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">{title}</h3>
            <p className="text-lg text-gray-600 leading-relaxed">{description}</p>
          </motion.div>

          {/* Image/Visual Content */}
          <motion.div 
            className="flex-1 w-full"
            initial={{ opacity: 0, scale: 0.95, x: align === 'left' ? 50 : -50 }}
            animate={isInView ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm min-h-[400px] flex items-center justify-center">
              {image || <div className="text-gray-400">Feature Visual Placeholder</div>}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
