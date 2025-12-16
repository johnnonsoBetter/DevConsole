/**
 * Page Store Manager
 * Manages CRUD operations and URL matching for page-specific autofill stores.
 * Handles persistence to Chrome storage and provides lookup utilities.
 */

import { detectInputType } from "./fieldDetector";
import type {
  CreatePageStoreOptions,
  PageForm,
  PageFormField,
  PageMetadata,
  PagePurpose,
  PageStore,
  PageStoreDataset,
  PageStoreSearchOptions,
  PageStoreStats,
  PageStoreStorageData,
  URLMatcher,
} from "./pageStoreTypes";
import {
  PAGE_STORE_STORAGE_KEY,
  PAGE_STORE_VERSION,
} from "./pageStoreTypes";

// ============================================================================
// PAGE STORE MANAGER CLASS
// ============================================================================

export class PageStoreManager {
  private stores: PageStore[] = [];
  private initialized: boolean = false;

  constructor() {
    this.stores = [];
    this.initialized = false;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the page store manager by loading from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await this.loadFromStorage();
      this.stores = data.stores;
      this.initialized = true;
      console.log(
        "✅ PageStoreManager initialized with",
        this.stores.length,
        "page stores"
      );
    } catch (error) {
      console.error("❌ Failed to initialize PageStoreManager:", error);
      this.stores = [];
      this.initialized = true;
    }
  }

  /**
   * Ensure manager is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ==========================================================================
  // STORAGE OPERATIONS
  // ==========================================================================

  /**
   * Load page stores from Chrome storage
   */
  private async loadFromStorage(): Promise<PageStoreStorageData> {
    return new Promise((resolve) => {
      chrome.storage.local.get(PAGE_STORE_STORAGE_KEY, (result) => {
        const data = result[PAGE_STORE_STORAGE_KEY];
        if (data && data.version === PAGE_STORE_VERSION) {
          resolve(data);
        } else {
          // Return empty/default state
          resolve({
            stores: [],
            version: PAGE_STORE_VERSION,
            lastSync: Date.now(),
          });
        }
      });
    });
  }

  /**
   * Save page stores to Chrome storage
   */
  private async saveToStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const data: PageStoreStorageData = {
        stores: this.stores,
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
    });
  }

  // ==========================================================================
  // URL MATCHING
  // ==========================================================================

  /**
   * Create a URL matcher from a URL string
   */
  createURLMatcher(
    url: string,
    options?: Partial<URLMatcher>
  ): URLMatcher {
    const urlObj = new URL(url);
    const basePath = urlObj.pathname;

    return {
      pattern: options?.type === "exact" 
        ? url 
        : `${urlObj.origin}${basePath}`,
      type: options?.type || "prefix",
      includeQueryParams: options?.includeQueryParams ?? false,
      includeHash: options?.includeHash ?? false,
    };
  }

  /**
   * Check if a URL matches a URL matcher
   */
  urlMatches(url: string, matcher: URLMatcher): boolean {
    try {
      const urlObj = new URL(url);
      let urlToMatch = urlObj.origin + urlObj.pathname;

      if (matcher.includeQueryParams) {
        urlToMatch += urlObj.search;
      }
      if (matcher.includeHash) {
        urlToMatch += urlObj.hash;
      }

      switch (matcher.type) {
        case "exact":
          return urlToMatch === matcher.pattern;
        case "prefix":
          return urlToMatch.startsWith(matcher.pattern);
        case "contains":
          return urlToMatch.includes(matcher.pattern);
        case "regex":
          try {
            const regex = new RegExp(matcher.pattern);
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

  /**
   * Find a page store that matches the given URL
   */
  async findStoreForUrl(url: string): Promise<PageStore | null> {
    await this.ensureInitialized();

    // Sort by specificity (exact > prefix > contains > regex)
    // and by last used (most recent first)
    const matchingStores = this.stores
      .filter((store) => this.urlMatches(url, store.urlMatcher))
      .sort((a, b) => {
        // Prioritize by match type
        const typeOrder = { exact: 0, prefix: 1, contains: 2, regex: 3 };
        const typeDiff =
          typeOrder[a.urlMatcher.type] - typeOrder[b.urlMatcher.type];
        if (typeDiff !== 0) return typeDiff;

        // Then by last used
        return b.lastUsedAt - a.lastUsedAt;
      });

    return matchingStores[0] || null;
  }

  // ==========================================================================
  // PAGE ANALYSIS
  // ==========================================================================

  /**
   * Analyze forms on the current page (runs in content script context)
   */
  analyzePageForms(): PageForm[] {
    const forms: PageForm[] = [];
    const formElements = document.querySelectorAll("form");
    
    // Also check for inputs outside forms
    const standaloneInputs = document.querySelectorAll(
      "input:not(form input), textarea:not(form textarea), select:not(form select)"
    );

    // Analyze each form
    formElements.forEach((formEl, formIndex) => {
      const form = this.analyzeForm(formEl, formIndex);
      if (form.fields.length > 0) {
        forms.push(form);
      }
    });

    // Create a virtual form for standalone inputs
    if (standaloneInputs.length > 0) {
      const virtualForm: PageForm = {
        id: `virtual-form-${Date.now()}`,
        name: "Standalone Fields",
        action: "",
        method: "",
        selector: "body",
        fields: [],
      };

      standaloneInputs.forEach((input, index) => {
        if (this.isValidInput(input as HTMLElement)) {
          const field = this.analyzeField(
            input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
            index
          );
          virtualForm.fields.push(field);
        }
      });

      if (virtualForm.fields.length > 0) {
        forms.push(virtualForm);
      }
    }

    return forms;
  }

  /**
   * Analyze a single form element
   */
  private analyzeForm(formEl: HTMLFormElement, formIndex: number): PageForm {
    const inputs = formEl.querySelectorAll("input, textarea, select");
    const fields: PageFormField[] = [];

    inputs.forEach((input, fieldIndex) => {
      if (this.isValidInput(input as HTMLElement)) {
        const field = this.analyzeField(
          input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
          fieldIndex
        );
        fields.push(field);
      }
    });

    return {
      id: formEl.id || `form-${formIndex}`,
      name: formEl.name || formEl.id || `Form ${formIndex + 1}`,
      action: formEl.action || "",
      method: formEl.method || "GET",
      selector: this.generateSelector(formEl),
      fields,
    };
  }

  /**
   * Analyze a single field
   */
  private analyzeField(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    order: number
  ): PageFormField {
    const label = this.findLabelForInput(input);
    const detectedType = detectInputType(input);

    return {
      id: `field-${Date.now()}-${order}`,
      name: input.name || "",
      elementId: input.id || "",
      type: input instanceof HTMLInputElement ? input.type : 
            input instanceof HTMLTextAreaElement ? "textarea" : "select",
      label: label?.textContent?.trim() || "",
      placeholder:
        input instanceof HTMLSelectElement
          ? ""
          : input.placeholder || "",
      ariaLabel: input.getAttribute("aria-label") || "",
      detectedType,
      required: input.required,
      pattern:
        input instanceof HTMLInputElement
          ? input.pattern || undefined
          : undefined,
      maxLength:
        input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
          ? input.maxLength > 0
            ? input.maxLength
            : undefined
          : undefined,
      selector: this.generateSelector(input),
      order,
    };
  }

  /**
   * Find the label element associated with an input
   */
  private findLabelForInput(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): HTMLLabelElement | null {
    // Check for explicit label via for attribute
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label as HTMLLabelElement;
    }

    // Check for parent label
    const parentLabel = input.closest("label");
    if (parentLabel) return parentLabel;

    // Check for aria-labelledby
    const labelledBy = input.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = document.getElementById(labelledBy);
      if (label) return label as HTMLLabelElement;
    }

    return null;
  }

  /**
   * Generate a CSS selector for an element
   */
  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        const classes = current.className
          .split(/\s+/)
          .filter((c) => c && !c.match(/^(hover|focus|active)/))
          .slice(0, 2)
          .map((c) => `.${CSS.escape(c)}`)
          .join("");
        selector += classes;
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (s) => s.tagName === current!.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;

      // Limit depth
      if (path.length >= 5) break;
    }

    return path.join(" > ");
  }

  /**
   * Check if an input is valid for autofill
   */
  private isValidInput(input: HTMLElement): boolean {
    if (!(input instanceof HTMLInputElement || 
          input instanceof HTMLTextAreaElement || 
          input instanceof HTMLSelectElement)) {
      return false;
    }

    // Skip hidden inputs, submit buttons, etc.
    if (input instanceof HTMLInputElement) {
      const type = input.type.toLowerCase();
      if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) {
        return false;
      }
    }

    // Check visibility
    const style = window.getComputedStyle(input);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return true;
  }

  /**
   * Detect page purpose from metadata and forms
   */
  detectPagePurpose(forms: PageForm[]): PagePurpose {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    
    // Check URL patterns
    if (url.match(/\/(login|signin|sign-in)/)) return "login";
    if (url.match(/\/(register|signup|sign-up|join)/)) return "signup";
    if (url.match(/\/(contact|support|help)/)) return "contact";
    if (url.match(/\/(checkout|payment|cart)/)) return "checkout";
    if (url.match(/\/(search|find)/)) return "search";
    if (url.match(/\/(profile|account|settings)/)) return "profile";
    if (url.match(/\/(feedback|review)/)) return "feedback";
    if (url.match(/\/(book|reserve|appointment)/)) return "booking";
    if (url.match(/\/(apply|application)/)) return "application";
    if (url.match(/\/(survey|poll|questionnaire)/)) return "survey";
    if (url.match(/\/(newsletter|subscribe)/)) return "newsletter";

    // Check form field patterns
    const allFields = forms.flatMap((f) => f.fields);
    const fieldTypes = allFields.map((f) => f.detectedType);
    const hasPassword = allFields.some((f) => 
      f.type === "password" || f.detectedType === "password"
    );
    const hasEmail = fieldTypes.includes("email");

    if (hasPassword && hasEmail && allFields.length <= 4) return "login";
    if (hasPassword && hasEmail && allFields.length > 4) return "signup";
    if (fieldTypes.includes("message") && hasEmail) return "contact";

    // Check title
    if (title.includes("login") || title.includes("sign in")) return "login";
    if (title.includes("register") || title.includes("sign up")) return "signup";
    if (title.includes("contact")) return "contact";
    if (title.includes("checkout")) return "checkout";

    return "unknown";
  }

  /**
   * Gather page metadata
   */
  gatherPageMetadata(): PageMetadata {
    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const metaKeywords =
      document.querySelector('meta[name="keywords"]')?.getAttribute("content") || "";

    const forms = this.analyzePageForms();

    return {
      title: document.title,
      description: metaDescription,
      detectedPurpose: this.detectPagePurpose(forms),
      keywords: metaKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    };
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new page store for the current page
   */
  async createStore(options: CreatePageStoreOptions = {}): Promise<PageStore> {
    await this.ensureInitialized();

    const url = window.location.href;
    const forms = this.analyzePageForms();
    const metadata = this.gatherPageMetadata();

    const urlMatcher = this.createURLMatcher(url, options.urlMatcher);
    const hostname = new URL(url).hostname;

    const store: PageStore = {
      id: `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: options.name || metadata.title || hostname,
      urlMatcher,
      originalUrl: url,
      hostname,
      forms,
      datasets: [],
      activeDatasetId: null,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      usageCount: 0,
      pageMetadata: metadata,
      hasAIDatasets: false,
    };

    this.stores.push(store);
    await this.saveToStorage();

    console.log("✅ Created page store:", store.name);
    return store;
  }

  /**
   * Get a store by ID
   */
  async getStore(storeId: string): Promise<PageStore | null> {
    await this.ensureInitialized();
    return this.stores.find((s) => s.id === storeId) || null;
  }

  /**
   * Update a store
   */
  async updateStore(
    storeId: string,
    updates: Partial<PageStore>
  ): Promise<PageStore> {
    await this.ensureInitialized();

    const index = this.stores.findIndex((s) => s.id === storeId);
    if (index === -1) {
      throw new Error("Store not found");
    }

    this.stores[index] = { ...this.stores[index], ...updates };
    await this.saveToStorage();

    console.log("✅ Updated page store:", storeId);
    return this.stores[index];
  }

  /**
   * Delete a store
   */
  async deleteStore(storeId: string): Promise<void> {
    await this.ensureInitialized();

    const index = this.stores.findIndex((s) => s.id === storeId);
    if (index === -1) {
      throw new Error("Store not found");
    }

    const deleted = this.stores.splice(index, 1)[0];
    await this.saveToStorage();

    console.log("✅ Deleted page store:", deleted.name);
  }

  /**
   * Get all stores
   */
  async getAllStores(): Promise<PageStore[]> {
    await this.ensureInitialized();
    return [...this.stores];
  }

  /**
   * Search stores with filters
   */
  async searchStores(options: PageStoreSearchOptions = {}): Promise<PageStore[]> {
    await this.ensureInitialized();

    let results = [...this.stores];

    // Filter by hostname
    if (options.hostname) {
      results = results.filter((s) => s.hostname === options.hostname);
    }

    // Filter by purpose
    if (options.purpose) {
      results = results.filter(
        (s) => s.pageMetadata.detectedPurpose === options.purpose
      );
    }

    // Search query
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.originalUrl.toLowerCase().includes(query)
      );
    }

    // Sort
    const sortBy = options.sortBy || "lastUsedAt";
    const sortOrder = options.sortOrder || "desc";
    results.sort((a, b) => {
      const aVal = a[sortBy] as number | string;
      const bVal = b[sortBy] as number | string;
      const diff = typeof aVal === "number" ? aVal - (bVal as number) : 
                   aVal.localeCompare(bVal as string);
      return sortOrder === "asc" ? diff : -diff;
    });

    // Limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ==========================================================================
  // DATASET OPERATIONS
  // ==========================================================================

  /**
   * Add a dataset to a store
   */
  async addDataset(
    storeId: string,
    dataset: Omit<PageStoreDataset, "id" | "createdAt" | "updatedAt">
  ): Promise<PageStoreDataset> {
    await this.ensureInitialized();

    const store = this.stores.find((s) => s.id === storeId);
    if (!store) {
      throw new Error("Store not found");
    }

    const newDataset: PageStoreDataset = {
      ...dataset,
      id: `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    store.datasets.push(newDataset);

    // Set as active if it's the first dataset
    if (store.datasets.length === 1) {
      store.activeDatasetId = newDataset.id;
    }

    if (newDataset.isAIGenerated) {
      store.hasAIDatasets = true;
    }

    await this.saveToStorage();
    console.log("✅ Added dataset to store:", newDataset.name);
    return newDataset;
  }

  /**
   * Update a dataset in a store
   */
  async updateDataset(
    storeId: string,
    datasetId: string,
    updates: Partial<PageStoreDataset>
  ): Promise<PageStoreDataset> {
    await this.ensureInitialized();

    const store = this.stores.find((s) => s.id === storeId);
    if (!store) {
      throw new Error("Store not found");
    }

    const datasetIndex = store.datasets.findIndex((d) => d.id === datasetId);
    if (datasetIndex === -1) {
      throw new Error("Dataset not found");
    }

    store.datasets[datasetIndex] = {
      ...store.datasets[datasetIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    await this.saveToStorage();
    return store.datasets[datasetIndex];
  }

  /**
   * Delete a dataset from a store
   */
  async deleteDataset(storeId: string, datasetId: string): Promise<void> {
    await this.ensureInitialized();

    const store = this.stores.find((s) => s.id === storeId);
    if (!store) {
      throw new Error("Store not found");
    }

    const datasetIndex = store.datasets.findIndex((d) => d.id === datasetId);
    if (datasetIndex === -1) {
      throw new Error("Dataset not found");
    }

    store.datasets.splice(datasetIndex, 1);

    // Update active dataset if needed
    if (store.activeDatasetId === datasetId) {
      store.activeDatasetId = store.datasets[0]?.id || null;
    }

    await this.saveToStorage();
    console.log("✅ Deleted dataset:", datasetId);
  }

  /**
   * Set active dataset for a store
   */
  async setActiveDataset(storeId: string, datasetId: string): Promise<void> {
    await this.ensureInitialized();

    const store = this.stores.find((s) => s.id === storeId);
    if (!store) {
      throw new Error("Store not found");
    }

    if (!store.datasets.some((d) => d.id === datasetId)) {
      throw new Error("Dataset not found in store");
    }

    store.activeDatasetId = datasetId;
    await this.saveToStorage();
  }

  /**
   * Record usage of a store
   */
  async recordUsage(storeId: string): Promise<void> {
    await this.ensureInitialized();

    const store = this.stores.find((s) => s.id === storeId);
    if (store) {
      store.usageCount++;
      store.lastUsedAt = Date.now();
      await this.saveToStorage();
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get page store statistics
   */
  async getStats(): Promise<PageStoreStats> {
    await this.ensureInitialized();

    const byHostname: Record<string, number> = {};
    const byPurpose: Record<PagePurpose, number> = {
      login: 0,
      signup: 0,
      contact: 0,
      checkout: 0,
      search: 0,
      profile: 0,
      settings: 0,
      feedback: 0,
      newsletter: 0,
      booking: 0,
      application: 0,
      survey: 0,
      unknown: 0,
    };

    let totalDatasets = 0;
    let totalUsageCount = 0;

    this.stores.forEach((store) => {
      byHostname[store.hostname] = (byHostname[store.hostname] || 0) + 1;
      byPurpose[store.pageMetadata.detectedPurpose]++;
      totalDatasets += store.datasets.length;
      totalUsageCount += store.usageCount;
    });

    const recentlyUsed = [...this.stores]
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 5)
      .map((s) => ({ id: s.id, name: s.name, lastUsedAt: s.lastUsedAt }));

    return {
      totalStores: this.stores.length,
      totalDatasets,
      byHostname,
      byPurpose,
      totalUsageCount,
      recentlyUsed,
    };
  }

  // ==========================================================================
  // IMPORT/EXPORT
  // ==========================================================================

  /**
   * Export all stores as JSON
   */
  async exportStores(): Promise<string> {
    await this.ensureInitialized();

    return JSON.stringify(
      {
        stores: this.stores,
        version: PAGE_STORE_VERSION,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Import stores from JSON
   */
  async importStores(
    jsonString: string,
    mode: "replace" | "merge" = "merge"
  ): Promise<number> {
    await this.ensureInitialized();

    try {
      const imported = JSON.parse(jsonString);

      if (!imported.stores || !Array.isArray(imported.stores)) {
        throw new Error("Invalid import format");
      }

      if (mode === "replace") {
        this.stores = imported.stores;
      } else {
        // Merge - add non-duplicate stores
        imported.stores.forEach((newStore: PageStore) => {
          const exists = this.stores.some(
            (s) => s.originalUrl === newStore.originalUrl
          );
          if (!exists) {
            this.stores.push(newStore);
          }
        });
      }

      await this.saveToStorage();
      console.log("✅ Imported", imported.stores.length, "page stores");
      return imported.stores.length;
    } catch (error) {
      console.error("❌ Failed to import page stores:", error);
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pageStoreManagerInstance: PageStoreManager | null = null;

/**
 * Get the singleton PageStoreManager instance
 */
export function getPageStoreManager(): PageStoreManager {
  if (!pageStoreManagerInstance) {
    pageStoreManagerInstance = new PageStoreManager();
  }
  return pageStoreManagerInstance;
}

/**
 * Initialize the page store manager
 */
export async function initializePageStoreManager(): Promise<PageStoreManager> {
  const manager = getPageStoreManager();
  await manager.initialize();
  return manager;
}
