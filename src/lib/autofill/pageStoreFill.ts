/**
 * Page Store Fill Integration
 * Bridges the page store system with the autofill logic.
 * Provides functions to fill forms using page-specific datasets.
 * Now includes dataset rotation for variety.
 */

import { detectInputType } from "./fieldDetector";
import { fillInput, getAllFillableInputs } from "./fillLogic";
import type {
  PageStore,
  PageStoreDataset,
  PageStoreFieldValue,
} from "./pageStoreTypes";
import { PAGE_STORE_STORAGE_KEY, PAGE_STORE_VERSION } from "./pageStoreTypes";
import { showFillAllConfirmation } from "./uiManager";

// ============================================================================
// DATASET ROTATION TRACKING
// ============================================================================

const ROTATION_STORAGE_KEY = "devConsoleDatasetRotation";

interface DatasetRotationState {
  // Map of storeId -> array of used dataset indices
  usedDatasets: Record<string, number[]>;
  // Map of storeId -> last used dataset index
  lastUsedIndex: Record<string, number>;
}

let rotationState: DatasetRotationState | null = null;

/**
 * Load rotation state from storage
 */
async function loadRotationState(): Promise<DatasetRotationState> {
  if (rotationState) return rotationState;
  
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(ROTATION_STORAGE_KEY, (result) => {
        const data = result[ROTATION_STORAGE_KEY];
        rotationState = data || { usedDatasets: {}, lastUsedIndex: {} };
        resolve(rotationState);
      });
    } catch {
      rotationState = { usedDatasets: {}, lastUsedIndex: {} };
      resolve(rotationState);
    }
  });
}

/**
 * Save rotation state to storage (debounced)
 */
let rotationSaveTimeout: ReturnType<typeof setTimeout> | null = null;
async function saveRotationState(): Promise<void> {
  if (rotationSaveTimeout) clearTimeout(rotationSaveTimeout);
  
  rotationSaveTimeout = setTimeout(() => {
    if (!rotationState) return;
    try {
      chrome.storage.local.set({ [ROTATION_STORAGE_KEY]: rotationState });
    } catch (error) {
      console.error("[PageStore] Failed to save rotation state:", error);
    }
  }, 300);
}

/**
 * Get the next dataset to use for a store (rotates through all datasets)
 */
async function getNextDataset(store: PageStore): Promise<PageStoreDataset | null> {
  if (!store.datasets.length) return null;
  if (store.datasets.length === 1) return store.datasets[0];
  
  const state = await loadRotationState();
  const storeId = store.id;
  
  // Initialize tracking for this store if needed
  if (!state.usedDatasets[storeId]) {
    state.usedDatasets[storeId] = [];
  }
  
  const usedIndices = state.usedDatasets[storeId];
  const totalDatasets = store.datasets.length;
  
  // Find unused dataset indices
  const allIndices = Array.from({ length: totalDatasets }, (_, i) => i);
  const unusedIndices = allIndices.filter(i => !usedIndices.includes(i));
  
  let nextIndex: number;
  
  if (unusedIndices.length === 0) {
    // All datasets used - reset and start from a different one than last time
    const lastUsed = state.lastUsedIndex[storeId] ?? -1;
    state.usedDatasets[storeId] = [];
    
    // Pick the next one after last used (cycling)
    nextIndex = (lastUsed + 1) % totalDatasets;
    console.log(`[PageStore] All ${totalDatasets} datasets used, resetting. Starting with index ${nextIndex}`);
  } else {
    // Pick randomly from unused datasets for variety
    nextIndex = unusedIndices[Math.floor(Math.random() * unusedIndices.length)];
  }
  
  // Track this usage
  state.usedDatasets[storeId].push(nextIndex);
  state.lastUsedIndex[storeId] = nextIndex;
  rotationState = state;
  await saveRotationState();
  
  console.log(`[PageStore] Using dataset ${nextIndex + 1}/${totalDatasets}: "${store.datasets[nextIndex].name}"`);
  return store.datasets[nextIndex];
}

/**
 * Reset rotation for a specific store
 */
export async function resetStoreRotation(storeId: string): Promise<void> {
  const state = await loadRotationState();
  delete state.usedDatasets[storeId];
  delete state.lastUsedIndex[storeId];
  rotationState = state;
  await saveRotationState();
}

// ============================================================================
// PAGE STORE LOADING
// ============================================================================

/**
 * Load page stores from Chrome storage
 */
async function loadPageStores(): Promise<PageStore[]> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(PAGE_STORE_STORAGE_KEY, (result) => {
        const data = result[PAGE_STORE_STORAGE_KEY];
        if (data && data.version === PAGE_STORE_VERSION) {
          resolve(data.stores || []);
        } else {
          resolve([]);
        }
      });
    } catch (error) {
      console.error("[PageStore] Failed to load stores:", error);
      resolve([]);
    }
  });
}

/**
 * Save page stores to Chrome storage
 */
async function savePageStores(stores: PageStore[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const data = {
        stores,
        version: PAGE_STORE_VERSION,
        lastSync: Date.now(),
      };

      chrome.storage.local.set({ [PAGE_STORE_STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// URL MATCHING
// ============================================================================

/**
 * Find a matching page store for the current URL
 */
export async function findPageStoreForCurrentUrl(): Promise<PageStore | null> {
  const stores = await loadPageStores();
  const currentUrl = window.location.href;

  // Find stores that match the current URL
  const matchingStores = stores.filter((store) => {
    try {
      const urlObj = new URL(currentUrl);
      let urlToMatch = urlObj.origin + urlObj.pathname;

      if (store.urlMatcher.includeQueryParams) {
        urlToMatch += urlObj.search;
      }
      if (store.urlMatcher.includeHash) {
        urlToMatch += urlObj.hash;
      }

      switch (store.urlMatcher.type) {
        case "exact":
          return urlToMatch === store.urlMatcher.pattern;
        case "prefix":
          return urlToMatch.startsWith(store.urlMatcher.pattern);
        case "contains":
          return urlToMatch.includes(store.urlMatcher.pattern);
        case "regex":
          try {
            const regex = new RegExp(store.urlMatcher.pattern);
            return regex.test(urlToMatch);
          } catch {
            return false;
          }
        default:
          return false;
      }
    } catch {
      return false;
    }
  });

  // Sort by specificity and return best match
  if (matchingStores.length === 0) return null;

  matchingStores.sort((a, b) => {
    const typeOrder = { exact: 0, prefix: 1, contains: 2, regex: 3 };
    const typeDiff = typeOrder[a.urlMatcher.type] - typeOrder[b.urlMatcher.type];
    if (typeDiff !== 0) return typeDiff;
    return b.lastUsedAt - a.lastUsedAt;
  });

  return matchingStores[0];
}

/**
 * Check if a page store exists for the current URL
 */
export async function hasPageStoreForCurrentUrl(): Promise<boolean> {
  const store = await findPageStoreForCurrentUrl();
  return store !== null;
}

// ============================================================================
// FIELD MATCHING
// ============================================================================

/**
 * Find the best matching field value for an input
 */
function findFieldValueForInput(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  dataset: PageStoreDataset
): PageStoreFieldValue | null {
  const detectedType = detectInputType(input);
  const inputName = (input.name || "").toLowerCase();
  const inputId = (input.id || "").toLowerCase();
  const placeholder =
    input instanceof HTMLSelectElement ? "" : (input.placeholder || "").toLowerCase();

  // Try to find an exact match by field type
  let match = dataset.values.find((v) => v.fieldType === detectedType);

  // If no exact match, try to match by field ID patterns
  if (!match) {
    match = dataset.values.find((v) => {
      const fieldId = v.fieldId.toLowerCase();
      return (
        fieldId.includes(inputName) ||
        fieldId.includes(inputId) ||
        inputName.includes(v.fieldType) ||
        inputId.includes(v.fieldType)
      );
    });
  }

  // Try matching by placeholder text
  if (!match && placeholder) {
    match = dataset.values.find((v) =>
      placeholder.includes(v.fieldType.toLowerCase())
    );
  }

  return match || null;
}

/**
 * Get the value for a specific field type from a dataset
 */
export function getPageStoreFieldValue(
  dataset: PageStoreDataset,
  fieldType: string
): string | null {
  const match = dataset.values.find((v) => v.fieldType === fieldType);
  return match?.value || null;
}

// ============================================================================
// FILL OPERATIONS
// ============================================================================

/**
 * Fill all inputs on the page using a page store dataset
 * Now with automatic rotation through all available datasets
 */
export async function fillWithPageStore(
  store?: PageStore,
  datasetId?: string
): Promise<{ filled: number; total: number }> {
  let pageStore = store;

  // Find store for current URL if not provided
  if (!pageStore) {
    const foundStore = await findPageStoreForCurrentUrl();
    if (!foundStore) {
      console.log("[PageStore] No store found for current URL");
      return { filled: 0, total: 0 };
    }
    pageStore = foundStore;
  }

  // Get the dataset to use - WITH ROTATION
  let dataset: PageStoreDataset | undefined | null;
  
  if (datasetId) {
    // Explicit dataset requested - use it directly
    dataset = pageStore.datasets.find((d) => d.id === datasetId);
  } else {
    // No explicit dataset - use rotation to get next one
    dataset = await getNextDataset(pageStore);
  }

  if (!dataset) {
    console.log("[PageStore] No dataset available in store:", pageStore.name);
    return { filled: 0, total: 0 };
  }

  console.log(`[PageStore] Filling with dataset: ${dataset.name}`);

  const inputs = getAllFillableInputs();
  let filledCount = 0;

  for (const input of inputs) {
    const fieldValue = findFieldValueForInput(input, dataset);
    if (fieldValue) {
      fillInput(input, fieldValue.value, false);
      filledCount++;
    }
  }

  // Record usage
  await recordStoreUsage(pageStore.id);

  // Show confirmation
  if (filledCount > 0) {
    const firstInput = inputs[0];
    if (firstInput) {
      showFillAllConfirmation(filledCount, dataset.name);
    }
  }

  console.log(
    `[PageStore] Filled ${filledCount}/${inputs.length} inputs using "${dataset.name}"`
  );

  return { filled: filledCount, total: inputs.length };
}

/**
 * Fill a single input using the page store
 */
export async function fillInputWithPageStore(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): Promise<boolean> {
  const pageStore = await findPageStoreForCurrentUrl();
  if (!pageStore) return false;

  const dataset = pageStore.datasets.find(
    (d) => d.id === pageStore.activeDatasetId
  );
  if (!dataset) return false;

  const fieldValue = findFieldValueForInput(input, dataset);
  if (!fieldValue) return false;

  fillInput(input, fieldValue.value, true);
  return true;
}

/**
 * Get suggestions for an input from the page store
 */
export async function getPageStoreSuggestions(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): Promise<string[]> {
  const pageStore = await findPageStoreForCurrentUrl();
  if (!pageStore) return [];

  const detectedType = detectInputType(input);
  const suggestions: string[] = [];

  // Collect all values for this field type across all datasets
  for (const dataset of pageStore.datasets) {
    const fieldValue = dataset.values.find((v) => v.fieldType === detectedType);
    if (fieldValue && !suggestions.includes(fieldValue.value)) {
      suggestions.push(fieldValue.value);
    }
  }

  return suggestions;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Record usage of a page store
 */
async function recordStoreUsage(storeId: string): Promise<void> {
  try {
    const stores = await loadPageStores();
    const storeIndex = stores.findIndex((s) => s.id === storeId);

    if (storeIndex !== -1) {
      stores[storeIndex] = {
        ...stores[storeIndex],
        usageCount: stores[storeIndex].usageCount + 1,
        lastUsedAt: Date.now(),
      };
      await savePageStores(stores);
    }
  } catch (error) {
    console.error("[PageStore] Failed to record usage:", error);
  }
}

// ============================================================================
// INTEGRATION WITH MAIN FILL LOGIC
// ============================================================================

/**
 * Attempt to fill using page store first, then fall back to regular DataStore
 * This function can be called by fillAllInputs as a primary option
 */
export async function tryFillWithPageStore(): Promise<boolean> {
  const hasStore = await hasPageStoreForCurrentUrl();
  if (!hasStore) return false;

  const result = await fillWithPageStore();
  return result.filled > 0;
}

/**
 * Get the active page store dataset for the current URL
 */
export async function getActivePageStoreDataset(): Promise<{
  store: PageStore;
  dataset: PageStoreDataset;
} | null> {
  const pageStore = await findPageStoreForCurrentUrl();
  if (!pageStore) return null;

  let dataset: PageStoreDataset | undefined;
  if (pageStore.activeDatasetId) {
    dataset = pageStore.datasets.find((d) => d.id === pageStore.activeDatasetId);
  }
  if (!dataset && pageStore.datasets.length > 0) {
    dataset = pageStore.datasets[0];
  }

  if (!dataset) return null;

  return { store: pageStore, dataset };
}

// ============================================================================
// PAGE STORE CREATION FROM CONTENT SCRIPT
// ============================================================================

/**
 * Detect form purpose from URL and page content
 */
function detectPagePurpose(): string {
  const url = window.location.href.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  if (url.includes('login') || url.includes('signin') || path.includes('login')) return 'login';
  if (url.includes('signup') || url.includes('register') || path.includes('signup')) return 'signup';
  if (url.includes('contact') || path.includes('contact')) return 'contact';
  if (url.includes('checkout') || url.includes('payment') || path.includes('checkout')) return 'checkout';
  if (url.includes('search') || path.includes('search')) return 'search';
  if (url.includes('profile') || path.includes('profile')) return 'profile';
  if (url.includes('settings') || path.includes('settings')) return 'settings';
  if (url.includes('feedback') || path.includes('feedback')) return 'feedback';
  if (url.includes('subscribe') || url.includes('newsletter')) return 'newsletter';
  if (url.includes('book') || url.includes('reservation')) return 'booking';
  if (url.includes('apply') || url.includes('application')) return 'application';
  if (url.includes('campaign') || url.includes('create')) return 'application';

  return 'unknown';
}

/**
 * Analyze current page and create a page store with detected forms
 */
export async function createPageStoreFromCurrentPage(storeName?: string): Promise<PageStore | null> {
  try {
    const stores = await loadPageStores();
    const url = window.location.href;
    const urlObj = new URL(url);

    // Check if store already exists for this URL
    const existingStore = stores.find(s => {
      if (s.urlMatcher.type === 'exact') return s.urlMatcher.pattern === url;
      if (s.urlMatcher.type === 'prefix') return url.startsWith(s.urlMatcher.pattern);
      return false;
    });

    if (existingStore) {
      console.log('[PageStore] Store already exists for this URL:', existingStore.name);
      return existingStore;
    }

    // Get all fillable inputs
    const inputs = getAllFillableInputs();
    if (inputs.length === 0) {
      console.warn('[PageStore] No fillable inputs found on page');
      return null;
    }

    // Analyze inputs and create form/field structure
    const fields = inputs.map((input, index) => {
      const detectedType = detectInputType(input);
      
      // Get label
      let label = '';
      if (input.id) {
        const labelEl = document.querySelector(`label[for="${input.id}"]`);
        if (labelEl) label = labelEl.textContent?.trim() || '';
      }
      if (!label && input.closest('label')) {
        label = input.closest('label')?.textContent?.trim() || '';
      }
      const ariaLabel = input.getAttribute('aria-label') || '';
      if (!label && ariaLabel) label = ariaLabel;

      // Generate selector
      let selector = '';
      if (input.id) {
        selector = `#${CSS.escape(input.id)}`;
      } else if (input.name) {
        selector = `[name="${input.name}"]`;
      } else {
        selector = `${input.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
      }

      return {
        id: `field-${index}-${Date.now()}`,
        name: input.name || '',
        elementId: input.id || '',
        type: input instanceof HTMLInputElement ? input.type : input.tagName.toLowerCase(),
        label,
        placeholder: (input as HTMLInputElement).placeholder || '',
        ariaLabel,
        detectedType,
        required: input.required || input.getAttribute('aria-required') === 'true',
        selector,
        order: index,
      };
    });

    // Create virtual form containing all fields
    const form = {
      id: `form-${Date.now()}`,
      name: 'Page Fields',
      action: '',
      method: '',
      selector: 'body',
      fields,
    };

    // Create the new store
    const newStore: PageStore = {
      id: `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: storeName || document.title || urlObj.hostname,
      urlMatcher: {
        pattern: `${urlObj.origin}${urlObj.pathname}`,
        type: 'prefix',
        includeQueryParams: false,
        includeHash: false,
      },
      originalUrl: url,
      hostname: urlObj.hostname,
      forms: [form],
      datasets: [],
      activeDatasetId: null,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      usageCount: 0,
      pageMetadata: {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        detectedPurpose: detectPagePurpose(),
        keywords: [],
      },
      hasAIDatasets: false,
    };

    // Save to storage
    const updatedStores = [...stores, newStore];
    await savePageStores(updatedStores);

    console.log('[PageStore] ✅ Created page store:', newStore.name, 'with', fields.length, 'fields');
    return newStore;
  } catch (error) {
    console.error('[PageStore] Failed to create page store:', error);
    return null;
  }
}

/**
 * Delete a page store by ID
 */
export async function deletePageStore(storeId: string): Promise<boolean> {
  try {
    const stores = await loadPageStores();
    const updatedStores = stores.filter(s => s.id !== storeId);
    
    if (updatedStores.length === stores.length) {
      console.warn('[PageStore] Store not found:', storeId);
      return false;
    }

    await savePageStores(updatedStores);
    console.log('[PageStore] Deleted store:', storeId);
    return true;
  } catch (error) {
    console.error('[PageStore] Failed to delete store:', error);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  loadPageStores,
  savePageStores,
  findFieldValueForInput,
  recordStoreUsage,
};
