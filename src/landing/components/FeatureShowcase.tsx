import { motion, useInView } from 'framer-motion';
import { Github, Network, Sparkles, Video } from 'lucide-react';
import React, { useRef } from 'react';
import { fadeInUp, staggerContainer } from './animations';

interface Feature {
  badge: string;
  title: string;
  description: string;
  screenshot: string;
  icon: React.ElementType;
  color: string;
}

const features: Feature[] = [
  {
    badge: 'AI-Powered',
    title: 'AI Log Analysis',
    description: 'Select any console error and get instant root cause analysis, suggested fixes, and severity assessment. No more Googling cryptic error messages.',
    screenshot: '/store-assets/screenshot-5-ai-log-analysis.png',
    icon: Sparkles,
    color: 'purple',
  },
  {
    badge: 'One-Click',
    title: 'GitHub Issues',
    description: 'Create perfectly formatted GitHub issues directly from console errors. Auto-includes error context, stack traces, network requests, and browser info.',
    screenshot: '/store-assets/screenshot-3-github-issues.png',
    icon: Github,
    color: 'emerald',
  },
  {
    badge: 'Smart Detection',
    title: 'Network Monitor',
    description: 'Automatically detects and labels GraphQL operations from hundreds of network requests. Full request/response inspection with headers and timing.',
    screenshot: '/store-assets/screenshot-4-code-actions.png',
    icon: Network,
    color: 'blue',
  },
  {
    badge: 'Video + Memory',
    title: 'Rooms with Memory',
    description: 'Video calls powered by LiveKit with Deepgram transcription. SmartMemory stores every conversation—search across past meetings instantly.',
    screenshot: '/store-assets/screenshot-2-video-tab.png',
    icon: Video,
    color: 'pink',
  },
];

const colorClasses: Record<string, { badge: string; icon: string }> = {
  purple: { badge: 'bg-purple-100 text-purple-700', icon: 'bg-purple-100 text-purple-600' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', icon: 'bg-emerald-100 text-emerald-600' },
  blue: { badge: 'bg-blue-100 text-blue-700', icon: 'bg-blue-100 text-blue-600' },
  pink: { badge: 'bg-pink-100 text-pink-700', icon: 'bg-pink-100 text-pink-600' },
};

const FeatureItem: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const isReversed = index % 2 === 1;
  const colors = colorClasses[feature.color];
  const Icon = feature.icon;
  
  return (
    <div className={`py-24 px-6 lg:px-10 ${isReversed ? 'bg-white' : ''}`}>
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className={`grid lg:grid-cols-2 gap-16 items-center ${isReversed ? 'lg:grid-flow-dense' : ''}`}>
          {/* Text Content */}
          <motion.div 
            className={isReversed ? 'lg:col-start-2' : ''}
            variants={fadeInUp}
          >
            <span className={`inline-flex items-center gap-2 px-3 py-1 ${colors.badge} text-xs font-semibold rounded-full mb-6 uppercase tracking-wider`}>
              <Icon className="w-3.5 h-3.5" />
              {feature.badge}
            </span>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              {feature.title}
            </h3>
            <p className="text-lg text-gray-500 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
          
          {/* Screenshot */}
          <motion.div 
            className={isReversed ? 'lg:col-start-1' : ''}
            variants={fadeInUp}
          >
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Screenshot container */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-900">
                <img 
                  src={feature.screenshot}
                  alt={feature.title}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export const FeatureShowcase: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-gray-50">
      {features.map((feature, index) => (
        <FeatureItem key={feature.title} feature={feature} index={index} />
      ))}
    </section>
  );
};
