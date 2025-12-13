import { SmartMemoryLocation } from "@/lib/ai/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface Memory {
  id: string;
  sessionId: string;
  timeline?: string;
  by?: string;
  dueTo?: string;
  content: string;
  at: string;
  key?: string;
  agent?: string;
}

interface TranscriptionSegment {
  text: string;
  participantIdentity?: string;
  trackSid?: string;
  timestamp?: number;
  isFinal?: boolean;
}

interface UseSmartMemoryConfig {
  smartMemoryLocation: SmartMemoryLocation;
  apiKey: string;
  autoStart?: boolean;
  timeline?: string;
  agent?: string;
  storeFinalOnly?: boolean; // Only store final transcriptions
  batchSize?: number; // Number of transcriptions to batch before storing
  batchDelayMs?: number; // Delay before auto-storing batched transcriptions
}

interface UseSmartMemoryReturn {
  sessionId: string | null;
  isSessionActive: boolean;
  storeTranscription: (
    transcription: TranscriptionSegment
  ) => Promise<string | null>;
  storeTranscriptions: (
    transcriptions: TranscriptionSegment[]
  ) => Promise<string[]>;
  searchMemories: (terms: string, limit?: number) => Promise<Memory[]>;
  getMemories: (options?: {
    timeline?: string;
    key?: string;
    nMostRecent?: number;
  }) => Promise<Memory[]>;
  startSession: () => Promise<string | null>;
  endSession: (flush?: boolean) => Promise<boolean>;
  deleteMemory: (memoryId: string) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
}

// Main Hook Implementation
