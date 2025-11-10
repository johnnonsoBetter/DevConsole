(function() {
  'use strict';

  let currentInput = null;
  let suggestionBox = null;
  let fillAllButton = null;
  const iconElements = new WeakMap();
  
  // DataStore instance (initialized from datastore.js)
  let dataStore = null;
  let currentDataset = null;

  // Unsplash API configuration
  const UNSPLASH_ACCESS_KEY = 'HnMNrlNY_fopvct5jXNSytrBkCUEH9kBEdPQXt92Gh4'
  const UNSPLASH_API_URL = 'https://api.unsplash.com';
  
  // Cache for Unsplash images
  const imageCache = new Map();

  /**
   * Get suggestions for a field type from all available datasets
   */
  function getSuggestionsForField(fieldType) {
    if (!dataStore || !dataStore.initialized) {
      // Fallback to static suggestions if dataStore not ready
      return getStaticSuggestions(fieldType);
    }

    const allDatasets = dataStore.getAllDatasets();
    const suggestions = [];
    
    allDatasets.forEach(dataset => {
      const value = dataStore.getFieldData(dataset, fieldType);
      if (value && !suggestions.includes(value)) {
        suggestions.push(value);
      }
    });

    // Limit to 6 suggestions for UI
    return suggestions.slice(0, 6);
  }

  /**
   * Fallback static suggestions (used when dataStore is not initialized)
   */
  function getStaticSuggestions(fieldType) {
    const staticSuggestions = {
      email: ['john.doe@example.com', 'jane.smith@company.com', 'contact@business.com'],
      name: ['John Doe', 'Jane Smith', 'Alex Johnson'],
      firstName: ['John', 'Jane', 'Alex'],
      lastName: ['Doe', 'Smith', 'Johnson'],
      phone: ['+1 (555) 123-4567', '+1 (555) 987-6543', '+1 (555) 456-7890'],
      address: ['123 Main Street', '456 Oak Avenue', '789 Pine Road'],
      city: ['New York', 'San Francisco', 'Austin', 'Seattle'],
      state: ['NY', 'CA', 'TX', 'WA'],
      zip: ['10001', '94102', '78701', '98101'],
      country: ['United States', 'United Kingdom', 'Canada', 'Australia'],
      company: ['Tech Corp', 'Innovation Labs', 'Digital Solutions Inc.'],
      title: ['Software Engineer', 'Product Manager', 'UX Designer'],
      website: ['https://example.com', 'https://company.com', 'https://website.com'],
      message: [
        "I'm interested in learning more about this opportunity.",
        "Thank you for reaching out. I'd love to connect.",
        "Could we schedule a time to discuss this further?"
      ],
      default: ['Sample text', 'Example content', 'Test data']
    };
    
    return staticSuggestions[fieldType] || staticSuggestions.default;
  }

  // Fetch images from Unsplash
  async function fetchUnsplashImages(query = 'random', count = 3) {
    const cacheKey = `${query}-${count}`;
    
    // Check cache first
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey);
    }
    
    try {
      const response = await fetch(
        `${UNSPLASH_API_URL}/photos/random?query=${encodeURIComponent(query)}&count=${count}&client_id=${UNSPLASH_ACCESS_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch images from Unsplash');
      }
      
      const data = await response.json();
      const images = data.map(img => ({
        url: img.urls.regular,
        thumbnail: img.urls.thumb,
        description: img.alt_description || img.description || 'Unsplash Image',
        photographer: img.user.name,
        downloadUrl: img.links.download_location
      }));
      
      // Cache the results
      imageCache.set(cacheKey, images);
      
      return images;
    } catch (error) {
      console.error('Error fetching Unsplash images:', error);
      return [];
    }
  }

  // Convert image URL to File object
  async function urlToFile(url, filename) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      console.error('Error converting URL to file:', error);
      return null;
    }
  }

  // Detect input type
  function detectInputType(input) {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const type = (input.type || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    const combined = `${name} ${id} ${placeholder} ${ariaLabel}`;
    const accept = (input.accept || '').toLowerCase();

    // Image file input
    if (type === 'file' && (accept.includes('image') || combined.includes('image') || combined.includes('photo') || combined.includes('picture'))) {
      return 'image';
    }

    // Email
    if (type === 'email' || combined.includes('email')) return 'email';
    
    // Phone
    if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile')) return 'phone';
    if(combined.includes('number')) return 'number';
    if(combined.includes('text')) return 'text';
    // Name fields
    if (combined.includes('firstname') || combined.includes('first-name') || combined.includes('first_name')) return 'firstName';
    if (combined.includes('lastname') || combined.includes('last-name') || combined.includes('last_name')) return 'lastName';
    if (combined.includes('fullname') || combined.includes('full-name') || combined.includes('full_name')) return 'name';
    if (combined.includes('name') && !combined.includes('user')) return 'name';
    
    // Address fields
    if (combined.includes('address') || combined.includes('street')) return 'address';
    if (combined.includes('city')) return 'city';
    if (combined.includes('state') || combined.includes('province')) return 'state';
    if (combined.includes('zip') || combined.includes('postal')) return 'zip';
    if (combined.includes('country')) return 'country';
    
    // Other field  s
    if (combined.includes('company') || combined.includes('organization')) return 'company';
    if (combined.includes('title') || combined.includes('position') || combined.includes('role')) return 'title';
    if (combined.includes('website') || combined.includes('url')) return 'website';
    if (combined.includes('message') || combined.includes('comment') || combined.includes('description') || input.tagName === 'TEXTAREA') return 'message';
    
    if (type === 'text' || type === 'textarea')
      return 'text';

    if(type === 'number') 
      return 'number';
    return 'default';
  }

  // Get search query for image input
  function getImageSearchQuery(input) {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const type = (input.type || '').toLowerCase();
    const accept = (input.accept || '').toLowerCase();
    const label = input.closest('label')?.textContent.toLowerCase() || '';
    const placeholder = (input.placeholder || '').toLowerCase();
    const combined = `${name} ${id} ${label} ${placeholder} ${type} ${accept} `;
    
    // Try to determine context
    if (combined.includes('profile') || combined.includes('avatar')) return 'portrait face';
    if (combined.includes('cover') || combined.includes('banner')) return 'landscape nature';
    if (combined.includes('product')) return 'product';
    if (combined.includes('logo')) return 'logo design';
    if (combined.includes('background')) return 'abstract background';
    
    return 'random'; // Default
  }

  // Get all fillable inputs on the page
  function getAllFillableInputs() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="file"], input:not([type]),  textarea'); 
    
    const fillableInputs = [];
    
    inputs.forEach(input => {
      if (input.type === 'password' || input.type === 'hidden') return;
      
      // For file inputs, include even if hidden (common pattern)
      if (input.type === 'file') {
        if (!input.disabled) {
          fillableInputs.push(input);
        }
        return;
      }
      
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      // Check if input is visible and not disabled
      if (input.offsetParent !== null && !input.disabled && !input.readOnly) {
        fillableInputs.push(input);
      }
    });
    
    return fillableInputs;
  }

  // Fill all inputs on the page
  async function fillAllInputs() {
    const inputs = getAllFillableInputs();
    let filledCount = 0;
    
    // Initialize dataStore if needed
    if (!dataStore) {
      dataStore = window.AutofillDataStore;
      await dataStore.initialize();
    }

    // Generate form fingerprint and select dataset
    const formFingerprint = dataStore.generateFormFingerprint(inputs);
    currentDataset = dataStore.selectDataset(formFingerprint);

    if (!currentDataset) {
      console.error('❌ No dataset available for filling');
      return;
    }

    console.log(`🎯 Using dataset: ${currentDataset.name} for this form`);
    
    for (const input of inputs) {
      const inputType = detectInputType(input);
      
      if (inputType === 'image') {
        // Handle image inputs
        const query = getImageSearchQuery(input);
        const images = await fetchUnsplashImages(query, 1);
        if (images.length > 0) {
          await fillImageInput(input, images[0], false);
          filledCount++;
        }
      } else {
        // Get value from selected dataset
        const value = dataStore.getFieldData(currentDataset, inputType);
        if (value) {
          fillInput(input, value, false); // false = don't show individual confirmations
          filledCount++;
        }
      }
    }
    
    // Show summary confirmation with dataset name
    if (filledCount > 0) {
      showFillAllConfirmation(filledCount, currentDataset.name);
      
      // Hide the Fill All button after filling
      if (fillAllButton) {
        fillAllButton.style.opacity = '0';
        setTimeout(() => {
          if (fillAllButton && fillAllButton.parentNode) {
            fillAllButton.remove();
            fillAllButton = null;
          }
        }, 300);
      }
      
      // Re-check inputs after a delay to show button again if needed
      setTimeout(checkAndShowFillAllButton, 2000);
    }
  }

  // Show Fill All button
  function showFillAllButton() {
    if (fillAllButton && document.body.contains(fillAllButton)) return;
    
    fillAllButton = document.createElement('button');
    fillAllButton.className = 'autofill-fill-all-button';
    fillAllButton.type = 'button';
    fillAllButton.setAttribute('aria-label', 'Fill All Fields');
    fillAllButton.setAttribute('title', 'Fill All Fields');
    fillAllButton.setAttribute('role', 'button');
    fillAllButton.setAttribute('id', 'autofill-fill-all-button' + Date.now());
    fillAllButton.innerHTML = `
      <svg class="fill-all-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
      <span class="fill-all-text">Fill All Fields</span>
      <span class="fill-all-count"></span>
    `;

    
    document.body.appendChild(fillAllButton);
    
    // Update count
    const inputs = getAllFillableInputs();
    const emptyInputs = inputs.filter(input => !input.value.trim());
    const countSpan = fillAllButton.querySelector('.fill-all-count');
    if (emptyInputs.length > 0) {
      countSpan.textContent = `(${emptyInputs.length})`;
    }
    
    // Add click handler
    fillAllButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fillAllInputs();
    });
    
    // Animate in
    setTimeout(() => {
      fillAllButton.classList.add('visible');
    }, 100);
  }

  // Check if we should show Fill All button
  function checkAndShowFillAllButton() {
    const inputs = getAllFillableInputs();
    const emptyInputs = inputs.filter(input => !input.value.trim());
    
    // Only show if there are 2 or more empty inputs
    if (emptyInputs.length >= 2) {
      showFillAllButton();
    } else if (fillAllButton) {
      fillAllButton.style.opacity = '0';
      setTimeout(() => {
        if (fillAllButton && fillAllButton.parentNode) {
          fillAllButton.remove();
          fillAllButton = null;
        }
      }, 300);
    }
  }

  // Show confirmation for Fill All
  function showFillAllConfirmation(count, datasetName) {
    const confirmation = document.createElement('div');
    confirmation.className = 'autofill-fill-all-confirmation';
    confirmation.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/>
      </svg>
      <div>
        <span>Filled ${count} field${count > 1 ? 's' : ''} successfully!</span>
        ${datasetName ? `<div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Using: ${datasetName}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
      confirmation.classList.add('visible');
    }, 100);
    
    setTimeout(() => {
      confirmation.classList.remove('visible');
      setTimeout(() => confirmation.remove(), 300);
    }, 3000);
  }

  // Create suggestion box for images
  async function createImageSuggestionBox(input) {
    if (suggestionBox) {
      suggestionBox.remove();
    }

    suggestionBox = document.createElement('div');
    suggestionBox.className = 'autofill-suggestion-box autofill-image-box';
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
    suggestionBox.style.position = 'absolute';
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
          ${images.map((img, i) => `
            <div class="autofill-image-option" data-index="${i}">
              <img src="${img.thumbnail}" alt="${escapeHtml(img.description)}">
              <div class="autofill-image-overlay">
                <span>${escapeHtml(img.description)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="autofill-image-credit">Photos by Unsplash photographers</div>
      `;
      
      suggestionBox.querySelectorAll('.autofill-image-option').forEach((option, index) => {
        option.addEventListener('click', async (e) => {
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
      document.addEventListener('click', handleOutsideClick);
    }, 0);
  }

  // Create suggestion box
  async function createSuggestionBox(input) {
    if (suggestionBox) {
      suggestionBox.remove();
    }

    // Initialize dataStore if needed
    if (!dataStore) {
      dataStore = window.AutofillDataStore;
      await dataStore.initialize();
    }

    const inputType = detectInputType(input);
    
    // Handle image inputs differently
    if (inputType === 'image') {
      await createImageSuggestionBox(input);
      return;
    }

    const inputSuggestions = getSuggestionsForField(inputType);

    suggestionBox = document.createElement('div');
    suggestionBox.className = 'autofill-suggestion-box';
    suggestionBox.innerHTML = `
      <div class="autofill-header">
        <svg class="autofill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span class="autofill-title">Quick Fill</span>
      </div>
      <div class="autofill-suggestions">
        ${inputSuggestions.map((suggestion, i) => `
          <button class="autofill-btn" data-index="${i}">
            ${escapeHtml(suggestion)}
          </button>
        `).join('')}
      </div>
    `;

    const rect = input.getBoundingClientRect();
    suggestionBox.style.position = 'absolute';
    suggestionBox.style.top = `${rect.bottom + window.scrollY + 8}px`;
    suggestionBox.style.left = `${rect.left + window.scrollX}px`;
    suggestionBox.style.minWidth = `${Math.max(rect.width, 250)}px`;

    document.body.appendChild(suggestionBox);

    suggestionBox.querySelectorAll('.autofill-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fillInput(input, inputSuggestions[index]);
      });
    });

    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
  }

  function handleOutsideClick(e) {
    if (suggestionBox && !suggestionBox.contains(e.target) && e.target !== currentInput) {
      closeSuggestionBox();
    }
  }

  function closeSuggestionBox() {
    if (suggestionBox) {
      suggestionBox.remove();
      suggestionBox = null;
      document.removeEventListener('click', handleOutsideClick);
    }
  }

  // Fill image input
  async function fillImageInput(input, imageData, showConfirmation = true) {
    try {
      // Download the image and convert to File
      const file = await urlToFile(imageData.url, `unsplash-${Date.now()}.jpg`);
      
      if (file) {
        // Create a DataTransfer object to set files
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // Trigger events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        closeSuggestionBox();
        
        if (showConfirmation) {
          showConfirmationMessage(input, 'Image loaded');
        }
        
        // Re-check if we should show/hide Fill All button
        setTimeout(checkAndShowFillAllButton, 100);
      }
    } catch (error) {
      console.error('Error filling image input:', error);
      showConfirmationMessage(input, 'Error loading image', true);
    }
  }

  function fillInput(input, value, showConfirmation = true) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    closeSuggestionBox();
    
    if (showConfirmation) {
      showConfirmationMessage(input);
    }
    
    // Re-check if we should show/hide Fill All button
    setTimeout(checkAndShowFillAllButton, 100);
  }

  function showConfirmationMessage(input, message = '✓ Filled', isError = false) {
    const confirmation = document.createElement('div');
    confirmation.className = `autofill-confirmation ${isError ? 'autofill-error' : ''}`;
    confirmation.textContent = message;
    
    const rect = input.getBoundingClientRect();
    confirmation.style.position = 'absolute';
    confirmation.style.top = `${rect.top + window.scrollY - 30}px`;
    confirmation.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
      confirmation.style.opacity = '0';
      setTimeout(() => confirmation.remove(), 300);
    }, 1500);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function handleHiddenFileInput(input) {
    // For hidden file inputs, find the associated label or custom button
    let targetElement = null;
    
    // Try to find label with for attribute
    if (input.id) {
      targetElement = document.querySelector(`label[for="${input.id}"]`);
    }
    
    // If no label found, try parent or sibling elements
    if (!targetElement) {
      // Check if parent is a label
      const parent = input.parentElement;
      if (parent && parent.tagName === 'LABEL') {
        targetElement = parent;
      } else if (parent) {
        // Look for a button or clickable element near the input
        targetElement = parent.querySelector('button, [role="button"], .button, .btn');
      }
    }
    
    // If we found a target, add icon to it
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log('📌 Using associated element for hidden file input:', targetElement.tagName, targetElement.className);
        addIconToElement(input, targetElement);
        return;
      }
    }
    
    // If no visible target found, still track the input for "Fill All"
    console.log('⚠️ Hidden file input with no visible trigger found, adding to fill-all only');
    // Store reference for Fill All functionality
    iconElements.set(input, null);
  }

  function addIconToElement(input, targetElement) {
    // Add icon next to a target element (used for hidden file inputs)
    if (iconElements.has(input)) return;
    
    const icon = document.createElement('div');
    icon.className = 'autofill-trigger-icon';
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    `;
    
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentInput = input;
      createSuggestionBox(input);
    });
    
    document.body.appendChild(icon);
    iconElements.set(input, icon);
    
    const updateIconPosition = () => {
      if (!document.contains(targetElement)) {
        icon.remove();
        iconElements.delete(input);
        return;
      }
      const rect = targetElement.getBoundingClientRect();
      icon.style.position = 'absolute';
      icon.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;
      icon.style.left = `${rect.right + window.scrollX - 35}px`;
      icon.style.zIndex = '2147483646';
      icon.style.display = 'flex';
    };
    
    updateIconPosition();
    window.addEventListener('scroll', updateIconPosition, true);
    window.addEventListener('resize', updateIconPosition);
  }

  function addIconToInput(input) {
    if (iconElements.has(input)) return;
    
    const isFileInput = input.type === 'file';
    
    const icon = document.createElement('div');
    icon.className = 'autofill-trigger-icon';
    
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
    
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentInput = input;
      createSuggestionBox(input);
    });
    
    document.body.appendChild(icon);
    iconElements.set(input, icon);
    
    const updateIconPosition = () => {
      if (!document.contains(input)) {
        icon.remove();
        iconElements.delete(input);
        return;
      }
      const rect = input.getBoundingClientRect();
      icon.style.position = 'absolute';
      icon.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;
      
      // For file inputs, position the icon at the right edge
      if (isFileInput) {
        icon.style.left = `${rect.right + window.scrollX - 35}px`;
      } else {
        icon.style.left = `${rect.right + window.scrollX - 30}px`;
      }
      
      // Ensure icon is visible
      icon.style.zIndex = '2147483646';
      icon.style.display = 'flex';
    };
    
    updateIconPosition();
    window.addEventListener('scroll', updateIconPosition, true);
    window.addEventListener('resize', updateIconPosition);
  }

  function enhanceInputs() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="file"], input:not([type]), textarea');
    
    let fileInputCount = 0;
    inputs.forEach(input => {
      if (input.type === 'password' || input.type === 'hidden') return;
      if (iconElements.has(input)) return;
      
      const rect = input.getBoundingClientRect();
      
      // For file inputs, we need to handle hidden inputs differently
      // Many modern UIs hide the file input and use a custom button/label
      if (input.type === 'file') {
        fileInputCount++;
        console.log('📁 Found file input:', input.id || input.name || 'unnamed', 'Accept:', input.accept || 'any', 'Hidden:', rect.width === 0);
        
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
      }
    });
    
    if (fileInputCount > 0) {
      console.log(`✅ Smart Autofill: Enhanced ${fileInputCount} file input(s)`);
    }
    
    // Check if we should show Fill All button
    checkAndShowFillAllButton();
  }

  // Initialize DataStore and Extension
  async function initializeExtension() {
    // Initialize DataStore
    dataStore = window.AutofillDataStore;
    if (dataStore) {
      await dataStore.initialize();
      console.log('✅ Smart Autofill DataStore initialized');
    }

    // Enhance inputs
    enhanceInputs();
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }

  const observer = new MutationObserver(() => {
    enhanceInputs();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Monitor input changes to update Fill All button
  document.addEventListener('input', () => {
    setTimeout(checkAndShowFillAllButton, 100);
  }, true);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Alt+S for individual input
    if (e.altKey && e.key === '`') {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        if (activeElement.type !== 'password' && activeElement.type !== 'hidden') {
          e.preventDefault();
          currentInput = activeElement;
          createSuggestionBox(activeElement);
        }
      }
    }
    
    // Alt+F for Fill All
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      fillAllInputs();
    }
  });

})();