/**
 * Field Detector for Autofill Extension
 * Detects 15+ field types from input attributes
 */

import type { FieldType } from "./types";

/**
 * Detect input type from input element attributes
 */

export function detectInputType(
  input: HTMLInputElement | HTMLTextAreaElement
): FieldType {
  // Handle textarea
  if (input instanceof HTMLTextAreaElement) {
    return "message";
  }

  const type = (input.type || "").toLowerCase();
  const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();

  // 1. Trust explicit HTML attributes first (most reliable)
  if (type === "email") return "email";
  if (type === "tel") return "phone";
  if (type === "url") return "website";
  if (type === "number") return "number";
  if (type === "date") return "date";

  const accept = (input.accept || "").toLowerCase();

  // File inputs
  if (
    type === "file" &&
    (accept.includes("image") ||
      accept.includes(".png") ||
      accept.includes(".jpg") ||
      accept.includes(".jpeg") ||
      accept.includes(".gif"))
  ) {
    return "image";
  }

  // 2. Trust autocomplete attribute (standard)
  if (autocomplete) {
    const acMap: Record<string, FieldType> = {
      email: "email",
      tel: "phone",
      "given-name": "firstName",
      "family-name": "lastName",
      name: "name",
      "street-address": "address",
      "address-line1": "address",
      "postal-code": "zip",
      country: "country",
      // ... standard autocomplete values
    };
    if (acMap[autocomplete]) return acMap[autocomplete];
  }

  // 3. For text inputs, use pattern matching with confidence scores
  const patterns = extractPatterns(input);
  const bestMatch = classifyByPatterns(patterns);

  return bestMatch || "text";
}

function extractPatterns(input: HTMLInputElement): string[] {
  const attrs = [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute("aria-label"),
    input.className,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return attrs.split(/[\s\-_]+/); // Split by common separators
}

function classifyByPatterns(tokens: string[]): FieldType | null {
  // Look for semantic indicators, not exact matches
  const hasToken = (keywords: string[]) =>
    tokens.some((token) => keywords.some((kw) => token.includes(kw)));

  // Email indicators
  if (hasToken(["email", "mail", "e-mail"])) return "email";

  // Phone indicators
  if (hasToken(["phone", "tel", "mobile", "cell"])) return "phone";

  // Name indicators (order matters: specific → general)
  if (hasToken(["first", "given", "fname"])) {
    if (hasToken(["name"])) return "firstName";
  }
  if (hasToken(["last", "family", "surname", "lname"])) {
    if (hasToken(["name"])) return "lastName";
  }
  if (hasToken(["full", "complete"]) && hasToken(["name"])) return "name";
  if (hasToken(["name", "user", "login", "account"])) return "name"; // General name/username

  // Address components
  if (hasToken(["address", "street", "addr"])) return "address";
  if (hasToken(["city", "town"])) return "city";
  if (hasToken(["state", "province", "region"])) return "state";
  if (hasToken(["zip", "postal", "postcode"])) return "zip";
  if (hasToken(["country", "nation"])) return "country";

  // Professional info
  if (hasToken(["company", "organization", "org", "employer"]))
    return "company";
  if (
    hasToken(["title", "position", "role", "job"]) &&
    !hasToken(["page", "article"])
  )
    return "title";

  // Contact info
  if (hasToken(["website", "site", "url", "web"])) return "website";

  // Message/content
  if (hasToken(["message", "comment", "note", "description", "bio", "about"]))
    return "message";

  return null;
}
