/**
 * LLM Field Understanding for Autofill
 * Uses AI to understand and generate contextual responses for complex fields
 *
 * Handles fields like:
 * - "Describe yourself"
 * - "Why do you want this job?"
 * - "What are your strengths?"
 * - "Cover letter"
 * - Open-ended questions
 */

import type { AISettings } from "../ai/types";

// ============================================================================
// FIELD PATTERN DETECTION
// ============================================================================

export interface ComplexFieldContext {
  fieldType: ComplexFieldType;
  confidence: number;
  suggestedPrompt: string;
  fallbackResponse: string;
}

export type ComplexFieldType =
  | "bio"
  | "cover-letter"
  | "why-interested"
  | "strengths"
  | "weaknesses"
  | "experience"
  | "goals"
  | "achievements"
  | "describe-project"
  | "feedback"
  | "general-text";

// Pattern matching for complex fields
const FIELD_PATTERNS: Record<ComplexFieldType, RegExp[]> = {
  bio: [
    /about\s*(yourself|you|me)/i,
    /bio(graphy)?/i,
    /describe\s*(yourself|you)/i,
    /tell\s*(us|me)\s*about\s*(yourself|you)/i,
    /short\s*description/i,
    /summary/i,
  ],
  "cover-letter": [
    /cover\s*letter/i,
    /application\s*letter/i,
    /letter\s*of\s*(introduction|interest)/i,
    /motivation\s*letter/i,
  ],
  "why-interested": [
    /why\s*(are\s*you\s*)?(interested|applying|want)/i,
    /what\s*(draws|attracts|interests)\s*you/i,
    /motivation/i,
    /reason\s*for\s*(applying|interest)/i,
  ],
  strengths: [
    /strength/i,
    /best\s*qualit/i,
    /what\s*are\s*you\s*good\s*at/i,
    /top\s*skill/i,
    /key\s*skill/i,
  ],
  weaknesses: [
    /weakness/i,
    /area.*(improve|development)/i,
    /what\s*are\s*you\s*(bad|not\s*good)\s*at/i,
    /challenge/i,
  ],
  experience: [
    /experience/i,
    /background/i,
    /work\s*history/i,
    /previous\s*(role|position|job)/i,
    /tell\s*us\s*about\s*your\s*work/i,
  ],
  goals: [
    /goal/i,
    /objective/i,
    /aspiration/i,
    /where\s*do\s*you\s*see\s*(yourself|you)/i,
    /5\s*year/i,
    /future\s*plan/i,
  ],
  achievements: [
    /achievement/i,
    /accomplishment/i,
    /proud\s*of/i,
    /success\s*stor/i,
    /notable/i,
  ],
  "describe-project": [
    /describe\s*(a|your)\s*project/i,
    /project\s*description/i,
    /tell\s*us\s*about\s*(a|your)\s*project/i,
    /portfolio/i,
  ],
  feedback: [
    /feedback/i,
    /comment/i,
    /suggestion/i,
    /how\s*can\s*we\s*improve/i,
    /review/i,
  ],
  "general-text": [
    /message/i,
    /note/i,
    /additional\s*info/i,
    /other/i,
    /comment/i,
  ],
};

// Fallback responses for each field type
const FALLBACK_RESPONSES: Record<ComplexFieldType, string[]> = {
  bio: [
    "I'm a passionate professional with over 5 years of experience in my field. I love solving complex problems and collaborating with teams to deliver exceptional results. In my free time, I enjoy reading, hiking, and learning new technologies.",
    "Dedicated and results-driven professional with a strong background in technology and innovation. I thrive in fast-paced environments and am always eager to take on new challenges. Outside of work, I'm an avid photographer and coffee enthusiast.",
    "Creative thinker and strategic problem-solver with extensive experience in driving growth and efficiency. I believe in continuous learning and bringing fresh perspectives to every project I work on.",
  ],
  "cover-letter": [
    "I am writing to express my strong interest in this position. With my background in technology and proven track record of delivering results, I believe I would be an excellent addition to your team. I am particularly drawn to your company's innovative approach and commitment to excellence. I look forward to the opportunity to discuss how my skills and experience align with your needs.",
    "I am excited to apply for this opportunity. Throughout my career, I have consistently demonstrated my ability to lead projects, collaborate effectively with cross-functional teams, and drive meaningful outcomes. I am confident that my experience and passion for innovation would make me a valuable asset to your organization.",
  ],
  "why-interested": [
    "I'm drawn to this opportunity because of the company's reputation for innovation and the chance to work on meaningful projects. The role aligns perfectly with my career goals and would allow me to leverage my skills while continuing to grow professionally.",
    "What excites me most about this position is the opportunity to make a real impact. Your company's mission resonates with my values, and I'm eager to contribute my expertise to help achieve your goals.",
    "I've long admired this organization's commitment to excellence and innovation. This role offers the perfect blend of challenge and growth that I'm looking for in my next career move.",
  ],
  strengths: [
    "My greatest strengths include problem-solving, communication, and the ability to remain calm under pressure. I'm highly adaptable and can quickly learn new technologies and processes. I also excel at building strong relationships with colleagues and stakeholders.",
    "I'm particularly strong in strategic thinking, technical expertise, and team collaboration. I have a proven track record of delivering projects on time and exceeding expectations. I'm also known for my attention to detail and commitment to quality.",
    "My key strengths are leadership, creativity, and analytical thinking. I'm able to see the big picture while managing the details that matter. I'm also highly organized and excel at prioritizing tasks effectively.",
  ],
  weaknesses: [
    "I sometimes tend to be overly detail-oriented, which can slow me down on larger projects. I've been working on this by setting clear milestones and focusing on the most impactful tasks first.",
    "I've sometimes struggled with delegating tasks because I want to ensure quality. I've learned to trust my team more and focus on providing clear guidance and feedback instead.",
    "Public speaking was a challenge for me early in my career. I've actively worked on this by taking courses and seeking opportunities to present, and I've seen significant improvement.",
  ],
  experience: [
    "I have over 5 years of professional experience in software development and project management. I've worked on diverse projects ranging from startups to enterprise solutions, giving me a broad perspective on what it takes to deliver successful products.",
    "My background includes roles in both technical and leadership positions. I've led cross-functional teams, managed complex projects, and consistently delivered results that exceeded expectations. I bring a combination of hands-on technical skills and strategic thinking.",
    "Throughout my career, I've worked across multiple industries including technology, finance, and healthcare. This diverse experience has given me valuable insights into different business challenges and approaches to problem-solving.",
  ],
  goals: [
    "In the next 5 years, I aim to grow into a leadership role where I can mentor others while continuing to develop my technical expertise. I'm committed to continuous learning and making a meaningful impact in my field.",
    "My career goal is to become a thought leader in my industry while contributing to innovative projects that make a real difference. I value both personal growth and the opportunity to help others succeed.",
    "I aspire to take on increasingly challenging roles that allow me to leverage my skills while learning new ones. Long-term, I want to lead initiatives that drive positive change and innovation.",
  ],
  achievements: [
    "I'm particularly proud of leading a project that increased team efficiency by 40% and was recognized with a company innovation award. The project required coordinating across multiple departments and overcoming significant technical challenges.",
    "My most notable achievement was developing a new system that reduced processing time by 60%, saving the company over $500K annually. This project demonstrated my ability to identify opportunities and deliver measurable results.",
    "I successfully led the launch of a product that exceeded revenue targets by 150% in its first year. This achievement required strong cross-functional collaboration and strategic thinking throughout the development process.",
  ],
  "describe-project": [
    "I led a team of 5 developers to build a customer-facing web application that improved user engagement by 35%. The project involved modern technologies like React and Node.js, and we delivered it 2 weeks ahead of schedule.",
    "I designed and implemented an automated testing framework that reduced bug detection time by 70%. The project required extensive research, stakeholder alignment, and careful implementation to integrate with existing workflows.",
    "My most impactful project was creating a data analytics dashboard that helped leadership make better-informed decisions. The solution processed millions of records daily and presented insights in an intuitive interface.",
  ],
  feedback: [
    "The overall experience has been positive. I particularly appreciated the clear communication and responsiveness. One area for improvement could be providing more detailed documentation upfront.",
    "I'm impressed with the quality of service provided. The team was professional and efficient. My only suggestion would be to consider offering more flexible scheduling options.",
    "Thank you for the opportunity to provide feedback. The product meets my needs well, and I've found the support team to be very helpful when I had questions.",
  ],
  "general-text": [
    "Thank you for your consideration. I look forward to hearing from you and discussing this opportunity further.",
    "I'm excited about this opportunity and eager to contribute. Please don't hesitate to contact me if you need any additional information.",
    "I appreciate your time and attention. I'm confident that my skills and experience make me a strong candidate for this position.",
  ],
};

// ============================================================================
// FIELD ANALYSIS
// ============================================================================

/**
 * Analyze an input field to detect if it requires complex/contextual response
 */
export function analyzeComplexField(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): ComplexFieldContext | null {
  // Only analyze text areas and large text inputs
  if (input instanceof HTMLSelectElement) return null;
  if (input instanceof HTMLInputElement && input.type !== "text") return null;

  // Check if it's likely a complex field (textarea or large input)
  const isTextArea = input instanceof HTMLTextAreaElement;
  const hasLargeMinLength =
    parseInt(input.getAttribute("minlength") || "0") > 50;
  const hasLargeMaxLength =
    parseInt(input.getAttribute("maxlength") || "0") > 200;
  const hasMultipleRows =
    isTextArea && parseInt(input.getAttribute("rows") || "1") > 2;

  // If not a likely complex field, skip
  if (!isTextArea && !hasLargeMinLength && !hasLargeMaxLength) return null;

  // Gather context from the field
  const label = getFieldLabel(input);
  const placeholder = input.placeholder || "";
  const name = input.name || "";
  const id = input.id || "";
  const ariaLabel = input.getAttribute("aria-label") || "";

  const contextText =
    `${label} ${placeholder} ${name} ${id} ${ariaLabel}`.toLowerCase();

  // Match against patterns
  let bestMatch: { type: ComplexFieldType; confidence: number } | null = null;

  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(contextText)) {
        const confidence = calculateConfidence(
          contextText,
          pattern,
          isTextArea,
          hasMultipleRows
        );
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type: fieldType as ComplexFieldType, confidence };
        }
      }
    }
  }

  if (!bestMatch) {
    // Default to general-text for textareas without specific matches
    if (isTextArea || hasMultipleRows) {
      bestMatch = { type: "general-text", confidence: 0.5 };
    } else {
      return null;
    }
  }

  const fallbacks = FALLBACK_RESPONSES[bestMatch.type];
  const fallbackResponse =
    fallbacks[Math.floor(Math.random() * fallbacks.length)];

  return {
    fieldType: bestMatch.type,
    confidence: bestMatch.confidence,
    suggestedPrompt: generatePrompt(bestMatch.type, contextText),
    fallbackResponse,
  };
}

/**
 * Get the label text for an input field
 */
function getFieldLabel(input: HTMLElement): string {
  // Try explicit label
  const id = input.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent || "";
  }

  // Try parent label
  const parentLabel = input.closest("label");
  if (parentLabel) return parentLabel.textContent || "";

  // Try preceding sibling
  const prev = input.previousElementSibling;
  if (prev?.tagName === "LABEL") return prev.textContent || "";

  // Try aria-labelledby
  const labelledBy = input.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent || "";
  }

  return "";
}

/**
 * Calculate confidence score for a field match
 */
function calculateConfidence(
  contextText: string,
  pattern: RegExp,
  isTextArea: boolean,
  hasMultipleRows: boolean
): number {
  let confidence = 0.6; // Base confidence for pattern match

  // Boost for textarea
  if (isTextArea) confidence += 0.15;
  if (hasMultipleRows) confidence += 0.1;

  // Boost for exact matches
  const match = contextText.match(pattern);
  if (match && match[0].length > 10) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

/**
 * Generate a prompt for AI-based response generation
 */
function generatePrompt(
  fieldType: ComplexFieldType,
  contextText: string
): string {
  const prompts: Record<ComplexFieldType, string> = {
    bio: `Write a professional bio for a job application. Keep it 2-3 sentences, highlighting experience and personality.`,
    "cover-letter": `Write a brief cover letter paragraph expressing interest in the position. Be professional but personable.`,
    "why-interested": `Explain why you're interested in this opportunity. Focus on alignment with career goals and company values.`,
    strengths: `Describe 2-3 key professional strengths with brief examples. Be specific and confident.`,
    weaknesses: `Describe a professional weakness and how you're working to improve it. Show self-awareness.`,
    experience: `Summarize relevant professional experience in 2-3 sentences. Focus on achievements and skills.`,
    goals: `Describe your career goals for the next 3-5 years. Be ambitious but realistic.`,
    achievements: `Describe a notable professional achievement with specific results. Use metrics if possible.`,
    "describe-project": `Describe a professional project you worked on, including your role and the outcome.`,
    feedback: `Provide constructive feedback that is professional and actionable.`,
    "general-text": `Write a professional message that is clear and concise.`,
  };

  const base = prompts[fieldType] || prompts["general-text"];
  return `${base}\n\nContext: ${contextText.slice(0, 300)}`;
}

// ============================================================================
// AI INTEGRATION (Uses Vercel AI SDK directly for content script compatibility)
// ============================================================================

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AIProvider } from "../ai/types";

const STORAGE_KEY = "devconsole_ai_settings";

// Cache for AI settings to avoid repeated storage reads
let cachedAISettings: AISettings | null = null;
let aiSettingsLastFetched = 0;
const AI_SETTINGS_CACHE_TTL = 5000; // 5 seconds

/**
 * Create AI SDK model based on provider and settings
 */
function createAIModel(settings: AISettings) {
  const { provider, apiKey, model, useGateway, gatewayApiKey, gatewayUrl } = settings;
  
  // Use gateway if configured
  if (useGateway && gatewayApiKey && gatewayUrl) {
    return createOpenAI({ apiKey: gatewayApiKey, baseURL: gatewayUrl })(model);
  }

  const cleanModelId = model.includes("/") ? model.split("/").pop()! : model;

  switch (provider as AIProvider) {
    case "openai":
      return createOpenAI({ apiKey })(cleanModelId);
    case "anthropic":
      return createAnthropic({ apiKey })(cleanModelId);
    case "deepseek":
      return createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" })(cleanModelId);
    default:
      return createOpenAI({ apiKey })(cleanModelId);
  }
}

/**
 * Check if we're in a valid chrome extension context
 */
function isExtensionContextValid(): boolean {
  try {
    return (
      typeof chrome !== "undefined" &&
      !!chrome?.storage?.local &&
      !!chrome?.runtime?.id
    );
  } catch {
    return false;
  }
}

/**
 * Load AI settings from chrome.storage (same pattern as useAISettingsStore)
 */
async function loadAISettingsForAutofill(): Promise<AISettings | null> {
  const now = Date.now();

  // Return cached settings if still fresh
  if (cachedAISettings && now - aiSettingsLastFetched < AI_SETTINGS_CACHE_TTL) {
    return cachedAISettings;
  }

  // Check if we're in a valid extension context
  if (!isExtensionContextValid()) {
    console.warn("[LLM Autofill] Not in valid extension context");
    return null;
  }

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    cachedAISettings = result[STORAGE_KEY] || null;
    aiSettingsLastFetched = now;

    if (cachedAISettings) {
      console.log("[LLM Autofill] AI settings loaded from storage");
    }

    return cachedAISettings;
  } catch (error: any) {
    // Handle extension context errors gracefully
    if (
      error?.message?.includes("execution context") ||
      error?.message?.includes("Extension context invalidated")
    ) {
      console.warn("[LLM Autofill] Extension context not available");
    } else {
      console.warn("[LLM Autofill] Failed to load AI settings:", error);
    }
    return null;
  }
}

/**
 * Check if AI is properly configured and ready
 */
export async function isAIReadyForAutofill(): Promise<boolean> {
  const settings = await loadAISettingsForAutofill();
  console.log(
    "[LLM Autofill] AI settings loaded:",
    settings ? "yes" : "no",
    "enabled:",
    settings?.enabled
  );

  if (!settings || !settings.enabled) {
    console.log(
      "[LLM Autofill] AI not ready - settings:",
      !!settings,
      "enabled:",
      settings?.enabled
    );
    return false;
  }

  // Check for required API keys
  if (settings.useGateway) {
    const hasKey = !!settings.gatewayApiKey;
    console.log("[LLM Autofill] Gateway mode, has key:", hasKey);
    return hasKey;
  }
  const hasKey = !!settings.apiKey;
  console.log(
    "[LLM Autofill] Direct mode, provider:",
    settings.provider,
    "has key:",
    hasKey
  );
  return hasKey;
}

/**
 * Generate a response using Vercel AI SDK
 */
async function callAI(
  prompt: string,
  systemPrompt: string
): Promise<string | null> {
  try {
    const settings = await loadAISettingsForAutofill();
    if (!settings || !settings.enabled) {
      console.log("[LLM Autofill] AI not configured or disabled");
      return null;
    }

    console.log("[LLM Autofill] Calling AI with prompt length:", prompt.length);

    const model = createAIModel(settings);
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt,
      temperature: settings.temperature ?? 0.7,
      maxTokens: 500,
    });

    console.log(
      "[LLM Autofill] AI response received, length:",
      result.text?.length
    );
    return result.text || null;
  } catch (error) {
    console.warn("[LLM Autofill] AI call failed:", error);
    return null;
  }
}

/**
 * Generate a response using AI (if available) or fallback
 */
export async function generateSmartResponse(
  context: ComplexFieldContext,
  useAI: boolean = false,
  pageContext?: string
): Promise<string> {
  // If AI is not requested, return fallback immediately
  if (!useAI) {
    return context.fallbackResponse;
  }

  // Check if AI is ready
  const aiReady = await isAIReadyForAutofill();
  if (!aiReady) {
    console.log("[LLM Autofill] AI not configured, using fallback");
    return context.fallbackResponse;
  }

  // Build AI prompt
  const systemPrompt = `You are an expert form-filling assistant. Generate professional, realistic responses for form fields. 
Keep responses concise (2-4 sentences for most fields, up to 1 paragraph for cover letters/bios).
Write in first person as if you are the applicant.
Be professional but personable. Use specific details to make responses feel authentic.
Do not include placeholder text like [Company Name] - invent realistic details if needed.`;

  const fieldPrompt =
    context.suggestedPrompt +
    (pageContext ? `\n\nPage context: ${pageContext}` : "");

  try {
    const aiResponse = await callAI(fieldPrompt, systemPrompt);
    if (aiResponse) {
      console.log(
        "[LLM Autofill] Generated AI response for:",
        context.fieldType
      );
      return aiResponse;
    }
  } catch (error) {
    console.warn("[LLM Autofill] AI generation failed, using fallback:", error);
  }

  return context.fallbackResponse;
}

/**
 * Get suggestions for a complex field (with optional AI generation)
 */
export async function getComplexFieldSuggestionsAsync(
  context: ComplexFieldContext,
  useAI: boolean = false
): Promise<string[]> {
  if (!useAI) {
    return (
      FALLBACK_RESPONSES[context.fieldType] ||
      FALLBACK_RESPONSES["general-text"]
    );
  }

  // Try to generate one AI response and combine with fallbacks
  const aiResponse = await generateSmartResponse(context, true);
  const fallbacks =
    FALLBACK_RESPONSES[context.fieldType] || FALLBACK_RESPONSES["general-text"];

  // Put AI response first if it's different from fallbacks
  if (aiResponse && !fallbacks.includes(aiResponse)) {
    return [aiResponse, ...fallbacks.slice(0, 2)];
  }

  return fallbacks;
}

/**
 * Get suggestions for a complex field (synchronous - uses fallbacks only)
 */
export function getComplexFieldSuggestions(
  context: ComplexFieldContext
): string[] {
  return (
    FALLBACK_RESPONSES[context.fieldType] || FALLBACK_RESPONSES["general-text"]
  );
}

/**
 * Test function to verify AI integration is working
 * Call this from browser console: window.testAutofillAI()
 */
export async function testAutofillAI(): Promise<void> {
  console.log("=== Testing Autofill AI Integration ===");

  // Step 0: Check extension context
  console.log("0. Checking extension context...");
  const contextValid = isExtensionContextValid();
  console.log("   Extension context valid:", contextValid ? "YES" : "NO");

  if (!contextValid) {
    console.log("❌ Not running in a valid Chrome extension context.");
    console.log(
      "   Make sure you're testing on a page where the extension content script is loaded."
    );
    return;
  }

  // Step 1: Check if AI settings are available
  console.log("1. Loading AI settings...");
  const settings = await loadAISettingsForAutofill();
  console.log("   Settings loaded:", settings ? "YES" : "NO");

  if (settings) {
    console.log("   - Enabled:", settings.enabled);
    console.log("   - Provider:", settings.provider);
    console.log("   - Model:", settings.model);
    console.log("   - Has API Key:", !!settings.apiKey);
    console.log("   - Use Gateway:", settings.useGateway);
    console.log("   - Has Gateway Key:", !!settings.gatewayApiKey);
  } else {
    console.log(
      "❌ No AI settings found. Configure AI in DevConsole Settings → AI Providers"
    );
    return;
  }

  // Step 2: Check if AI is ready
  console.log("2. Checking if AI is ready...");
  const isReady = await isAIReadyForAutofill();
  console.log("   AI Ready:", isReady ? "YES" : "NO");

  if (!isReady) {
    console.log("❌ AI is not configured properly:");
    if (!settings.enabled) {
      console.log("   → AI is disabled. Enable it in Settings.");
    }
    if (settings.useGateway && !settings.gatewayApiKey) {
      console.log("   → Gateway mode enabled but no Gateway API key.");
    }
    if (!settings.useGateway && !settings.apiKey) {
      console.log("   → No API key set for provider:", settings.provider);
    }
    return;
  }

  // Step 3: Try to create client
  console.log("3. Creating AI client...");
  const client = await getAIClient();
  console.log("   Client created:", client ? "YES" : "NO");

  if (!client) {
    console.log("❌ Failed to create AI client");
    return;
  }

  // Step 4: Test a simple AI call
  console.log("4. Testing AI call (this may take a few seconds)...");
  try {
    const response = await callAI(
      "Write one sentence about yourself for a job application.",
      "You are a professional job applicant. Be concise. Reply with just one sentence."
    );
    console.log("   Response received:", response ? "YES" : "NO");
    if (response) {
      console.log("   ✅ Response:", response);
      console.log("");
      console.log(
        '🎉 AI autofill is working! Enable "Use AI for Text Fields" in the autofill dropdown.'
      );
    } else {
      console.log("   ⚠️ Empty response received from AI");
    }
  } catch (error) {
    console.error("   ❌ Error:", error);
  }

  console.log("=== Test Complete ===");
}

// Expose test function via chrome extension messaging for DevTools access
// The function can be called from DevTools console using:
// chrome.runtime.sendMessage({type: 'TEST_AUTOFILL_AI'}, console.log)
//
// Or simply check the autofill AI status in content script console by filtering for [LLM Autofill]
