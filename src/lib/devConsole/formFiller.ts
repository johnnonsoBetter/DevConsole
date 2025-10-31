/**
 * Form Filler
 * Fills form inputs with generated mock data
 */

import { generateMockData } from './mockDataset';
import type { ScannedForm, ScannedInput } from './formScanner';

export interface FormFillResult {
  success: boolean;
  filledInputs: number;
  skippedInputs: number;
  errors: string[];
}

export interface InputFillResult {
  success: boolean;
  value?: string;
  error?: string;
}

/**
 * Fill all inputs in a form
 */
export function fillForm(form: ScannedForm): FormFillResult {
  const result: FormFillResult = {
    success: true,
    filledInputs: 0,
    skippedInputs: 0,
    errors: [],
  };

  form.inputs.forEach(input => {
    if (!input.isFillable) {
      result.skippedInputs++;
      return;
    }

    const fillResult = fillInput(input);
    if (fillResult.success) {
      result.filledInputs++;
    } else {
      result.skippedInputs++;
      if (fillResult.error) {
        result.errors.push(fillResult.error);
      }
    }
  });

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Fill a single input with generated data
 */
export function fillInput(input: ScannedInput): InputFillResult {
  if (!input.isFillable) {
    return {
      success: false,
      error: 'Input is not fillable (disabled or readonly)',
    };
  }

  try {
    const value = generateMockData(input.fieldType);

    // Set the value
    input.element.value = value;

    // Trigger input event for React/Vue/Angular reactivity
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    input.element.dispatchEvent(inputEvent);

    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    input.element.dispatchEvent(changeEvent);

    // Trigger blur event (some forms validate on blur)
    const blurEvent = new Event('blur', { bubbles: true, cancelable: true });
    input.element.dispatchEvent(blurEvent);

    return {
      success: true,
      value,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear all inputs in a form
 */
export function clearForm(form: ScannedForm): void {
  form.inputs.forEach(input => {
    if (input.isFillable) {
      clearInput(input);
    }
  });
}

/**
 * Clear a single input
 */
export function clearInput(input: ScannedInput): void {
  if (!input.isFillable) return;

  input.element.value = '';

  // Trigger events
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  input.element.dispatchEvent(inputEvent);

  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  input.element.dispatchEvent(changeEvent);
}
