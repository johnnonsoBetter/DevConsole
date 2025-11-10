/**
 * Browser Support Utility
 * Check if browser supports AI features
 */

export interface BrowserSupport {
  isSupported: boolean;
  reason?: string;
  browserName: string;
}

/**
 * Check if the current browser supports Chrome AI features
 */
export function checkBrowserSupport(): BrowserSupport {
  // Check if we're in a Chrome-based browser
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  
  if (!isChrome) {
    return {
      isSupported: false,
      reason: 'Chrome AI features are only available in Chrome browser',
      browserName: getBrowserName(userAgent),
    };
  }

  // Check if the AI API is available
  if (!('LanguageModel' in self)) {
    return {
      isSupported: false,
      reason: 'Chrome AI API is not available. Make sure you have Chrome 127+ with AI features enabled.',
      browserName: 'Chrome',
    };
  }

  return {
    isSupported: true,
    browserName: 'Chrome',
  };
}

function getBrowserName(userAgent: string): string {
  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
  if (userAgent.includes('edg')) return 'Edge';
  if (userAgent.includes('chrome')) return 'Chrome';
  return 'Unknown';
}
