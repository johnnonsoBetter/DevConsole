/**
 * SuperWriteAI Component
 * AI-powered enhancement for GitHub issues
 * Transforms and enhances issue titles and bodies using advanced AI
 */

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Loader, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { createAIClient } from '../../lib/ai/services/aiClient';
import { cn } from '../../utils';
import { useAISettingsStore } from '../../utils/stores/aiSettings';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const GITHUB_ISSUE_ENHANCEMENT_PROMPT = `You are a GitHub Issue Enhancement Specialist. Your task is to rewrite and enhance GitHub issues based on whatever information is provided, whether from technical or non-technical users.

# Input Analysis
First, analyze what you're given:
- What information is available? (title only, body only, both, or fragments)
- Is the reporter technical or non-technical? (look for jargon, technical terms, or casual language)
- What type of issue is this? (bug report, feature request, question, documentation issue)
- What's missing that would be helpful?

# Your Task
Enhance the issue intelligently based on available context. **Adapt the structure dynamically** - only include sections that make sense given the information provided.

## 1. TITLE
- If title exists: refine it to be clear and descriptive (50-72 characters)
- If title is missing: create one from the body content
- Format: \`[Type] Component: Brief description\` (use [Type] only if you can confidently determine it)
- Types: Bug, Feature, Enhancement, Documentation, Performance, Question, etc.

## 2. ISSUE BODY STRUCTURE (Dynamic - include only relevant sections)

### Summary
- 2-3 sentence overview synthesizing available information
- Translate non-technical descriptions into clear technical context where possible
- Preserve the original reporter's intent and observations

### Problem Description / What's Happening
- Describe the issue based on what was reported
- If it's a bug: what the user experienced
- If it's a feature: what capability is missing
- If it's unclear: frame it as an observation or question
- **Preserve original user quotes** when they provide valuable context

### User Impact (if discernible)
- Who is affected by this?
- What workflow or task is interrupted?
- How does this impact the user experience?

### Steps to Reproduce (only if bug-related information is available)
- Extract any steps mentioned by the reporter
- If steps are vague, note them as reported and flag what's missing
- Format: numbered list or bullet points

### Expected Behavior (only if clear from context)
- What should happen instead?
- If the reporter mentioned expectations, include them
- If unclear, omit this section or note "[Reporter's expectation unclear]"

### Environment & Context (only include if any details provided)
- Browser, OS, device, or version mentioned
- Time of occurrence
- Frequency (one-time, consistent, intermittent)
- Any error messages or screenshots referenced

### Technical Notes (only if you can infer technical details)
- Possible affected components or systems
- Related features or dependencies
- If you can suggest likely causes, note them tentatively

### Additional Context
- Any extra details that don't fit elsewhere
- Related issues or similar reports (if pattern recognition applies)
- Assumptions you're making based on limited information

### Missing Information (be explicit about gaps)
- [ ] What details would help investigate this?
- [ ] What questions should be asked to the reporter?
- [ ] What testing or reproduction steps are needed?

### Suggested Labels & Priority
- Labels: based on issue type (bug, enhancement, question, needs-triage, needs-reproduction, etc.)
- Priority: Conservative estimate (default to Medium/needs-triage if uncertain)
- Add \`needs-more-info\` if critical details are missing

---

# Guidelines

**Adaptability:**
- Work with what you have - don't force structure where information doesn't exist
- If the report is sparse, create a shorter, focused issue
- If the report is detailed, create comprehensive documentation
- Mark uncertainties clearly - use phrases like "appears to be", "possibly", "based on description"

**Language Translation:**
- Translate non-technical language into technical context without losing meaning
- Example: "the button doesn't work" → "Button appears unresponsive to click events"
- Keep original quotes when they capture important details

**Tone:**
- Respectful of the original reporter's effort
- Professional but not overly formal
- Helpful for maintainers to quickly understand and act

**Formatting:**
- Use clear Markdown formatting
- Add emoji sparingly for quick visual parsing (🐛 bug, ✨ feature, ❓ question, 📚 docs)
- Use code blocks only if code/commands were mentioned
- Use blockquotes (>) to preserve original reporter's descriptions

**Smart Inference:**
- Make reasonable assumptions based on context, but label them as assumptions
- Suggest likely scenarios without stating them as facts
- If multiple interpretations exist, mention the possibilities

**Action-Oriented:**
- End with clear next steps when possible
- Suggest what information would be most helpful
- Make it easy for maintainers to triage and respond

# Output Format
Provide the enhanced issue in GitHub Markdown format. The structure should feel natural and appropriate for the amount of information available - not forced or padded with empty sections.

Return ONLY the enhanced content in the following JSON format:
{
  "title": "Enhanced title here",
  "body": "Enhanced body markdown here"
}`;

// ============================================================================
// TYPES
// ============================================================================

interface SuperWriteAIProps {
  currentTitle: string;
  currentBody: string;
  onEnhanced: (enhanced: { title: string; body: string }) => void;
  className?: string;
}

interface EnhancementResult {
  title: string;
  body: string;
}

// ============================================================================
// SUPER WRITE AI COMPONENT
// ============================================================================

export function SuperWriteAI({
  currentTitle,
  currentBody,
  onEnhanced,
  className,
}: SuperWriteAIProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const aiSettings = useAISettingsStore();

  const handleEnhance = async () => {
    // Validate AI settings
    if (!aiSettings.enabled) {
      showNotification("AI features are disabled. Enable in Settings → AI.", "error");
      return;
    }

    if (!aiSettings.apiKey && !aiSettings.gatewayApiKey) {
      showNotification("AI API key not configured. Set up in Settings → AI.", "error");
      return;
    }

    if (!currentTitle.trim() && !currentBody.trim()) {
      showNotification("Please provide at least a title or body to enhance.", "error");
      return;
    }

    setIsEnhancing(true);

    try {
      const client = createAIClient(aiSettings);

      // Build user prompt from current content
      const userPrompt = `Please enhance this GitHub issue:

${currentTitle.trim() ? `**Current Title:**\n${currentTitle}\n\n` : ""}${currentBody.trim() ? `**Current Body:**\n${currentBody}` : "No body provided yet."}

Analyze the content and provide an enhanced version following the guidelines. Return ONLY valid JSON with "title" and "body" fields.`;

      // Generate enhancement
      const result = await client.generateText({
        prompt: userPrompt,
        systemPrompt: GITHUB_ISSUE_ENHANCEMENT_PROMPT,
        temperature: 0.7,
        maxTokens: 3000,
      });

      // Parse JSON response
      const enhanced = parseEnhancedResult(result.text);

      if (!enhanced) {
        throw new Error("Failed to parse AI response. Please try again.");
      }

      // Apply enhancement
      onEnhanced(enhanced);

      showNotification("✨ Issue enhanced successfully!", "success");
    } catch (error) {
      console.error("Enhancement error:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to enhance issue. Check console for details.",
        "error"
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  /**
   * Parse AI response to extract enhanced title and body
   * Handles both JSON and markdown-wrapped responses
   */
  const parseEnhancedResult = (text: string): EnhancementResult | null => {
    try {
      // Try direct JSON parse
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title && parsed.body) {
          return {
            title: parsed.title,
            body: parsed.body,
          };
        }
      }

      // Fallback: extract title and body from markdown
      const titleMatch = text.match(/(?:^|\n)(?:#+\s*)?(?:title|Title):\s*(.+?)(?:\n|$)/i);
      const bodyMatch = text.match(/(?:^|\n)(?:#+\s*)?(?:body|Body):\s*([\s\S]+?)(?:\n#+|$)/i);

      if (titleMatch || bodyMatch) {
        return {
          title: titleMatch?.[1]?.trim() || currentTitle,
          body: bodyMatch?.[1]?.trim() || currentBody,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to parse enhancement result:", error);
      return null;
    }
  };

  return (
    <>
      {/* Professional FAB Button */}
      <motion.button
        onClick={handleEnhance}
        disabled={isEnhancing}
        className={cn(
          "group relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all",
          "bg-primary hover:bg-primary/90 text-white font-medium text-sm",
          "border border-primary/20 shadow-sm hover:shadow-md",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          className
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title="Enhance issue with AI"
      >
        {isEnhancing ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Enhancing...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Enhance with AI</span>
          </>
        )}
      </motion.button>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={cn(
              "fixed bottom-6 right-6 z-[10002] px-4 py-3 rounded-lg shadow-xl flex items-start gap-3 max-w-md",
              toastType === "success"
                ? "bg-success text-white"
                : "bg-destructive text-white"
            )}
          >
            {toastType === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium flex-1">{toastMessage}</p>
            <button
              onClick={() => setShowToast(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
