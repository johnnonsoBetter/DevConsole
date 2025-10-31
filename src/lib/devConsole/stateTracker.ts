import { useDevConsoleStore } from "../../utils/stores/devConsole";
import type { StateSnapshot } from "../../utils/stores/devConsole";

// ============================================================================
// STATE TRACKER
// Monitors Zustand stores and captures state changes
// ============================================================================

interface TrackedStore {
  name: string;
  getState: () => any;
  subscribe: (listener: (state: any, prevState: any) => void) => () => void;
}

const trackedStores: Map<string, TrackedStore> = new Map();
const unsubscribeFns: Map<string, () => void> = new Map();

/**
 * Calculate diff between two objects
 */
function calculateDiff(prev: any, next: any): any {
  if (prev === next) return null;

  const diff: any = {};

  // Handle primitives
  if (typeof prev !== "object" || typeof next !== "object") {
    return { from: prev, to: next };
  }

  // Handle arrays
  if (Array.isArray(prev) || Array.isArray(next)) {
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      return { from: prev, to: next };
    }
    return null;
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);

  for (const key of allKeys) {
    const prevVal = prev?.[key];
    const nextVal = next?.[key];

    if (prevVal !== nextVal) {
      if (typeof prevVal === "object" && typeof nextVal === "object") {
        const nestedDiff = calculateDiff(prevVal, nextVal);
        if (nestedDiff) {
          diff[key] = nestedDiff;
        }
      } else {
        diff[key] = { from: prevVal, to: nextVal };
      }
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Register a Zustand store for tracking
 */
export function trackStore(name: string, store: any) {

  if (trackedStores.has(name)) {
    console.warn(`Store "${name}" is already being tracked`);
    return;
  }

  const storeObj: TrackedStore = {
    name,
    getState: store.getState,
    subscribe: store.subscribe,
  };

  trackedStores.set(name, storeObj);

  // Take initial snapshot
  const initialState = store.getState();
  const devConsoleState = useDevConsoleStore.getState();

  devConsoleState.addStateSnapshot({
    storeName: name,
    state: initialState,
    action: "INIT",
  });

  // Subscribe to changes
  const unsubscribe = store.subscribe((state: any, prevState: any) => {
    const diff = calculateDiff(prevState, state);

    if (diff) {
      // Get fresh state reference to avoid stale closures
      const currentDevConsole = useDevConsoleStore.getState();
      currentDevConsole.addStateSnapshot({
        storeName: name,
        state: state,
        diff: diff,
      });
    }
  });

  unsubscribeFns.set(name, unsubscribe);

  console.info(
    `%c📊 DevConsole`,
    "color: #10B981; font-weight: bold; font-size: 14px;",
    `State tracking enabled for "${name}"`
  );
}

/**
 * Unregister a store from tracking
 */
export function untrackStore(name: string) {
  const unsubscribe = unsubscribeFns.get(name);
  if (unsubscribe) {
    unsubscribe();
    unsubscribeFns.delete(name);
  }

  trackedStores.delete(name);

  console.info(
    `%c📊 DevConsole`,
    "color: #10B981; font-weight: bold; font-size: 14px;",
    `State tracking disabled for "${name}"`
  );
}

/**
 * Get all tracked stores
 */
export function getTrackedStores(): string[] {
  return Array.from(trackedStores.keys());
}

/**
 * Get current state of a tracked store
 */
export function getStoreState(name: string): any {
  const store = trackedStores.get(name);
  if (!store) {
    console.warn(`Store "${name}" is not being tracked`);
    return null;
  }

  return store.getState();
}

/**
 * Install automatic tracking for common stores
 */
export function installStateTracking() {
 



  // Track devConsole store itself (meta!)
  import("../../utils/stores/devConsole").then((devConsoleStore) => {
    trackStore("devConsole", devConsoleStore.useDevConsoleStore);
  });

  console.info(
    "%c📊 DevConsole",
    "color: #10B981; font-weight: bold; font-size: 14px;",
    "State tracking initialized"
  );
}

/**
 * Uninstall state tracking
 */
export function uninstallStateTracking() {
  for (const name of trackedStores.keys()) {
    untrackStore(name);
  }
}

/**
 * Check if state tracking is active
 */
export function isStateTrackingActive(): boolean {
  return trackedStores.size > 0;
}
