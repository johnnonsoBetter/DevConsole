import { motion, useInView } from 'framer-motion';
import { ArrowRight, Github, Sparkles } from 'lucide-react';
import React, { useRef } from 'react';
import { slideInLeft, slideInRight, staggerContainer } from './animations';

export const FeatureShowcase: React.FC = () => {
  const features = [
    {
      badge: 'Core Feature',
      title: 'An AI IDE Core',
      description: 'DevConsole\'s AI engine offers intelligent log analysis, natural language code explanations, and context-aware suggestions. Stay inside DevTools while AI highlights root causes and fixes.',
      visual: 'ai-core',
    },
    {
      badge: 'Smart Abstractions',
      title: 'Higher-level Abstractions',
      description: 'Transform cryptic errors into actionable insights. Our AI understands your codebase context and provides explanations tailored to your stack and coding patterns.',
      visual: 'abstractions',
    },
    {
      badge: 'Integration',
      title: 'User Feedback',
      description: 'Create perfectly formatted GitHub issues directly from console errors. AI enhances your issues with context, reproduction steps, and suggested fixes—no copy-paste required.',
      visual: 'feedback',
    },
    {
      badge: 'Workflow',
      title: 'An Agent-First Experience',
      description: 'Manage all your debugging workflows from a central mission-control view. GraphQL explorer, network monitoring, and smart autofill work together seamlessly.',
      visual: 'agent-first',
    },
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      {features.map((feature, index) => {
        const FeatureItem = () => {
          const ref = useRef(null);
          const isInView = useInView(ref, { once: true, margin: "-50px" });
          const isReversed = index % 2 === 1;
          
          return (
            <div 
              key={feature.title}
              className={`py-24 px-6 lg:px-10 ${isReversed ? 'bg-white' : ''}`}
            >
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
                    variants={isReversed ? slideInRight : slideInLeft}
                  >
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
                      {feature.badge}
                    </span>
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-gray-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                  
                  {/* Visual */}
                  <motion.div 
                    className={isReversed ? 'lg:col-start-1' : ''}
                    variants={isReversed ? slideInLeft : slideInRight}
                  >
                    <FeatureVisual type={feature.visual} />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          );
        };
        
        return <FeatureItem key={feature.title} />;
      })}
    </section>
  );
};

// =============================================
// Feature Visual Component
// =============================================
const FeatureVisual: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'ai-core') {
    return (
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-[#1e1e2e] rounded-2xl p-6 shadow-2xl border border-gray-800">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-2 text-xs text-gray-500 font-mono">page.tsx</span>
          </div>
          <pre className="text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto">
            <code>
              <span className="text-purple-400">"use client"</span>;{'\n\n'}
              <span className="text-blue-400">export default function</span> <span className="text-yellow-300">Form</span>() {'{\n'}
              {'  '}<span className="text-blue-400">const</span> <span className="text-emerald-300">onSubmit</span> = () =&gt; {'{\n'}
              {'    '}<span className="text-gray-500">console</span>.<span className="text-yellow-300">log</span>(<span className="text-green-400">"Submitted"</span>);{'\n'}
              {'  }\n\n'}
              {'  '}<span className="text-purple-400">return</span> ({'\n'}
              {'    '}<span className="text-blue-300">&lt;form</span> <span className="text-purple-300">onSubmit</span>=<span className="text-emerald-300">{'{onSubmit}'}</span><span className="text-blue-300">&gt;</span>{'\n'}
              <span className="bg-purple-500/20 block px-2 -mx-2 rounded border-l-2 border-purple-500">{'      '}<span className="text-gray-400 italic">{'// AI suggests: Add e.preventDefault()'}</span></span>
              {'    '}<span className="text-blue-300">&lt;/form&gt;</span>{'\n'}
              {'  );\n}'}
            </code>
          </pre>
        </div>
        {/* Floating suggestion card */}
        <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-gray-100 max-w-[200px] animate-bounce-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-900">AI Suggestion</span>
          </div>
          <p className="text-xs text-gray-500">Add form validation before submit to prevent empty payloads.</p>
        </div>
      </div>
    );
  }
  
  if (type === 'abstractions') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100 shadow-lg">
        <div className="space-y-4">
          {/* Error Input */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded uppercase">Error</span>
            </div>
            <code className="text-sm text-red-500 font-mono break-all">TypeError: Cannot read property 'map' of undefined</code>
          </div>
          
          {/* Arrow */}
          <div className="flex justify-center py-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
              <ArrowRight className="w-4 h-4 text-purple-600 rotate-90" />
            </div>
          </div>
          
          {/* AI Explanation */}
          <div className="bg-white rounded-xl p-4 shadow-apple-md border border-purple-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-900">Plain English</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              You're trying to loop through an array that doesn't exist yet. 
              The data probably hasn't loaded—add a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">if (!data) return null</code> check before rendering.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (type === 'feedback') {
    return (
      <div className="bg-[#1e1e2e] rounded-2xl p-6 shadow-2xl border border-gray-800">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
          <Github className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-white">New Issue</span>
          <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">Auto-generated</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title</label>
            <div className="bg-white/5 rounded-lg p-3 text-sm text-white border border-white/10">
              [Bug] Network error when fetching user data
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300 leading-relaxed border border-white/10 font-mono text-xs">
              <p className="mb-2 text-purple-400">## Description</p>
              <p className="text-gray-400 mb-3">The fetch request to /api/users fails with a network error.</p>
              <p className="mb-2 text-purple-400">## Steps to Reproduce</p>
              <p className="text-gray-400">1. Open the app</p>
              <p className="text-gray-400">2. Navigate to users page</p>
            </div>
          </div>
          <button className="w-full py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20">
            Create Issue
          </button>
        </div>
      </div>
    );
  }
  
  // agent-first
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-6">
          {['Console', 'Network', 'GraphQL', 'Settings'].map((tab, i) => (
            <span key={tab} className={`text-sm font-medium cursor-pointer ${i === 2 ? 'text-purple-600 border-b-2 border-purple-600 pb-4 -mb-4.5' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div className="p-6 bg-gray-50/30">
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Endpoint</div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <span className="text-sm font-mono text-gray-700">https://api.example.com/graphql</span>
            <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wide">Connected</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1e1e2e] rounded-lg p-4 shadow-inner">
            <div className="text-xs text-gray-500 mb-2 font-mono">Query</div>
            <pre className="text-xs font-mono text-emerald-400">
{`query {
  users {
    id
    name
    email
  }
}`}
            </pre>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 mb-2 font-mono">Response</div>
            <pre className="text-xs font-mono text-gray-600">
{`{
  "users": [
    { "id": 1, ... }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
