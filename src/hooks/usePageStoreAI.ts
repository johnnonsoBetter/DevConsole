/**
 * usePageStoreAI - React Hook for AI-powered Form Dataset Generation
 * 
 * Generates diverse datasets for form autofill with rotation support.
 */

import { z } from "zod";
import { useCallback, useState } from "react";
import { useAI } from "./useAI";
import type {
  PageStore,
  PageStoreDataset,
} from "../lib/autofill/pageStoreTypes";

// ============================================================================
// SIMPLE ZOD SCHEMA - Just field values
// ============================================================================

/**
 * Simple schema: AI returns an array of field values
 */
const generatedDatasetSchema = z.object({
  name: z.string().describe("Short unique name for this dataset (e.g. 'Dataset 1', 'User A')"),
  fieldValues: z.array(
    z.object({
      fieldId: z.string().describe("The field ID/name from the form"),
      value: z.string().describe("The fill value for this field"),
    })
  ).describe("Values to fill for each form field"),
});

const datasetsResponseSchema = z.object({
  datasets: z.array(generatedDatasetSchema),
});

type DatasetsResponse = z.infer<typeof datasetsResponseSchema>;

// ============================================================================
// HOOK
// ============================================================================

export interface UsePageStoreAIOptions {
  onError?: (error: Error) => void;
}

export function usePageStoreAI(options: UsePageStoreAIOptions = {}) {
  const [generatedDatasets, setGeneratedDatasets] = useState<PageStoreDataset[]>([]);
  
  const ai = useAI({
    systemPrompt: `You are a form autofill assistant generating diverse, realistic test data.
Each dataset should have unique values. Return valid JSON only.`,
    onError: options.onError,
  });

  /**
   * Generate diverse datasets for form autofill
   */
  const generateDatasets = useCallback(
    async (
      store: PageStore,
      opts: {
        count?: number;
      } = {}
    ): Promise<PageStoreDataset[]> => {
      const count = opts.count || 100;
      
      // Build simple field list
      const fields = store.forms.flatMap(form => 
        form.fields.map(f => ({
          id: f.elementId || f.name || f.label || "field",
          type: f.detectedType || f.type,
          label: f.label || f.name || f.placeholder || "unnamed",
          required: f.required,
        }))
      );

      const prompt = `Generate ${count} UNIQUE test datasets for this form.

FORM FIELDS:
${fields.map(f => `- ${f.id} (${f.type}): "${f.label}"${f.required ? ' [required]' : ''}`).join('\n')}

PAGE: ${store.pageMetadata.title || store.originalUrl}

REQUIREMENTS:
- Generate exactly ${count} datasets
- Each dataset must have completely unique values for all fields
- Use realistic but fake data
- Vary names, emails, phone numbers, addresses across datasets
- Name each dataset simply (e.g., "Dataset 1", "Dataset 2", etc.)`;

      try {
        const result = await ai.generateObj<DatasetsResponse>(
          prompt,
          datasetsResponseSchema
        );

        // Convert to PageStoreDataset format
        const datasets: PageStoreDataset[] = result.datasets.map((d, idx) => ({
          id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          name: d.name,
          description: `AI-generated dataset #${idx + 1}`,
          values: d.fieldValues.map(v => ({
            fieldId: v.fieldId,
            fieldType: fields.find(f => f.id === v.fieldId)?.type || "text",
            value: v.value,
          })),
          isAIGenerated: true,
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));

        setGeneratedDatasets(datasets);
        return datasets;
      } catch (error) {
        console.error("AI dataset generation failed:", error);
        throw error;
      }
    },
    [ai]
  );

  /**
   * Get suggestions for a single field
   */
  const getFieldSuggestions = useCallback(
    async (fieldType: string, fieldLabel: string): Promise<string[]> => {
      const suggestionsSchema = z.object({
        values: z.array(z.string()).describe("5 realistic test values"),
      });

      try {
        const result = await ai.generateObj<{ values: string[] }>(
          `Give me 5 realistic test values for a form field: "${fieldLabel}" (type: ${fieldType})`,
          suggestionsSchema
        );
        return result.values;
      } catch {
        return getBasicSuggestions(fieldType);
      }
    },
    [ai]
  );

  return {
    generatedDatasets,
    isGenerating: ai.isLoading,
    error: ai.error,
    generateDatasets,
    getFieldSuggestions,
    stop: ai.stop,
    clear: () => {
      ai.clear();
      setGeneratedDatasets([]);
    },
    isConfigured: ai.isConfigured,
    isEnabled: ai.isEnabled,
    provider: ai.provider,
    model: ai.model,
  };
}

/**
 * Fallback suggestions when AI fails
 */
function getBasicSuggestions(fieldType: string): string[] {
  const map: Record<string, string[]> = {
    email: ["test@example.com", "user@domain.com", "admin@company.org"],
    firstName: ["John", "Jane", "Alex"],
    lastName: ["Doe", "Smith", "Johnson"],
    phone: ["+1 555-123-4567", "(555) 987-6543", "555.456.7890"],
    password: ["TestPass123!", "SecureP@ss1", "Demo!Pass789"],
  };
  return map[fieldType] || ["test value", "sample", "example"];
}

export default usePageStoreAI;
