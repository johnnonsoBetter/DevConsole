/**
 * Page Store Types
 * Type definitions for the page-specific autofill store feature.
 * Allows users to create and manage form fill datasets on a per-URL basis.
 */

// ============================================================================
// FORM FIELD ANALYSIS TYPES
// ============================================================================

/**
 * Represents a form field detected on a page
 */
export interface PageFormField {
  /** Unique identifier for this field (auto-generated) */
  id: string;
  /** Field name attribute */
  name: string;
  /** Field ID attribute */
  elementId: string;
  /** Input type (text, email, etc.) */
  type: string;
  /** Label text if available */
  label: string;
  /** Placeholder text */
  placeholder: string;
  /** Aria-label attribute */
  ariaLabel: string;
  /** Detected semantic field type (email, firstName, etc.) */
  detectedType: string;
  /** Whether this field is required */
  required: boolean;
  /** Any pattern/validation constraints */
  pattern?: string;
  /** Max length constraint */
  maxLength?: number;
  /** CSS selector to find this field */
  selector: string;
  /** Order in which the field appears in the form */
  order: number;
}

/**
 * Represents a form on the page
 */
export interface PageForm {
  /** Unique identifier for the form */
  id: string;
  /** Form name/id if available */
  name: string;
  /** Action URL if available */
  action: string;
  /** Form method */
  method: string;
  /** Fields in this form */
  fields: PageFormField[];
  /** CSS selector to find this form */
  selector: string;
}

// ============================================================================
// PAGE STORE TYPES
// ============================================================================

/**
 * A single data entry for a field in the page store
 */
export interface PageStoreFieldValue {
  /** The field ID this value maps to */
  fieldId: string;
  /** The detected field type */
  fieldType: string;
  /** The value to fill */
  value: string;
  /** AI-generated explanation for this value (optional) */
  aiRationale?: string;
}

/**
 * A dataset entry within a page store
 * Similar to Dataset but tailored for page-specific use
 */
export interface PageStoreDataset {
  /** Unique ID for this dataset */
  id: string;
  /** User-friendly name (e.g., "Test User 1", "Edge Case") */
  name: string;
  /** Description or purpose of this dataset */
  description: string;
  /** Field values for this dataset */
  values: PageStoreFieldValue[];
  /** When this dataset was created */
  createdAt: number;
  /** When this dataset was last modified */
  updatedAt: number;
  /** Whether this was AI-generated */
  isAIGenerated: boolean;
  /** Tags for filtering/organization */
  tags: string[];
}

export interface URLMatcher {
  /** The pattern to match against */
  pattern: string;
  /** Match type */
  type: "exact" | "prefix" | "regex" | "contains";
  /** Whether to include query params in matching */
  includeQueryParams: boolean;
  /** Whether to include hash in matching */
  includeHash: boolean;
}

/**
 * Main page store entry that contains all data for a specific page/URL
 */
export interface PageStore {
  /** Unique identifier */
  id: string;
  /** User-friendly name for this page store */
  name: string;
  /** URL pattern this store matches */
  urlMatcher: URLMatcher;
  /** Original URL when the store was created */
  originalUrl: string;
  /** Hostname for grouping */
  hostname: string;
  /** Detected forms on the page */
  forms: PageForm[];
  /** Datasets for this page */
  datasets: PageStoreDataset[];
  /** The currently active/default dataset ID */
  activeDatasetId: string | null;
  /** When this store was created */
  createdAt: number;
  /** When this store was last used */
  lastUsedAt: number;
  /** Usage statistics */
  usageCount: number;
  /** Page metadata captured during analysis */
  pageMetadata: PageMetadata;
  /** Whether AI was used to generate any datasets */
  hasAIDatasets: boolean;
}

/**
 * Metadata captured from the page during analysis
 */
export interface PageMetadata {
  /** Page title */
  title: string;
  /** Meta description */
  description: string;
  /** Detected page purpose (login, signup, contact, checkout, etc.) */
  detectedPurpose: PagePurpose;
  /** Keywords from meta tags */
  keywords: string[];
  /** Screenshot thumbnail (base64, optional) */
  thumbnail?: string;
}

export type PagePurpose =
  | "login"
  | "signup"
  | "contact"
  | "checkout"
  | "search"
  | "profile"
  | "settings"
  | "feedback"
  | "newsletter"
  | "booking"
  | "application"
  | "survey"
  | "unknown";

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

/**
 * Context passed to AI for form analysis
 */
export interface AIFormAnalysisContext {
  /** The page URL */
  url: string;
  /** Page title */
  title: string;
  /** Page description */
  description: string;
  /** Forms detected on the page */
  forms: PageForm[];
  /** User preference for dataset categories to generate */
  /** Number of datasets to generate per category */
  datasetsPerCategory: number;
}

/**
 * Result from AI form analysis
 */
export interface AIFormAnalysisResult {
  /** Detected page purpose */
  purpose: PagePurpose;
  /** Generated datasets */
  datasets: PageStoreDataset[];
  /** Suggestions for the user */
  suggestions: string[];
  /** Any warnings about the form */
  warnings: string[];
}

// ============================================================================
// PAGE STORE MANAGER TYPES
// ============================================================================

/**
 * Options for creating a new page store
 */
export interface CreatePageStoreOptions {
  /** Custom name for the store (defaults to page title) */
  name?: string;
  /** URL matching configuration */
  urlMatcher?: Partial<URLMatcher>;
  /** Whether to use AI to generate initial datasets */
  useAI?: boolean;
  /** Categories to generate datasets for */
  /** Number of datasets per category */
  datasetsPerCategory?: number;
}

/**
 * Search/filter options for page stores
 */
export interface PageStoreSearchOptions {
  /** Filter by hostname */
  hostname?: string;
  /** Filter by purpose */
  purpose?: PagePurpose;
  /** Search in name/URL */
  query?: string;
  /** Sort by field */
  sortBy?: "name" | "lastUsedAt" | "createdAt" | "usageCount";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Limit results */
  limit?: number;
}

/**
 * Statistics for page stores
 */
export interface PageStoreStats {
  /** Total number of stores */
  totalStores: number;
  /** Total datasets across all stores */
  totalDatasets: number;
  /** Stores grouped by hostname */
  byHostname: Record<string, number>;
  /** Stores grouped by purpose */
  byPurpose: Record<PagePurpose, number>;
  /** Total times stores have been used */
  totalUsageCount: number;
  /** Most recently used stores */
  recentlyUsed: Array<{ id: string; name: string; lastUsedAt: number }>;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface PageStoreStorageData {
  /** All page stores */
  stores: PageStore[];
  /** Version for migrations */
  version: number;
  /** Last sync timestamp */
  lastSync: number;
}

export const PAGE_STORE_STORAGE_KEY = "devConsolePageStores";
export const PAGE_STORE_VERSION = 1;
