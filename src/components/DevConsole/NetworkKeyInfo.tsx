/**
 * NetworkKeyInfo Component
 * Displays comprehensive network analytics and insights
 * Includes resource breakdown, third-party analysis, API activity, and initiator info
 */

import { useMemo } from 'react';
import { Chip } from './Chips';

interface NetworkKeyInfoProps {
  request: any;
  allRequests: any[];
}

export function NetworkKeyInfo({ request, allRequests }: NetworkKeyInfoProps) {
  // Analyze resource type
  const resourceType = useMemo(() => {
    const url = request.url.toLowerCase();
    const contentType = (request.responseHeaders?.['content-type'] || request.responseHeaders?.['Content-Type'] || '').toLowerCase();
    
    if (contentType.includes('image') || /\.(jpg|jpeg|png|gif|svg|webp|ico)(\?|$)/.test(url)) return 'image';
    if (contentType.includes('javascript') || contentType.includes('ecmascript') || /\.js(\?|$)/.test(url)) return 'script';
    if (contentType.includes('css') || /\.css(\?|$)/.test(url)) return 'stylesheet';
    if (contentType.includes('font') || /\.(woff|woff2|ttf|eot|otf)(\?|$)/.test(url)) return 'font';
    if (contentType.includes('json') || contentType.includes('xml')) return 'api';
    if (contentType.includes('html')) return 'document';
    return 'other';
  }, [request.url, request.responseHeaders]);

  // Determine if third-party
  const isThirdParty = useMemo(() => {
    try {
      const requestUrl = new URL(request.url, window.location.origin);
      return requestUrl.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  }, [request.url]);

  // Analyze third-party service
  const thirdPartyService = useMemo(() => {
    if (!isThirdParty) return null;
    
    const url = request.url.toLowerCase();
    if (url.includes('google-analytics') || url.includes('googletagmanager')) return { name: 'Google Analytics', category: 'Analytics', risk: 'low' };
    if (url.includes('facebook.com') || url.includes('fbcdn')) return { name: 'Facebook', category: 'Social Media', risk: 'medium' };
    if (url.includes('twitter.com') || url.includes('twimg')) return { name: 'Twitter', category: 'Social Media', risk: 'medium' };
    if (url.includes('doubleclick') || url.includes('googlesyndication')) return { name: 'Google Ads', category: 'Advertising', risk: 'medium' };
    if (url.includes('cloudflare') || url.includes('cdn')) return { name: 'CDN', category: 'Content Delivery', risk: 'low' };
    if (url.includes('stripe')) return { name: 'Stripe', category: 'Payment', risk: 'low' };
    if (url.includes('paypal')) return { name: 'PayPal', category: 'Payment', risk: 'low' };
    if (url.includes('mixpanel') || url.includes('segment')) return { name: 'Analytics Platform', category: 'Analytics', risk: 'medium' };
    
    try {
      const hostname = new URL(request.url).hostname;
      return { name: hostname, category: 'Unknown', risk: 'unknown' };
    } catch {
      return { name: 'Unknown', category: 'Unknown', risk: 'unknown' };
    }
  }, [isThirdParty, request.url]);

  // Calculate resource breakdown for all requests
  const resourceBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      image: 0,
      script: 0,
      stylesheet: 0,
      font: 0,
      api: 0,
      document: 0,
      other: 0,
    };

    allRequests.forEach(req => {
      const url = req.url.toLowerCase();
      const ct = (req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '').toLowerCase();
      
      if (ct.includes('image') || /\.(jpg|jpeg|png|gif|svg|webp|ico)(\?|$)/.test(url)) breakdown.image++;
      else if (ct.includes('javascript') || ct.includes('ecmascript') || /\.js(\?|$)/.test(url)) breakdown.script++;
      else if (ct.includes('css') || /\.css(\?|$)/.test(url)) breakdown.stylesheet++;
      else if (ct.includes('font') || /\.(woff|woff2|ttf|eot|otf)(\?|$)/.test(url)) breakdown.font++;
      else if (ct.includes('json') || ct.includes('xml')) breakdown.api++;
      else if (ct.includes('html')) breakdown.document++;
      else breakdown.other++;
    });

    return breakdown;
  }, [allRequests]);

  // Calculate API metrics
  const apiMetrics = useMemo(() => {
    const apiRequests = allRequests.filter(req => {
      const ct = (req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '').toLowerCase();
      return ct.includes('json') || ct.includes('xml');
    });

    const successCount = apiRequests.filter(req => req.status && req.status >= 200 && req.status < 300).length;
    const errorCount = apiRequests.filter(req => req.status && req.status >= 400).length;
    const totalCount = apiRequests.length;

    const endpoints: Record<string, number> = {};
    apiRequests.forEach(req => {
      try {
        const url = new URL(req.url, window.location.origin);
        const endpoint = url.pathname;
        endpoints[endpoint] = (endpoints[endpoint] || 0) + 1;
      } catch {}
    });

    return {
      total: totalCount,
      success: successCount,
      error: errorCount,
      successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '0',
      endpoints: Object.entries(endpoints).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [allRequests]);

  // Calculate third-party breakdown
  const thirdPartyBreakdown = useMemo(() => {
    const services: Record<string, number> = {};
    let internalCount = 0;

    allRequests.forEach(req => {
      try {
        const reqUrl = new URL(req.url, window.location.origin);
        if (reqUrl.hostname === window.location.hostname) {
          internalCount++;
        } else {
          services[reqUrl.hostname] = (services[reqUrl.hostname] || 0) + 1;
        }
      } catch {}
    });

    return {
      internal: internalCount,
      external: allRequests.length - internalCount,
      services: Object.entries(services).sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  }, [allRequests]);

  const totalRequests = Object.values(resourceBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Initiator Info */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
          <span>🎯</span> Request Initiator
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-start justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Type</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {request.method === 'GET' ? 'Browser/Script' : 'User Action/Form'}
            </span>
          </div>
          <div className="flex items-start justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Resource Type</span>
            <Chip variant="info" size="sm" className="capitalize">{resourceType}</Chip>
          </div>
          {isThirdParty && (
            <div className="flex items-start justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Source</span>
              <Chip variant="warning" size="sm">Third-Party</Chip>
            </div>
          )}
        </div>
      </div>

      {/* Resource Breakdown */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
          <span>📦</span> Resource Breakdown
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="text-center mb-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalRequests}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Requests</div>
          </div>
          
          {Object.entries(resourceBreakdown).map(([type, count]) => {
            if (count === 0) return null;
            const percentage = ((count / totalRequests) * 100).toFixed(1);
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                  <span className="font-mono text-gray-900 dark:text-gray-100 font-semibold">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Third-Party Dependencies */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
          <span>🌍</span> Third-Party Dependencies
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-lg font-bold text-green-700 dark:text-green-400">{thirdPartyBreakdown.internal}</div>
              <div className="text-xs text-green-600 dark:text-green-500">Internal</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{thirdPartyBreakdown.external}</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-500">External</div>
            </div>
          </div>

          {thirdPartyBreakdown.services.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Top External Domains</h5>
              <div className="space-y-1.5">
                {thirdPartyBreakdown.services.slice(0, 5).map(([domain, count]) => (
                  <div key={domain} className="flex items-center justify-between text-xs bg-white dark:bg-gray-900 rounded px-2 py-1.5 border border-gray-200 dark:border-gray-700">
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate flex-1" title={domain}>
                      {domain}
                    </span>
                    <span className="ml-2 font-semibold text-gray-600 dark:text-gray-400">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {thirdPartyService && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-xs">ℹ️</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    This Request: {thirdPartyService.name}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Category: {thirdPartyService.category}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Privacy Risk: <span className="font-semibold capitalize">{thirdPartyService.risk}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Activity */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
          <span>🔌</span> API Activity
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{apiMetrics.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="text-lg font-bold text-green-700 dark:text-green-400">{apiMetrics.success}</div>
              <div className="text-xs text-green-600 dark:text-green-500">Success</div>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <div className="text-lg font-bold text-red-700 dark:text-red-400">{apiMetrics.error}</div>
              <div className="text-xs text-red-600 dark:text-red-500">Errors</div>
            </div>
          </div>

          {apiMetrics.total > 0 && (
            <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Success Rate</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{apiMetrics.successRate}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                  style={{ width: `${apiMetrics.successRate}%` }}
                />
              </div>
            </div>
          )}

          {apiMetrics.endpoints.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Top API Endpoints</h5>
              <div className="space-y-1.5">
                {apiMetrics.endpoints.map(([endpoint, count]) => (
                  <div key={endpoint} className="flex items-center justify-between text-xs bg-white dark:bg-gray-900 rounded px-2 py-1.5 border border-gray-200 dark:border-gray-700">
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate flex-1" title={endpoint}>
                      {endpoint}
                    </span>
                    <span className="ml-2 font-semibold text-gray-600 dark:text-gray-400">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
