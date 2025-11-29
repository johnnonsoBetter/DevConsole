/**
 * UI Manager for Autofill Extension
 * Handles blue icons, suggestion boxes, and Fill All button injection
 */

/**
 * UI Manager for Autofill Extension
 * Handles blue icons, suggestion boxes, and Fill All button injection
 */

import { detectInputType } from "./fieldDetector";
import {
  fillAllInputs,
  fillInput,
  getAllFillableInputs,
  getSuggestionsForField,
} from "./fillLogic";
import {
  fetchUnsplashImages,
  fillImageInput,
  getImageSearchQuery,
} from "./unsplashService";

// State
let currentInput:
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | null = null;
let suggestionBox: HTMLElement | null = null;
let fillAllButton: HTMLElement | null = null;
// Map input -> { icon: HTMLElement, updatePos: () => void }
const iconRegistry = new Map<
  HTMLElement,
  { icon: HTMLElement; updatePos: () => void }
>();

// Global event listeners for performance (Single listener instead of N listeners)
let globalListenersAttached = false;

function ensureGlobalListeners() {
  if (globalListenersAttached) return;

  const updateAllIcons = () => {
    requestAnimationFrame(() => {
      iconRegistry.forEach(({ updatePos }) => updatePos());
    });
  };

  window.addEventListener("scroll", updateAllIcons, true);
  window.addEventListener("resize", updateAllIcons);
  globalListenersAttached = true;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show confirmation message near input
 */
export function showConfirmationMessage(
  input: HTMLElement,
  message: string = "✓ Filled",
  isError: boolean = false
): void {
  const confirmation = document.createElement("div");
  confirmation.className = `autofill-confirmation ${isError ? "autofill-error" : ""}`;
  confirmation.textContent = message;

  const rect = input.getBoundingClientRect();
  confirmation.style.position = "absolute";
  confirmation.style.top = `${rect.top + window.scrollY - 30}px`;
  confirmation.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(confirmation);

  setTimeout(() => {
    confirmation.style.opacity = "0";
    setTimeout(() => confirmation.remove(), 300);
  }, 1500);
}

/**
 * Show Fill All confirmation
 */
export function showFillAllConfirmation(
  count: number,
  datasetName: string
): void {
  const confirmation = document.createElement("div");
  confirmation.className = "autofill-fill-all-confirmation";
  confirmation.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 11l3 3L22 4"/>
    </svg>
    <div>
      <span>Filled ${count} field${count > 1 ? "s" : ""} successfully!</span>
      ${datasetName ? `<div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Using: ${escapeHtml(datasetName)}</div>` : ""}
    </div>
  `;

  document.body.appendChild(confirmation);

  setTimeout(() => {
    confirmation.classList.add("visible");
  }, 100);

  setTimeout(() => {
    confirmation.classList.remove("visible");
    setTimeout(() => confirmation.remove(), 300);
  }, 3000);
}

/**
 * Close suggestion box
 */
export function closeSuggestionBox(): void {
  if (suggestionBox) {
    suggestionBox.remove();
    suggestionBox = null;
    document.removeEventListener("click", handleOutsideClick);
  }
}

/**
 * Handle clicks outside suggestion box
 */
function handleOutsideClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (
    suggestionBox &&
    !suggestionBox.contains(target) &&
    target !== currentInput
  ) {
    closeSuggestionBox();
  }
}

/**
 * Create image suggestion box
 */
async function createImageSuggestionBox(
  input: HTMLInputElement
): Promise<void> {
  if (suggestionBox) {
    suggestionBox.remove();
  }

  suggestionBox = document.createElement("div");
  suggestionBox.className = "autofill-suggestion-box autofill-image-box";
  suggestionBox.innerHTML = `
    <div class="autofill-header">
      <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span class="autofill-title">Choose Image from Unsplash</span>
    </div>
    <div class="autofill-image-loading">Loading images...</div>
  `;

  const rect = input.getBoundingClientRect();
  suggestionBox.style.position = "absolute";
  suggestionBox.style.top = `${rect.bottom + window.scrollY + 8}px`;
  suggestionBox.style.left = `${rect.left + window.scrollX}px`;
  suggestionBox.style.minWidth = `${Math.max(rect.width, 350)}px`;

  document.body.appendChild(suggestionBox);

  // Fetch images
  const query = getImageSearchQuery(input);
  const images = await fetchUnsplashImages(query, 6);

  if (images.length > 0) {
    suggestionBox.innerHTML = `
      <div class="autofill-header">
        <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span class="autofill-title">Choose Image from Unsplash</span>
      </div>
      <div class="autofill-image-grid">
        ${images
          .map(
            (img, i) => `
          <div class="autofill-image-option" data-index="${i}">
            <img src="${img.thumbnail}" alt="${escapeHtml(img.description)}">
            <div class="autofill-image-overlay">
              <span>${escapeHtml(img.description)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="autofill-image-credit">Photos by Unsplash photographers</div>
    `;

    suggestionBox
      .querySelectorAll(".autofill-image-option")
      .forEach((option, index) => {
        option.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await fillImageInput(input, images[index]);
        });
      });
  } else {
    suggestionBox.innerHTML = `
      <div class="autofill-header">
        <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span class="autofill-title">Image Suggestions</span>
      </div>
      <div class="autofill-image-error">
        Unable to load images. Please check your Unsplash API key.
      </div>
    `;
  }

  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick);
  }, 0);
}

/**
 * Create suggestion box for text inputs
 */
export async function createSuggestionBox(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): Promise<void> {
  if (suggestionBox) {
    suggestionBox.remove();
  }

  const inputType = detectInputType(input);

  // Handle image inputs differently
  if (inputType === "image" && input instanceof HTMLInputElement) {
    await createImageSuggestionBox(input);
    return;
  }

  const inputSuggestions = getSuggestionsForField(inputType);

  suggestionBox = document.createElement("div");
  suggestionBox.className = "autofill-suggestion-box";
  suggestionBox.innerHTML = `
    <div class="autofill-header">
      <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span class="autofill-title">Quick Fill</span>
    </div>
    <div class="autofill-suggestions">
      ${inputSuggestions
        .map(
          (suggestion, i) => `
        <button class="autofill-btn" data-index="${i}">
          ${escapeHtml(suggestion)}
        </button>
      `
        )
        .join("")}
    </div>
  `;

  const rect = input.getBoundingClientRect();
  suggestionBox.style.position = "absolute";
  suggestionBox.style.top = `${rect.bottom + window.scrollY + 8}px`;
  suggestionBox.style.left = `${rect.left + window.scrollX}px`;
  suggestionBox.style.minWidth = `${Math.max(rect.width, 250)}px`;

  document.body.appendChild(suggestionBox);

  suggestionBox.querySelectorAll(".autofill-btn").forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fillInput(input, inputSuggestions[index]);
    });
  });

  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick);
  }, 0);
}

/**
 * Check and show Fill All button if needed
 */
export function checkAndShowFillAllButton(): void {
  const inputs = getAllFillableInputs();
  const emptyInputs = inputs.filter((input) => {
    if (input instanceof HTMLInputElement && input.type === "file") {
      return !input.files || input.files.length === 0;
    }
    return !input.value.trim();
  });

  // Only show if there are 2 or more empty inputs
  if (emptyInputs.length >= 2) {
    showFillAllButton();
    // Always update the count to show total fillable inputs in the view
    if (fillAllButton) {
      const countSpan = fillAllButton.querySelector(".fill-all-count");
      if (countSpan) {
        countSpan.textContent = `${inputs.length}`;
      }
    }
  } else if (fillAllButton) {
    fillAllButton.style.opacity = "0";
    setTimeout(() => {
      if (fillAllButton && fillAllButton.parentNode) {
        fillAllButton.remove();
        fillAllButton = null;
      }
    }, 300);
  }
}

/**
 * Show Fill All button
 */
function showFillAllButton(): void {
  if (fillAllButton && document.body.contains(fillAllButton)) return;

  fillAllButton = document.createElement("button");
  fillAllButton.className = "autofill-fill-all-button";
  fillAllButton.setAttribute("type", "button");
  fillAllButton.setAttribute("aria-label", "Fill All Fields");
  fillAllButton.setAttribute("title", "Fill All Fields (Ctrl+F)");
  fillAllButton.setAttribute("role", "button");
  fillAllButton.setAttribute("id", "autofill-fill-all-button" + Date.now());
  fillAllButton.innerHTML = `
    <svg class="fill-all-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
    <span class="fill-all-count"></span>
  `;

  document.body.appendChild(fillAllButton);

  // Update count to show total fillable inputs
  const inputs = getAllFillableInputs();
  const countSpan = fillAllButton.querySelector(".fill-all-count");
  if (countSpan && inputs.length > 0) {
    countSpan.textContent = `${inputs.length}`;
  }

  // Add click handler
  fillAllButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fillAllInputs();
  });

  // Animate in
  setTimeout(() => {
    if (fillAllButton) {
      fillAllButton.classList.add("visible");
    }
  }, 100);
}

/**
 * Handle hidden file inputs
 */
function handleHiddenFileInput(input: HTMLInputElement): void {
  let targetElement: HTMLElement | null = null;

  // Try to find label with for attribute
  if (input.id) {
    targetElement = document.querySelector<HTMLElement>(
      `label[for="${input.id}"]`
    );
  }

  // If no label found, try parent or sibling elements
  if (!targetElement) {
    const parent = input.parentElement;
    if (parent && parent.tagName === "LABEL") {
      targetElement = parent;
    } else if (parent) {
      targetElement = parent.querySelector<HTMLElement>(
        'button, [role="button"], .button, .btn'
      );
    }
  }

  // If we found a target, add icon to it
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      console.log(
        "📌 Using associated element for hidden file input:",
        targetElement.tagName,
        targetElement.className
      );
      addIconToElement(input, targetElement);
      return;
    }
  }

  // If no visible target found, still track the input for "Fill All"
  console.log(
    "⚠️ Hidden file input with no visible trigger found, adding to fill-all only"
  );
  // No icon to register
}

/**
 * Add icon to a target element (for hidden file inputs)
 */
function addIconToElement(
  input: HTMLInputElement,
  targetElement: HTMLElement
): void {
  if (iconRegistry.has(input)) return;

  const icon = document.createElement("div");
  icon.className = "autofill-trigger-icon";
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  `;

  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    currentInput = input;
    createSuggestionBox(input);
  });

  document.body.appendChild(icon);

  const updateIconPosition = () => {
    if (!document.contains(targetElement)) {
      icon.remove();
      iconRegistry.delete(input);
      return;
    }
    const rect = targetElement.getBoundingClientRect();
    // Only show if visible in viewport (simple check)
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      icon.style.display = "none";
      return;
    }

    icon.style.position = "absolute";
    icon.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;
    icon.style.left = `${rect.right + window.scrollX - 35}px`;
    icon.style.zIndex = "2147483646";
    icon.style.display = "flex";
  };

  // Register icon
  iconRegistry.set(input, { icon, updatePos: updateIconPosition });
  ensureGlobalListeners();

  // Initial update
  updateIconPosition();
}

/**
 * Add icon to input
 */
export function addIconToInput(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): void {
  if (iconRegistry.has(input)) return;

  const isFileInput =
    input instanceof HTMLInputElement && input.type === "file";

  const icon = document.createElement("div");
  icon.className = "autofill-trigger-icon";

  // Use different icon for file inputs
  if (isFileInput) {
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    `;
  } else {
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    `;
  }

  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    currentInput = input;
    createSuggestionBox(input);
  });

  document.body.appendChild(icon);

  const updateIconPosition = () => {
    if (!document.contains(input)) {
      icon.remove();
      iconRegistry.delete(input);
      return;
    }
    const rect = input.getBoundingClientRect();

    // Optimization: Hide if off-screen
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      icon.style.display = "none";
      return;
    }

    icon.style.position = "absolute";
    icon.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;

    // For file inputs, position the icon at the right edge
    if (isFileInput) {
      icon.style.left = `${rect.right + window.scrollX - 35}px`;
    } else {
      icon.style.left = `${rect.right + window.scrollX - 30}px`;
    }

    // Ensure icon is visible
    icon.style.zIndex = "2147483646";
    icon.style.display = "flex";
  };

  // Register icon
  iconRegistry.set(input, { icon, updatePos: updateIconPosition });
  ensureGlobalListeners();

  // Initial update
  updateIconPosition();
}

/**
 * Enhance all inputs on the page
 */
export function enhanceInputs(): void {
  const inputs = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="url"], input[type="date"], input[type="file"], input:not([type]), textarea, select'
  );

  let fileInputCount = 0;
  inputs.forEach((input) => {
    if (input instanceof HTMLInputElement) {
      if (
        input.type === "password" ||
        input.type === "hidden" ||
        input.type === "radio" ||
        input.type === "checkbox"
      )
        return;
      if (iconRegistry.has(input)) return;

      const rect = input.getBoundingClientRect();

      // For file inputs, handle hidden inputs differently
      if (input.type === "file") {
        fileInputCount++;
        console.log(
          "📁 Found file input:",
          input.id || input.name || "unnamed",
          "Accept:",
          input.accept || "any",
          "Hidden:",
          rect.width === 0
        );

        // For hidden file inputs, try to find associated label or button
        if (rect.width === 0 || rect.height === 0) {
          handleHiddenFileInput(input);
        } else {
          addIconToInput(input);
        }
      } else {
        // For non-file inputs, skip if not visible
        if (rect.width === 0 || rect.height === 0) return;
        addIconToInput(input);
        fileInputCount++;
      }
    } else if (
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLSelectElement
    ) {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (!iconRegistry.has(input)) {
        addIconToInput(input);
      }
    }
  });

  if (fileInputCount > 0) {
    console.log(`✅ Smart Autofill: Enhanced ${fileInputCount} file input(s)`);
  }

  // Check if we should show Fill All button
  checkAndShowFillAllButton();
}

/**
 * Setup keyboard shortcuts
 */
export function setupKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    // Alt+` for individual input
    if (e.altKey && e.key === "`") {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT")
      ) {
        const input = activeElement as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        if (
          input instanceof HTMLInputElement &&
          (input.type === "password" || input.type === "hidden")
        ) {
          return;
        }
        e.preventDefault();
        currentInput = input;
        createSuggestionBox(input);
      }
    }

    // Ctrl+F for Fill All
    if (e.ctrlKey && e.key === "f") {
      const inputs = getAllFillableInputs();
      if (inputs.length >= 2) {
        e.preventDefault();
        fillAllInputs();
      }
    }
  });
}
