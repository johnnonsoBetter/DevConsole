/**
 * Storage service with in-memory caching and debounced writes
 * Reduces chrome.storage API calls for better performance
 */

// ============================================================================
// STORAGE KEY TYPES
// ============================================================================

export type StorageKey =
  | "devConsole_logs"
  | "devConsole_networkRequests"
  | "devConsole_state"
  | "devConsole_captureSettings"
  | "devConsole_githubSettings"
  | "devConsole_graphqlSettings"
  | "devConsole_theme";

export interface CaptureSettings {
  captureConsole: boolean;
  captureNetwork: boolean;
}

// ============================================================================
// STORAGE SERVICE
// ============================================================================

export class StorageService {
  private static cache = new Map<StorageKey, any>();
  private static pendingWrites = new Map<StorageKey, any>();
  private static writeTimers = new Map<StorageKey, number>();
  private static readonly WRITE_DELAY = 500; // Debounce writes by 500ms
  private static readonly MAX_CACHE_AGE = 5000; // Cache for 5 seconds
  private static cacheTimestamps = new Map<StorageKey, number>();

  /**
   * Get value from storage with caching
   */
  static async get<T = any>(key: StorageKey): Promise<T | null> {
    // Check cache first
    const cached = this.cache.get(key);
    const cacheTime = this.cacheTimestamps.get(key);

    if (
      cached !== undefined &&
      cacheTime &&
      Date.now() - cacheTime < this.MAX_CACHE_AGE
    ) {
      return cached;
    }

    // Check if extension context is valid
    if (!chrome?.runtime?.id) {
      console.warn(
        `[Storage] Extension context invalidated - returning cached value for ${key}`
      );
      return cached ?? null;
    }

    // Fetch from chrome.storage
    try {
      const result = await chrome.storage.local.get(key);
      const value = result[key] ?? null;

      // Update cache
      this.cache.set(key, value);
      this.cacheTimestamps.set(key, Date.now());

      return value;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Return cached value if context is invalidated
      if (
        errorMsg.includes("Extension context") ||
        errorMsg.includes("message port")
      ) {
        console.warn(
          `[Storage] Extension context invalidated - returning cached value for ${key}`
        );
        return cached ?? null;
      }

      console.error(`[Storage] Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in storage with debouncing
   */
  static async set(
    key: StorageKey,
    value: any,
    immediate = false
  ): Promise<void> {
    // Update cache immediately
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
    this.pendingWrites.set(key, value);

    if (immediate) {
      await this.flush(key);
      return;
    }

    // Clear existing timer
    const existingTimer = this.writeTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced write timer
    const timer = window.setTimeout(() => {
      this.flush(key);
    }, this.WRITE_DELAY);

    this.writeTimers.set(key, timer);
  }

  /**
   * Flush pending writes for a specific key
   */
  private static async flush(key: StorageKey): Promise<void> {
    const value = this.pendingWrites.get(key);
    if (value === undefined) return;

    // Check if extension context is valid
    if (!chrome?.runtime?.id) {
      console.warn(
        `[Storage] Extension context invalidated - cannot write ${key}`
      );
      return;
    }

    try {
      await chrome.storage.local.set({ [key]: value });
      this.pendingWrites.delete(key);
      this.writeTimers.delete(key);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Silently handle context invalidation
      if (
        errorMsg.includes("Extension context") ||
        errorMsg.includes("message port")
      ) {
        console.warn(
          `[Storage] Extension context invalidated - cannot write ${key}`
        );
        return;
      }

      console.error(`[Storage] Failed to write ${key}:`, error);
    }
  }

  /**
   * Flush all pending writes
   */
  static async flushAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    this.writeTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.writeTimers.clear();

    this.pendingWrites.forEach((value, key) => {
      promises.push(
        chrome.storage.local.set({ [key]: value }).catch((error) => {
          console.error(`[Storage] Failed to write ${key}:`, error);
        })
      );
    });

    await Promise.all(promises);
    this.pendingWrites.clear();
  }

  /**
   * Remove value from storage
   */
  static async remove(key: StorageKey): Promise<void> {
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
    this.pendingWrites.delete(key);

    const timer = this.writeTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.writeTimers.delete(key);
    }

    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`[Storage] Failed to remove ${key}:`, error);
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.pendingWrites.clear();

    this.writeTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.writeTimers.clear();

    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error("[Storage] Failed to clear:", error);
    }
  }

  /**
   * Invalidate cache for a specific key
   */
  static invalidate(key: StorageKey): void {
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
  }

  /**
   * Listen for storage changes
   */
  static onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
  ): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local") {
        // Invalidate cache for changed keys
        Object.keys(changes).forEach((key) => {
          this.cache.set(key as StorageKey, changes[key].newValue);
          this.cacheTimestamps.set(key as StorageKey, Date.now());
        });

        callback(changes);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    // Return unsubscribe function
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  /**
   * Get multiple keys at once
   */
  static async getMultiple<T extends Partial<Record<StorageKey, any>>>(
    keys: StorageKey[]
  ): Promise<T> {
    try {
      const result = await chrome.storage.local.get(keys);

      // Update cache for all retrieved keys
      keys.forEach((key) => {
        if (result[key] !== undefined) {
          this.cache.set(key, result[key]);
          this.cacheTimestamps.set(key, Date.now());
        }
      });

      return result as T;
    } catch (error) {
      console.error("[Storage] Failed to get multiple keys:", error);
      return {} as T;
    }
  }

  /**
   * Set multiple keys at once
   */
  static async setMultiple(
    items: Partial<Record<StorageKey, any>>,
    immediate = false
  ): Promise<void> {
    // Update cache immediately
    Object.entries(items).forEach(([key, value]) => {
      this.cache.set(key as StorageKey, value);
      this.cacheTimestamps.set(key as StorageKey, Date.now());
      this.pendingWrites.set(key as StorageKey, value);
    });

    if (immediate) {
      try {
        await chrome.storage.local.set(items);
        Object.keys(items).forEach((key) => {
          this.pendingWrites.delete(key as StorageKey);
        });
      } catch (error) {
        console.error("[Storage] Failed to set multiple keys:", error);
      }
      return;
    }

    // Debounce each key individually
    Object.keys(items).forEach((key) => {
      const storageKey = key as StorageKey;
      const existingTimer = this.writeTimers.get(storageKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = window.setTimeout(() => {
        this.flush(storageKey);
      }, this.WRITE_DELAY);

      this.writeTimers.set(storageKey, timer);
    });
  }
}
