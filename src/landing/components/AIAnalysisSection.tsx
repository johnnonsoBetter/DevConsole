import { motion, useInView } from 'framer-motion';
import { AlertTriangle, ArrowRight, Bot, Brain, Bug, ChevronRight, Code2, ExternalLink, Lightbulb, MessageSquare, Sparkles, Wand2, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { fadeInUp, staggerContainer } from './animations';

// AI Analysis Panel mockup
const AIAnalysisMockup: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-blue-500/30 rounded-3xl blur-3xl opacity-60" />
      
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-50 via-white to-blue-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">AI Log Analysis</h3>
                <p className="text-[11px] text-gray-500">Powered by GPT-4 / Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-600 text-[10px] font-semibold rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                Analyzing
              </span>
            </div>
          </div>
        </div>

        {/* Error being analyzed */}
        <div className="p-4 bg-red-50/50 border-b border-red-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bug className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-red-700">TypeError</span>
                <span className="text-[10px] text-red-500/70">at App.tsx:142</span>
              </div>
              <p className="text-xs text-red-600 font-mono break-all">
                Cannot read properties of undefined (reading 'map')
              </p>
            </div>
          </div>
        </div>

        {/* AI Response */}
        <div className="p-5 space-y-4">
          {/* Root Cause */}
          {phase >= 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Root Cause</span>
              </div>
              <div className="pl-8">
                <p className="text-sm text-gray-700 leading-relaxed">
                  The <code className="px-1.5 py-0.5 bg-gray-100 rounded text-purple-600 text-xs font-mono">users</code> array is undefined when the component first renders. The API call hasn't completed yet.
                </p>
              </div>
            </motion.div>
          )}

          {/* Severity Badge */}
          {phase >= 2 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 pl-8"
            >
              <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full">
                Medium Severity
              </span>
              <span className="text-[11px] text-gray-400">• Common React pattern issue</span>
            </motion.div>
          )}

          {/* Suggested Fix */}
          {phase >= 3 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Suggested Fix</span>
              </div>
              <div className="pl-8">
                <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                  <div className="text-gray-500">{'// Add optional chaining or default value'}</div>
                  <div className="mt-1">
                    <span className="text-pink-400">const</span>
                    <span className="text-blue-300"> items</span>
                    <span className="text-gray-300"> = </span>
                    <span className="text-blue-300">users</span>
                    <span className="text-emerald-400">?.</span>
                    <span className="text-yellow-300">map</span>
                    <span className="text-gray-300">(</span>
                    <span className="text-orange-300">user</span>
                    <span className="text-gray-300"> {'=>'} ...)</span>
                  </div>
                  <div className="text-gray-500 mt-2">{'// Or use default array'}</div>
                  <div className="mt-1">
                    <span className="text-pink-400">const</span>
                    <span className="text-blue-300"> items</span>
                    <span className="text-gray-300"> = (</span>
                    <span className="text-blue-300">users</span>
                    <span className="text-gray-300"> || []).</span>
                    <span className="text-yellow-300">map</span>
                    <span className="text-gray-300">(...)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          {phase >= 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 pl-8 pt-2"
            >
              <button className="px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-purple-600 transition-colors shadow-sm">
                <Wand2 className="w-3 h-3" />
                Apply Fix
              </button>
              <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition-colors">
                <MessageSquare className="w-3 h-3" />
                Create Issue
              </button>
              <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition-colors">
                <ExternalLink className="w-3 h-3" />
                Docs
              </button>
            </motion.div>
          )}

          {/* Related Patterns */}
          {phase >= 5 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 pt-4 border-t border-gray-100"
            >
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Related Patterns</p>
              <div className="flex flex-wrap gap-2">
                {['Conditional Rendering', 'Loading States', 'Error Boundaries'].map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] rounded-md border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Feature highlight
const HighlightCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
}> = ({ icon: Icon, title, description, gradient }) => (
  <div className="relative group">
    <div className={`absolute inset-0 ${gradient} rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`} />
    <div className="relative flex items-start gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 hover:border-gray-200 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

export const AIAnalysisSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 px-6 lg:px-10 bg-white overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1400px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div variants={fadeInUp} className="lg:order-1 order-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50 rounded-full mb-6">
              <Bot className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">AI-Powered</span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6 leading-[1.15]">
              Understand errors<br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                in seconds, not hours
              </span>
            </h2>

            <p className="text-lg text-gray-500 leading-relaxed mb-10">
              Select any console error and get instant root cause analysis. No more Googling 
              cryptic error messages or digging through Stack Overflow. Get suggested fixes 
              with one-click apply.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 mb-8">
              <HighlightCard
                icon={Brain}
                title="Root Cause Detection"
                description="AI identifies the underlying issue, not just the symptom"
                gradient="bg-gradient-to-br from-purple-500 to-pink-500"
              />
              <HighlightCard
                icon={Code2}
                title="Code Suggestions"
                description="Get working code snippets you can apply with one click"
                gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
              />
              <HighlightCard
                icon={Zap}
                title="Severity Assessment"
                description="Know which errors need immediate attention"
                gradient="bg-gradient-to-br from-orange-500 to-red-500"
              />
            </div>

            {/* CTA */}
            <button className="group flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all hover:shadow-lg">
              <span>See it in action</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Right - Visual */}
          <motion.div variants={fadeInUp} className="lg:order-2 order-1">
            <AIAnalysisMockup />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
