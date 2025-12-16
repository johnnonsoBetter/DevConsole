import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Bug, CheckCircle2, ChevronRight, Code2, Edit3, FileText, Filter, Github, GitPullRequest, Layers, ListTodo, MessageSquare, Mic, Network, Plus, RefreshCw, Search, Sparkles, Tag, Terminal, Video, Wand2, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { fadeInUp, staggerContainer } from './animations';

// ============================================
// DEVTOOLS SUB-FEATURES
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
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden font-mono text-[13px]">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#252525] border-b border-gray-800">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-xs text-gray-500">devconsole — zsh</span>
      </div>

      {/* Terminal Content */}
      <div className="p-4 space-y-3 min-h-[320px]">
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <span className="text-emerald-400">❯</span>
            <span className="text-purple-400">devconsole</span>
            <span className="text-gray-400">build</span>
          </motion.div>
        )}
        
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-4 space-y-1 text-gray-400">
            <div><span className="text-blue-400">●</span> Bundling modules...</div>
            <div><span className="text-emerald-400">✓</span> <span className="text-gray-300">tsc && concurrently "npm run build"</span></div>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-4 border-l-2 border-gray-700 space-y-1 text-gray-500 text-xs">
            <div><span className="text-yellow-500">[0]</span> <span className="text-cyan-400">[343ms]</span> bundle 3867 modules</div>
            <div><span className="text-yellow-500">[0]</span> Built version <span className="text-purple-400">0.2.67-dev.shade3f2f0</span></div>
            <div className="text-emerald-400"><span className="text-yellow-500">[0]</span> npm run build exited with code <span className="font-bold">0</span></div>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <div className="text-gray-500 flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-500" />Running tests...</div>
            <div className="pl-4 space-y-0.5 text-xs">
              <div><span className="text-emerald-400 font-bold">(pass)</span> <span className="text-gray-300">allowedTools CLI flag › should restrict tools</span> <span className="text-gray-600">[2.58ms]</span></div>
              <div><span className="text-emerald-400 font-bold">(pass)</span> <span className="text-gray-300">allowedTools CLI flag › should allow tools</span> <span className="text-gray-600">[0.20ms]</span></div>
              <div><span className="text-emerald-400 font-bold">(pass)</span> <span className="text-gray-300">allowedTools CLI flag › should combine configs</span> <span className="text-gray-600">[0.47ms]</span></div>
            </div>
          </motion.div>
        )}

        {phase >= 5 && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">All tests passing</span>
              <span className="text-emerald-400/60 text-xs">• 47 tests in 3.2s</span>
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">AI Log Analysis</div>
          <div className="text-[10px] text-gray-500">Powered by GPT-4 / Claude</div>
        </div>
      </div>

      {/* Error */}
      <div className="p-3 bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-2 text-xs">
          <Bug className="w-3.5 h-3.5 text-red-500" />
          <span className="font-semibold text-red-700">TypeError</span>
          <span className="text-red-500/70">at App.tsx:142</span>
        </div>
        <p className="text-xs text-red-600 font-mono mt-1">Cannot read properties of undefined (reading 'map')</p>
      </div>

      {/* Analysis */}
      <div className="p-4 space-y-3 min-h-[240px]">
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Root Cause</div>
            <p className="text-sm text-gray-700">The <code className="px-1 py-0.5 bg-gray-100 rounded text-purple-600 text-xs">users</code> array is undefined when the component first renders.</p>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded-full">Medium Severity</span>
            <span className="text-[10px] text-gray-400">• Common React pattern</span>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Suggested Fix</div>
            <div className="bg-[#1a1a1a] rounded-lg p-3 font-mono text-xs text-gray-300">
              <div className="text-gray-500">// Add optional chaining</div>
              <div><span className="text-pink-400">const</span> items = users<span className="text-emerald-400">?.</span><span className="text-yellow-300">map</span>(...)</div>
            </div>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 pt-2">
            <button className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-md flex items-center gap-1.5">
              <Wand2 className="w-3 h-3" />Apply Fix
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />Create Issue
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Network Monitor Mockup
const NetworkMockup: React.FC = () => {
  const requests = [
    { method: 'POST', url: '/graphql', status: 200, time: 124, op: 'GetUserProfile', type: 'gql' },
    { method: 'GET', url: '/api/users/me', status: 200, time: 89, type: 'rest' },
    { method: 'POST', url: '/graphql', status: 200, time: 256, op: 'ListProducts', type: 'gql' },
    { method: 'POST', url: '/graphql', status: 400, time: 45, op: 'UpdateCart', type: 'gql' },
  ];

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Network className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Network Monitor</div>
            <div className="text-[10px] text-gray-500">4 requests • 18.8 KB</div>
          </div>
        </div>
        <div className="flex gap-1">
          {['All', 'GraphQL', 'REST'].map((f, i) => (
            <span key={f} className={`px-2 py-1 text-[10px] font-medium rounded ${i === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{f}</span>
          ))}
        </div>
      </div>

      {/* Requests */}
      <div className="divide-y divide-gray-50">
        {requests.map((req, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`px-4 py-2.5 flex items-center justify-between ${i === 0 ? 'bg-blue-50/50 border-l-2 border-blue-500' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${methodColors[req.method]}`}>{req.method}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{req.url}</span>
                  {req.type === 'gql' && <span className="px-1 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded">GQL</span>}
                </div>
                {req.op && <span className="text-[10px] text-purple-600 font-mono">{req.op}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className={req.status >= 400 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{req.status}</span>
              <span className="text-gray-400 font-mono">{req.time}ms</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// GitHub Issues Mockup
const GitHubMockup: React.FC = () => {
  const issues = [
    { id: 142, title: 'Login button unresponsive on mobile Safari', status: 'open', labels: ['bug', 'mobile'] },
    { id: 139, title: 'Add dark mode support to dashboard', status: 'open', labels: ['enhancement'] },
    { id: 135, title: 'API rate limiting not working', status: 'closed', labels: [] },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Github className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">GitHub Issues</div>
            <div className="text-[10px] text-gray-500">acme/web-app</div>
          </div>
        </div>
        <button className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded flex items-center gap-1">
          <Plus className="w-3 h-3" />New
        </button>
      </div>

      {/* Issues */}
      <div className="divide-y divide-gray-50">
        {issues.map((issue, i) => (
          <motion.div 
            key={issue.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`px-4 py-3 ${i === 0 ? 'bg-emerald-50/50 border-l-2 border-emerald-500' : issue.status === 'closed' ? 'opacity-50' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${issue.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {issue.status === 'open' ? '● Open' : '✓ Closed'}
                  </span>
                  <span className="text-[10px] text-gray-400">#{issue.id}</span>
                </div>
                <h4 className={`text-sm font-medium ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{issue.title}</h4>
                {issue.labels.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {issue.labels.map(label => (
                      <span key={label} className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full border ${label === 'bug' ? 'bg-red-50 text-red-600 border-red-200' : label === 'mobile' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
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
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Debug Notes</div>
            <div className="text-[10px] text-gray-500">3 notes • Synced</div>
          </div>
        </div>
        <button className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-semibold rounded flex items-center gap-1">
          <Plus className="w-3 h-3" />New
        </button>
      </div>

      {/* Notes List */}
      <div className="p-4 space-y-3 min-h-[280px]">
        {phase >= 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-orange-600 font-semibold">Active</span>
              <span className="text-[10px] text-gray-400">• 2 min ago</span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Auth Flow Investigation</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Token refresh fails after 1hr idle</div>
              <div>• <code className="px-1 bg-gray-100 rounded text-xs">localStorage.auth</code> not persisting</div>
              <div className="text-orange-600">TODO: Check service worker cache</div>
            </div>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-500 font-medium">Yesterday</span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">API Response Optimization</h4>
            <p className="text-xs text-gray-500 line-clamp-2">Reduced payload size by 40% using GraphQL fragments...</p>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-500 font-medium">Dec 15</span>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-semibold rounded-full">Resolved</span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Memory Leak in Dashboard</h4>
            <p className="text-xs text-gray-500 line-clamp-2">Fixed useEffect cleanup in chart component...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ============================================
// ROOMS WITH MEMORY MOCKUPS
// ============================================

const VideoCallMockup: React.FC = () => (
  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
    {/* Video Header */}
    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
          <Video className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Team Standup</div>
          <div className="text-[10px] text-gray-400">4 participants • 23:45</div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 rounded-full">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-semibold text-red-400">LIVE</span>
      </div>
    </div>

    {/* Video Grid */}
    <div className="p-4 grid grid-cols-2 gap-3 min-h-[200px]">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`rounded-lg overflow-hidden ${i === 1 ? 'ring-2 ring-emerald-500' : ''}`}>
          <div className={`aspect-video bg-gradient-to-br ${
            i === 1 ? 'from-blue-600 to-purple-600' :
            i === 2 ? 'from-pink-600 to-rose-600' :
            i === 3 ? 'from-emerald-600 to-teal-600' :
            'from-orange-600 to-amber-600'
          } flex items-center justify-center`}>
            <span className="text-white text-lg font-bold">{['JD', 'SC', 'MW', 'AK'][i-1]}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Controls */}
    <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-3">
      <button className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600">
        <Mic className="w-4 h-4" />
      </button>
      <button className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600">
        <Video className="w-4 h-4" />
      </button>
      <button className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600">
        <span className="text-xs font-bold">END</span>
      </button>
    </div>
  </div>
);

const TranscriptMockup: React.FC = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines(v => v < 4 ? v + 1 : v);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  const lines = [
    { speaker: 'John', text: 'Let\'s discuss the Q4 roadmap priorities.' },
    { speaker: 'Sarah', text: 'I think we should focus on the mobile experience first.' },
    { speaker: 'Mike', text: 'Agreed. The analytics show 60% mobile traffic now.' },
    { speaker: 'John', text: 'Okay, let\'s prioritize mobile. Action item noted.' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Live Transcript</div>
          <div className="text-[10px] text-gray-500">Deepgram • Real-time</div>
        </div>
      </div>

      <div className="p-4 space-y-3 min-h-[180px]">
        {lines.slice(0, visibleLines).map((line, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
              line.speaker === 'John' ? 'bg-blue-500' :
              line.speaker === 'Sarah' ? 'bg-pink-500' : 'bg-emerald-500'
            }`}>
              {line.speaker[0]}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-500">{line.speaker}</span>
              <p className="text-sm text-gray-700">{line.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const InsightsMockup: React.FC = () => {
  const insights = [
    { type: 'decision', icon: CheckCircle2, text: 'Prioritize mobile experience for Q4', color: 'emerald' },
    { type: 'action', icon: ListTodo, text: 'Sarah to draft mobile UI specs by Friday', color: 'amber' },
    { type: 'question', icon: MessageSquare, text: 'What\'s the timeline for API v2?', color: 'blue' },
  ];

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">SmartMemory Insights</div>
          <div className="text-[10px] text-gray-500">Auto-extracted</div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {insights.map((insight, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`p-3 rounded-lg border ${colorClasses[insight.color]}`}
          >
            <div className="flex items-start gap-2">
              <insight.icon className="w-4 h-4 mt-0.5" />
              <p className="text-sm font-medium">{insight.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const MemorySearchMockup: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
        <Search className="w-4 h-4 text-white" />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">Memory Search</div>
        <div className="text-[10px] text-gray-500">Search all conversations</div>
      </div>
    </div>

    <div className="p-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 mb-4">
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">What did we decide about mobile?</span>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Results</div>
        {[
          { date: 'Dec 15', meeting: 'Team Standup', snippet: '...prioritize mobile experience for Q4...' },
          { date: 'Dec 10', meeting: 'Product Review', snippet: '...mobile traffic increased to 60%...' },
        ].map((result, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-gray-400">{result.date}</span>
              <span className="text-xs font-medium text-gray-900">{result.meeting}</span>
            </div>
            <p className="text-sm text-gray-600">{result.snippet}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

// Sub-feature configurations
const devToolsFeatures = {
  console: {
    id: 'console',
    label: 'Console Logs',
    icon: Terminal,
    mockup: ConsoleTerminalMockup,
    title: 'Code onboarding',
    description: 'DevConsole maps and explains entire codebases in seconds. It uses agentic search to understand project structure and dependencies.',
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
    mockup: AIAnalysisMockup,
    title: 'Turn errors into fixes',
    description: 'Select any console error and get instant root cause analysis. No more Googling cryptic error messages or digging through Stack Overflow.',
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
    mockup: NetworkMockup,
    title: 'Make powerful requests',
    description: 'Automatically detects and labels GraphQL operations from hundreds of network requests. Full request/response inspection.',
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
    mockup: GitHubMockup,
    title: 'Turn issues into PRs',
    description: 'Stop bouncing between tools. DevConsole integrates with GitHub to handle reading issues, writing code, running tests, and submitting PRs.',
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
    mockup: NotesMockup,
    title: 'Capture debugging insights',
    description: 'Take contextual notes while debugging. Markdown support, auto-sync, and seamless organization keep your debugging sessions productive.',
    bullets: [
      'Markdown editing with live preview',
      'Auto-sync across browser sessions',
      'Link notes to specific errors or logs',
    ],
  },
};

const roomsFeatures = {
  video: {
    id: 'video',
    label: 'Video',
    icon: Video,
    mockup: VideoCallMockup,
    title: 'HD video conferencing',
    description: 'Crystal clear video calls powered by LiveKit. Share screens, collaborate in real-time, and never worry about call quality.',
    bullets: [
      'LiveKit-powered HD video',
      'Screen sharing and collaboration',
      'Works in any browser, no plugins',
    ],
  },
  transcript: {
    id: 'transcript',
    label: 'Transcript',
    icon: Mic,
    mockup: TranscriptMockup,
    title: 'Live transcription',
    description: 'Every word captured in real-time with Deepgram integration. Never miss a detail from your team conversations.',
    bullets: [
      'Real-time speech-to-text',
      'Speaker identification',
      'Searchable transcript history',
    ],
  },
  insights: {
    id: 'insights',
    label: 'Insights',
    icon: Brain,
    mockup: InsightsMockup,
    title: 'Smart extraction',
    description: 'AI automatically extracts decisions, action items, and key topics from your conversations. Stay organized without effort.',
    bullets: [
      'Auto-detect decisions and action items',
      'Key topic extraction',
      'Meeting summaries generated',
    ],
  },
  search: {
    id: 'search',
    label: 'Memory',
    icon: Search,
    mockup: MemorySearchMockup,
    title: 'Searchable history',
    description: '"What did we decide last week?" — get instant answers. SmartMemory stores and indexes everything for instant recall.',
    bullets: [
      'Search across all conversations',
      'Find any past decision instantly',
      'Persistent team knowledge base',
    ],
  },
};

type MainTabId = 'devtools' | 'rooms';
type DevToolsSubTab = keyof typeof devToolsFeatures;
type RoomsSubTab = keyof typeof roomsFeatures;

export const ProductOverview: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [mainTab, setMainTab] = useState<MainTabId>('devtools');
  const [devToolsSubTab, setDevToolsSubTab] = useState<DevToolsSubTab>('console');
  const [roomsSubTab, setRoomsSubTab] = useState<RoomsSubTab>('video');

  const currentSubFeature = mainTab === 'devtools' 
    ? devToolsFeatures[devToolsSubTab] 
    : roomsFeatures[roomsSubTab];
  
  const Mockup = currentSubFeature.mockup;

  return (
    <section id="product" className="py-24 px-6 lg:px-10 bg-white overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1200px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Section Header */}
        <motion.div className="text-center max-w-2xl mx-auto mb-12" variants={fadeInUp}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Two tools. One extension.
          </h2>
          <p className="text-lg text-gray-500">
            Everything you need for debugging and team collaboration, built right into Chrome.
          </p>
        </motion.div>

        {/* Main Tab Switcher */}
        <motion.div className="flex justify-center mb-8" variants={fadeInUp}>
          <div className="inline-flex p-1 bg-gray-100 rounded-xl">
            {[
              { id: 'devtools' as MainTabId, label: 'DevTools Enhancement', icon: Terminal },
              { id: 'rooms' as MainTabId, label: 'Rooms with Memory', icon: Video },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mainTab === tab.id
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Sub-feature Tabs */}
        <motion.div className="flex justify-center mb-10" variants={fadeInUp}>
          <div className="inline-flex gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
            {Object.values(mainTab === 'devtools' ? devToolsFeatures : roomsFeatures).map((feature) => {
              const isActive = mainTab === 'devtools' 
                ? devToolsSubTab === feature.id 
                : roomsSubTab === feature.id;
              const Icon = feature.icon;
              
              return (
                <button
                  key={feature.id}
                  onClick={() => mainTab === 'devtools' 
                    ? setDevToolsSubTab(feature.id as DevToolsSubTab)
                    : setRoomsSubTab(feature.id as RoomsSubTab)
                  }
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {feature.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mainTab}-${mainTab === 'devtools' ? devToolsSubTab : roomsSubTab}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid lg:grid-cols-2 gap-12 items-start"
          >
            {/* Left - Mockup */}
            <div>
              <Mockup />
            </div>

            {/* Right - Content */}
            <div className="lg:pt-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                {currentSubFeature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-8">
                {currentSubFeature.description}
              </p>

              {/* Bullet points */}
              <ul className="space-y-4">
                {currentSubFeature.bullets.map((bullet, i) => (
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
                  <span>Learn more about {currentSubFeature.label}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </section>
  );
};
