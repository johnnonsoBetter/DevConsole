/**
 * AI Service for DevConsole
 * Provides access to Chrome's Built-in AI APIs (Gemini Nano)
 *
 * Supported APIs:
 * - Summarizer API (Stable, Chrome 138+)
 * - Language Detector API (Stable, Chrome 138+)
 * - Translator API (Stable, Chrome 138+)
 * - Writer API (Origin Trial)
 * - Rewriter API (Origin Trial)
 * - Prompt API (Origin Trial/Extensions)
 */
/**
 * AI Service for DevConsole
 * Provides access to Chrome's Built-in AI APIs (Gemini Nano)
 *
 * Supported APIs:
 * - Summarizer API (Stable, Chrome 138+)
 * - Language Detector API (Stable, Chrome 138+)
 * - Translator API (Stable, Chrome 138+)
 * - Writer API (Origin Trial)
 * - Rewriter API (Origin Trial)
 * - Prompt API (Origin Trial/Extensions)
 */

// ============================================================================
// TYPES
// ============================================================================

export type AIAvailability = 'available' | 'downloading' | 'downloadable' | 'unavailable';

export interface SummarizerOptions {
  type?: 'tldr' | 'teaser' | 'key-points' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
}

export interface ErrorSummary {
  summary: string;
  possibleCauses: string[];
  suggestedFixes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// FEATURE DETECTION
// ============================================================================

export function isAISupported(): boolean {
  return 'Summarizer' in self || 'LanguageModel' in self || 'Translator' in self;
}

export async function checkSummarizerAvailability(): Promise<AIAvailability> {
  if (!('Summarizer' in self)) {
    return 'unavailable';
  }

  try {
    // @ts-ignore - Chrome AI API
    const availability = await self.Summarizer.availability();
    return availability as AIAvailability;
  } catch (error) {
    console.error('Failed to check Summarizer availability:', error);
    return 'unavailable';
  }
}

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class DevConsoleAIService {
  private summarizer: any | null = null;
  private languageModel: any | null = null;
  private summarizerDownloadProgress: number = 0;
  private promptAPIDownloadProgress: number = 0;
  private onDownloadProgress?: (progress: number) => void;

  /**
   * Check if AI features are available
   * Checks both Summarizer API and Prompt API
   */
  async checkAvailability(): Promise<AIAvailability> {
    // Check Summarizer API (preferred for analysis)
    const summarizerAvailability = await checkSummarizerAvailability();

    // Check Prompt API (for form filling)
    const promptAPIAvailability = await this.checkPromptAPIAvailability();

    // Return the most permissive status
    if (summarizerAvailability === 'available' || promptAPIAvailability === 'available') {
      return 'available';
    }
    if (summarizerAvailability === 'downloading' || promptAPIAvailability === 'downloading') {
      return 'downloading';
    }
    if (summarizerAvailability === 'downloadable' || promptAPIAvailability === 'downloadable') {
      return 'downloadable';
    }
    return 'unavailable';
  }

  /**
   * Check Prompt API availability (for form filling)
   */
  async checkPromptAPIAvailability(): Promise<AIAvailability> {
    // @ts-ignore - Chrome Built-in AI API
    if (!self.LanguageModel) {
      return 'unavailable';
    }

    try {
      // @ts-ignore - Chrome Built-in AI API
      const availability = await self.LanguageModel.availability();
      return availability as AIAvailability;
    } catch (error) {
      console.error('Failed to check Prompt API availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Create or get cached language model session (Prompt API)
   */
  async getLanguageModelSession(systemPrompt: string): Promise<any> {
    // @ts-ignore - Chrome Built-in AI API
    if (!self.LanguageModel) {
      throw new Error('Prompt API is not available - LanguageModel is not defined');
    }

    try {
      // @ts-ignore - Chrome Built-in AI API
      const availability = await self.LanguageModel.availability();

      if (availability === 'no') {
        throw new Error('Prompt API is not ready. Please enable chrome://flags/#prompt-api-for-gemini-nano');
      }

      if (availability === 'after-download') {
        throw new Error('Gemini Nano model needs to be downloaded. This may take a few minutes.');
      }

      // Create new session with initial prompts
      // @ts-ignore - Chrome Built-in AI API
      const session = await self.LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        monitor: (m: any) => {
          m.addEventListener('downloadprogress', (e: any) => {
            const progress = Math.round(e.loaded * 100);
            this.promptAPIDownloadProgress = progress;
            this.onDownloadProgress?.(progress);
          });
        }
      });

      return session;
    } catch (error) {
      console.error('Failed to create language model session:', error);
      throw error;
    }
  }

  /**
   * Generate text using Prompt API (for form filling and generation tasks)
   */
  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const session = await this.getLanguageModelSession(systemPrompt);

    try {
      const response = await session.prompt(userPrompt);
      return response;
    } catch (error) {
      console.error('Failed to generate text:', error);
      throw error;
    }
  }

  /**
   * Create or get cached summarizer instance
   */
  private async getSummarizer(options?: SummarizerOptions): Promise<any> {
    // Return cached instance if options haven't changed
    if (this.summarizer) {
      return this.summarizer;
    }

    if (!('Summarizer' in self)) {
      throw new Error('Summarizer API is not available in this browser');
    }

    const summarizerOptions = {
      type: options?.type || 'key-points',
      format: options?.format || 'markdown',
      length: options?.length || 'medium',
      sharedContext: options?.sharedContext || 'This is an error from a web application.',
      monitor: (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          const progress = Math.round(e.loaded * 100);
          this.summarizerDownloadProgress = progress;
          this.onDownloadProgress?.(progress);
        });
      }
    };

    try {
      // @ts-ignore - Chrome AI API
      this.summarizer = await self.Summarizer.create(summarizerOptions);
      return this.summarizer;
    } catch (error) {
      console.error('Failed to create Summarizer:', error);
      throw error;
    }
  }

  /**
   * Analyze a log entry with context
   */
  async analyzeLog(
    logMessage: string,
    logLevel: string,
    stackTrace?: string,
    additionalContext?: string
  ): Promise<string> {
    const summarizer = await this.getSummarizer({
      type: 'key-points',
      length: 'medium',
      format: 'markdown',
      sharedContext: 'This is a log entry from a JavaScript web application. Provide clear, actionable insights.'
    });

    // Build comprehensive context
    let fullContext = `Log Level: ${logLevel}\nLog Message: ${logMessage}`;

    if (stackTrace) {
      // Extract just the first few lines of stack trace for context
      const stackLines = stackTrace.split('\n').slice(0, 3).join('\n');
      fullContext += `\n\nStack Trace Preview:\n${stackLines}`;
    }

    if (additionalContext) {
      fullContext += `\n\nAdditional Context: ${additionalContext}`;
    }

    try {
      // Adjust analysis prompt based on log level
      let analysisPrompt = 'Analyze this log entry and explain what it means, what might have triggered it, and any relevant insights. Be specific and practical.';

      if (logLevel.toLowerCase() === 'error') {
        analysisPrompt = 'Analyze this error log and explain what it means, what might have caused it, and how to fix it. Be specific and practical.';
      } else if (logLevel.toLowerCase() === 'warn') {
        analysisPrompt = 'Analyze this warning log and explain what it means, potential implications, and whether action is needed. Be specific and practical.';
      } else if (logLevel.toLowerCase() === 'info' || logLevel.toLowerCase() === 'log') {
        analysisPrompt = 'Analyze this informational log and explain what system behavior or state it represents. Be concise and clear.';
      } else if (logLevel.toLowerCase() === 'debug') {
        analysisPrompt = 'Analyze this debug log and explain what debugging information it provides and what it indicates about the system state.';
      }

      const summary = await summarizer.summarize(fullContext, {
        context: analysisPrompt
      });

      return summary;
    } catch (error) {
      console.error('Failed to analyze log:', error);
      throw error;
    }
  }

  /**
   * Summarize an error message with context (deprecated - use analyzeLog instead)
   * @deprecated Use analyzeLog for all log types
   */
  async summarizeError(
    errorMessage: string,
    stackTrace?: string,
    additionalContext?: string
  ): Promise<string> {
    return this.analyzeLog(errorMessage, 'error', stackTrace, additionalContext);
  }

  /**
   * Summarize a network request chain
   */
  async summarizeNetworkChain(requests: any[]): Promise<string> {
    const summarizer = await this.getSummarizer({
      type: 'tldr',
      length: 'medium',
      format: 'markdown'
    });

    const requestSummary = requests.map((req, i) =>
      `${i + 1}. ${req.method} ${req.url} → ${req.status} (${req.duration}ms)`
    ).join('\n');

    try {
      const summary = await summarizer.summarize(requestSummary, {
        context: 'Explain what this sequence of network requests is doing in plain English.'
      });

      return summary;
    } catch (error) {
      console.error('Failed to summarize network chain:', error);
      throw error;
    }
  }

  /**
   * Generate analysis of an error with structured output
   */
  async analyzeError(
    errorMessage: string,
    stackTrace?: string,
    errorType?: string
  ): Promise<ErrorSummary> {
    const summary = await this.summarizeError(errorMessage, stackTrace, errorType);

    // Parse the markdown summary to extract structured data
    // This is a simplified parser - in production you might want more sophisticated parsing
    const lines = summary.split('\n').filter(line => line.trim());

    const possibleCauses: string[] = [];
    const suggestedFixes: string[] = [];
    let inCausesSection = false;
    let inFixesSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Section detection
      if (trimmed.toLowerCase().includes('cause') || trimmed.toLowerCase().includes('reason')) {
        inCausesSection = true;
        inFixesSection = false;
        continue;
      }
      if (trimmed.toLowerCase().includes('fix') || trimmed.toLowerCase().includes('solution')) {
        inCausesSection = false;
        inFixesSection = true;
        continue;
      }

      // Extract bullet points or numbered items
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');
        if (inCausesSection) {
          possibleCauses.push(content);
        } else if (inFixesSection) {
          suggestedFixes.push(content);
        }
      }
    }

    // Determine severity based on error type
    let severity: ErrorSummary['severity'] = 'medium';
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
      severity = 'critical';
    } else if (lowerMessage.includes('error') || lowerMessage.includes('exception')) {
      severity = 'high';
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) {
      severity = 'low';
    }

    return {
      summary,
      possibleCauses,
      suggestedFixes,
      severity
    };
  }

  /**
   * Set download progress callback
   */
  setDownloadProgressCallback(callback: (progress: number) => void) {
    this.onDownloadProgress = callback;
  }

  /**
   * Get current download progress (combines Summarizer and Prompt API)
   */
  getDownloadProgress(): number {
    return Math.max(this.summarizerDownloadProgress, this.promptAPIDownloadProgress);
  }

  /**
   * Destroy AI instances (free resources)
   */
  destroy() {
    if (this.summarizer) {
      try {
        this.summarizer.destroy();
      } catch (error) {
        console.error('Failed to destroy summarizer:', error);
      }
      this.summarizer = null;
    }

    // Language model sessions are auto-managed by Chrome
    this.languageModel = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new DevConsoleAIService();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user is on a supported browser
 */
export function getBrowserSupport(): {
  isSupported: boolean;
  reason?: string;
  browserName: string;
} {
  const ua = navigator.userAgent;

  // Check for Chrome
  const isChrome = ua.includes('Chrome') && !ua.includes('Edg');
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;

  if (!isChrome) {
    return {
      isSupported: false,
      reason: 'AI features are only available in Chrome browser',
      browserName: 'Unknown'
    };
  }

  if (chromeVersion < 138) {
    return {
      isSupported: false,
      reason: `Chrome ${chromeVersion} detected. AI features require Chrome 138+`,
      browserName: `Chrome ${chromeVersion}`
    };
  }

  return {
    isSupported: true,
    browserName: `Chrome ${chromeVersion}`
  };
}

/**
 * Get user-friendly error message for AI failures
 */
export function getAIErrorMessage(error: any): string {
  if (error?.message?.includes('not available')) {
    return 'AI features are not available. Please ensure you\'re using Chrome 138+ on desktop.';
  }

  if (error?.message?.includes('user activation')) {
    return 'Please click a button to activate AI features (browser security requirement).';
  }

  if (error?.message?.includes('storage')) {
    return 'Insufficient storage space. AI models require ~22GB of free disk space.';
  }

  return error?.message || 'An unknown error occurred while using AI features.';
}
