import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ArrowRight, BookOpen, Bug, CheckCircle2, Github, MessageSquare, Network, Plus, Sparkles, Terminal, Wand2, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ============================================
// MOCKUP COMPONENTS
// ============================================

// Console/Logs Terminal Mockup
const ConsoleTerminalMockup: React.FC = () => {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2000),
      setTimeout(() => setPhase(5), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-[#0d1117] rounded-xl sm:rounded-2xl overflow-hidden font-mono text-[11px] sm:text-[13px]">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-[#161b22] border-b border-gray-800">
        <div className="flex gap-1.5 sm:gap-2">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs text-gray-500 truncate">devconsole — terminal</span>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 bg-emerald-500/10 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-3 sm:p-5 space-y-2 sm:space-y-3 min-h-[260px] sm:min-h-[340px]">
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
            <span className="text-emerald-400">❯</span>
            <span className="text-purple-400">devconsole</span>
            <span className="text-gray-400">build</span>
          </motion.div>
        )}
        
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-4 space-y-1.5 text-gray-400">
            <div className="flex items-center gap-2"><span className="text-blue-400">●</span> Bundling modules...</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <span className="text-gray-300">tsc && vite build</span></div>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-4 border-l-2 border-gray-700 ml-1 pl-3 space-y-1 text-gray-500 text-xs">
            <div><span className="text-cyan-400">[vite]</span> <span className="text-gray-400">343ms</span> bundle 3867 modules</div>
            <div><span className="text-cyan-400">[vite]</span> Built version <span className="text-purple-400">0.2.67</span></div>
            <div className="text-emerald-400">Build completed with code <span className="font-bold">0</span></div>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-4">
            <div className="text-gray-500 flex items-center gap-2 text-sm"><Zap className="w-3.5 h-3.5 text-yellow-500" />Running tests...</div>
            <div className="pl-4 space-y-1 text-xs">
              <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold">✓</span> <span className="text-gray-300">should restrict tools</span> <span className="text-gray-600">2.58ms</span></div>
              <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold">✓</span> <span className="text-gray-300">should allow tools</span> <span className="text-gray-600">0.20ms</span></div>
              <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold">✓</span> <span className="text-gray-300">should combine configs</span> <span className="text-gray-600">0.47ms</span></div>
            </div>
          </motion.div>
        )}

        {phase >= 5 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
          >
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">All 47 tests passing</span>
              <span className="text-emerald-400/60 text-xs ml-auto">3.2s</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// AI Analysis Mockup
const AIAnalysisMockup: React.FC = () => {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <div className="text-xs sm:text-sm font-bold text-gray-900">AI Log Analysis</div>
          <div className="text-[10px] sm:text-[11px] text-gray-500">Powered by GPT-4 / Claude</div>
        </div>
      </div>

      {/* Error */}
      <div className="p-3 sm:p-4 bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-2 text-[10px] sm:text-xs">
          <Bug className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
          <span className="font-bold text-red-700">TypeError</span>
          <span className="text-red-500/70 font-mono truncate">at App.tsx:142</span>
        </div>
        <p className="text-[10px] sm:text-xs text-red-600 font-mono mt-1.5 bg-red-100/50 px-2 py-1 rounded truncate">Cannot read properties of undefined (reading 'map')</p>
      </div>

      {/* Analysis */}
      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 min-h-[200px] sm:min-h-[260px]">
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-[9px] sm:text-[10px] text-purple-600 uppercase tracking-wider font-bold mb-1 sm:mb-1.5">Root Cause</div>
            <p className="text-xs sm:text-sm text-gray-700">The <code className="px-1 sm:px-1.5 py-0.5 bg-purple-100 rounded text-purple-600 text-[10px] sm:text-xs font-mono">users</code> array is undefined when the component first renders.</p>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 sm:py-1 bg-orange-100 text-orange-700 text-[9px] sm:text-[10px] font-bold rounded-full">Medium Severity</span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 flex items-center">• Common React pattern</span>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-[10px] text-purple-600 uppercase tracking-wider font-bold mb-1.5">Suggested Fix</div>
            <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-xs text-gray-300 border border-gray-800">
              <div className="text-gray-500">// Add optional chaining</div>
              <div><span className="text-pink-400">const</span> items = users<span className="text-emerald-400">?.</span><span className="text-yellow-300">map</span>(<span className="text-blue-400">...</span>)</div>
            </div>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 pt-2">
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Wand2 className="w-3.5 h-3.5" />Apply Fix
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />Create Issue
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Network Monitor Mockup
const NetworkMockup: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const requests = [
    { method: 'POST', url: '/graphql', status: 200, time: 124, op: 'GetUserProfile', type: 'gql' },
    { method: 'GET', url: '/api/users/me', status: 200, time: 89, type: 'rest' },
    { method: 'POST', url: '/graphql', status: 200, time: 256, op: 'ListProducts', type: 'gql' },
    { method: 'POST', url: '/graphql', status: 400, time: 45, op: 'UpdateCart', type: 'gql' },
  ];

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-500 text-white',
    POST: 'bg-emerald-500 text-white',
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Network className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-gray-900">Network Monitor</div>
            <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">4 requests • 18.8 KB</div>
          </div>
        </div>
        <div className="flex gap-0.5 sm:gap-1 bg-white rounded-lg p-0.5 sm:p-1 border border-gray-200 flex-shrink-0">
          {['All', 'GQL', 'REST'].map((f) => (
            <button 
              key={f} 
              onClick={() => setActiveFilter(f === 'GQL' ? 'GraphQL' : f)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-semibold rounded-md transition-all ${activeFilter === (f === 'GQL' ? 'GraphQL' : f) ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Requests */}
      <div className="divide-y divide-gray-100">
        {requests.slice(0, 3).map((req, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between cursor-pointer transition-colors ${i === 0 ? 'bg-blue-50/50 border-l-2 sm:border-l-3 border-l-blue-500' : ''}`}
          >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-bold rounded-md flex-shrink-0 ${methodColors[req.method]}`}>{req.method}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{req.url}</span>
                  {req.type === 'gql' && (
                    <span className="hidden sm:inline px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded">GraphQL</span>
                  )}
                </div>
                {req.op && <span className="text-[10px] sm:text-[11px] text-purple-600 font-mono truncate block">{req.op}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] flex-shrink-0">
              <span className={`font-bold ${req.status >= 400 ? 'text-red-500' : 'text-emerald-500'}`}>{req.status}</span>
              <span className="text-gray-400 font-mono bg-gray-50 px-1.5 sm:px-2 py-0.5 rounded">{req.time}ms</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// GitHub Issues Mockup
const GitHubMockup: React.FC = () => {
  const [hoveredIssue, setHoveredIssue] = useState<number | null>(null);
  const issues = [
    { id: 142, title: 'Login button unresponsive on mobile Safari', status: 'open', labels: ['bug', 'mobile'] },
    { id: 139, title: 'Add dark mode support to dashboard', status: 'open', labels: ['enhancement'] },
    { id: 135, title: 'API rate limiting not working', status: 'closed', labels: [] },
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center">
            <Github className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white">GitHub Issues</div>
            <div className="text-[10px] sm:text-[11px] text-gray-400">acme/web-app</div>
          </div>
        </div>
        <button className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500 text-white text-[10px] sm:text-[11px] font-bold rounded-lg flex items-center gap-1 sm:gap-1.5 hover:bg-emerald-600 transition-colors">
          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden xs:inline">New Issue</span>
          <span className="xs:hidden">New</span>
        </button>
      </div>

      {/* Issues */}
      <div className="divide-y divide-gray-100">
        {issues.slice(0, 2).map((issue, i) => (
          <motion.div 
            key={issue.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`px-3 sm:px-5 py-3 sm:py-4 cursor-pointer transition-all ${
              i === 0 ? 'bg-emerald-50/50 border-l-2 sm:border-l-3 border-l-emerald-500' : 
              issue.status === 'closed' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                  <span className={`px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold rounded-full ${issue.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {issue.status === 'open' ? '● Open' : '✓ Closed'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono">#{issue.id}</span>
                </div>
                <h4 className={`text-xs sm:text-sm font-medium truncate ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{issue.title}</h4>
                {issue.labels.length > 0 && (
                  <div className="flex gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
                    {issue.labels.map(label => (
                      <span key={label} className={`px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold rounded-full ${
                        label === 'bug' ? 'bg-red-100 text-red-600' : 
                        label === 'mobile' ? 'bg-purple-100 text-purple-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Notes Mockup
const NotesMockup: React.FC = () => {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-gray-900">Debug Notes</div>
            <div className="text-[10px] sm:text-[11px] text-gray-500">3 notes • Auto-synced</div>
          </div>
        </div>
        <button className="px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-500 text-white text-[10px] sm:text-[11px] font-bold rounded-lg flex items-center gap-1 sm:gap-1.5 hover:bg-orange-600 transition-colors">
          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden xs:inline">New Note</span>
          <span className="xs:hidden">New</span>
        </button>
      </div>

      {/* Notes List */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {phase >= 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg sm:rounded-xl cursor-pointer"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <span className="px-1.5 sm:px-2 py-0.5 bg-orange-500 text-white text-[8px] sm:text-[9px] font-bold rounded-full">Active</span>
              <span className="text-[9px] sm:text-[10px] text-gray-400">• 2 min ago</span>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Auth Flow Investigation</h4>
            <div className="text-[10px] sm:text-xs text-gray-600 space-y-1 sm:space-y-1.5">
              <div className="flex items-start gap-1.5 sm:gap-2"><span className="text-orange-500">•</span> Token refresh fails after 1hr</div>
              <div className="flex items-start gap-1.5 sm:gap-2 text-orange-600 font-medium"><span>→</span> TODO: Check service worker</div>
            </div>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl cursor-pointer"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium">Yesterday</span>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-1">API Response Optimization</h4>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">Reduced payload size by 40%...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Autofill Mockup
const AutofillMockup: React.FC = () => {
  const [phase, setPhase] = useState(0);
  const [filledFields, setFilledFields] = useState<string[]>([]);

  useEffect(() => {
    const timers = [
      setTimeout(() => { setPhase(1); setFilledFields(['name']); }, 400),
      setTimeout(() => { setPhase(2); setFilledFields(['name', 'email']); }, 800),
      setTimeout(() => { setPhase(3); setFilledFields(['name', 'email', 'phone']); }, 1200),
      setTimeout(() => { setPhase(4); setFilledFields(['name', 'email', 'phone', 'company']); }, 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const persona = { name: 'Sarah Chen', email: 'sarah@startup.io' };

  const FormField: React.FC<{ label: string; value: string; filled: boolean; placeholder: string }> = ({ label, value, filled, placeholder }) => (
    <div>
      <label className="text-[9px] sm:text-[10px] font-semibold text-gray-500 mb-0.5 sm:mb-1 block uppercase tracking-wide">{label}</label>
      <div className="relative">
        <div className={`w-full px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm transition-all truncate ${
          filled
            ? 'bg-emerald-50 border border-emerald-200 text-gray-900'
            : 'bg-gray-50 border border-gray-200 text-gray-300'
        }`}>
          {filled ? value : placeholder}
        </div>
        {filled && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2"
          >
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
          </motion.span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-gray-900">Smart Autofill</div>
            <div className="text-[10px] sm:text-[11px] text-gray-500">5 personas • Context-aware</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex -space-x-1.5 sm:-space-x-2">
            {['from-blue-400 to-purple-500', 'from-pink-400 to-rose-500'].map((g, i) => (
              <div key={i} className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br ${g} border-2 border-white`} />
            ))}
          </div>
          <span className="text-[9px] sm:text-[10px] text-gray-400">+3</span>
        </div>
      </div>

      {/* Form */}
      <div className="p-3 sm:p-5 bg-gray-50/50">
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-5">
          <div className="text-center mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-sm font-bold text-gray-900">Create Account</h4>
            <p className="text-[10px] sm:text-[11px] text-gray-400">Watching form fields...</p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <FormField label="Full Name" value={persona.name} filled={filledFields.includes('name')} placeholder="Enter your name" />
            <FormField label="Email" value={persona.email} filled={filledFields.includes('email')} placeholder="you@example.com" />
            <FormField label="Phone" value="+1 (555) 234-5678" filled={filledFields.includes('phone')} placeholder="(555) 000-0000" />
          </div>

          {/* Fill All CTA */}
          {phase >= 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 sm:mt-4 flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-500">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                <span>3 fields filled</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] sm:text-[11px] font-bold rounded-lg">
                <Wand2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Fill All
              </div>
            </motion.div>
          )}
        </div>

        {/* Keyboard hints - hide on small mobile */}
        <div className="hidden sm:flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">Alt</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">`</kbd>
            <span className="ml-1">Suggestions</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">F</kbd>
            <span className="ml-1">Fill All</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// FEATURE CONFIGURATION
// ============================================

const devToolsFeatures = {
  console: {
    id: 'console',
    label: 'Console',
    icon: Terminal,
    color: 'emerald',
    mockup: ConsoleTerminalMockup,
    title: 'Capture every log',
    description: 'All console output captured with full stack traces. Filter, search, and export logs to debug faster than ever.',
    bullets: [
      'Capture all console output with stack traces',
      'Filter by log level (error, warn, info, debug)',
      'Search and export logs for debugging',
    ],
  },
  ai: {
    id: 'ai',
    label: 'AI Analysis',
    icon: Sparkles,
    color: 'purple',
    mockup: AIAnalysisMockup,
    title: 'Turn errors into fixes',
    description: 'Select any console error and get instant root cause analysis. No more Googling cryptic error messages.',
    bullets: [
      'Instant root cause detection',
      'One-click code fix suggestions',
      'Severity assessment and prioritization',
    ],
  },
  network: {
    id: 'network',
    label: 'Network',
    icon: Network,
    color: 'blue',
    mockup: NetworkMockup,
    title: 'Inspect every request',
    description: 'Automatically detects GraphQL operations. Full request/response inspection with smart filtering.',
    bullets: [
      'Auto-detect GraphQL operations',
      'View full request/response payloads',
      'Filter by status, type, or endpoint',
    ],
  },
  github: {
    id: 'github',
    label: 'GitHub',
    icon: Github,
    color: 'gray',
    mockup: GitHubMockup,
    title: 'Issues without context-switching',
    description: 'Create, edit, and manage GitHub issues without leaving DevTools. Full error context included automatically.',
    bullets: [
      'Create issues with full error context',
      'Edit, comment, and close issues',
      'Label and assign without leaving DevTools',
    ],
  },
  notes: {
    id: 'notes',
    label: 'Notes',
    icon: BookOpen,
    color: 'orange',
    mockup: NotesMockup,
    title: 'Capture debugging insights',
    description: 'Take contextual notes while debugging. Markdown support and auto-sync keep your sessions productive.',
    bullets: [
      'Markdown editing with live preview',
      'Auto-sync across browser sessions',
      'Link notes to specific errors or logs',
    ],
  },
  autofill: {
    id: 'autofill',
    label: 'Autofill',
    icon: Wand2,
    color: 'blue',
    mockup: AutofillMockup,
    title: 'Fill forms in milliseconds',
    description: 'Smart field detection with rotating personas. Unsplash images for file inputs and one-click Fill All for testing.',
    bullets: [
      '15+ field types auto-detected',
      '5 rotating test personas',
      'Unsplash images for file inputs',
    ],
  },
};

type FeatureId = keyof typeof devToolsFeatures;

// ============================================
// MAIN COMPONENT
// ============================================

export const DevToolsSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFeature, setActiveFeature] = useState<FeatureId>('console');

  const feature = devToolsFeatures[activeFeature];
  const Mockup = feature.mockup;

  return (
    <section id="devtools" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-10 bg-white overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Section Header */}
        <motion.div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10" variants={fadeInUp}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-2 sm:mb-4">
            DevTools Enhancement
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-500 px-2">
            Everything you need to understand, debug, and fix your code — integrated into Chrome DevTools.
          </p>
        </motion.div>

        {/* Feature Tabs - Grid on mobile for better visibility */}
        <motion.div className="mb-6 sm:mb-10" variants={fadeInUp}>
          {/* Mobile: 3-column grid */}
          <div className="grid grid-cols-3 gap-2 sm:hidden">
            {Object.values(devToolsFeatures).map((f) => {
              const isActive = activeFeature === f.id;
              const Icon = f.icon;
              
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFeature(f.id as FeatureId)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-[10px] font-medium transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Desktop: horizontal scrollable */}
          <div className="hidden sm:flex justify-center">
            <div className="inline-flex gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
              {Object.values(devToolsFeatures).map((f) => {
                const isActive = activeFeature === f.id;
                const Icon = f.icon;
                
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFeature(f.id as FeatureId)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Mobile: Stacked card layout */}
            <div className="lg:hidden">
              {/* Feature info card */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Bullet points - compact */}
                <ul className="space-y-2">
                  {feature.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-700">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup */}
              <div className="rounded-2xl overflow-hidden">
                <Mockup />
              </div>
            </div>

            {/* Desktop: Side by side layout */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-16 items-center">
              {/* Left - Mockup */}
              <div>
                <Mockup />
              </div>

              {/* Right - Content */}
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-8">
                  {feature.description}
                </p>

                {/* Bullet points */}
                <ul className="space-y-4">
                  {feature.bullets.map((bullet, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{bullet}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-10"
                >
                  <button className="group flex items-center gap-2 text-gray-900 font-semibold hover:text-purple-600 transition-colors">
                    <span>Learn more about {feature.label}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

export default DevToolsSection;
