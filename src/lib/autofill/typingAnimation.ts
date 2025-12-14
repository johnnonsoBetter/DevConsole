/**
 * Realistic Typing Animation for Autofill
 * Simulates human-like typing with variable delays, occasional typos, and corrections
 *
 * Features:
 * - Variable typing speed (like real humans)
 * - Occasional typos with backspace corrections
 * - Natural pauses at punctuation and word boundaries
 * - Optional "thinking" delays before starting
 * - Smooth cursor movement between fields
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TypingConfig {
  /** Base delay between keystrokes in ms (will vary) */
  baseDelay: number;
  /** Variance in delay (±ms) */
  delayVariance: number;
  /** Probability of making a typo (0-1) */
  typoChance: number;
  /** Delay before fixing a typo */
  typoFixDelay: number;
  /** Extra delay after punctuation */
  punctuationDelay: number;
  /** Extra delay after completing a word (space) */
  wordDelay: number;
  /** Delay before starting to type (thinking time) */
  startDelay: number;
  /** Whether to simulate mouse movements */
  simulateMouseMovement: boolean;
  /** Speed multiplier (0.5 = half speed, 2 = double speed) */
  speedMultiplier: number;
}

export const DEFAULT_TYPING_CONFIG: TypingConfig = {
  baseDelay: 50,
  delayVariance: 30,
  typoChance: 0.03, // 3% chance per character
  typoFixDelay: 200,
  punctuationDelay: 150,
  wordDelay: 80,
  startDelay: 300,
  simulateMouseMovement: true,
  speedMultiplier: 1,
};

export const SPEED_PRESETS: Record<string, Partial<TypingConfig>> = {
  slow: { baseDelay: 100, delayVariance: 50, speedMultiplier: 0.5 },
  normal: { baseDelay: 50, delayVariance: 30, speedMultiplier: 1 },
  fast: { baseDelay: 25, delayVariance: 15, speedMultiplier: 2 },
  instant: {
    baseDelay: 5,
    delayVariance: 2,
    typoChance: 0,
    speedMultiplier: 10,
  },
};

// ============================================================================
// TYPO GENERATION
// ============================================================================

// Adjacent keys on QWERTY keyboard for realistic typos
const ADJACENT_KEYS: Record<string, string[]> = {
  a: ["q", "w", "s", "z"],
  b: ["v", "g", "h", "n"],
  c: ["x", "d", "f", "v"],
  d: ["s", "e", "r", "f", "c", "x"],
  e: ["w", "s", "d", "r"],
  f: ["d", "r", "t", "g", "v", "c"],
  g: ["f", "t", "y", "h", "b", "v"],
  h: ["g", "y", "u", "j", "n", "b"],
  i: ["u", "j", "k", "o"],
  j: ["h", "u", "i", "k", "m", "n"],
  k: ["j", "i", "o", "l", "m"],
  l: ["k", "o", "p"],
  m: ["n", "j", "k"],
  n: ["b", "h", "j", "m"],
  o: ["i", "k", "l", "p"],
  p: ["o", "l"],
  q: ["w", "a"],
  r: ["e", "d", "f", "t"],
  s: ["a", "w", "e", "d", "x", "z"],
  t: ["r", "f", "g", "y"],
  u: ["y", "h", "j", "i"],
  v: ["c", "f", "g", "b"],
  w: ["q", "a", "s", "e"],
  x: ["z", "s", "d", "c"],
  y: ["t", "g", "h", "u"],
  z: ["a", "s", "x"],
  "0": ["9", "-"],
  "1": ["2", "`"],
  "2": ["1", "3", "q", "w"],
  "3": ["2", "4", "w", "e"],
  "4": ["3", "5", "e", "r"],
  "5": ["4", "6", "r", "t"],
  "6": ["5", "7", "t", "y"],
  "7": ["6", "8", "y", "u"],
  "8": ["7", "9", "u", "i"],
  "9": ["8", "0", "i", "o"],
};

/**
 * Generate a typo for a character (adjacent key)
 */
function generateTypo(char: string): string {
  const lowerChar = char.toLowerCase();
  const adjacent = ADJACENT_KEYS[lowerChar];

  if (!adjacent || adjacent.length === 0) {
    // Can't generate typo, return original
    return char;
  }

  const typo = adjacent[Math.floor(Math.random() * adjacent.length)];

  // Preserve case
  if (char === char.toUpperCase() && char !== char.toLowerCase()) {
    return typo.toUpperCase();
  }
  return typo;
}

// ============================================================================
// ANIMATION STATE
// ============================================================================

interface TypingState {
  isTyping: boolean;
  isPaused: boolean;
  currentField: HTMLElement | null;
  abortController: AbortController | null;
}

let globalState: TypingState = {
  isTyping: false,
  isPaused: false,
  currentField: null,
  abortController: null,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(
  base: number,
  variance: number,
  multiplier: number
): number {
  const delay = base + (Math.random() * 2 - 1) * variance;
  return Math.max(5, delay / multiplier);
}

/**
 * Dispatch realistic keyboard events
 */
function dispatchKeyEvent(
  element: HTMLElement,
  eventType: "keydown" | "keyup" | "keypress",
  key: string
): void {
  const event = new KeyboardEvent(eventType, {
    key,
    code: `Key${key.toUpperCase()}`,
    keyCode: key.charCodeAt(0),
    which: key.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

function safeGetSelection(
  input: HTMLInputElement | HTMLTextAreaElement,
  fallback: number
): { start: number; end: number } {
  try {
    const start = input.selectionStart ?? fallback;
    const end = input.selectionEnd ?? fallback;
    return { start, end };
  } catch {
    return { start: fallback, end: fallback };
  }
}

function safeSetSelection(
  input: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number
): void {
  try {
    input.selectionStart = start;
    input.selectionEnd = end;
  } catch {
    // Some input types (e.g. number/date) do not support selection APIs.
  }
}

/**
 * Dispatch input event after changing value
 */
function dispatchInputEvent(element: HTMLElement): void {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

// ============================================================================
// MAIN TYPING FUNCTIONS
// ============================================================================

/**
 * Type a single character with realistic timing
 */
async function typeCharacter(
  input: HTMLInputElement | HTMLTextAreaElement,
  char: string,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) return;

  // Dispatch keydown
  dispatchKeyEvent(input, "keydown", char);

  // Add character to value
  const currentValue = input.value;
  const { start: selectionStart, end: selectionEnd } = safeGetSelection(
    input,
    currentValue.length
  );

  input.value =
    currentValue.slice(0, selectionStart) +
    char +
    currentValue.slice(selectionEnd);

  // Move cursor
  safeSetSelection(input, selectionStart + 1, selectionStart + 1);

  // Dispatch events
  dispatchKeyEvent(input, "keyup", char);
  dispatchInputEvent(input);
}

/**
 * Delete the last character (backspace)
 */
async function backspace(
  input: HTMLInputElement | HTMLTextAreaElement,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) return;

  const currentValue = input.value;
  if (currentValue.length === 0) return;

  const { start: selectionStart } = safeGetSelection(
    input,
    currentValue.length
  );

  // Dispatch backspace key
  dispatchKeyEvent(input, "keydown", "Backspace");

  // Remove character
  input.value =
    currentValue.slice(0, selectionStart - 1) +
    currentValue.slice(selectionStart);

  // Move cursor
  safeSetSelection(input, selectionStart - 1, selectionStart - 1);

  dispatchKeyEvent(input, "keyup", "Backspace");
  dispatchInputEvent(input);
}

/**
 * Type a string with realistic human-like timing
 */
export async function typeWithAnimation(
  input: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  config: Partial<TypingConfig> = {}
): Promise<boolean> {
  if (!input) return false;
  if (typeof (input as any).focus !== "function") return false;
  if (!input.isConnected) return false;

  const finalConfig = { ...DEFAULT_TYPING_CONFIG, ...config };

  // Cancel any existing typing
  if (globalState.abortController) {
    globalState.abortController.abort();
  }

  const abortController = new AbortController();
  globalState = {
    isTyping: true,
    isPaused: false,
    currentField: input,
    abortController,
  };

  const signal = abortController.signal;

  try {
    // Focus the input
    try {
      input.focus();
    } catch {
      return false;
    }

    // Clear existing value
    try {
      input.value = "";
      dispatchInputEvent(input);
    } catch {
      return false;
    }

    // Initial "thinking" delay
    await sleep(finalConfig.startDelay / finalConfig.speedMultiplier);

    if (signal.aborted) return false;

    // Type each character
    for (let i = 0; i < text.length; i++) {
      if (signal.aborted) return false;

      const char = text[i];

      // Check for typo
      const shouldTypo =
        Math.random() < finalConfig.typoChance && char.match(/[a-zA-Z0-9]/);

      if (shouldTypo) {
        // Type wrong character
        const typo = generateTypo(char);
        await typeCharacter(input, typo, signal);

        // Delay before realizing mistake
        await sleep(finalConfig.typoFixDelay / finalConfig.speedMultiplier);

        if (signal.aborted) return false;

        // Backspace
        await backspace(input, signal);

        // Small delay
        await sleep(randomDelay(30, 20, finalConfig.speedMultiplier));
      }

      if (signal.aborted) return false;

      // Type correct character
      await typeCharacter(input, char, signal);

      // Variable delay based on character
      let delay = randomDelay(
        finalConfig.baseDelay,
        finalConfig.delayVariance,
        finalConfig.speedMultiplier
      );

      // Extra delay for punctuation
      if (".!?,;:".includes(char)) {
        delay += finalConfig.punctuationDelay / finalConfig.speedMultiplier;
      }

      // Extra delay for spaces (word boundaries)
      if (char === " ") {
        delay += finalConfig.wordDelay / finalConfig.speedMultiplier;
      }

      await sleep(delay);

      // Handle pause state
      while (globalState.isPaused && !signal.aborted) {
        await sleep(100);
      }
    }

    // Trigger final events
    try {
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    } catch {
      // ignore
    }

    return true;
  } catch (error) {
    console.error("[TypingAnimation] Error:", error);
    return false;
  } finally {
    globalState.isTyping = false;
    globalState.currentField = null;
  }
}

/**
 * Fill multiple fields with animation
 */
export async function fillFieldsWithAnimation(
  fields: Array<{
    input: HTMLInputElement | HTMLTextAreaElement;
    value: string;
  }>,
  config: Partial<TypingConfig> = {}
): Promise<boolean> {
  const finalConfig = { ...DEFAULT_TYPING_CONFIG, ...config };

  for (const { input, value } of fields) {
    // Delay between fields
    if (finalConfig.simulateMouseMovement) {
      await sleep(200 / finalConfig.speedMultiplier);
    }

    const success = await typeWithAnimation(input, value, finalConfig);
    if (!success) return false;

    // Delay after completing a field
    await sleep(300 / finalConfig.speedMultiplier);
  }

  return true;
}

// ============================================================================
// CONTROL FUNCTIONS
// ============================================================================

/**
 * Stop the current typing animation
 */
export function stopTyping(): void {
  if (globalState.abortController) {
    globalState.abortController.abort();
    globalState.isTyping = false;
  }
}

/**
 * Pause the current typing animation
 */
export function pauseTyping(): void {
  globalState.isPaused = true;
}

/**
 * Resume the current typing animation
 */
export function resumeTyping(): void {
  globalState.isPaused = false;
}

/**
 * Check if currently typing
 */
export function isTyping(): boolean {
  return globalState.isTyping;
}

/**
 * Check if typing is paused
 */
export function isTypingPaused(): boolean {
  return globalState.isPaused;
}

/**
 * Get the current field being typed into
 */
export function getCurrentTypingField(): HTMLElement | null {
  return globalState.currentField;
}

// ============================================================================
// DEMO MODE (For presentations)
// ============================================================================

export interface DemoStep {
  input: HTMLInputElement | HTMLTextAreaElement;
  value: string;
  label?: string;
  delay?: number;
}

/**
 * Run a demo with narration-friendly timing
 */
export async function runDemoMode(
  steps: DemoStep[],
  onStepStart?: (step: DemoStep, index: number) => void,
  onStepComplete?: (step: DemoStep, index: number) => void
): Promise<boolean> {
  const demoConfig: Partial<TypingConfig> = {
    baseDelay: 70,
    delayVariance: 20,
    typoChance: 0.05, // Slightly higher for demo effect
    startDelay: 500,
    speedMultiplier: 0.8,
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Callback before starting
    onStepStart?.(step, i);

    // Delay before this step
    if (step.delay) {
      await sleep(step.delay);
    }

    // Type the value
    const success = await typeWithAnimation(step.input, step.value, demoConfig);
    if (!success) return false;

    // Callback after completing
    onStepComplete?.(step, i);

    // Pause between steps for demo effect
    await sleep(800);
  }

  return true;
}
