/**
 * AI Form Analyzer
 * 
 * Provides utilities for form analysis and dataset generation.
 * The main AI integration is now in the usePageStoreAI hook.
 * This file provides fallback generators and utility functions.
 */

import type {
  PageForm,
  PageFormField,
  PagePurpose,
  PageStoreDataset,
  PageStoreFieldValue,
} from "./pageStoreTypes";

// ============================================================================
// FALLBACK GENERATORS (when AI is not available)
// ============================================================================

/**
 * Generate a basic dataset without AI
 */
export function generateBasicDataset(
  form: PageForm,
  index: number = 0
): Omit<PageStoreDataset, "id" | "createdAt" | "updatedAt"> {
  const values: PageStoreFieldValue[] = form.fields.map((field) => ({
    fieldId: field.id,
    fieldType: field.detectedType,
    value: generateBasicValue(field, index),
  }));

  return {
    name: `Dataset ${index + 1}`,
    description: `Auto-generated test data #${index + 1}`,
    values,
    isAIGenerated: false,
    tags: ["auto-generated"],
  };
}

/**
 * Generate a basic value for a field
 */
export function generateBasicValue(
  field: PageFormField,
  index: number = 0
): string {
  const type = field.detectedType;
  
  // Add index suffix to make values unique
  const suffix = index > 0 ? `${index + 1}` : "";

  // Base values by type
  const baseValues: Record<string, () => string> = {
    email: () => `test.user${suffix}@example.com`,
    firstName: () => index % 2 === 0 ? `John${suffix}` : `Jane${suffix}`,
    lastName: () => index % 3 === 0 ? `Doe${suffix}` : index % 3 === 1 ? `Smith${suffix}` : `Johnson${suffix}`,
    name: () => index % 2 === 0 ? `John Doe${suffix}` : `Jane Smith${suffix}`,
    phone: () => `+1 555-${String(100 + index).padStart(3, "0")}-${String(1000 + index).padStart(4, "0")}`,
    address: () => `${100 + index} Test Street`,
    city: () => "Test City",
    state: () => "CA",
    zip: () => `${10000 + index}`,
    country: () => "United States",
    company: () => `Test Company${suffix}`,
    title: () => `Test Title${suffix}`,
    website: () => `https://example${suffix}.com`,
    message: () => `This is test message ${index + 1}.`,
    number: () => `${42 + index}`,
    date: () => `2024-01-${String(15 + (index % 15)).padStart(2, "0")}`,
    password: () => `TestPassword${index + 1}!`,
    text: () => `Test value ${index + 1}`,
  };

  return baseValues[type]?.() ?? `test value ${index + 1}`;
}

/**
 * Quick-generate datasets without AI
 */
export function generateQuickDatasetsForStore(
  forms: PageForm[],
  count: number = 10
): Omit<PageStoreDataset, "id" | "createdAt" | "updatedAt">[] {
  const datasets: Omit<PageStoreDataset, "id" | "createdAt" | "updatedAt">[] = [];

  for (let i = 0; i < count; i++) {
    for (const form of forms) {
      datasets.push(generateBasicDataset(form, i));
    }
  }

  return datasets;
}

// ============================================================================
// FIELD TYPE SUGGESTIONS (fallback)
// ============================================================================

/**
 * Get basic suggestions for a field type
 */
export function getBasicSuggestions(fieldType: string): string[] {
  const suggestions: Record<string, string[]> = {
    email: [
      "test@example.com",
      "user.name@domain.com",
      "test+label@example.com",
      "admin@company.org",
      "support@test.io",
    ],
    firstName: ["John", "Jane", "Alex", "María", "李"],
    lastName: ["Doe", "Smith", "O'Connor", "García", "王"],
    name: ["John Doe", "Jane Smith", "Test User", "Admin User", "Guest"],
    phone: [
      "+1 555-123-4567",
      "(555) 987-6543",
      "555.456.7890",
      "+44 20 7946 0958",
      "1-800-TEST-NUM",
    ],
    address: [
      "123 Main Street",
      "456 Oak Avenue, Apt 2B",
      "789 Test Blvd Suite 100",
      "1 Infinite Loop",
      "221B Baker Street",
    ],
    city: ["New York", "San Francisco", "London", "Tokyo", "São Paulo"],
    state: ["CA", "NY", "TX", "FL", "WA"],
    zip: ["12345", "90210", "10001", "94102", "12345-6789"],
    country: ["United States", "United Kingdom", "Canada", "Australia", "Germany"],
    company: [
      "Test Corp",
      "Example Inc.",
      "Demo Company LLC",
      "Acme Industries",
      "Tech Solutions",
    ],
    message: [
      "This is a test message.",
      "Please contact me regarding your services.",
      "I have a question about the product.",
      "Looking forward to hearing from you.",
      "Thank you for your time.",
    ],
    password: [
      "TestPass123!",
      "SecureP@ssw0rd",
      "MyP@ss2024#",
      "Testing123$",
      "Demo!Pass789",
    ],
  };

  return suggestions[fieldType] || ["test value", "sample data", "example", "demo", "placeholder"];
}

// ============================================================================
// PURPOSE DETECTION HELPERS
// ============================================================================

/**
 * Detect form purpose based on fields
 */
export function detectFormPurpose(forms: PageForm[]): PagePurpose {
  const allFieldTypes = forms.flatMap((f) => f.fields.map((field) => field.detectedType));
  const fieldTypeSet = new Set(allFieldTypes);

  // Login detection
  if (
    (fieldTypeSet.has("email") || fieldTypeSet.has("username")) &&
    fieldTypeSet.has("password") &&
    allFieldTypes.length <= 4
  ) {
    return "login";
  }

  // Signup detection
  if (
    fieldTypeSet.has("email") &&
    fieldTypeSet.has("password") &&
    (fieldTypeSet.has("firstName") || fieldTypeSet.has("lastName") || fieldTypeSet.has("name"))
  ) {
    return "signup";
  }

  // Contact form detection
  if (
    fieldTypeSet.has("email") &&
    (fieldTypeSet.has("message") || fieldTypeSet.has("subject"))
  ) {
    return "contact";
  }

  // Checkout detection
  if (
    fieldTypeSet.has("address") ||
    fieldTypeSet.has("creditCard") ||
    fieldTypeSet.has("cardNumber")
  ) {
    return "checkout";
  }

  // Search detection
  if (fieldTypeSet.has("search") || (allFieldTypes.length === 1 && fieldTypeSet.has("text"))) {
    return "search";
  }

  // Profile detection
  if (
    (fieldTypeSet.has("firstName") || fieldTypeSet.has("lastName")) &&
    (fieldTypeSet.has("phone") || fieldTypeSet.has("address"))
  ) {
    return "profile";
  }

  // Newsletter detection
  if (fieldTypeSet.has("email") && allFieldTypes.length <= 2) {
    return "newsletter";
  }

  return "unknown";
}

// ============================================================================
// FORM ANALYSIS UTILITIES
// ============================================================================

/**
 * Build a text prompt for form analysis (used by hooks)
 */
export function buildFormContextPrompt(
  url: string,
  title: string,
  description: string,
  forms: PageForm[],
  count: number = 100
): string {
  const fieldsDescription = forms
    .map((form) => {
      const fieldsList = form.fields
        .map(
          (f) =>
            `- ${f.label || f.name || f.elementId || "unnamed"} (type: ${f.type}, detected: ${f.detectedType}${f.required ? ", required" : ""}${f.placeholder ? `, placeholder: "${f.placeholder}"` : ""})`
        )
        .join("\n");
      return `Form: ${form.name}\n${fieldsList}`;
    })
    .join("\n\n");

  return `Analyze this web form and generate realistic test data.

PAGE CONTEXT:
- URL: ${url}
- Title: ${title}
- Description: ${description || "No description"}

FORMS DETECTED:
${fieldsDescription || "No forms detected"}

REQUIREMENTS:
Generate ${count} unique datasets with diverse, realistic values.

For each dataset, provide:
1. A simple name (e.g., "Dataset 1", "Dataset 2")
2. Realistic values for EVERY field that match the form's purpose
3. Unique values across all datasets

Be creative and vary names, emails, phone formats, and addresses.`;
}
