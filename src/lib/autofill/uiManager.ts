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
  fillWithScenario,
  runAutofillDemo,
  getAutofillSettings,
  updateAutofillSettings,
} from "./fillLogic";
import { SCENARIO_PRESETS } from "./scenarioPresets";
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
let suggestionBoxPositionCleanup: (() => void) | null = null;
let fillAllOutsideClickHandler: ((e: MouseEvent) => void) | null = null;
// Map input -> { icon: HTMLElement, updatePos: () => void }
const iconRegistry = new Map<
  HTMLElement,
  { icon: HTMLElement; updatePos: () => void }
>();

// Global event listeners for performance (Single listener instead of N listeners)
let globalListenersAttached = false;

/**
 * Cleanup all autofill UI elements
 */
export function cleanupAutofillUI(): void {
  // Remove all icons
  iconRegistry.forEach(({ icon }) => {
    if (icon.parentNode) {
      icon.remove();
    }
  });
  iconRegistry.clear();

  // Remove suggestion box
  if (suggestionBox) {
    suggestionBox.remove();
    suggestionBox = null;
  }
  if (suggestionBoxPositionCleanup) {
    suggestionBoxPositionCleanup();
    suggestionBoxPositionCleanup = null;
  }

  // Remove fill all button
  if (fillAllButton) {
    fillAllButton.remove();
    fillAllButton = null;
  }
  if (fillAllOutsideClickHandler) {
    document.removeEventListener("click", fillAllOutsideClickHandler);
    fillAllOutsideClickHandler = null;
  }

  currentInput = null;
}

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

function getViewportBounds() {
  const left = window.scrollX;
  const top = window.scrollY;
  const right = left + window.innerWidth;
  const bottom = top + window.innerHeight;
  return { left, top, right, bottom };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function positionOverlayNearAnchor(
  overlay: HTMLElement,
  anchorRect: DOMRect,
  {
    gap = 8,
    padding = 8,
    preferredPlacement = "bottom",
  }: { gap?: number; padding?: number; preferredPlacement?: "bottom" | "top" } = {}
) {
  const viewport = getViewportBounds();
  const overlayRect = overlay.getBoundingClientRect();

  let top =
    preferredPlacement === "top"
      ? anchorRect.top + window.scrollY - overlayRect.height - gap
      : anchorRect.bottom + window.scrollY + gap;

  // Flip if needed
  if (top + overlayRect.height > viewport.bottom - padding) {
    top = anchorRect.top + window.scrollY - overlayRect.height - gap;
  }
  if (top < viewport.top + padding) {
    top = anchorRect.bottom + window.scrollY + gap;
  }

  let left = anchorRect.left + window.scrollX;
  left = clamp(left, viewport.left + padding, viewport.right - overlayRect.width - padding);
  top = clamp(top, viewport.top + padding, viewport.bottom - overlayRect.height - padding);

  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;
}

function calculateIconPosition(anchorRect: DOMRect, iconSize = 20, padding = 8) {
  const viewport = getViewportBounds();
  const desiredTop =
    anchorRect.top + window.scrollY + (anchorRect.height - iconSize) / 2;
  const top = clamp(desiredTop, viewport.top + padding, viewport.bottom - iconSize - padding);

  const outsideRight = anchorRect.right + window.scrollX + 6;
  const insideRight = anchorRect.right + window.scrollX - iconSize - 6;
  const outsideLeft = anchorRect.left + window.scrollX - iconSize - 6;

  const fits = (x: number) => x >= viewport.left + padding && x <= viewport.right - iconSize - padding;

  let left: number;
  if (fits(outsideRight)) {
    left = outsideRight;
  } else if (fits(insideRight)) {
    left = insideRight;
  } else if (fits(outsideLeft)) {
    left = outsideLeft;
  } else {
    left = clamp(insideRight, viewport.left + padding, viewport.right - iconSize - padding);
  }

  return { left, top };
}

function formatFieldTypeLabel(type: string) {
  const overrides: Record<string, string> = {
    firstName: "First name",
    lastName: "Last name",
    zip: "ZIP code",
    tel: "Phone",
    phone: "Phone",
    website: "Website",
    url: "Website",
    message: "Message",
    company: "Company",
    city: "City",
    state: "State",
    country: "Country",
    email: "Email",
    name: "Full name",
    number: "Number",
    date: "Date",
    image: "Image",
    text: "Text",
  };

  if (overrides[type]) return overrides[type];

  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
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
  if (suggestionBoxPositionCleanup) {
    suggestionBoxPositionCleanup();
    suggestionBoxPositionCleanup = null;
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

  // Determine query early so we can show it in the header
  const query = getImageSearchQuery(input);

  suggestionBox.innerHTML = `
    <div class="autofill-header">
      <div class="autofill-header-left">
        <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <div class="autofill-header-text">
          <span class="autofill-title">Unsplash Images</span>
          <span class="autofill-subtitle">${escapeHtml(query)}</span>
        </div>
      </div>
      <button class="autofill-close-btn" type="button" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18"/>
          <path d="M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="autofill-image-loading">Loading images...</div>
  `;

  const rect = input.getBoundingClientRect();
  suggestionBox.style.position = "absolute";
  suggestionBox.style.minWidth = `${Math.max(rect.width, 350)}px`;

  document.body.appendChild(suggestionBox);
  positionOverlayNearAnchor(suggestionBox, rect, { gap: 10 });

  if (suggestionBoxPositionCleanup) {
    suggestionBoxPositionCleanup();
  }
  suggestionBoxPositionCleanup = (() => {
    const update = () => {
      if (!suggestionBox) return;
      if (!document.contains(input)) {
        closeSuggestionBox();
        return;
      }
      positionOverlayNearAnchor(suggestionBox, input.getBoundingClientRect(), { gap: 10 });
    };

    const scheduleUpdate = () => requestAnimationFrame(update);
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  })();

  const closeBtn = suggestionBox.querySelector(".autofill-close-btn");
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeSuggestionBox();
  });

  // Fetch images
  const images = await fetchUnsplashImages(query, 6);

  if (images.length > 0) {
    suggestionBox.innerHTML = `
      <div class="autofill-header">
        <div class="autofill-header-left">
          <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <div class="autofill-header-text">
            <span class="autofill-title">Unsplash Images</span>
            <span class="autofill-subtitle">${escapeHtml(query)}</span>
          </div>
        </div>
        <button class="autofill-close-btn" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
        </button>
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
    requestAnimationFrame(() => {
      if (!suggestionBox) return;
      positionOverlayNearAnchor(suggestionBox, input.getBoundingClientRect(), { gap: 10 });
    });

    const closeBtn = suggestionBox.querySelector(".autofill-close-btn");
    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSuggestionBox();
    });

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
        <div class="autofill-header-left">
          <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <div class="autofill-header-text">
            <span class="autofill-title">Image Suggestions</span>
            <span class="autofill-subtitle">${escapeHtml(query)}</span>
          </div>
        </div>
        <button class="autofill-close-btn" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="autofill-image-error">
        Unable to load images. Please check your Unsplash API key.
      </div>
    `;
    requestAnimationFrame(() => {
      if (!suggestionBox) return;
      positionOverlayNearAnchor(suggestionBox, input.getBoundingClientRect(), { gap: 10 });
    });

    const closeBtn = suggestionBox.querySelector(".autofill-close-btn");
    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSuggestionBox();
    });
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
  suggestionBox.setAttribute("role", "dialog");
  suggestionBox.setAttribute("aria-label", "Smart Autofill suggestions");
  suggestionBox.innerHTML = `
    <div class="autofill-header">
      <div class="autofill-header-left">
        <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
	        <div class="autofill-header-text">
	          <span class="autofill-title">Smart Autofill</span>
	          <span class="autofill-subtitle">${escapeHtml(formatFieldTypeLabel(String(inputType)))}</span>
	        </div>
	      </div>
      <button class="autofill-close-btn" type="button" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18"/>
          <path d="M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="autofill-suggestions" role="listbox" aria-label="Suggestions">
      ${inputSuggestions
        .map(
          (suggestion, i) => `
        <button class="autofill-btn" type="button" data-index="${i}" role="option">
          <span class="autofill-btn-index">${i + 1}</span>
          <span class="autofill-btn-text">${escapeHtml(suggestion)}</span>
        </button>
      `
        )
        .join("")}
    </div>
	    <div class="autofill-footer">
	      <span class="autofill-hint">
	        <span class="autofill-kbd">Alt</span>+<span class="autofill-kbd">&#96;</span> suggestions · <span class="autofill-kbd">Ctrl</span>+<span class="autofill-kbd">F</span> fill all
	      </span>
	    </div>
	  `;

  const rect = input.getBoundingClientRect();
  suggestionBox.style.position = "absolute";
  suggestionBox.style.minWidth = `${Math.max(rect.width, 280)}px`;

  document.body.appendChild(suggestionBox);
  positionOverlayNearAnchor(suggestionBox, rect, { gap: 10 });

  if (suggestionBoxPositionCleanup) {
    suggestionBoxPositionCleanup();
  }
  suggestionBoxPositionCleanup = (() => {
    const update = () => {
      if (!suggestionBox) return;
      if (!document.contains(input)) {
        closeSuggestionBox();
        return;
      }
      positionOverlayNearAnchor(suggestionBox, input.getBoundingClientRect(), { gap: 10 });
    };

    const scheduleUpdate = () => requestAnimationFrame(update);
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  })();

  const closeBtn = suggestionBox.querySelector(".autofill-close-btn");
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeSuggestionBox();
  });

  suggestionBox.querySelectorAll(".autofill-btn").forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fillInput(input, inputSuggestions[index]);
    });
  });

  const suggestionButtons = Array.from(
    suggestionBox.querySelectorAll<HTMLButtonElement>(".autofill-btn")
  );
  if (suggestionButtons.length > 0) {
    requestAnimationFrame(() => {
      suggestionButtons[0]?.focus({ preventScroll: true });
    });
  }

  suggestionBox.addEventListener("keydown", (e) => {
    if (!suggestionBox) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeSuggestionBox();
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
      return;
    }

    const activeEl = document.activeElement as HTMLElement | null;
    const currentIndex = suggestionButtons.findIndex((b) => b === activeEl);
    const hasFocusInList = currentIndex >= 0;
    const startIndex = hasFocusInList ? currentIndex : 0;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (startIndex + delta + suggestionButtons.length) % suggestionButtons.length;
      suggestionButtons[nextIndex]?.focus({ preventScroll: true });
    }

    if (e.key === "Enter" || e.key === " ") {
      if (!hasFocusInList) return;
      e.preventDefault();
      e.stopPropagation();
      suggestionButtons[startIndex]?.click();
    }
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
      // If it was hidden previously, re-show
      fillAllButton.classList.add("visible");
    }
  } else if (fillAllButton) {
    fillAllButton.classList.remove("visible");

    if (fillAllOutsideClickHandler) {
      document.removeEventListener("click", fillAllOutsideClickHandler);
      fillAllOutsideClickHandler = null;
    }

    setTimeout(() => {
      if (fillAllButton && fillAllButton.parentNode) {
        fillAllButton.remove();
        fillAllButton = null;
      }
    }, 300);
  }
}

/**
 * Show Fill All button with enhanced dropdown menu
 */
function showFillAllButton(): void {
  if (fillAllButton && document.body.contains(fillAllButton)) return;

  const settings = getAutofillSettings();

  fillAllButton = document.createElement("div");
  fillAllButton.className = "autofill-fill-all-container";
  fillAllButton.setAttribute("id", "autofill-fill-all-container" + Date.now());
  
  const inputs = getAllFillableInputs();
  const inputCount = inputs.length;

	  fillAllButton.innerHTML = `
	    <button class="autofill-fill-all-button" type="button" aria-label="Fill All Fields" title="Fill All Fields (Ctrl+F)" role="button">
	      <svg class="fill-all-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
	        <path d="M9 11l3 3L22 4"/>
	        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
	      </svg>
	      <span class="fill-all-label">Fill</span>
	      <span class="fill-all-count">${inputCount}</span>
	    </button>
	    <button class="autofill-dropdown-toggle" type="button" aria-label="More options" title="Autofill Options">
	      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
	        <path d="M6 9l6 6 6-6"/>
	      </svg>
	    </button>
    <div class="autofill-dropdown-menu" role="menu" aria-hidden="true">
      <div class="autofill-menu-section">
        <div class="autofill-menu-label">Quick Fill</div>
        <button class="autofill-menu-item" data-action="fill-instant" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span>Instant Fill</span>
        </button>
        <button class="autofill-menu-item" data-action="fill-animated" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          <span>Animated Fill</span>
        </button>
        <button class="autofill-menu-item" data-action="demo" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>Demo Mode</span>
        </button>
      </div>
      <div class="autofill-menu-divider"></div>
      <div class="autofill-menu-section">
        <div class="autofill-menu-label">Test Scenarios</div>
        ${SCENARIO_PRESETS.map(scenario => `
          <button class="autofill-menu-item" data-action="scenario" data-scenario="${scenario.id}" role="menuitem" title="${scenario.description}">
            <span class="scenario-icon">${getScenarioIcon(scenario.id)}</span>
            <span>${scenario.name}</span>
          </button>
        `).join('')}
      </div>
      <div class="autofill-menu-divider"></div>
      <div class="autofill-menu-section">
        <div class="autofill-menu-label">Typing Speed</div>
        <div class="autofill-speed-options">
          <button class="autofill-speed-btn ${settings.typingSpeed === 'instant' ? 'active' : ''}" data-speed="instant" title="Instant">⚡</button>
          <button class="autofill-speed-btn ${settings.typingSpeed === 'fast' ? 'active' : ''}" data-speed="fast" title="Fast">🏃</button>
          <button class="autofill-speed-btn ${settings.typingSpeed === 'normal' ? 'active' : ''}" data-speed="normal" title="Normal">🚶</button>
          <button class="autofill-speed-btn ${settings.typingSpeed === 'slow' ? 'active' : ''}" data-speed="slow" title="Slow">🐌</button>
        </div>
      </div>
      <div class="autofill-menu-divider"></div>
      <div class="autofill-menu-section">
        <label class="autofill-toggle-row">
          <span>Enable Typing Animation</span>
          <input type="checkbox" class="autofill-toggle" data-setting="enableTypingAnimation" ${settings.enableTypingAnimation ? 'checked' : ''}>
        </label>
        <label class="autofill-toggle-row">
          <span>Enable Typos</span>
          <input type="checkbox" class="autofill-toggle" data-setting="enableTypos" ${settings.enableTypos ? 'checked' : ''}>
        </label>
      </div>
      <div class="autofill-menu-divider"></div>
      <div class="autofill-menu-section">
        <div class="autofill-menu-label">AI Features</div>
        <label class="autofill-toggle-row autofill-ai-toggle">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ai-icon">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
            </svg>
            Use AI for Text Fields
          </span>
          <input type="checkbox" class="autofill-toggle" data-setting="useAI" ${settings.useAI ? 'checked' : ''}>
        </label>
        <p class="autofill-ai-hint">Uses AI from Settings → AI Providers</p>
      </div>
    </div>
  `;

  document.body.appendChild(fillAllButton);

  // Setup event handlers
  const mainButton = fillAllButton.querySelector('.autofill-fill-all-button') as HTMLButtonElement;
  const dropdownToggle = fillAllButton.querySelector('.autofill-dropdown-toggle') as HTMLButtonElement;
  const dropdownMenu = fillAllButton.querySelector('.autofill-dropdown-menu') as HTMLDivElement;

  // Main fill button
  mainButton?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fillAllInputs();
    closeDropdown();
  });

  // Dropdown toggle
  dropdownToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdownMenu?.classList.contains('open');
    if (isOpen) {
      closeDropdown();
    } else {
      dropdownMenu?.classList.add('open');
      dropdownMenu?.setAttribute('aria-hidden', 'false');
    }
  });

  // Menu items
  fillAllButton.querySelectorAll('.autofill-menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = (item as HTMLElement).dataset.action;
      const scenarioId = (item as HTMLElement).dataset.scenario;

      closeDropdown();

      switch (action) {
        case 'fill-instant':
          await fillAllInputs({ animated: false });
          break;
        case 'fill-animated':
          await fillAllInputs({ animated: true });
          break;
        case 'demo':
          await runAutofillDemo();
          break;
        case 'scenario':
          if (scenarioId) {
            await fillWithScenario(scenarioId, getAutofillSettings().enableTypingAnimation);
          }
          break;
      }
    });
  });

  // Speed buttons
  fillAllButton.querySelectorAll('.autofill-speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const speed = (btn as HTMLElement).dataset.speed as 'instant' | 'fast' | 'normal' | 'slow';
      updateAutofillSettings({ typingSpeed: speed });
      // Update active state
      fillAllButton?.querySelectorAll('.autofill-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Toggle switches
  fillAllButton.querySelectorAll('.autofill-toggle').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const setting = (toggle as HTMLElement).dataset.setting as 'enableTypingAnimation' | 'enableTypos';
      const checked = (toggle as HTMLInputElement).checked;
      updateAutofillSettings({ [setting]: checked });
    });
  });

	  // Close dropdown when clicking outside
	  const closeDropdown = () => {
	    dropdownMenu?.classList.remove('open');
	    dropdownMenu?.setAttribute('aria-hidden', 'true');
	  };

	  if (fillAllOutsideClickHandler) {
	    document.removeEventListener('click', fillAllOutsideClickHandler);
	  }
	  fillAllOutsideClickHandler = (e: MouseEvent) => {
	    if (fillAllButton && !fillAllButton.contains(e.target as Node)) {
	      closeDropdown();
	    }
	  };
	  document.addEventListener('click', fillAllOutsideClickHandler);

  // Animate in
  setTimeout(() => {
    if (fillAllButton) {
      fillAllButton.classList.add("visible");
    }
  }, 100);
}

/**
 * Get icon for scenario type
 */
function getScenarioIcon(scenarioId: string): string {
  const icons: Record<string, string> = {
    'happy-path': '✅',
    'edge-cases': '🔧',
    'validation': '❌',
    'i18n': '🌍',
    'accessibility': '♿',
    'security': '🔒',
    'boundary': '📏',
  };
  return icons[scenarioId] || '📋';
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

    const { left, top } = calculateIconPosition(rect, 20, 8);
    icon.style.position = "absolute";
    icon.style.top = `${top}px`;
    icon.style.left = `${left}px`;
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

    const { left, top } = calculateIconPosition(rect, 20, 8);
    icon.style.position = "absolute";
    icon.style.top = `${top}px`;
    icon.style.left = `${left}px`;

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
  document.addEventListener("keydown", async (e) => {
    // Check if autofill is enabled
    const { getIsAutofillEnabled } = await import("./index");
    if (!getIsAutofillEnabled()) return;

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
