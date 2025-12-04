/**
 * Environment Detection Utility
 * Detects whether the inspected page is running in development mode (localhost)
 * vs remote environment.
 *
 * Simple logic: localhost/local network IP = dev mode, everything else = remote
 */

// ============================================================================
// TYPES
// ============================================================================

export type Environment = "development" | "remote";

export interface EnvironmentInfo {
  /** The detected environment type */
  environment: Environment;
  /** Whether this is a development/local environment */
  isDevelopment: boolean;
  /** Whether this is a remote environment */
  isRemote: boolean;
  /** The hostname of the inspected page */
  hostname: string;
  /** The port (if any) */
  port: string;
  /** The full origin URL */
  origin: string;
  /** The protocol (http/https) */
  protocol: string;
  /** Reason for the detection */
  reason: string;
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

/** Localhost patterns - the reliable indicator of dev mode */
const LOCALHOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
];

/** Local network IPs (optional - for testing on other devices) */
const LOCAL_NETWORK_PATTERNS = [
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
];

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect the environment of the current page
 * Call this from the DevTools panel context
 */
export function detectEnvironment(): EnvironmentInfo {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  const origin = window.location.origin;

  return detectEnvironmentFromUrl(hostname, port, protocol, origin);
}

/**
 * Detect environment from URL components
 * Simple logic: localhost/local IP = dev, everything else = production
 */
export function detectEnvironmentFromUrl(
  hostname: string,
  port: string,
  protocol: string,
  origin: string
): EnvironmentInfo {
  const reasons: string[] = [];
  let environment: Environment = "remote";

  // Check localhost patterns (highest confidence)
  if (isLocalhost(hostname)) {
    environment = "development";
    reasons.push(`Localhost: "${hostname}"`);
  }
  // Check local network IPs (for testing on other devices)
  else if (isLocalNetworkIP(hostname)) {
    environment = "development";
    reasons.push(`Local network IP: "${hostname}"`);
  }
  // Everything else is remote
  else {
    reasons.push(`Remote host: "${hostname}"`);
  }

  return {
    environment,
    isDevelopment: environment === "development",
    isRemote: environment === "remote",
    hostname,
    port,
    origin,
    protocol,
    reason: reasons[0],
  };
}

/**
 * Get environment info from the inspected window via chrome.devtools API
 * Use this in DevTools panel context
 */
export async function getInspectedPageEnvironment(): Promise<EnvironmentInfo> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(
      `({
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        origin: window.location.origin
      })`,
      (
        result: {
          hostname: string;
          port: string;
          protocol: string;
          origin: string;
        } | null,
        error
      ) => {
        if (error || !result) {
          // Fallback to remote (safe default)
          resolve({
            environment: "remote",
            isDevelopment: false,
            isRemote: true,
            hostname: "",
            port: "",
            origin: "",
            protocol: "",
            reason: "Failed to get inspected page URL",
          });
          return;
        }

        resolve(
          detectEnvironmentFromUrl(
            result.hostname,
            result.port,
            result.protocol,
            result.origin
          )
        );
      }
    );
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isLocalhost(hostname: string): boolean {
  return LOCALHOST_PATTERNS.includes(hostname.toLowerCase());
}

function isLocalNetworkIP(hostname: string): boolean {
  return LOCAL_NETWORK_PATTERNS.some((pattern) => pattern.test(hostname));
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useEffect, useState } from "react";

/**
 * React hook to get the environment of the inspected page
 * Updates when the inspected page navigates
 */
export function useInspectedPageEnvironment() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function detectEnv() {
      setIsLoading(true);
      try {
        const info = await getInspectedPageEnvironment();
        if (mounted) {
          setEnvInfo(info);
        }
      } catch (error) {
        console.error("[Environment Detection] Error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    detectEnv();

    // Listen for navigation events to re-detect
    const handleNavigation = () => {
      detectEnv();
    };

    // Chrome DevTools navigation event
    if (chrome.devtools?.network?.onNavigated) {
      chrome.devtools.network.onNavigated.addListener(handleNavigation);
    }

    return () => {
      mounted = false;
      if (chrome.devtools?.network?.onNavigated) {
        chrome.devtools.network.onNavigated.removeListener(handleNavigation);
      }
    };
  }, []);

  return { envInfo, isLoading };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick check if running in development
 */
export async function isDevMode(): Promise<boolean> {
  const info = await getInspectedPageEnvironment();
  return info.isDevelopment;
}

/**
 * Get environment badge color for UI
 */
export function getEnvironmentColor(env: Environment): "green" | "blue" {
  return env === "development" ? "green" : "blue";
}

/**
 * Get environment display name
 */
export function getEnvironmentDisplayName(env: Environment): string {
  return env === "development" ? "Dev Mode" : "Remote";
}
