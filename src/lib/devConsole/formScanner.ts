/**
 * Form Scanner
 * Scans the DOM for forms and their inputs
 */

export interface ScannedInput {
  id: string;
  element: HTMLInputElement | HTMLTextAreaElement;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  isFillable: boolean;
  isRequired: boolean;
  fieldType: string; // Inferred field type (email, phone, etc.)
}

export interface ScannedForm {
  id: string;
  element: HTMLFormElement;
  name: string;
  action: string;
  inputs: ScannedInput[];
  fillableCount: number;
}

/**
 * Scan all forms on the page
 */
export function scanAllForms(): ScannedForm[] {
  const forms = Array.from(document.querySelectorAll('form'));

  return forms.map((formElement, index) => {
    const inputs = scanFormInputs(formElement);
    const fillableInputs = inputs.filter(input => input.isFillable);

    return {
      id: formElement.id || `form-${index}`,
      element: formElement,
      name: getFormName(formElement, index),
      action: formElement.action || '(no action)',
      inputs,
      fillableCount: fillableInputs.length,
    };
  });
}

/**
 * Get a human-readable form name
 */
function getFormName(form: HTMLFormElement, index: number): string {
  // Try to get name from various sources
  if (form.name) return form.name;
  if (form.id) return form.id;

  // Try to find a heading near the form
  const heading = form.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading?.textContent) {
    return heading.textContent.trim();
  }

  // Try to get from aria-label
  const ariaLabel = form.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Fallback
  return `Form ${index + 1}`;
}

/**
 * Scan all inputs within a form
 */
function scanFormInputs(form: HTMLFormElement): ScannedInput[] {
  const inputs: ScannedInput[] = [];

  // Get all input and textarea elements
  const inputElements = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
  );

  inputElements.forEach((element, index) => {
    const input = scanInput(element, index);
    if (input) {
      inputs.push(input);
    }
  });

  return inputs;
}

/**
 * Scan a single input element
 */
function scanInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  index: number
): ScannedInput | null {
  const type = element instanceof HTMLInputElement ? element.type : 'textarea';

  // Skip certain input types
  const skipTypes = ['submit', 'button', 'reset', 'image', 'file', 'hidden'];
  if (skipTypes.includes(type)) {
    return null;
  }

  const name = element.name || element.id || `input-${index}`;
  const label = getInputLabel(element);
  const placeholder = element.placeholder || '';
  const value = element.value || '';

  // Check if input is fillable
  const isFillable = !element.disabled && !element.readOnly;
  const isRequired = element.required;

  // Infer field type
  const fieldType = inferFieldType(element, name, label, placeholder, type);

  return {
    id: element.id || `input-${index}`,
    element,
    name,
    type,
    label,
    placeholder,
    value,
    isFillable,
    isRequired,
    fieldType,
  };
}

/**
 * Get the label text for an input
 */
function getInputLabel(element: HTMLInputElement | HTMLTextAreaElement): string {
  // Try to find associated label
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent) {
      return label.textContent.trim();
    }
  }

  // Try to find parent label
  const parentLabel = element.closest('label');
  if (parentLabel?.textContent) {
    // Remove the input's own text content
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const input = clone.querySelector('input, textarea');
    if (input) {
      input.remove();
    }
    return clone.textContent?.trim() || '';
  }

  // Try aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Try nearby text
  const prevSibling = element.previousElementSibling;
  if (prevSibling?.textContent && prevSibling.textContent.trim().length < 50) {
    return prevSibling.textContent.trim();
  }

  return '';
}

/**
 * Infer the field type from various signals
 */
function inferFieldType(
  element: HTMLInputElement | HTMLTextAreaElement,
  name: string,
  label: string,
  placeholder: string,
  type: string
): string {
  // Combine all text for analysis
  const allText = `${name} ${label} ${placeholder}`.toLowerCase();

  // Direct type match
  if (type === 'email') return 'email';
  if (type === 'tel') return 'phone';
  if (type === 'url') return 'url';
  if (type === 'date') return 'date';
  if (type === 'number') return 'number';
  if (type === 'password') return 'password';

  // Pattern matching
  if (allText.match(/email|e-mail/)) return 'email';
  if (allText.match(/phone|tel|mobile|cell/)) return 'phone';
  if (allText.match(/first.?name|fname/)) return 'firstName';
  if (allText.match(/last.?name|lname|surname/)) return 'lastName';
  if (allText.match(/full.?name|name/)) return 'fullName';
  if (allText.match(/address|street/)) return 'address';
  if (allText.match(/city|town/)) return 'city';
  if (allText.match(/state|province/)) return 'state';
  if (allText.match(/zip|postal/)) return 'zip';
  if (allText.match(/country/)) return 'country';
  if (allText.match(/company|organization/)) return 'company';
  if (allText.match(/job.?title|position/)) return 'jobTitle';
  if (allText.match(/username|user/)) return 'username';
  if (allText.match(/password|pass/)) return 'password';
  if (allText.match(/url|website|link/)) return 'url';
  if (allText.match(/age/)) return 'age';
  if (allText.match(/birth|dob/)) return 'date';
  if (allText.match(/credit.?card|card.?number/)) return 'creditCard';
  if (allText.match(/cvv|cvc|security.?code/)) return 'cvv';
  if (allText.match(/description|message|comment|bio|about|notes/)) return 'description';

  // Default
  return 'text';
}
