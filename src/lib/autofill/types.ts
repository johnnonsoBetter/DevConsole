/**
 * TypeScript types and interfaces for Autofill feature
 */

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
