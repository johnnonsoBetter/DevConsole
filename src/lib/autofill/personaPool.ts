/**
 * Persona Pool - Pre-built diverse personas with rotation and tracking
 * 
 * Features:
 * - 100 pre-generated diverse personas
 * - Rotation through unused personas per form
 * - Usage tracking persisted in Chrome storage
 * - Form fingerprinting for smart matching
 */

import type { Dataset } from "./types";
import { generateRelationalPersona, generateMultiplePersonas } from "./personaGenerator";

// ============================================================================
// TYPES
// ============================================================================

export interface PersonaPoolConfig {
  poolSize: number;
  autoRotate: boolean;
  trackUsage: boolean;
}

export interface FormFingerprint {
  hash: string;
  fieldTypes: string[];
  fieldCount: number;
  url?: string;
}

export interface UsageRecord {
  formHash: string;
  usedPersonaIds: string[];
  lastUsedIndex: number;
  fillCount: number;
  lastFillAt: number;
}

export interface PersonaPoolState {
  personas: Dataset[];
  usage: Record<string, UsageRecord>;
  config: PersonaPoolConfig;
  createdAt: number;
  version: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "devConsolePersonaPool";
const POOL_VERSION = 1;
const DEFAULT_POOL_SIZE = 100;

const DEFAULT_CONFIG: PersonaPoolConfig = {
  poolSize: DEFAULT_POOL_SIZE,
  autoRotate: true,
  trackUsage: true,
};

// ============================================================================
// STATE
// ============================================================================

let poolState: PersonaPoolState | null = null;
let initPromise: Promise<PersonaPoolState> | null = null;

// ============================================================================
// FORM FINGERPRINTING
// ============================================================================

/**
 * Create a fingerprint for a form based on its structure
 * This allows matching similar forms across different URLs
 */
export function createFormFingerprint(fields: Array<{ type: string; name?: string }>): FormFingerprint {
  // Sort field types for consistent hashing
  const fieldTypes = fields.map(f => f.type).sort();
  
  // Create a simple hash from field types
  const hashInput = fieldTypes.join("|");
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return {
    hash: `form-${Math.abs(hash).toString(36)}`,
    fieldTypes,
    fieldCount: fields.length,
  };
}

/**
 * Create fingerprint from URL (fallback when form structure not available)
 */
export function createUrlFingerprint(url: string): FormFingerprint {
  try {
    const parsed = new URL(url);
    // Use pathname without query params for more stable matching
    const normalized = `${parsed.hostname}${parsed.pathname}`;
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return {
      hash: `url-${Math.abs(hash).toString(36)}`,
      fieldTypes: [],
      fieldCount: 0,
      url: normalized,
    };
  } catch {
    return {
      hash: `url-${Date.now().toString(36)}`,
      fieldTypes: [],
      fieldCount: 0,
      url,
    };
  }
}

// ============================================================================
// POOL INITIALIZATION
// ============================================================================

/**
 * Initialize the persona pool (creates if doesn't exist)
 */
export async function initializePersonaPool(forceRegenerate = false): Promise<PersonaPoolState> {
  // Return cached if available and not forcing regeneration
  if (poolState && !forceRegenerate) {
    return poolState;
  }
  
  // Prevent multiple simultaneous initializations
  if (initPromise && !forceRegenerate) {
    return initPromise;
  }
  
  initPromise = (async () => {
    try {
      // Try to load from storage
      if (!forceRegenerate) {
        const stored = await loadFromStorage();
        if (stored && stored.version === POOL_VERSION && stored.personas.length >= DEFAULT_POOL_SIZE) {
          poolState = stored;
          console.log(`[PersonaPool] Loaded ${stored.personas.length} personas from storage`);
          return poolState;
        }
      }
      
      // Generate new pool
      console.log(`[PersonaPool] Generating ${DEFAULT_POOL_SIZE} personas...`);
      const personas = generateMultiplePersonas(DEFAULT_POOL_SIZE);
      
      poolState = {
        personas,
        usage: {},
        config: DEFAULT_CONFIG,
        createdAt: Date.now(),
        version: POOL_VERSION,
      };
      
      // Save to storage
      await saveToStorage(poolState);
      console.log(`[PersonaPool] Generated and saved ${personas.length} personas`);
      
      return poolState;
    } catch (error) {
      console.error("[PersonaPool] Failed to initialize:", error);
      
      // Fallback: create minimal in-memory pool
      const personas = generateMultiplePersonas(10);
      poolState = {
        personas,
        usage: {},
        config: DEFAULT_CONFIG,
        createdAt: Date.now(),
        version: POOL_VERSION,
      };
      return poolState;
    } finally {
      initPromise = null;
    }
  })();
  
  return initPromise;
}

// ============================================================================
// PERSONA SELECTION WITH ROTATION
// ============================================================================

/**
 * Get the next persona for a form, rotating through unused ones
 */
export async function getNextPersona(fingerprint: FormFingerprint): Promise<Dataset> {
  const state = await initializePersonaPool();
  const { hash } = fingerprint;
  
  // Get or create usage record for this form
  let usage = state.usage[hash];
  if (!usage) {
    usage = {
      formHash: hash,
      usedPersonaIds: [],
      lastUsedIndex: -1,
      fillCount: 0,
      lastFillAt: 0,
    };
    state.usage[hash] = usage;
  }
  
  // Find next unused persona
  let selectedPersona: Dataset | null = null;
  let selectedIndex = -1;
  
  if (state.config.autoRotate) {
    // Try to find an unused persona
    for (let i = 0; i < state.personas.length; i++) {
      const idx = (usage.lastUsedIndex + 1 + i) % state.personas.length;
      const persona = state.personas[idx];
      
      if (!usage.usedPersonaIds.includes(persona.id)) {
        selectedPersona = persona;
        selectedIndex = idx;
        break;
      }
    }
    
    // If all used, reset and start over
    if (!selectedPersona) {
      usage.usedPersonaIds = [];
      selectedIndex = (usage.lastUsedIndex + 1) % state.personas.length;
      selectedPersona = state.personas[selectedIndex];
    }
  } else {
    // Random selection
    selectedIndex = Math.floor(Math.random() * state.personas.length);
    selectedPersona = state.personas[selectedIndex];
  }
  
  // Update usage tracking
  if (state.config.trackUsage && selectedPersona) {
    usage.usedPersonaIds.push(selectedPersona.id);
    usage.lastUsedIndex = selectedIndex;
    usage.fillCount++;
    usage.lastFillAt = Date.now();
    
    // Save updated state (debounced)
    scheduleStateSave();
  }
  
  return selectedPersona || state.personas[0];
}

/**
 * Get a random persona (no tracking)
 */
export async function getRandomPersona(): Promise<Dataset> {
  const state = await initializePersonaPool();
  const index = Math.floor(Math.random() * state.personas.length);
  return state.personas[index];
}

/**
 * Get all personas in the pool
 */
export async function getAllPersonas(): Promise<Dataset[]> {
  const state = await initializePersonaPool();
  return state.personas;
}

/**
 * Get pool statistics
 */
export async function getPoolStats(): Promise<{
  totalPersonas: number;
  formsTracked: number;
  totalFills: number;
  config: PersonaPoolConfig;
}> {
  const state = await initializePersonaPool();
  
  const totalFills = Object.values(state.usage).reduce(
    (sum, u) => sum + u.fillCount,
    0
  );
  
  return {
    totalPersonas: state.personas.length,
    formsTracked: Object.keys(state.usage).length,
    totalFills,
    config: state.config,
  };
}

// ============================================================================
// USAGE MANAGEMENT
// ============================================================================

/**
 * Reset usage tracking for all forms
 */
export async function resetAllUsage(): Promise<void> {
  const state = await initializePersonaPool();
  state.usage = {};
  await saveToStorage(state);
  console.log("[PersonaPool] Reset all usage tracking");
}

/**
 * Reset usage tracking for a specific form
 */
export async function resetFormUsage(fingerprint: FormFingerprint): Promise<void> {
  const state = await initializePersonaPool();
  delete state.usage[fingerprint.hash];
  await saveToStorage(state);
}

/**
 * Get usage info for a form
 */
export async function getFormUsage(fingerprint: FormFingerprint): Promise<UsageRecord | null> {
  const state = await initializePersonaPool();
  return state.usage[fingerprint.hash] || null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Update pool configuration
 */
export async function updatePoolConfig(updates: Partial<PersonaPoolConfig>): Promise<void> {
  const state = await initializePersonaPool();
  state.config = { ...state.config, ...updates };
  await saveToStorage(state);
}

/**
 * Regenerate the entire persona pool
 */
export async function regeneratePool(size?: number): Promise<void> {
  const newSize = size || DEFAULT_POOL_SIZE;
  console.log(`[PersonaPool] Regenerating ${newSize} personas...`);
  
  const personas = generateMultiplePersonas(newSize);
  
  poolState = {
    personas,
    usage: {}, // Reset usage on regeneration
    config: poolState?.config || DEFAULT_CONFIG,
    createdAt: Date.now(),
    version: POOL_VERSION,
  };
  
  await saveToStorage(poolState);
  console.log(`[PersonaPool] Regenerated ${personas.length} personas`);
}

// ============================================================================
// STORAGE
// ============================================================================

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleStateSave(): void {
  if (saveTimeout) return;
  
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    if (poolState) {
      await saveToStorage(poolState);
    }
  }, 2000); // Debounce 2 seconds
}

async function loadFromStorage(): Promise<PersonaPoolState | null> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve(null);
      return;
    }
    
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        console.warn("[PersonaPool] Storage load error:", chrome.runtime.lastError);
        resolve(null);
        return;
      }
      
      const data = result[STORAGE_KEY];
      if (data && typeof data === "object") {
        resolve(data as PersonaPoolState);
      } else {
        resolve(null);
      }
    });
  });
}

async function saveToStorage(state: PersonaPoolState): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    
    chrome.storage.local.set({ [STORAGE_KEY]: state }, () => {
      if (chrome.runtime.lastError) {
        console.warn("[PersonaPool] Storage save error:", chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initialize: initializePersonaPool,
  getNext: getNextPersona,
  getRandom: getRandomPersona,
  getAll: getAllPersonas,
  getStats: getPoolStats,
  resetAllUsage,
  resetFormUsage,
  getFormUsage,
  updateConfig: updatePoolConfig,
  regenerate: regeneratePool,
  createFingerprint: createFormFingerprint,
  createUrlFingerprint,
};
