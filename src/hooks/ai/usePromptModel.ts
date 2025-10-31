/**
 * usePromptModel
 *
 * React hook that wraps the Chrome Prompt API (LanguageModel) to power
 * AI-assisted form filling inside the DevConsole.
 *
 * Responsibilities:
 * - Track Prompt API availability/download status
 * - Expose helpers for creating Prompt sessions
 * - Provide higher-level helpers for analysing forms and generating values
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScannedForm, ScannedInput } from "../../lib/devConsole/formScanner";
import type { AIFieldValue, AIFormContext } from "../../utils/stores/aiAutoFiller";
import { getBrowserSupport } from "../../lib/devConsole/aiService";
import { useAIAutoFillerStore } from "../../utils/stores/aiAutoFiller";
import { shallow } from "zustand/shallow";

export type PromptAPIAvailability =
  | "unknown"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

export interface PromptModelGenerationRequest {
  inputId: string;
  inputName: string;
  fieldType: string;
  label?: string;
  placeholder?: string;
  formContext?: AIFormContext;
  existingValue?: string;
}

type PromptSession = {
  prompt: (userPrompt: string, options?: Record<string, unknown>) => Promise<string>;
  destroy?: () => void;
};

const ANALYSIS_SYSTEM_PROMPT = `You are an expert AI that generates realistic test data for HTML web forms.

Given form metadata and input fields, you must:
1. Understand the form's purpose and context
2. Generate unique, realistic values for EVERY SINGLE input field listed
3. Ensure values match each field's type and semantic meaning

CRITICAL RULES:
- Generate a UNIQUE value for EVERY input in the list
- Values must be realistic and contextually appropriate
- Each time you're called, generate DIFFERENT values (no repeating previous data)
- Match field types exactly (email → valid email, phone → valid phone, etc.)

Respond ONLY with valid JSON in this exact shape:
{
  "purpose": "What this form is for",
  "industry": "Business domain/industry",
  "userPersona": "Typical user persona",
  "dataset": {
    "inputId": "Realistic value for this specific input",
    "anotherId": "Another realistic value"
  }
}

Use the input's ID as the dataset key. No markdown, no explanations.`;

const GENERATION_SYSTEM_PROMPT = `Generate realistic test data for web form fields.
Respond ONLY with the raw field value (no quotes, explanations, or extra text).`;

const JSON_MATCHER = /\{[\s\S]*\}/;

const normaliseKey = (value?: string | null) => {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
};

const randomSuffix = () => (Math.floor(Math.random() * 9000) + 1000).toString();

const createFallbackVariation = (
  original: string,
  request: PromptModelGenerationRequest
): string => {
  const trimmed = original.trim();
  const suffix = randomSuffix();
  const lowerType = request.fieldType?.toLowerCase() || "";

  if (!trimmed) {
    return suffix;
  }

  if (trimmed.includes("@") || lowerType === "email") {
    const [userPart, domainPart] = trimmed.split("@");
    if (domainPart) {
      const sanitizedUser = (userPart || "user").replace(/[^a-zA-Z0-9._-]/g, "");
      return `${sanitizedUser || "user"}${suffix}@${domainPart}`;
    }
    return `${trimmed}${suffix}`;
  }

  if (lowerType === "date") {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const adjusted = new Date(parsed.getTime() + 86400000);
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return adjusted.toISOString().slice(0, 10);
      }
      return adjusted.toISOString();
    }
  }

  const numericOnly = trimmed.replace(/\D/g, "");
  if (
    lowerType === "number" ||
    /^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) {
      return (num + Math.max(1, Math.round(Math.random() * 5))).toString();
    }
  }

  if (
    lowerType.includes("phone") ||
    lowerType === "tel" ||
    (numericOnly.length >= 7 && /\d/.test(trimmed))
  ) {
    const newTail = (Math.floor(Math.random() * 9000) + 1000).toString();
    const combinedDigits = (numericOnly.slice(0, -4) + newTail).slice(-numericOnly.length);
    let digitIndex = 0;
    return trimmed.replace(/\d/g, () => combinedDigits[digitIndex++] || "");
  }

  return `${trimmed} ${suffix}`;
};

export function usePromptModel() {
  const [availability, setAvailability] = useState<PromptAPIAvailability>("unknown");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [browserSupport] = useState<ReturnType<typeof getBrowserSupport>>(() =>
    typeof navigator !== "undefined"
      ? getBrowserSupport()
      : {
        isSupported: false,
        browserName: "Unknown",
        reason: "Navigator unavailable",
      }
  );



  const mapAvailability = useCallback((status: string): PromptAPIAvailability => {
    switch (status) {
      case "ready":
      case "available":
        return "available";
      case "after-download":
      case "downloadable":
        return "downloadable";
      case "downloading":
        return "downloading";
      default:
        return "unavailable";
    }
  }, []);



  const handleDownloadProgress = useCallback((loaded: number) => {
    const pct = Math.round(loaded * 100);
    setProgress(pct);
    if (pct < 100) {
      setAvailability("downloading");
    } else {
      setAvailability("available");
    }
  }, []);

  const checkAvailability = useCallback(async (): Promise<PromptAPIAvailability> => {
    if (typeof self === "undefined" || !("LanguageModel" in self)) {
      setAvailability("unavailable");
      return "unavailable";
    }

    try {
      const status = await (self as any).LanguageModel.availability();
      const mapped = mapAvailability(status);
      setAvailability(mapped);
      setError(null);
      return mapped;
    } catch (err) {
      console.error("Prompt API not available:", err);
      setAvailability("unavailable");
      setError(err instanceof Error ? err.message : "Prompt API not available");
      return "unavailable";
    }
  }, [mapAvailability]);

  const createSession = useCallback(
    async (systemPrompt: string): Promise<PromptSession> => {
      const currentAvailability = await checkAvailability();
      if (currentAvailability === "unavailable") {
        throw new Error("Prompt API is not available on this device");
      }

      try {
        const session: PromptSession = await (self as any).LanguageModel.create({
          initialPrompts: [
            {
              role: "system",
              content: systemPrompt,
            },
          ],
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              handleDownloadProgress(e.loaded);
            });
          },
        });

        setAvailability("available");
        setError(null);
        return session;
      } catch (err) {
        console.error("Error creating Prompt session:", err);
        const message = err instanceof Error ? err.message : "Failed to create Prompt session";
        setError(message);
        throw err;
      }
    },
    [checkAvailability, handleDownloadProgress]
  );

  const downloadModel = useCallback(async () => {
    // Trigger a lightweight session to initiate download if required
    const session = await createSession("Prepare the model for upcoming web form analysis tasks.");
    session.destroy?.();
  }, [createSession]);

  const parseJSONResponse = useCallback((raw: string) => {
    const match = raw.match(JSON_MATCHER);
    const candidate = match ? match[0] : raw;
    return JSON.parse(candidate);
  }, []);

  const analyzeFormContext = useCallback(
    async (form: ScannedForm): Promise<AIFormContext | null> => {
      try {
        const session = await createSession(ANALYSIS_SYSTEM_PROMPT);

        // Build detailed input summary using INPUT IDs for dataset keys
        const fillableInputs = form.inputs.filter(input => input.isFillable);

        const inputSummary = fillableInputs
          .map((input, idx) => {
            const parts = [
              `${idx + 1}. ID: "${input.id}"`,
              `Label: "${input.label || input.name || 'N/A'}"`,
              `Type: ${input.fieldType || input.type}`,
            ];

            if (input.placeholder) {
              parts.push(`Placeholder: "${input.placeholder}"`);
            }

            if (input.isRequired) {
              parts.push('(Required)');
            }

            return parts.join(' | ');
          }
          )
          .join("\n");

        const totalInputs = fillableInputs.length;

        const responseConstraint = {
          type: "object",
          properties: {
            purpose: { type: "string" },
            industry: { type: "string" },
            userPersona: { type: "string" },
            dataset: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
          required: ["purpose", "industry", "userPersona", "dataset"],
        };

        const response = await session.prompt(
          `Form Name: ${form.name || "Unnamed form"}
Action: ${form.action || "Unknown action"}
Total Inputs: ${totalInputs}

GENERATE UNIQUE VALUES for ALL ${totalInputs} inputs listed below.
Use each input's ID as the key in your dataset object.

Inputs:
${inputSummary}

Your dataset must contain ALL ${totalInputs} input IDs with unique, realistic values.`,
          { responseConstraint }
        );

        const parsed = parseJSONResponse(response);

        console.log('🔍 AI Response parsed:', {
          purpose: parsed.purpose,
          industry: parsed.industry,
          datasetKeys: Object.keys(parsed.dataset || {}),
          expectedInputIds: fillableInputs.map(i => i.id),
        });

        // Store dataset as-is (no caching/variations - fresh data each time)
        const dataset: Record<string, string> = {};

        if (parsed && typeof parsed.dataset === "object" && parsed.dataset !== null) {
          for (const [key, value] of Object.entries(parsed.dataset as Record<string, unknown>)) {
            if (typeof value === "string" && value.trim()) {
              dataset[key] = value.trim();
            }
          }

          console.log(`✅ Generated fresh dataset with ${Object.keys(dataset).length} values for ${totalInputs} inputs`);
          console.log('Dataset:', dataset);

          // Check for missing mappings
          const missingIds = fillableInputs
            .map(i => i.id)
            .filter(id => !dataset[id]);

          if (missingIds.length > 0) {
            console.warn(`⚠️ AI did not provide values for ${missingIds.length} inputs:`, missingIds);
          }
        }

        return {
          formId: form.id,
          purpose: parsed.purpose || "Unknown purpose",
          industry: parsed.industry || "General",
          userPersona: parsed.userPersona || "Generic user",
          dataset,
          generatedAt: Date.now(),
        };
      } catch (err) {
        console.error("Failed to analyse form context:", err);
        return null;
      }
    },
    [createSession, parseJSONResponse]
  );

  const promptForFieldValue = useCallback(
    async (
      session: PromptSession,
      request: PromptModelGenerationRequest,
      attempt = 0,
      forbiddenValuesParam?: Set<string>
    ): Promise<AIFieldValue> => {
      const contextualInfo: string[] = [];
      if (request.formContext) {
        contextualInfo.push(`Form purpose: ${request.formContext.purpose}`);
        if (request.formContext.industry) {
          contextualInfo.push(`Industry: ${request.formContext.industry}`);
        }
        if (request.formContext.userPersona) {
          contextualInfo.push(`User persona: ${request.formContext.userPersona}`);
        }
      }

      const trimmedExisting = request.existingValue?.trim();
      const forbiddenValues = new Set<string>(
        forbiddenValuesParam ? Array.from(forbiddenValuesParam) : []
      );
      if (trimmedExisting) {
        forbiddenValues.add(trimmedExisting);
      }
      const forbiddenList = Array.from(forbiddenValues).filter(Boolean);
      const forbiddenLower = new Set(forbiddenList.map((val) => val.toLowerCase()));

      const promptSections: string[] = [
        "Generate a realistic value for the following web form field.",
        `Field name: ${request.label || request.inputName}`,
        `Field type: ${request.fieldType}`,
      ];

      if (request.placeholder) {
        promptSections.push(`Placeholder: ${request.placeholder}`);
      }

      if (contextualInfo.length) {
        promptSections.push(`Context:\n${contextualInfo.join("\n")}`);
      }

      if (trimmedExisting) {
        promptSections.push(`Existing value: ${trimmedExisting}`);
      }

      if (forbiddenList.length) {
        promptSections.push(
          `Forbidden exact values:\n${forbiddenList.map((val) => `- ${val}`).join("\n")}`
        );
        promptSections.push("Return a different realistic value than the forbidden list.");
      }

      if (attempt > 0) {
        promptSections.push(
          `Retry attempt ${attempt + 1}: previous suggestion duplicated a forbidden value. Provide a distinct value that still fits the field.`
        );
      }

      promptSections.push("Respond only with the new value.");
      promptSections.push(`Request id: ${request.inputId}-${Date.now()}-${attempt}`);

      const response = await session.prompt(promptSections.join("\n\n"));
      const trimmed = response.trim();

      if (!trimmed) {
        throw new Error("Prompt API returned an empty value.");
      }

      if (forbiddenLower.has(trimmed.toLowerCase())) {
        console.warn(
          `Prompt API returned a forbidden value for ${request.inputName}, attempt ${attempt}`
        );

        if (attempt < 2) {
          const nextForbidden = new Set(forbiddenValues);
          nextForbidden.add(trimmed);
          return promptForFieldValue(session, request, attempt + 1, nextForbidden);
        }

        const fallback = createFallbackVariation(trimmed, request);
        return {
          inputId: request.inputId,
          value: fallback,
          confidence: 0.7,
          generatedAt: Date.now(),
        };
      }

      return {
        inputId: request.inputId,
        value: trimmed,
        confidence: attempt > 0 ? 0.9 : 0.95,
        generatedAt: Date.now(),
      };
    },
    []
  );

  const generateFieldValue = useCallback(
    async (request: PromptModelGenerationRequest): Promise<AIFieldValue> => {
      // For single field generation, use the dedicated generation prompt
      const session = await createSession(GENERATION_SYSTEM_PROMPT);
      return promptForFieldValue(session, request);
    },
    [createSession, promptForFieldValue]
  );

  const generateAllFieldValues = useCallback(
    async (
      form: ScannedForm,
      formContext: AIFormContext | null
    ): Promise<AIFieldValue[]> => {
      const values: AIFieldValue[] = [];

      if (!formContext || !formContext.dataset) {
        console.warn('⚠️ No form context available - cannot generate values');
        return values;
      }

      // Track which inputs need fallback generation
      const missingInputs: ScannedInput[] = [];

      // First pass: Map dataset values to inputs
      for (const input of form.inputs) {
        if (!input.isFillable) {
          continue;
        }

        try {
          // Look up value by input ID
          const value = formContext.dataset[input.id];

          if (value) {
            console.log(`✅ Mapped value for ${input.name} (${input.id}): ${value}`);
            values.push({
              inputId: input.id,
              value: value,
              confidence: 0.95,
              generatedAt: Date.now(),
            });
          } else {
            console.warn(`⚠️ No value in dataset for ${input.name} (${input.id}) - will generate with fallback`);
            missingInputs.push(input);
          }
        } catch (err) {
          console.error(`❌ Failed to map value for ${input.name}:`, err);
          missingInputs.push(input);
        }
      }

      // Second pass: Generate missing values using single-field AI generation
      if (missingInputs.length > 0) {
        console.log(`� Generating ${missingInputs.length} missing values with fallback AI...`);
        let fallbackSession: PromptSession | null = null;

        for (const input of missingInputs) {
          try {
            if (!fallbackSession) {
              fallbackSession = await createSession(GENERATION_SYSTEM_PROMPT);
            }

            const request: PromptModelGenerationRequest = {
              inputId: input.id,
              inputName: input.name,
              fieldType: input.fieldType,
              label: input.label,
              placeholder: input.placeholder,
              formContext: formContext,
              existingValue: typeof input.element.value === "string" ? input.element.value : input.value,
            };

            const aiValue = await promptForFieldValue(fallbackSession, request);
            values.push(aiValue);
            console.log(`✅ Fallback generated value for ${input.name}: ${aiValue.value}`);
          } catch (err) {
            console.error(`❌ Failed to generate fallback value for ${input.name}:`, err);
          }
        }
      }

      const totalFillable = form.inputs.filter(i => i.isFillable).length;
      console.log(`📊 Final result: ${values.length} values for ${totalFillable} fillable inputs (${missingInputs.length} used fallback)`);

      return values;
    },
    [createSession, promptForFieldValue]
  );


  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Compute derived states
  const isAvailable = availability === "available";
  const isDownloading = availability === "downloading";
  const isDownloadRequired = availability === "downloadable";

  return {
    availability,
    isAvailable,
    isDownloading,
    isDownloadRequired,
    downloadProgress: progress,
    error,
    browserSupport,
    checkAvailability,
    downloadModel,
    createSession,
    analyzeFormContext,
    generateFieldValue,
    generateAllFieldValues,
  };
}
