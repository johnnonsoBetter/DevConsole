/**
 * Fill Logic for Autofill Extension
 * Handles filling inputs with data and events
 */

import { DataStore } from "./datastore";
import { detectInputType } from "./fieldDetector";
import { analyzeComplexField, getComplexFieldSuggestions } from "./llmFieldUnderstanding";
import { generateRelationalPersona } from "./personaGenerator";
import { getScenarioDatasets, type TestScenario } from "./scenarioPresets";
import type { AutofillSettings, Dataset, FieldType } from "./types";
import { DEFAULT_AUTOFILL_SETTINGS } from "./types";
import { fillFieldsWithAnimation, runDemoMode, SPEED_PRESETS, type TypingConfig } from "./typingAnimation";
import {
  checkAndShowFillAllButton,
  closeSuggestionBox,
  showConfirmationMessage,
  showFillAllConfirmation,
} from "./uiManager";
import {
  fetchUnsplashImages,
  fillImageInput,
  getImageSearchQuery,
} from "./unsplashService";

// Store reference
let dataStore: DataStore | null = null;
let currentDataset: Dataset | null = null;
let currentSettings: AutofillSettings = DEFAULT_AUTOFILL_SETTINGS;

/**
 * Initialize dataStore reference
 */
export function initializeDataStore(store: DataStore): void {
  dataStore = store;
}

/**
 * Update autofill settings
 */
export function updateAutofillSettings(settings: Partial<AutofillSettings>): void {
  currentSettings = { ...currentSettings, ...settings };
}

/**
 * Get current autofill settings
 */
export function getAutofillSettings(): AutofillSettings {
  return currentSettings;
}

// function getStaticSuggestions(fieldType: FieldType): string[] {
//   return STATIC_SUGGESTIONS[fieldType] || STATIC_SUGGESTIONS.text;
// }

function getStaticSuggestions(fieldType: FieldType): string[] {
  const staticSuggestions: Record<string, string[]> = {
    email: [
      "john.doe@example.com",
      "jane.smith@company.com",
      "contact@business.com",
    ],
    name: ["John Doe", "Jane Smith", "Alex Johnson"],
    firstName: ["John", "Jane", "Alex"],
    lastName: ["Doe", "Smith", "Johnson"],
    phone: ["+1 (555) 123-4567", "+1 (555) 987-6543", "+1 (555) 456-7890"],
    tel: ["+1 (555) 123-4567", "+1 (555) 987-6543", "+1 (555) 456-7890"],
    address: ["123 Main Street", "456 Oak Avenue", "789 Pine Road"],
    city: ["New York", "San Francisco", "Austin", "Seattle"],
    state: ["NY", "CA", "TX", "WA"],
    zip: ["10001", "94102", "78701", "98101"],
    country: ["United States", "United Kingdom", "Canada", "Australia"],
    company: ["Tech Corp", "Innovation Labs", "Digital Solutions Inc."],
    title: ["Software Engineer", "Product Manager", "UX Designer"],
    website: [
      "https://example.com",
      "https://company.com",
      "https://website.com",
    ],
    url: ["https://example.com", "https://company.com", "https://website.com"],
    message: [
      "I'm interested in learning more about this opportunity.",
      "Thank you for reaching out. I'd love to connect.",
      "Could we schedule a time to discuss this further?",
    ],
    text: ["Sample text", "Example content", "Test data"],
    number: ["123", "456", "789"],
    date: ["2025-01-01", "2025-06-15", "2025-12-31"],
    // Extended fields
    age: ["25", "32", "45"],
    birthdate: ["1990-05-15", "1985-11-22", "1978-03-08"],
    username: ["johndoe", "jsmith", "alexj"],
    gender: ["Male", "Female", "Non-binary"],
    bio: [
      "Passionate developer with 5+ years of experience.",
      "Creative problem solver who loves building products.",
      "Tech enthusiast always learning new things.",
    ],
    password: ["Test1234!", "SecurePass123!", "MyPassword456!"],
  };

  return staticSuggestions[fieldType] || staticSuggestions.text;
}

/**
 * Get suggestions for a field type from all available datasets
 */
export function getSuggestionsForField(fieldType: FieldType): string[] {
  if (!dataStore || !dataStore.initialized) {
    return getStaticSuggestions(fieldType);
  }

  const allDatasets = dataStore.getAllDatasets();
  const suggestions: string[] = [];

  allDatasets.forEach((dataset) => {
    const value = dataStore!.getFieldData(dataset, fieldType);
    if (value && !suggestions.includes(value)) {
      suggestions.push(value);
    }
  });

  // Fallback to static suggestions if no dataset data found
  if (suggestions.length === 0) {
    return getStaticSuggestions(fieldType);
  }

  // Limit to 6 suggestions for UI
  return suggestions.slice(0, 6);
}

/**
 * Get suggestions including complex field understanding
 */
export function getSmartSuggestions(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string[] {
  const fieldType = detectInputType(input);
  
  // Check if it's a complex field that needs AI understanding
  if (input instanceof HTMLTextAreaElement || 
      (input instanceof HTMLInputElement && input.type === 'text')) {
    const complexContext = analyzeComplexField(input);
    if (complexContext && complexContext.confidence > 0.6) {
      return getComplexFieldSuggestions(complexContext);
    }
  }
  
  return getSuggestionsForField(fieldType);
}

/**
 * Get suggestions with optional AI enhancement (async version)
 */
export async function getSmartSuggestionsAsync(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): Promise<string[]> {
  const fieldType = detectInputType(input);
  const useAI = currentSettings.useAI;
  
  // Check if it's a complex field that needs AI understanding
  if (input instanceof HTMLTextAreaElement || 
      (input instanceof HTMLInputElement && input.type === 'text')) {
    const complexContext = analyzeComplexField(input);
    if (complexContext && complexContext.confidence > 0.6) {
      // Use async version with AI if enabled
      const { getComplexFieldSuggestionsAsync } = await import('./llmFieldUnderstanding');
      return getComplexFieldSuggestionsAsync(complexContext, useAI);
    }
  }
  
  return getSuggestionsForField(fieldType);
}

/**
 * Generate an AI-powered response for a complex field
 */
export async function generateAIResponse(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): Promise<string | null> {
  if (!currentSettings.useAI) return null;
  
  if (input instanceof HTMLTextAreaElement || 
      (input instanceof HTMLInputElement && input.type === 'text')) {
    const complexContext = analyzeComplexField(input);
    if (complexContext && complexContext.confidence > 0.5) {
      const { generateSmartResponse } = await import('./llmFieldUnderstanding');
      return generateSmartResponse(complexContext, true);
    }
  }
  
  return null;
}

/**
 * Get dataset based on current scenario
 * @param scenarioId - Optional scenario ID to override current settings
 */
function getDatasetForScenario(scenarioId?: string): Dataset | null {
  const { activeScenario, enableRelationalData } = currentSettings;
  const effectiveScenario = scenarioId || activeScenario;
  
  // Use scenario presets
  if (effectiveScenario !== 'default' && effectiveScenario !== 'relational') {
    const scenarioDatasets = getScenarioDatasets(effectiveScenario as TestScenario);
    if (scenarioDatasets.length > 0) {
      return scenarioDatasets[Math.floor(Math.random() * scenarioDatasets.length)];
    }
  }

  // Generate relational persona
  if (effectiveScenario === 'relational' || (effectiveScenario === 'default' && enableRelationalData)) {
    return generateRelationalPersona();
  }
  
  // Fall back to datastore
  return null;
}

/**
 * Get typing config based on settings
 * @param speedOverride - Optional speed to override current settings
 */
function getTypingConfig(speedOverride?: 'slow' | 'normal' | 'fast' | 'instant'): Partial<TypingConfig> {
  const speed = speedOverride || currentSettings.typingSpeed;
  const speedConfig = SPEED_PRESETS[speed] || SPEED_PRESETS.normal;
  return {
    ...speedConfig,
    typoChance: currentSettings.enableTypos ? 0.03 : 0,
  };
}

/**
 * Fill input with value and trigger events
 */
export function fillInput(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
  showConfirmation: boolean = true
): void {
  let filled = false;

  if (input instanceof HTMLInputElement && input.type === "file") {
    // Browser security prevents programmatic selection of files.
    if (showConfirmation) {
      showConfirmationMessage(input, "⚠️ Cannot autofill file inputs", true);
    }
    closeSuggestionBox();
    return;
  }

  if (input instanceof HTMLSelectElement) {
    // Handle Select
    const options = Array.from(input.options);
    const lowerValue = value.toLowerCase();

    // Try exact match on value
    let match = options.find((opt) => opt.value.toLowerCase() === lowerValue);

    // Try exact match on text
    if (!match) {
      match = options.find((opt) => opt.text.toLowerCase() === lowerValue);
    }

    // Try fuzzy match
    if (!match) {
      match = options.find(
        (opt) =>
          opt.text.toLowerCase().includes(lowerValue) ||
          lowerValue.includes(opt.text.toLowerCase())
      );
    }

    if (match) {
      input.value = match.value;
      filled = true;
    }
  } else if (input instanceof HTMLInputElement && input.type === "radio") {
    // Handle Radio
    // For radio, 'value' passed here is the desired value (e.g. "Male")
    // We check if THIS radio button matches that value
    const lowerValue = value.toLowerCase();
    const radioValue = input.value.toLowerCase();

    // Check value attribute
    if (radioValue === lowerValue) {
      input.checked = true;
      filled = true;
    } else {
      // Check associated label
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label && label.textContent?.toLowerCase().includes(lowerValue)) {
          input.checked = true;
          filled = true;
        }
      }
    }
  } else {
    // Handle Text/Textarea
    input.value = value;
    filled = true;
  }

  if (filled) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));

    if (showConfirmation) {
      showConfirmationMessage(input);
    }
  }

  closeSuggestionBox();

  // Re-check if we should show/hide Fill All button
  setTimeout(checkAndShowFillAllButton, 100);
}

/**
 * Get all fillable inputs on the page
 */
export function getAllFillableInputs(): Array<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
> {
  const inputs = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(
    'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="url"], input[type="date"], input[type="file"], input[type="radio"], input:not([type]), textarea, select'
  );

  const fillableInputs: Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = [];

  inputs.forEach((input) => {
    if (input instanceof HTMLInputElement) {
      if (input.type === "password" || input.type === "hidden") return;

      // For file inputs, include even if hidden (common pattern)
      if (input.type === "file") {
        if (!input.disabled) {
          fillableInputs.push(input);
        }
        return;
      }

      // Special handling for radio buttons that might be visually hidden but functional
      if (input.type === "radio") {
        if (!input.disabled) {
          fillableInputs.push(input);
        }
        return;
      }

      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Check if input is visible and not disabled
      if (
        input.offsetParent !== null &&
        !input.disabled &&
        !input.readOnly &&
        input.getAttribute("aria-hidden") !== "true"
      ) {
        fillableInputs.push(input);
      }
    } else if (
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLSelectElement
    ) {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (input instanceof HTMLSelectElement && !input.disabled) {
        fillableInputs.push(input);
      } else if (
        input instanceof HTMLTextAreaElement &&
        !input.disabled &&
        !input.readOnly
      ) {
        fillableInputs.push(input);
      }
    }
  });

  return fillableInputs;
}

/**
 * Fill all inputs on the page
 * @param options - Optional configuration for filling
 */
export async function fillAllInputs(options?: {
  scenarioId?: string;
  animated?: boolean;
  typingSpeed?: 'slow' | 'normal' | 'fast' | 'instant';
}): Promise<void> {
  const inputs = getAllFillableInputs();
  let filledCount = 0;

  // Initialize dataStore if needed
  if (!dataStore) {
    console.error("❌ DataStore not initialized");
    return;
  }

  // Get settings for animation mode
  const settings = getAutofillSettings();
  const useAnimation = options?.animated ?? settings.enableTypingAnimation;
  const typingSpeed = options?.typingSpeed ?? settings.typingSpeed;

  // If a scenario is specified, use its dataset
  let selectedDataset: Dataset | null = null;
  if (options?.scenarioId) {
    selectedDataset = getDatasetForScenario(options.scenarioId);
    if (selectedDataset) {
      console.log(`🎭 Using scenario: ${options.scenarioId}`);
    }
  }

  // Fallback to normal dataset selection
  if (!selectedDataset) {
    const formFingerprint = dataStore.generateFormFingerprint(inputs);
    selectedDataset = dataStore.selectDataset(formFingerprint);
  }

  if (!selectedDataset) {
    console.error("❌ No dataset available for filling");
    return;
  }

  currentDataset = selectedDataset;
  console.log(`🎯 Using dataset: ${currentDataset.name} for this form`);

  // Build field-value pairs for animation mode
  if (useAnimation && typingSpeed !== 'instant') {
    const fieldsToAnimate: Array<{
      input: HTMLInputElement | HTMLTextAreaElement;
      value: string;
    }> = [];

    for (const input of inputs) {
      const inputType = detectInputType(input);

      if (inputType === "image" && input instanceof HTMLInputElement) {
        // Handle image inputs directly (can't animate)
        const query = getImageSearchQuery(input);
        const images = await fetchUnsplashImages(query, 1);
        if (images.length > 0) {
          await fillImageInput(input, images[0], false);
          filledCount++;
        }
      } else if (input instanceof HTMLSelectElement) {
        // Handle selects directly (can't animate typing)
        const value = dataStore.getFieldData(currentDataset!, inputType);
        if (value) {
          fillInput(input, value, false);
          filledCount++;
        }
      } else if (input instanceof HTMLInputElement && input.type === "file") {
        // Non-image file inputs can't be filled programmatically.
        continue;
      } else {
        // Text inputs can be animated
        let value = dataStore.getFieldData(currentDataset!, inputType);
        
        // Try smart suggestions for complex fields (with AI if enabled)
        if (!value && input instanceof HTMLTextAreaElement) {
          if (currentSettings.useAI) {
            // Use AI-powered suggestion
            const aiResponse = await generateAIResponse(input);
            if (aiResponse) {
              value = aiResponse;
            }
          }
          // Fall back to regular smart suggestions
          if (!value) {
            const smartSuggestions = getSmartSuggestions(input);
            if (smartSuggestions.length > 0) {
              value = smartSuggestions[0];
            }
          }
        }

        // Fallback for generic types
        if (!value && (inputType === "number" || inputType === "text")) {
          const staticVals = getStaticSuggestions(inputType);
          if (staticVals.length > 0) value = staticVals[0];
        }

        if (value) {
          if (input instanceof HTMLInputElement) {
            const type = (input.type || "").toLowerCase();
            // Some input types (e.g. date/number/radio) don't behave well with character-by-character typing.
            if (type === "radio" || type === "date" || type === "number") {
              fillInput(input, value, false);
              filledCount++;
              continue;
            }
          }
          fieldsToAnimate.push({ input, value });
        }
      }
    }

    // Fill with animation
    if (fieldsToAnimate.length > 0) {
      const typingConfig = getTypingConfig(typingSpeed);
      await fillFieldsWithAnimation(fieldsToAnimate, typingConfig);
      filledCount += fieldsToAnimate.length;
    }
  } else {
    // Instant mode - original behavior
    for (const input of inputs) {
      const inputType = detectInputType(input);

      if (inputType === "image" && input instanceof HTMLInputElement) {
        const query = getImageSearchQuery(input);
        const images = await fetchUnsplashImages(query, 1);
        if (images.length > 0) {
          await fillImageInput(input, images[0], false);
          filledCount++;
        }
      } else if (input instanceof HTMLInputElement && input.type === "file") {
        // Non-image file inputs can't be filled programmatically.
        continue;
      } else {
        let value = dataStore.getFieldData(currentDataset!, inputType);

        // Try smart suggestions for complex fields (with AI if enabled)
        if (!value && input instanceof HTMLTextAreaElement) {
          if (currentSettings.useAI) {
            // Use AI-powered suggestion
            const aiResponse = await generateAIResponse(input);
            if (aiResponse) {
              value = aiResponse;
            }
          }
          // Fall back to regular smart suggestions
          if (!value) {
            const smartSuggestions = getSmartSuggestions(input);
            if (smartSuggestions.length > 0) {
              value = smartSuggestions[0];
            }
          }
        }

        // Fallback for generic types
        if (!value && (inputType === "number" || inputType === "text")) {
          const staticVals = getStaticSuggestions(inputType);
          if (staticVals.length > 0) value = staticVals[0];
        }

        if (value) {
          fillInput(input, value, false);
          filledCount++;
        }
      }
    }
  }

  // Show summary confirmation with dataset name
  if (filledCount > 0) {
    showFillAllConfirmation(filledCount, currentDataset.name);
    setTimeout(checkAndShowFillAllButton, 2000);
  }
}

/**
 * Fill all inputs with a specific test scenario
 */
export async function fillWithScenario(scenarioId: string, animated = false): Promise<void> {
  await fillAllInputs({ scenarioId, animated });
}

/**
 * Run demo mode - fills form with typing animation to showcase the feature
 */
export async function runAutofillDemo(): Promise<void> {
  const inputs = getAllFillableInputs();
  const textInputs = inputs.filter(
    (input) => input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
  );

  if (textInputs.length === 0) {
    console.warn("⚠️ No text inputs found for demo");
    return;
  }

  // Generate a fresh persona for the demo
  const persona = generateRelationalPersona();

  const steps: Array<{
    input: HTMLInputElement | HTMLTextAreaElement;
    value: string;
  }> = [];

  for (const input of textInputs) {
    const inputType = detectInputType(input);
    const value =
      String(persona.data[inputType] ?? persona.data.name ?? persona.data.firstName ?? "");
    if (value && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
      steps.push({ input, value });
    }
  }

  if (steps.length > 0) {
    console.log("🎬 Running autofill demo...");
    await runDemoMode(steps);
    console.log("✅ Demo complete!");
  }
}
