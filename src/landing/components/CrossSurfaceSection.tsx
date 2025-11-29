import { MessageSquare, Terminal, Zap } from 'lucide-react';
import React from 'react';

export const CrossSurfaceSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-gray-50 border-t border-gray-200">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Cross-surface Agents
            </h2>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              Synchronized agentic control across your editor, terminal, and browser for powerful development workflows.
            </p>
            
            {/* Feature List */}
            <div className="space-y-6">
              {[
                { icon: Zap, title: 'Real-time Sync', desc: 'Changes propagate instantly across all surfaces' },
                { icon: MessageSquare, title: 'Context Aware', desc: 'AI understands your full development context' },
                { icon: Terminal, title: 'Universal Access', desc: 'Debug from anywhere in your workflow' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Visual */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
              {/* Header */}
              <div className="bg-[#1e1e2e] px-4 py-3 border-b border-gray-800 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-gray-500 font-mono">Agent Dashboard</span>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Progress Section */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">Verify Changes</span>
                    <span className="text-xs text-gray-500 font-mono">Nov 14 3:48 PM</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    I have integrated the component into the main page. Now I will verify the changes.
                  </p>
                  
                  {/* Task List */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-gray-300">Verifying changes by checking the browser</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      </span>
                      <span className="text-gray-300">Running automated tests</span>
                    </div>
                  </div>
                </div>
                
                {/* Create Walkthrough */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-2">Create Walkthrough</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    I have verified that the component is displayed correctly. The code logic is sound.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-3 border border-gray-100 animate-bounce-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-900">Playback available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
