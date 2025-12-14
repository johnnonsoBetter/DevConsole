/**
 * TypeScript types and interfaces for Autofill feature
 */

import type { TestScenario } from './scenarioPresets';

// Re-export TestScenario for convenience
export type { TestScenario };

export interface Dataset {
  id: string;
  name: string;
  category: string;
  data: {
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    company?: string;
    title?: string;
    website?: string;
    message?: string;
    // Extended fields for relational data
    age?: string;
    birthdate?: string;
    username?: string;
    gender?: string;
    industry?: string;
    bio?: string;
    creditCardNumber?: string;
    creditCardExpiry?: string;
    creditCardCVV?: string;
    ssn?: string;
    password?: string;
    [key: string]: any;
  };
}

export interface FormUsage {
  usedDatasets: string[];
  lastFillTimestamp: number;
  fillCount: number;
}

export interface UsageMap {
  [formHash: string]: FormUsage;
}

export interface AutofillStats {
  totalDatasets: number;
  totalForms: number;
  totalFills: number;
  usageMap: UsageMap;
}

/** Autofill mode determines how data is filled */
export type AutofillMode = 'instant' | 'animated' | 'demo';

/** Autofill settings stored in chrome.storage */
export interface AutofillSettings {
  isEnabled: boolean;
  mode: AutofillMode;
  activeScenario: TestScenario | 'default' | 'relational';
  typingSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  enableTypos: boolean;
  enableRelationalData: boolean;
  enableTypingAnimation: boolean;
  /** Enable AI-powered responses for complex fields (uses AI settings from settings panel) */
  useAI: boolean;
}

export const DEFAULT_AUTOFILL_SETTINGS: AutofillSettings = {
  isEnabled: true,
  mode: 'instant',
  activeScenario: 'default',
  typingSpeed: 'normal',
  enableTypos: true,
  enableRelationalData: true,
  enableTypingAnimation: false,
  useAI: false,
};

export type FieldType =
  | "email"
  | "phone"
  | "name"
  | "firstName"
  | "lastName"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "country"
  | "company"
  | "title"
  | "website"
  | "message"
  | "image"
  | "text"
  | "url"
  | "date"
  | "number"
  | "tel";

/** Relational persona with internally consistent data */
export interface RelationalPersona {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  birthdate: string;
  company: string;
  jobTitle: string;
  industry: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  username: string;
  bio: string;
  creditCard?: {
    number: string;
    expiry: string;
    cvv: string;
    type: string;
  };
}
