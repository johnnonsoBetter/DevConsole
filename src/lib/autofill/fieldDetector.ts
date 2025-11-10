/**
 * Field Detector for Autofill Extension
 * Detects 15+ field types from input attributes
 */

import type { FieldType } from './types';

/**
 * Detect input type from input element attributes
 */
export function detectInputType(input: HTMLInputElement | HTMLTextAreaElement): FieldType {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    const combined = `${name} ${id} ${placeholder} ${ariaLabel}`;
    
    // Handle textarea
    if (input instanceof HTMLTextAreaElement) {
      if (combined.includes('message') || combined.includes('comment') || combined.includes('description')) {
        return 'message';
      }
      return 'message'; // Default for textareas
    }
    
    const type = (input.type || '').toLowerCase();
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
    return 'text';
}