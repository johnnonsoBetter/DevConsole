// /**
//  * useAI Hook
//  * Custom hook for managing AI features in DevConsole
//  *
//  * This hook is a wrapper around useSummarizerModel for backward compatibility.
//  * For new code, consider using useSummarizerModel directly.
//  */

// import { useState, useEffect, useCallback } from 'react';
// import { useSummarizerModel } from './ai/useSummarizerModel';
// import type { SummarizerAvailability } from './ai/useSummarizerModel';

// // Map SummarizerAvailability to AIAvailability for backward compatibility
// export type AIAvailability = SummarizerAvailability;

// interface UseAIOptions {
//   autoCheck?: boolean;
//   onDownloadProgress?: (progress: number) => void;
// }

// interface UseAIReturn {
//   availability: AIAvailability;
//   isLoading: boolean;
//   error: string | null;
//   summary: string | null;
//   downloadProgress: number;
//   checkAvailability: () => Promise<AIAvailability | undefined>;
//   analyzeLog: (
//     logMessage: string,
//     logLevel: string,
//     stackTrace?: string,
//     context?: string
//   ) => Promise<void>;
//   summarizeError: (errorMessage: string, stackTrace?: string, context?: string) => Promise<void>; // Deprecated, kept for backward compatibility
//   activateAI: () => Promise<void>;
//   reset: () => void;
// }

// export function useAI(options: UseAIOptions = {}): UseAIReturn {
//   const { autoCheck = true, onDownloadProgress } = options;

//   const [isLoading, setIsLoading] = useState(false);
//   const [summary, setSummary] = useState<string | null>(null);

//   // Check AI availability



//   const [error, setError] = useState<string | null>(null);


//   // Handle download progress callback
//   useEffect(() => {
//     if (onDownloadProgress) {
//       onDownloadProgress(downloadProgress);
//     }
//   }, [downloadProgress, onDownloadProgress]);

//   // Analyze log with AI (wrapper)


//   // Activate AI (first-time use)

//   // Reset state
//   const reset = useCallback(() => {
//     setIsLoading(false);
//     setError(null);
//     setSummary(null);
//   }, []);

//   return {
//     availability,
//     isLoading,
//     error,
//     summary,
    
//     reset,
//   };
// }
