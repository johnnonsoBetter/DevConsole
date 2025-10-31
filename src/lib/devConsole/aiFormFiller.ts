/**
 * AI Form Filler Service
 * Uses Chrome's built-in AI Prompt API (Gemini Nano) exclusively
 * Based on: https://developer.chrome.com/docs/ai/prompt-api
 */

import type {
  AIFieldValue,
  AIFormContext,
} from "../../utils/stores/aiAutoFiller";
import type { ScannedForm } from "./formScanner";

export interface AIGenerationRequest {
  inputId: string;
  inputName: string;
  fieldType: string;
  label?: string;
  placeholder?: string;
  formContext?: AIFormContext;
  existingValue?: string;
}

/**
 * Analyze form to understand its purpose and context using Prompt API
 */
export async function analyzeFormContext(
  form: ScannedForm,
  createSession: (systemPrompt: string) => Promise<any>
): Promise<AIFormContext | null> {
  console.log('🔍 analyzeFormContext called for form:', form.name);

  try {
    const session = await createSession(`You are an expert at analyzing web forms.

Analyze the form and respond ONLY with valid JSON in this exact format:
{
  "purpose": "Brief description",
  "industry": "Industry/domain",
  "userPersona": "Typical user"
}

Be concise and specific.`);

    const formMetadata = {
      name: form.name,
      action: form.action,
      inputs: form.inputs.map((input) => ({
        name: input.name,
        type: input.type,
        fieldType: input.fieldType,
        label: input.label,
        placeholder: input.placeholder,
      })),
    };

    const prompt = `Analyze this form:

Form: ${form.name}
Action: ${form.action}

Inputs:
${formMetadata.inputs
        .map(
          (input) =>
            `- ${input.label || input.name} (${input.fieldType})`
        )
        .join("\n")}

Respond with JSON only.`;

    const result = await session.prompt(prompt);

    let analysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch (e) {
      console.error("❌ Failed to parse AI response");
      return null;
    }

    return {
      formId: form.id,
      purpose: analysis.purpose || "Unknown",
      industry: analysis.industry,
      userPersona: analysis.userPersona,
      generatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to analyze form:', error);
    throw error;
  }
}

/**
 * Generate a realistic value for a form field using Prompt API
 */
export async function generateFieldValue(
  request: AIGenerationRequest,
  createSession: (systemPrompt: string) => Promise<any>
): Promise<AIFieldValue> {
  console.log(`🤖 Generating value for: ${request.label || request.inputName}`);

  try {
    const session = await createSession(`Generate realistic test data for web forms.

Respond ONLY with the field value - no explanations, no quotes, no extra text.

Examples:
- For name: John Smith
- For email: john.smith@example.com
- For phone: (555) 123-4567
- For number: 42
- For date: 2024-03-15`);

    const contextualInfo = [];

    if (request.formContext) {
      contextualInfo.push(`Form: ${request.formContext.purpose}`);
      if (request.formContext.industry) {
        contextualInfo.push(`Industry: ${request.formContext.industry}`);
      }
      if (request.formContext.userPersona) {
        contextualInfo.push(`User: ${request.formContext.userPersona}`);
      }
    }

    const prompt = `Generate a value for this field:

Field: ${request.label || request.inputName}
Type: ${request.fieldType}
${request.placeholder ? `Placeholder: ${request.placeholder}` : ''}
${contextualInfo.length > 0 ? `\nContext:\n${contextualInfo.join('\n')}` : ''}

Generate ONLY the field value.`;

    const result = await session.prompt(prompt);
    const value = result.trim();

    console.log(`✅ Generated: ${value}`);

    return {
      inputId: request.inputId,
      value,
      confidence: 0.95,
      generatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to generate field value:', error);
    throw error;
  }
}

/**
 * Generate values for all fields in a form
 */
export async function generateAllFieldValues(
  form: ScannedForm,
  formContext: AIFormContext | null,
  createSession: (systemPrompt: string) => Promise<any>
): Promise<AIFieldValue[]> {
  console.log(`📝 Generating values for ${form.inputs.length} fields`);

  const results: AIFieldValue[] = [];

  for (const input of form.inputs) {
    try {
      const request: AIGenerationRequest = {
        inputId: input.id,
        inputName: input.name,
        fieldType: input.fieldType,
        label: input.label,
        placeholder: input.placeholder,
        formContext: formContext || undefined,
      };

      const value = await generateFieldValue(request, createSession);
      results.push(value);
    } catch (error) {
      console.error(`Failed to generate value for ${input.name}:`, error);
    }
  }

  console.log(`✅ Generated ${results.length}/${form.inputs.length} values`);
  return results;
}
