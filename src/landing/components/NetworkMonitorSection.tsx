import { motion, useInView } from 'framer-motion';
import { Activity, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Clock, Filter, Globe, Layers, Network, RefreshCw, Search, Server, Wifi, XCircle, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { fadeInUp, staggerContainer } from './animations';

// Network request item
interface NetworkRequest {
  id: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  status: number;
  type: 'graphql' | 'rest' | 'fetch';
  time: number;
  size: string;
  operation?: string;
}

const requests: NetworkRequest[] = [
  { id: 1, method: 'POST', url: '/graphql', status: 200, type: 'graphql', time: 124, size: '2.3 KB', operation: 'GetUserProfile' },
  { id: 2, method: 'GET', url: '/api/users/me', status: 200, type: 'rest', time: 89, size: '1.1 KB' },
  { id: 3, method: 'POST', url: '/graphql', status: 200, type: 'graphql', time: 256, size: '15.2 KB', operation: 'ListProducts' },
  { id: 4, method: 'POST', url: '/graphql', status: 400, type: 'graphql', time: 45, size: '0.4 KB', operation: 'UpdateCart' },
  { id: 5, method: 'GET', url: '/api/config', status: 200, type: 'rest', time: 34, size: '0.8 KB' },
];

// Method badge colors
const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

// Network monitor mockup
const NetworkMonitorMockup: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(requests[0]);
  const [visibleRequests, setVisibleRequests] = useState<number[]>([]);

  useEffect(() => {
    // Animate requests appearing one by one
    requests.forEach((_, index) => {
      setTimeout(() => {
        setVisibleRequests(prev => [...prev, index]);
      }, 200 + index * 150);
    });
  }, []);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 via-cyan-500/15 to-emerald-500/20 rounded-3xl blur-3xl" />
      
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Network Monitor</h3>
                <p className="text-[10px] text-gray-500">5 requests • 18.8 KB total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Search className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
          {['All', 'GraphQL', 'REST', 'Fetch', 'Errors'].map((filter, i) => (
            <button
              key={filter}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                i === 0 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : i === 4
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Request List */}
        <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, x: -20 }}
              animate={visibleRequests.includes(index) ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedRequest(request)}
              className={`px-4 py-3 cursor-pointer transition-all ${
                selectedRequest?.id === request.id
                  ? 'bg-blue-50/70 border-l-2 border-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Method badge */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodColors[request.method]}`}>
                    {request.method}
                  </span>
                  
                  {/* URL & Operation */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900 truncate">{request.url}</span>
                      {request.type === 'graphql' && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[9px] font-bold rounded">
                          GQL
                        </span>
                      )}
                    </div>
                    {request.operation && (
                      <span className="text-[10px] text-purple-600 font-mono">{request.operation}</span>
                    )}
                  </div>
                </div>

                {/* Status & Time */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`flex items-center gap-1 text-[10px] font-bold ${
                    request.status >= 400 ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {request.status >= 400 ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {request.status}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{request.time}ms</span>
                  <span className="text-[10px] text-gray-400">{request.size}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Request Detail */}
        {selectedRequest && (
          <div className="border-t border-gray-200 bg-gray-50/50">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">Request Details</span>
                {selectedRequest.operation && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full">
                    {selectedRequest.operation}
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Status</div>
                <div className={`text-sm font-bold ${selectedRequest.status >= 400 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {selectedRequest.status}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Time</div>
                <div className="text-sm font-bold text-gray-900">{selectedRequest.time}ms</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Size</div>
                <div className="text-sm font-bold text-gray-900">{selectedRequest.size}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Stats card
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  color: string;
}> = ({ icon: Icon, label, value, trend, color }) => {
  const colorClasses: Record<string, { bg: string; icon: string; trend: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', trend: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', trend: 'text-emerald-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', trend: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', trend: 'text-orange-600' },
  };
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${colors.icon}`} />
        {trend && <span className={`text-[10px] font-bold ${colors.trend}`}>{trend}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
};

export const NetworkMonitorSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 px-6 lg:px-10 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1400px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Visual */}
          <motion.div variants={fadeInUp}>
            <NetworkMonitorMockup />
          </motion.div>

          {/* Right - Content */}
          <motion.div variants={fadeInUp}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200/50 rounded-full mb-6">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Smart Detection</span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6 leading-[1.15]">
              Every request.<br />
              <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
                Perfectly labeled.
              </span>
            </h2>

            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Automatically detects and labels GraphQL operations from hundreds of network 
              requests. Full request/response inspection with headers, timing, and performance metrics.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <StatCard
                icon={Globe}
                label="Total Requests"
                value="1,247"
                color="blue"
              />
              <StatCard
                icon={Zap}
                label="Avg Response"
                value="89ms"
                trend="↓ 12%"
                color="emerald"
              />
              <StatCard
                icon={Layers}
                label="GraphQL Ops"
                value="342"
                color="purple"
              />
              <StatCard
                icon={Activity}
                label="Success Rate"
                value="99.2%"
                trend="↑ 0.4%"
                color="orange"
              />
            </div>

            {/* Feature list */}
            <div className="space-y-3 mb-8">
              {[
                'Auto-detect GraphQL operations from any endpoint',
                'View full request/response payloads',
                'Filter by status, type, or custom criteria',
                'Performance waterfall visualization',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
              <span>Explore Network Tab</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
