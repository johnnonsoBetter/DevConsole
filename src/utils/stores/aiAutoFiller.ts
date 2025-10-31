import { produce } from "immer";
import { create } from "zustand";
import type { ScannedForm, ScannedInput } from "../../lib/devConsole/formScanner";

// ============================================================================
// AI AUTO-FILLER STORE
// ============================================================================
//
// Centralized state management for AI-powered form auto-filling.
//
// BENEFITS:
// - Manages AI-generated values for each input field
// - Tracks generation status and errors per field
// - Stores context understanding of form purpose
// - Enables batch AI operations across entire forms
// - Maintains generation history for refinement
//
// USAGE:
//   const { setAIValue, generateForInput, isGenerating } = useAIAutoFillerStore();
//
// ============================================================================

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AIFieldValue {
  inputId: string;
  value: string;
  confidence: number; // 0-1, how confident AI is about this value
  reasoning?: string; // Why AI chose this value
  generatedAt: number;
}

export interface AIFormContext {
  formId: string;
  purpose: string; // e.g., "User Registration", "Product Checkout", "Contact Form"
  industry?: string; // e.g., "E-commerce", "SaaS", "Healthcare"
  userPersona?: string; // e.g., "Tech-savvy millennial", "Business professional"
  dataset?: Record<string, string>; // Suggested values keyed by input name
  generatedAt: number;
}

export interface AIAutoFillerState {
  // AI-generated values (using Record instead of Map for Immer compatibility)
  aiValues: Record<string, AIFieldValue>; // inputId -> AIFieldValue

  // Form context understanding (using Record instead of Map for Immer compatibility)
  formContexts: Record<string, AIFormContext>; // formId -> AIFormContext

  // Generation state (using arrays instead of Set for Immer compatibility)
  generatingInputs: string[]; // inputIds currently being generated
  generatingForms: string[]; // formIds currently being generated

  // Errors (using Record instead of Map for Immer compatibility)
  errors: Record<string, string>; // inputId -> error message

  // Settings
  useContextualGeneration: boolean; // Use form context for better values
  includeReasoning: boolean; // Include why AI chose the value
  confidenceThreshold: number; // Minimum confidence to auto-fill (0-1)

  // Actions - AI Values
  setAIValue: (value: AIFieldValue) => void;
  getAIValue: (inputId: string) => AIFieldValue | undefined;
  clearAIValue: (inputId: string) => void;
  clearAllAIValues: () => void;

  // Actions - Form Context
  setFormContext: (context: AIFormContext) => void;
  getFormContext: (formId: string) => AIFormContext | undefined;
  clearFormContext: (formId: string) => void;

  // Actions - Generation State
  startGenerating: (inputId: string) => void;
  stopGenerating: (inputId: string) => void;
  startGeneratingForm: (formId: string) => void;
  stopGeneratingForm: (formId: string) => void;
  isInputGenerating: (inputId: string) => boolean;
  isFormGenerating: (formId: string) => boolean;

  // Actions - Errors
  setError: (inputId: string, error: string) => void;
  clearError: (inputId: string) => void;
  clearAllErrors: () => void;

  // Actions - Settings
  updateSettings: (settings: {
    useContextualGeneration?: boolean;
    includeReasoning?: boolean;
    confidenceThreshold?: number;
  }) => void;

  // Actions - Bulk Operations
  setMultipleAIValues: (values: AIFieldValue[]) => void;
  clearFormAIValues: (formId: string, inputIds: string[]) => void;

  // Actions - Reset
  reset: () => void;
}

const INITIAL_STATE = {
  aiValues: {} as Record<string, AIFieldValue>,
  formContexts: {} as Record<string, AIFormContext>,
  generatingInputs: [] as string[],
  generatingForms: [] as string[],
  errors: {} as Record<string, string>,
  useContextualGeneration: true,
  includeReasoning: true,
  confidenceThreshold: 0.7,
};

// ============================================================================
// AI AUTO-FILLER STORE
// ============================================================================

export const useAIAutoFillerStore = create<AIAutoFillerState>((set, get) => ({
  ...INITIAL_STATE,

  // AI Values Actions
  setAIValue: (value) =>
    set(
      produce((draft) => {
        draft.aiValues[value.inputId] = value;
        delete draft.errors[value.inputId]; // Clear error on successful generation
      })
    ),

  getAIValue: (inputId) => get().aiValues[inputId],

  clearAIValue: (inputId) =>
    set(
      produce((draft) => {
        delete draft.aiValues[inputId];
      })
    ),

  clearAllAIValues: () =>
    set(
      produce((draft) => {
        draft.aiValues = {};
      })
    ),

  // Form Context Actions
  setFormContext: (context) =>
    set(
      produce((draft) => {
        draft.formContexts[context.formId] = context;
      })
    ),

  getFormContext: (formId) => get().formContexts[formId],

  clearFormContext: (formId) =>
    set(
      produce((draft) => {
        delete draft.formContexts[formId];
      })
    ),

  // Generation State Actions
  startGenerating: (inputId) =>
    set(
      produce((draft) => {
        if (!draft.generatingInputs.includes(inputId)) {
          draft.generatingInputs.push(inputId);
        }
      })
    ),

  stopGenerating: (inputId) =>
    set(
      produce((draft) => {
        draft.generatingInputs = draft.generatingInputs.filter(id => id !== inputId);
      })
    ),

  startGeneratingForm: (formId) =>
    set(
      produce((draft) => {
        if (!draft.generatingForms.includes(formId)) {
          draft.generatingForms.push(formId);
        }
      })
    ),

  stopGeneratingForm: (formId) =>
    set(
      produce((draft) => {
        draft.generatingForms = draft.generatingForms.filter(id => id !== formId);
      })
    ),

  isInputGenerating: (inputId) => get().generatingInputs.includes(inputId),

  isFormGenerating: (formId) => get().generatingForms.includes(formId),

  // Error Actions
  setError: (inputId, error) =>
    set(
      produce((draft) => {
        draft.errors[inputId] = error;
        draft.generatingInputs = draft.generatingInputs.filter(id => id !== inputId); // Stop generating on error
      })
    ),

  clearError: (inputId) =>
    set(
      produce((draft) => {
        delete draft.errors[inputId];
      })
    ),

  clearAllErrors: () =>
    set(
      produce((draft) => {
        draft.errors = {};
      })
    ),

  // Settings Actions
  updateSettings: (settings) =>
    set(
      produce((draft) => {
        if (settings.useContextualGeneration !== undefined) {
          draft.useContextualGeneration = settings.useContextualGeneration;
        }
        if (settings.includeReasoning !== undefined) {
          draft.includeReasoning = settings.includeReasoning;
        }
        if (settings.confidenceThreshold !== undefined) {
          draft.confidenceThreshold = settings.confidenceThreshold;
        }
      })
    ),

  // Bulk Operations
  setMultipleAIValues: (values) =>
    set(
      produce((draft) => {
        values.forEach((value) => {
          draft.aiValues[value.inputId] = value;
          delete draft.errors[value.inputId];
        });
      })
    ),

  clearFormAIValues: (formId, inputIds) =>
    set(
      produce((draft) => {
        inputIds.forEach((inputId) => {
          delete draft.aiValues[inputId];
        });
        delete draft.formContexts[formId];
      })
    ),

  // Reset
  reset: () => set({
    aiValues: {},
    formContexts: {},
    generatingInputs: [],
    generatingForms: [],
    errors: {},
    useContextualGeneration: true,
    includeReasoning: true,
    confidenceThreshold: 0.7,
  }),
}));
