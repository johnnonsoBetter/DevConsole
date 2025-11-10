/**
 * Unsplash Service for Autofill Extension
 * Fetches and caches images from Unsplash API
 */

import { loadUnsplashConfig } from '../../utils/extensionSettings';
import { checkAndShowFillAllButton, closeSuggestionBox, showConfirmationMessage } from './uiManager';

// Configuration
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Cache for Unsplash images
const imageCache = new Map<string, UnsplashImage[]>();

/**
 * Get Unsplash access key from settings
 * Throws error if no key is configured
 */
async function getUnsplashAccessKey(): Promise<string> {
  try {
    const config = await loadUnsplashConfig();
    if (!config?.accessKey) {
      throw new Error('Unsplash access key not configured. Please add your key in DevConsole Settings.');
    }
    return config.accessKey;
  } catch (error) {
    console.error('Failed to load Unsplash access key:', error);
    throw error;
  }
}

export interface UnsplashImage {
  url: string;
  thumbnail: string;
  description: string;
  photographer: string;
  downloadUrl: string;
}

/**
 * Fetch images from Unsplash
 */
export async function fetchUnsplashImages(query: string = 'random', count: number = 6): Promise<UnsplashImage[]> {
  const cacheKey = `${query}-${count}`;
  
  // Check cache first
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  
  try {
    const accessKey = await getUnsplashAccessKey();
    const response = await fetch(
      `${UNSPLASH_API_URL}/photos/random?query=${encodeURIComponent(query)}&count=${count}&client_id=${accessKey}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unsplash API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const images: UnsplashImage[] = data.map((img: any) => ({
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
    // Show user-friendly error message
    if (error instanceof Error && error.message.includes('not configured')) {
      console.warn('💡 Tip: Configure your Unsplash API key in DevConsole Settings > Unsplash Integration');
    }
    return [];
  }
}

/**
 * Convert image URL to File object
 */
export async function urlToFile(url: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error converting URL to file:', error);
    return null;
  }
}

/**
 * Get search query for image input
 */
export function getImageSearchQuery(input: HTMLInputElement): string {
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const type = (input.type || '').toLowerCase();
  const accept = (input.accept || '').toLowerCase();
  const label = input.closest('label')?.textContent?.toLowerCase() || '';
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

/**
 * Fill image input with file from Unsplash
 */
export async function fillImageInput(
  input: HTMLInputElement,
  imageData: UnsplashImage,
  showConfirmation: boolean = true
): Promise<void> {
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