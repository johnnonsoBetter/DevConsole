import { CheckCircle2, CircleDot, Edit3, ExternalLink, Filter, Github, GitPullRequest, MessageCircle, Plus, RefreshCw, Search, Tag } from 'lucide-react';
import React from 'react';

export const GitHubSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-white overflow-hidden border-t border-gray-100">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual - GitHub Issues Mockup */}
          <div className="relative order-2 lg:order-1">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200/40 via-purple-200/20 to-emerald-200/30 rounded-3xl blur-3xl" />
            
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header Bar */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center shadow-sm">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Repository</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">acme/web-app</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {['open', 'closed', 'all'].map((state, i) => (
                    <button
                      key={state}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        i === 0
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {state.charAt(0).toUpperCase() + state.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Search & Actions Bar */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Search issues...</span>
                </div>
                <button className="px-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm hover:bg-emerald-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  New Issue
                </button>
                <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              
              {/* Issues List */}
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto scrollbar-thin">
                {/* Issue 1 - Selected */}
                <div className="px-5 py-4 bg-emerald-50/50 border-l-2 border-emerald-500 cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CircleDot className="w-2.5 h-2.5" />
                          Open
                        </span>
                        <span className="text-xs font-semibold text-gray-400">#142</span>
                        <span className="text-[10px] text-gray-400">Updated 2h ago</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Login button unresponsive on mobile Safari</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600 border border-red-200">
                          <Tag className="w-2.5 h-2.5" />
                          bug
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-600 border border-purple-200">
                          <Tag className="w-2.5 h-2.5" />
                          mobile
                        </span>
                      </div>
                    </div>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=john" alt="avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                  </div>
                </div>
                
                {/* Issue 2 */}
                <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CircleDot className="w-2.5 h-2.5" />
                          Open
                        </span>
                        <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-600">#139</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">Add dark mode support to dashboard</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-600 border border-blue-200">
                          <Tag className="w-2.5 h-2.5" />
                          enhancement
                        </span>
                      </div>
                    </div>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" alt="avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                  </div>
                </div>
                
                {/* Issue 3 - Closed */}
                <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer opacity-60 hover:opacity-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Closed
                        </span>
                        <span className="text-xs font-semibold text-gray-400">#135</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 line-through decoration-gray-300">API rate limiting not working</h3>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Issue Detail Slide Panel */}
              <div className="absolute right-0 top-0 bottom-0 w-[55%] bg-white border-l border-gray-200 shadow-xl flex flex-col transform transition-transform">
                {/* Detail Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">Issue #142</span>
                    </div>
                    <a href="#" className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium">
                      View on GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50">Preview</button>
                    <button className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100">Comments</button>
                  </div>
                </div>
                
                {/* Detail Content */}
                <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
                  <div className="flex items-start gap-3 mb-4">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=john" alt="avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 leading-snug">Login button unresponsive on mobile Safari</h2>
                      <p className="text-xs text-gray-400 mt-1">Opened 2h ago by <span className="font-medium text-gray-600">johndoe</span></p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 border border-gray-100">
                    <p><strong className="text-gray-900">Description:</strong></p>
                    <p>The login button doesn't respond to touch events on iOS Safari 17.x. Works fine on Chrome and Firefox mobile.</p>
                    <p><strong className="text-gray-900">Steps to reproduce:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-1">
                      <li>Open app in Safari on iPhone</li>
                      <li>Navigate to login page</li>
                      <li>Tap the "Sign In" button</li>
                    </ol>
                    <p><strong className="text-gray-900">Expected:</strong> Login modal appears</p>
                    <p><strong className="text-gray-900">Actual:</strong> Nothing happens</p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Comment
                    </button>
                    <button className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ml-auto">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Close
                    </button>
                  </div>
                </div>
                
                {/* Comment Input */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-start gap-3">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=me" alt="avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1">
                      <textarea 
                        placeholder="Add a comment..." 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-shadow"
                        rows={2}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 font-medium">Markdown supported</span>
                        <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1.5 shadow-sm">
                          <MessageCircle className="w-3 h-3" />
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Text Content */}
          <div className="order-1 lg:order-2">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
              GitHub Integration
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Manage issues<br />
              <span className="text-gray-400">without context switching</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Full GitHub issue management right inside DevTools. Create, edit, comment, and close issues 
              while debugging—never lose your flow jumping between browser tabs.
            </p>
            
            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Plus, title: 'Create Issues', desc: 'File bugs instantly with context' },
                { icon: Edit3, title: 'Edit & Update', desc: 'Modify title, body, and labels' },
                { icon: MessageCircle, title: 'Comments', desc: 'Discuss with Markdown support' },
                { icon: CheckCircle2, title: 'State Control', desc: 'Open, close, reopen issues' },
                { icon: Filter, title: 'Smart Filters', desc: 'Filter by open, closed, or all' },
                { icon: Search, title: 'Quick Search', desc: 'Find issues by title instantly' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Workflow Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                <RefreshCw className="w-3 h-3" />
                Real-time sync
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">
                <GitPullRequest className="w-3 h-3" />
                Any repository
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                <Tag className="w-3 h-3" />
                Label support
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
