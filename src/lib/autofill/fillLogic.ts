/**
 * Fill Logic for Autofill Extension
 * Handles filling inputs with data and events
 */

import { DataStore } from "./datastore";
import { detectInputType } from "./fieldDetector";
import type { Dataset, FieldType } from "./types";
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

/**
 * Initialize dataStore reference
 */
export function initializeDataStore(store: DataStore): void {
  dataStore = store;
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
 * Fill input with value and trigger events
 */
export function fillInput(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
  showConfirmation: boolean = true
): void {
  let filled = false;

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
 */
export async function fillAllInputs(): Promise<void> {
  const inputs = getAllFillableInputs();
  let filledCount = 0;

  // Initialize dataStore if needed
  if (!dataStore) {
    console.error("❌ DataStore not initialized");
    return;
  }

  // Generate form fingerprint and select dataset
  const formFingerprint = dataStore.generateFormFingerprint(inputs);
  currentDataset = dataStore.selectDataset(formFingerprint);

  if (!currentDataset) {
    console.error("❌ No dataset available for filling");
    return;
  }

  console.log(`🎯 Using dataset: ${currentDataset.name} for this form`);

  for (const input of inputs) {
    const inputType = detectInputType(input);

    if (inputType === "image" && input instanceof HTMLInputElement) {
      // Handle image inputs
      const query = getImageSearchQuery(input);
      const images = await fetchUnsplashImages(query, 1);
      if (images.length > 0) {
        await fillImageInput(input, images[0], false);
        filledCount++;
      }
    } else {
      // Get value from selected dataset
      let value = dataStore.getFieldData(currentDataset, inputType);

      // Fallback for generic types if missing in dataset
      if (!value && (inputType === "number" || inputType === "text")) {
        const staticVals = getStaticSuggestions(inputType);
        if (staticVals.length > 0) value = staticVals[0];
      }

      if (value) {
        fillInput(input, value, false); // false = don't show individual confirmations
        filledCount++;
      }
    }
  }

  // Show summary confirmation with dataset name
  if (filledCount > 0) {
    showFillAllConfirmation(filledCount, currentDataset.name);

    // Re-check inputs after a delay to show button again if needed
    setTimeout(checkAndShowFillAllButton, 2000);
  }
}
