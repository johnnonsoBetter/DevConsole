import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Export JSON sanitizer utilities
export {
  ensureJsonObject,
  isJsonSafe,
  safeJsonStringify,
  sanitizeForJson,
} from "./jsonSanitizer";

// Export formatting utilities (includes time utilities with better features)
export * from "./formatUtils";
