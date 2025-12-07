/**
 * LiveKitErrorBoundary Component
 * Error boundary specifically for LiveKit operations
 * Catches and displays errors gracefully with recovery options
 */

import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  onRetry?: () => void;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class LiveKitErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[LiveKit Error Boundary] Caught error:', error);
    console.error('[LiveKit Error Boundary] Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });

    // Log to any analytics/error tracking service here
    // e.g., Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  handleClose = (): void => {
    this.props.onClose?.();
  };

  getErrorMessage(): string {
    const { error } = this.state;
    const { fallbackMessage } = this.props;

    if (fallbackMessage) return fallbackMessage;

    if (!error) return 'An unexpected error occurred';

    // Parse common LiveKit errors
    const message = error.message.toLowerCase();

    if (message.includes('permission') || message.includes('notallowed')) {
      return 'Camera or microphone access was denied. Please check your browser permissions.';
    }

    if (message.includes('notfound') || message.includes('device')) {
      return 'No camera or microphone found. Please connect a device and try again.';
    }

    if (message.includes('network') || message.includes('connection')) {
      return 'Network connection lost. Please check your internet and try again.';
    }

    if (message.includes('token') || message.includes('auth')) {
      return 'Authentication failed. Please try rejoining the call.';
    }

    if (message.includes('room') || message.includes('full')) {
      return 'Unable to join the room. It may be full or unavailable.';
    }

    return error.message || 'An unexpected error occurred during the video call';
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex items-center justify-center bg-gray-900 p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-gray-800 rounded-2xl p-6 shadow-apple-lg border border-white/10">
            {/* Header with close button */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Video Call Error
                  </h2>
                  <p className="text-caption2 text-gray-400">
                    Something went wrong
                  </p>
                </div>
              </div>
              {this.props.onClose && (
                <button
                  onClick={this.handleClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close error dialog"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Error message */}
            <p className="text-body text-gray-300 mb-6">
              {this.getErrorMessage()}
            </p>

            {/* Technical details (collapsed by default) */}
            {this.state.error && (
              <details className="mb-6">
                <summary className="text-caption2 text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-gray-900 rounded-lg overflow-auto max-h-32">
                  <code className="text-caption2 text-gray-400 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                  </code>
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {this.props.onRetry && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-body hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                  aria-label="Try again"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  Try Again
                </motion.button>
              )}
              {this.props.onClose && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.handleClose}
                  className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-xl font-medium text-body hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                  aria-label="Leave call"
                >
                  Leave Call
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}
