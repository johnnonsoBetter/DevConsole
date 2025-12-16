/**
 * Page Store Zustand Store
 * State management for page-specific autofill stores.
 * Bridges the PageStoreManager with React components.
 */

import { create } from "zustand";
import type {
  CreatePageStoreOptions,
  PageStore,
  PageStoreDataset,
  PageStoreSearchOptions,
  PageStoreStats,
} from "../../lib/autofill/pageStoreTypes";
import {
  PAGE_STORE_STORAGE_KEY,
  PAGE_STORE_VERSION,
} from "../../lib/autofill/pageStoreTypes";

// ============================================================================
// TYPES
// ============================================================================

interface PageStoresState {
  // State
  stores: PageStore[];
  currentStore: PageStore | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  isLoaded: boolean;

  // Actions
  loadStores: () => Promise<void>;
  refreshStores: () => Promise<void>;
  
  // Current page store
  setCurrentStore: (store: PageStore | null) => void;
  findStoreForUrl: (url: string) => PageStore | null;
  
  // CRUD
  createStore: (options?: CreatePageStoreOptions) => Promise<PageStore | null>;
  updateStore: (storeId: string, updates: Partial<PageStore>) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  
  // Dataset operations
  addDataset: (
    storeId: string,
    dataset: Omit<PageStoreDataset, "id" | "createdAt" | "updatedAt">
  ) => Promise<PageStoreDataset | null>;
  updateDataset: (
    storeId: string,
    datasetId: string,
    updates: Partial<PageStoreDataset>
  ) => Promise<void>;
  deleteDataset: (storeId: string, datasetId: string) => Promise<void>;
  setActiveDataset: (storeId: string, datasetId: string) => Promise<void>;
  
  // AI generation
  generateDatasetsWithAI: (
    storeId: string,
    options?: {
      count?: number;
    }
  ) => Promise<PageStoreDataset[]>;
  generateQuickDatasets: (
    storeId: string,
    count?: number
  ) => Promise<PageStoreDataset[]>;
  addDatasetsToStore: (
    storeId: string,
    datasets: PageStoreDataset[]
  ) => Promise<PageStoreDataset[]>;
  setIsGenerating: (isGenerating: boolean) => void;
  
  // Search & stats
  searchStores: (options?: PageStoreSearchOptions) => PageStore[];
  getStats: () => PageStoreStats;
  
  // Import/Export
  exportStores: () => string;
  importStores: (jsonString: string, mode?: "replace" | "merge") => Promise<number>;
  
  // Usage tracking
  recordUsage: (storeId: string) => Promise<void>;
  
  // Clear error
  clearError: () => void;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Check if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

async function loadFromStorage(): Promise<PageStore[]> {
  return new Promise((resolve) => {
    try {
      if (!isExtensionContextValid()) {
        console.warn("[PageStore] Extension context invalidated - returning empty stores");
        resolve([]);
        return;
      }
      
      chrome.storage.local.get(PAGE_STORE_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message || "";
          if (/extension context invalidated/i.test(msg)) {
            console.warn("[PageStore] Extension context invalidated during load");
            resolve([]);
            return;
          }
        }
        const data = result[PAGE_STORE_STORAGE_KEY];
        if (data && data.version === PAGE_STORE_VERSION) {
          resolve(data.stores || []);
        } else {
          resolve([]);
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/extension context invalidated/i.test(msg)) {
        console.warn("[PageStore] Extension context invalidated");
        resolve([]);
        return;
      }
      console.error("Failed to load page stores:", error);
      resolve([]);
    }
  });
}

async function saveToStorage(stores: PageStore[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!isExtensionContextValid()) {
        console.warn("[PageStore] Extension context invalidated - cannot save");
        resolve(); // Silently resolve to avoid cascading errors
        return;
      }
      
      const data = {
        stores,
        version: PAGE_STORE_VERSION,
        lastSync: Date.now(),
      };

      chrome.storage.local.set({ [PAGE_STORE_STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message || "";
          if (/extension context invalidated/i.test(msg)) {
            console.warn("[PageStore] Extension context invalidated during save");
            resolve(); // Silently resolve
            return;
          }
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/extension context invalidated/i.test(msg)) {
        console.warn("[PageStore] Extension context invalidated");
        resolve(); // Silently resolve
        return;
      }
      reject(error);
    }
  });
}

// ============================================================================
// URL MATCHING
// ============================================================================

function urlMatches(url: string, store: PageStore): boolean {
  try {
    const urlObj = new URL(url);
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
}

// ============================================================================
// STORE
// ============================================================================

export const usePageStoresStore = create<PageStoresState>((set, get) => ({
  // Initial state
  stores: [],
  currentStore: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  isLoaded: false,

  // Load stores from storage
  loadStores: async () => {
    if (get().isLoaded) return;
    
    set({ isLoading: true, error: null });
    try {
      const stores = await loadFromStorage();
      set({ stores, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load stores",
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  // Refresh stores from storage
  refreshStores: async () => {
    set({ isLoading: true, error: null });
    try {
      const stores = await loadFromStorage();
      set({ stores, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to refresh stores",
        isLoading: false,
      });
    }
  },

  // Set current store
  setCurrentStore: (store) => {
    set({ currentStore: store });
  },

  // Find store for URL
  findStoreForUrl: (url) => {
    const { stores } = get();
    
    // Sort by specificity and find best match
    const matchingStores = stores
      .filter((store) => urlMatches(url, store))
      .sort((a, b) => {
        const typeOrder = { exact: 0, prefix: 1, contains: 2, regex: 3 };
        const typeDiff =
          typeOrder[a.urlMatcher.type] - typeOrder[b.urlMatcher.type];
        if (typeDiff !== 0) return typeDiff;
        return b.lastUsedAt - a.lastUsedAt;
      });

    return matchingStores[0] || null;
  },

  // Create a new store
  createStore: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      // Check extension context first
      if (!isExtensionContextValid()) {
        set({ 
          error: "Extension context invalidated. Please close and reopen DevTools.",
          isLoading: false 
        });
        return null;
      }
      
      const { stores } = get();
      
      // Get page info from the inspected window (not the DevTools panel)
      const pageInfo = await new Promise<{
        url: string;
        title: string;
        description: string;
        forms: Array<{
          id: string;
          name: string;
          action: string;
          method: string;
          selector: string;
          fields: Array<{
            id: string;
            elementId: string;
            name: string;
            type: string;
            detectedType: string;
            label: string;
            placeholder: string;
            ariaLabel: string;
            required: boolean;
            selector: string;
            order: number;
          }>;
        }>;
        detectedPurpose: string;
      }>((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.devtools?.inspectedWindow?.eval) {
          chrome.devtools.inspectedWindow.eval(`
            (function() {
              // ============================================================
              // FIELD TYPE DETECTION (from fieldDetector.ts)
              // ============================================================
              function extractPatterns(input) {
                const attrs = [
                  input.name,
                  input.id,
                  input.placeholder || '',
                  input.getAttribute('aria-label'),
                  input.className,
                  input.getAttribute('data-testid'),
                  input.getAttribute('data-test-id'),
                  input.getAttribute('data-cy'),
                  input.getAttribute('data-field'),
                  input.getAttribute('data-type'),
                  input.getAttribute('inputmode'),
                ].filter(Boolean).join(' ').toLowerCase();
                return attrs.split(/[\\s\\-_]+/);
              }

              function classifyByPatterns(tokens) {
                const hasToken = (keywords) => tokens.some(token => keywords.some(kw => token.includes(kw)));
                
                if (hasToken(['email', 'mail', 'e-mail'])) return 'email';
                if (hasToken(['phone', 'tel', 'mobile', 'cell'])) return 'phone';
                if (hasToken(['first', 'given', 'fname']) && hasToken(['name'])) return 'firstName';
                if (hasToken(['last', 'family', 'surname', 'lname']) && hasToken(['name'])) return 'lastName';
                if ((hasToken(['full', 'complete']) && hasToken(['name'])) || hasToken(['name', 'user', 'login', 'account'])) return 'name';
                if (hasToken(['address', 'street', 'addr'])) return 'address';
                if (hasToken(['city', 'town'])) return 'city';
                if (hasToken(['state', 'province', 'region'])) return 'state';
                if (hasToken(['zip', 'postal', 'postcode'])) return 'zip';
                if (hasToken(['country', 'nation'])) return 'country';
                if (hasToken(['company', 'organization', 'org', 'employer'])) return 'company';
                if (hasToken(['title', 'position', 'role', 'job']) && !hasToken(['page', 'article'])) return 'title';
                if (hasToken(['website', 'site', 'url', 'web'])) return 'website';
                if (hasToken(['message', 'comment', 'note', 'description', 'bio', 'about'])) return 'message';
                if (hasToken(['password', 'pass', 'pwd'])) return 'password';
                if (hasToken(['search', 'query', 'find'])) return 'search';
                return null;
              }

              function detectInputType(input) {
                if (input.tagName === 'TEXTAREA') return 'message';
                if (input.tagName === 'SELECT') {
                  const patterns = extractPatterns(input);
                  return classifyByPatterns(patterns) || 'select';
                }
                
                const type = (input.type || '').toLowerCase();
                const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();
                
                // Trust explicit HTML attributes first
                if (type === 'email') return 'email';
                if (type === 'tel') return 'phone';
                if (type === 'url') return 'website';
                if (type === 'number') return 'number';
                if (type === 'date') return 'date';
                if (type === 'password') return 'password';
                
                // Trust autocomplete attribute
                const acMap = {
                  'email': 'email', 'tel': 'phone', 'given-name': 'firstName',
                  'family-name': 'lastName', 'name': 'name', 'street-address': 'address',
                  'address-line1': 'address', 'postal-code': 'zip', 'country': 'country'
                };
                if (acMap[autocomplete]) return acMap[autocomplete];
                
                // Use pattern matching
                const patterns = extractPatterns(input);
                return classifyByPatterns(patterns) || 'text';
              }

              // ============================================================
              // PURPOSE DETECTION
              // ============================================================
              function detectPurpose() {
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
                if (url.includes('survey') || url.includes('poll')) return 'survey';
                if (url.includes('campaign') || url.includes('create')) return 'application';
                
                const forms = document.querySelectorAll('form');
                for (const form of forms) {
                  const formId = (form.id || '').toLowerCase();
                  const formClass = (form.className || '').toLowerCase();
                  if (formId.includes('login') || formClass.includes('login')) return 'login';
                  if (formId.includes('signup') || formClass.includes('signup')) return 'signup';
                  if (formId.includes('contact') || formClass.includes('contact')) return 'contact';
                }
                
                return 'unknown';
              }

              // ============================================================
              // FORM AND FIELD EXTRACTION
              // ============================================================
              function getFieldInfo(el, index) {
                let label = '';
                if (el.id) {
                  const labelEl = document.querySelector('label[for="' + el.id + '"]');
                  if (labelEl) label = labelEl.textContent.trim();
                }
                if (!label && el.closest('label')) {
                  label = el.closest('label').textContent.trim();
                }
                const ariaLabel = el.getAttribute('aria-label') || '';
                if (!label && ariaLabel) label = ariaLabel;
                
                // Generate a unique selector for this field
                let selector = '';
                if (el.id) {
                  selector = '#' + CSS.escape(el.id);
                } else if (el.name) {
                  selector = '[name="' + el.name + '"]';
                } else {
                  selector = el.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')';
                }
                
                return {
                  id: 'field-' + index + '-' + Date.now(),
                  elementId: el.id || '',
                  name: el.name || '',
                  type: el.type || el.tagName.toLowerCase(),
                  detectedType: detectInputType(el),
                  label: label,
                  placeholder: el.placeholder || '',
                  ariaLabel: ariaLabel,
                  required: el.required || el.getAttribute('aria-required') === 'true',
                  selector: selector,
                  order: index
                };
              }

              function isVisible(el) {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                
                // Skip completely hidden elements
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                
                // Allow elements with 0 size if they're file inputs or radios (commonly hidden but functional)
                if (el.type === 'file' || el.type === 'radio') return !el.disabled;
                
                // Regular visibility check
                if (rect.width === 0 && rect.height === 0) return false;
                
                return !el.disabled;
              }

              function getAllInputs() {
                const inputs = [];
                const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select';
                
                document.querySelectorAll(selector).forEach((el, index) => {
                  if (isVisible(el)) {
                    inputs.push(getFieldInfo(el, index));
                  }
                });
                
                return inputs;
              }

              function getForms() {
                const formElements = document.querySelectorAll('form');
                const forms = [];
                
                formElements.forEach((form, formIndex) => {
                  const fields = [];
                  const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select';
                  
                  form.querySelectorAll(selector).forEach((el, fieldIndex) => {
                    if (isVisible(el)) {
                      fields.push(getFieldInfo(el, fieldIndex));
                    }
                  });
                  
                  // Generate form selector
                  let formSelector = '';
                  if (form.id) {
                    formSelector = '#' + CSS.escape(form.id);
                  } else if (form.name) {
                    formSelector = 'form[name="' + form.name + '"]';
                  } else {
                    formSelector = 'form:nth-of-type(' + (formIndex + 1) + ')';
                  }
                  
                  if (fields.length > 0) {
                    forms.push({
                      id: 'form-' + formIndex + '-' + Date.now(),
                      name: form.name || form.id || 'Form ' + (formIndex + 1),
                      action: form.action || '',
                      method: (form.method || 'get').toUpperCase(),
                      selector: formSelector,
                      fields: fields
                    });
                  }
                });
                
                // If no forms but there are inputs, create a virtual form
                if (forms.length === 0) {
                  const allInputs = getAllInputs();
                  if (allInputs.length > 0) {
                    forms.push({
                      id: 'virtual-form-' + Date.now(),
                      name: 'Page Fields',
                      action: '',
                      method: '',
                      selector: 'body',
                      fields: allInputs
                    });
                  }
                }
                
                return forms;
              }
              
              return {
                url: window.location.href,
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                forms: getForms(),
                detectedPurpose: detectPurpose()
              };
            })()
          `, (result, error) => {
            if (error) {
              const errorMsg = error.message || error.toString() || '';
              console.error('Failed to get page info:', error);
              
              // Check for extension context invalidation
              if (/extension context invalidated/i.test(errorMsg)) {
                reject(new Error('Extension context invalidated. Please close and reopen DevTools.'));
              } else {
                reject(new Error('Failed to analyze page: ' + errorMsg));
              }
            } else if (!result) {
              reject(new Error('No page info returned. Make sure the page is fully loaded.'));
            } else {
              resolve(result);
            }
          });
        } else {
          // Fallback for non-DevTools context (shouldn't happen in panel)
          reject(new Error('DevTools API not available. Please reopen DevTools.'));
        }
      }).catch((err) => {
        // Handle any promise rejection including context invalidation
        const msg = err instanceof Error ? err.message : String(err);
        if (/extension context invalidated/i.test(msg)) {
          throw new Error('Extension context invalidated. Please close and reopen DevTools.');
        }
        throw err;
      });

      const urlObj = new URL(pageInfo.url);
      
      // Convert to proper PageForm types
      const forms = pageInfo.forms.map(f => ({
        id: f.id,
        name: f.name,
        action: f.action,
        method: f.method,
        selector: f.selector,
        fields: f.fields.map(field => ({
          id: field.id,
          name: field.name,
          elementId: field.elementId,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          ariaLabel: field.ariaLabel,
          detectedType: field.detectedType,
          required: field.required,
          selector: field.selector,
          order: field.order,
        }))
      }));

      const newStore: PageStore = {
        id: `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: options.name || pageInfo.title || urlObj.hostname,
        urlMatcher: {
          pattern: `${urlObj.origin}${urlObj.pathname}`,
          type: options.urlMatcher?.type || "prefix",
          includeQueryParams: options.urlMatcher?.includeQueryParams ?? false,
          includeHash: options.urlMatcher?.includeHash ?? false,
        },
        originalUrl: pageInfo.url,
        hostname: urlObj.hostname,
        forms: forms,
        datasets: [],
        activeDatasetId: null,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        usageCount: 0,
        pageMetadata: {
          title: pageInfo.title,
          description: pageInfo.description,
          detectedPurpose: pageInfo.detectedPurpose,
          keywords: [],
        },
        hasAIDatasets: false,
      };

      const updatedStores = [...stores, newStore];
      await saveToStorage(updatedStores);
      set({ stores: updatedStores, currentStore: newStore, isLoading: false });

      console.log("✅ Created page store:", newStore.name, "with", pageInfo.forms.length, "forms detected");
      return newStore;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create store",
        isLoading: false,
      });
      return null;
    }
  },

  // Update a store
  updateStore: async (storeId, updates) => {
    const { stores } = get();
    const index = stores.findIndex((s) => s.id === storeId);
    if (index === -1) {
      set({ error: "Store not found" });
      return;
    }

    const updatedStores = [...stores];
    updatedStores[index] = { ...updatedStores[index], ...updates };

    await saveToStorage(updatedStores);
    set({ stores: updatedStores });

    // Update currentStore if it's the same
    const { currentStore } = get();
    if (currentStore?.id === storeId) {
      set({ currentStore: updatedStores[index] });
    }
  },

  // Delete a store
  deleteStore: async (storeId) => {
    const { stores, currentStore } = get();
    const updatedStores = stores.filter((s) => s.id !== storeId);

    await saveToStorage(updatedStores);
    set({
      stores: updatedStores,
      currentStore: currentStore?.id === storeId ? null : currentStore,
    });

    console.log("✅ Deleted page store:", storeId);
  },

  // Add a dataset to a store
  addDataset: async (storeId, datasetData) => {
    const { stores } = get();
    const storeIndex = stores.findIndex((s) => s.id === storeId);
    if (storeIndex === -1) {
      set({ error: "Store not found" });
      return null;
    }

    const newDataset: PageStoreDataset = {
      ...datasetData,
      id: `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedStores = [...stores];
    updatedStores[storeIndex] = {
      ...updatedStores[storeIndex],
      datasets: [...updatedStores[storeIndex].datasets, newDataset],
      hasAIDatasets:
        updatedStores[storeIndex].hasAIDatasets || newDataset.isAIGenerated,
    };

    // Set as active if first dataset
    if (updatedStores[storeIndex].datasets.length === 1) {
      updatedStores[storeIndex].activeDatasetId = newDataset.id;
    }

    await saveToStorage(updatedStores);
    set({ stores: updatedStores });

    // Update currentStore if same
    const { currentStore } = get();
    if (currentStore?.id === storeId) {
      set({ currentStore: updatedStores[storeIndex] });
    }

    console.log("✅ Added dataset:", newDataset.name);
    return newDataset;
  },

  // Update a dataset
  updateDataset: async (storeId, datasetId, updates) => {
    const { stores } = get();
    const storeIndex = stores.findIndex((s) => s.id === storeId);
    if (storeIndex === -1) {
      set({ error: "Store not found" });
      return;
    }

    const datasetIndex = stores[storeIndex].datasets.findIndex(
      (d) => d.id === datasetId
    );
    if (datasetIndex === -1) {
      set({ error: "Dataset not found" });
      return;
    }

    const updatedStores = [...stores];
    const updatedDatasets = [...updatedStores[storeIndex].datasets];
    updatedDatasets[datasetIndex] = {
      ...updatedDatasets[datasetIndex],
      ...updates,
      updatedAt: Date.now(),
    };
    updatedStores[storeIndex] = {
      ...updatedStores[storeIndex],
      datasets: updatedDatasets,
    };

    await saveToStorage(updatedStores);
    set({ stores: updatedStores });

    const { currentStore } = get();
    if (currentStore?.id === storeId) {
      set({ currentStore: updatedStores[storeIndex] });
    }
  },

  // Delete a dataset
  deleteDataset: async (storeId, datasetId) => {
    const { stores } = get();
    const storeIndex = stores.findIndex((s) => s.id === storeId);
    if (storeIndex === -1) return;

    const updatedStores = [...stores];
    updatedStores[storeIndex] = {
      ...updatedStores[storeIndex],
      datasets: updatedStores[storeIndex].datasets.filter(
        (d) => d.id !== datasetId
      ),
    };

    // Update active dataset if needed
    if (updatedStores[storeIndex].activeDatasetId === datasetId) {
      updatedStores[storeIndex].activeDatasetId =
        updatedStores[storeIndex].datasets[0]?.id || null;
    }

    await saveToStorage(updatedStores);
    set({ stores: updatedStores });

    const { currentStore } = get();
    if (currentStore?.id === storeId) {
      set({ currentStore: updatedStores[storeIndex] });
    }

    console.log("✅ Deleted dataset:", datasetId);
  },

  // Set active dataset
  setActiveDataset: async (storeId, datasetId) => {
    const { updateStore } = get();
    await updateStore(storeId, { activeDatasetId: datasetId });
  },

  // Generate datasets with AI - now just saves pre-generated datasets
  generateDatasetsWithAI: async (_storeId, _options = {}) => {
    // AI generation is now handled by usePageStoreAI hook in components
    // This method is kept for backward compatibility but should use addDatasetsToStore instead
    console.warn("generateDatasetsWithAI is deprecated. Use usePageStoreAI hook directly in components.");
    set({ error: "Use the AI Generate button which uses the new usePageStoreAI hook" });
    return [];
  },

  // Add pre-generated datasets to a store (used after AI generation in component)
  addDatasetsToStore: async (storeId, datasets) => {
    const { stores } = get();
    const storeIndex = stores.findIndex((s) => s.id === storeId);
    if (storeIndex === -1) {
      set({ error: "Store not found" });
      return [];
    }

    const updatedStores = [...stores];
    const addedDatasets: PageStoreDataset[] = [];

    for (const datasetData of datasets) {
      // Datasets should already have id, createdAt, updatedAt from the hook
      const newDataset: PageStoreDataset = {
        ...datasetData,
        updatedAt: Date.now(),
      };
      addedDatasets.push(newDataset);
    }

    updatedStores[storeIndex] = {
      ...updatedStores[storeIndex],
      datasets: [...updatedStores[storeIndex].datasets, ...addedDatasets],
      hasAIDatasets: addedDatasets.some((d) => d.isAIGenerated) || updatedStores[storeIndex].hasAIDatasets,
    };

    // Set first as active if no active dataset
    if (!updatedStores[storeIndex].activeDatasetId && addedDatasets.length > 0) {
      updatedStores[storeIndex].activeDatasetId = addedDatasets[0].id;
    }

    await saveToStorage(updatedStores);
    set({ stores: updatedStores });

    const { currentStore } = get();
    if (currentStore?.id === storeId) {
      set({ currentStore: updatedStores[storeIndex] });
    }

    console.log("✅ Added", addedDatasets.length, "datasets to store");
    return addedDatasets;
  },

  // Generate quick datasets without AI
  generateQuickDatasets: async (storeId, count = 10) => {
    set({ isGenerating: true, error: null });
    try {
      const { generateQuickDatasetsForStore } = await import(
        "../../lib/autofill/aiFormAnalyzer"
      );
      
      const { stores } = get();
      const store = stores.find((s) => s.id === storeId);
      if (!store) {
        throw new Error("Store not found");
      }

      // Generate datasets from forms
      const datasetData = generateQuickDatasetsForStore(store.forms, count);
      
      // Add them to the store
      const addedDatasets = await get().addDatasetsToStore(
        storeId,
        datasetData.map((d) => ({
          ...d,
          id: `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }))
      );

      set({ isGenerating: false });
      return addedDatasets;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate datasets",
        isGenerating: false,
      });
      return [];
    }
  },

  // Set generating state (used by components with usePageStoreAI hook)
  setIsGenerating: (isGenerating) => {
    set({ isGenerating });
  },

  // Search stores
  searchStores: (options = {}) => {
    let results = [...get().stores];

    if (options.hostname) {
      results = results.filter((s) => s.hostname === options.hostname);
    }
    if (options.purpose) {
      results = results.filter(
        (s) => s.pageMetadata.detectedPurpose === options.purpose
      );
    }
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.originalUrl.toLowerCase().includes(query)
      );
    }

    const sortBy = options.sortBy || "lastUsedAt";
    const sortOrder = options.sortOrder || "desc";
    results.sort((a, b) => {
      const aVal = a[sortBy] as number | string;
      const bVal = b[sortBy] as number | string;
      const diff =
        typeof aVal === "number"
          ? aVal - (bVal as number)
          : String(aVal).localeCompare(String(bVal));
      return sortOrder === "asc" ? diff : -diff;
    });

    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  },

  // Get statistics
  getStats: () => {
    const { stores } = get();
    const byHostname: Record<string, number> = {};
    const byPurpose: Record<string, number> = {};
    let totalDatasets = 0;
    let totalUsageCount = 0;

    stores.forEach((store) => {
      byHostname[store.hostname] = (byHostname[store.hostname] || 0) + 1;
      byPurpose[store.pageMetadata.detectedPurpose] =
        (byPurpose[store.pageMetadata.detectedPurpose] || 0) + 1;
      totalDatasets += store.datasets.length;
      totalUsageCount += store.usageCount;
    });

    const recentlyUsed = [...stores]
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 5)
      .map((s) => ({ id: s.id, name: s.name, lastUsedAt: s.lastUsedAt }));

    return {
      totalStores: stores.length,
      totalDatasets,
      byHostname,
      byPurpose: byPurpose as any,
      totalUsageCount,
      recentlyUsed,
    };
  },

  // Export stores
  exportStores: () => {
    const { stores } = get();
    return JSON.stringify(
      {
        stores,
        version: PAGE_STORE_VERSION,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  },

  // Import stores
  importStores: async (jsonString, mode = "merge") => {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported.stores || !Array.isArray(imported.stores)) {
        throw new Error("Invalid import format");
      }

      const { stores } = get();
      let updatedStores: PageStore[];

      if (mode === "replace") {
        updatedStores = imported.stores;
      } else {
        updatedStores = [...stores];
        imported.stores.forEach((newStore: PageStore) => {
          const exists = updatedStores.some(
            (s) => s.originalUrl === newStore.originalUrl
          );
          if (!exists) {
            updatedStores.push(newStore);
          }
        });
      }

      await saveToStorage(updatedStores);
      set({ stores: updatedStores });

      console.log("✅ Imported", imported.stores.length, "page stores");
      return imported.stores.length;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to import stores",
      });
      throw error;
    }
  },

  // Record usage
  recordUsage: async (storeId) => {
    const { stores } = get();
    const storeIndex = stores.findIndex((s) => s.id === storeId);
    if (storeIndex === -1) return;

    const updatedStores = [...stores];
    updatedStores[storeIndex] = {
      ...updatedStores[storeIndex],
      usageCount: updatedStores[storeIndex].usageCount + 1,
      lastUsedAt: Date.now(),
    };

    await saveToStorage(updatedStores);
    set({ stores: updatedStores });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

// ============================================================================
// STORAGE CHANGE LISTENER
// Listen for storage changes from content script and auto-refresh stores
// ============================================================================

/**
 * Initialize storage change listener for cross-context sync
 * This allows the DevTools panel to see changes made by the content script
 */
function initStorageChangeListener() {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    
    // Check if page stores changed
    if (changes[PAGE_STORE_STORAGE_KEY]) {
      const newData = changes[PAGE_STORE_STORAGE_KEY].newValue;
      if (newData && newData.version === PAGE_STORE_VERSION) {
        const currentStores = usePageStoresStore.getState().stores;
        const newStores = newData.stores || [];
        
        // Only update if stores actually changed (compare by stringifying)
        const currentJson = JSON.stringify(currentStores.map(s => s.id).sort());
        const newJson = JSON.stringify(newStores.map((s: PageStore) => s.id).sort());
        
        if (currentJson !== newJson) {
          console.log("[PageStore] Storage changed externally, syncing...", {
            previous: currentStores.length,
            new: newStores.length,
          });
          
          usePageStoresStore.setState({ 
            stores: newStores,
            isLoaded: true,
          });
        }
      }
    }
  });
  
  console.log("[PageStore] Storage change listener initialized");
}

// Auto-initialize the listener
initStorageChangeListener();
