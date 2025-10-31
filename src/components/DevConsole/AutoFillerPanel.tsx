/**
 * Auto-Filler Panel
 * Automatically fills form inputs with AI-generated realistic data
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Trash2,
  Zap,
  FileText,
  Lock,
  Brain,
  Wand2,
} from 'lucide-react';
import { cn } from '../../utils';
import { scanAllForms, type ScannedForm, type ScannedInput } from '../../lib/devConsole/formScanner';
import { fillInput, fillForm, clearForm } from '../../lib/devConsole/formFiller';
import type { AIFieldValue, AIFormContext } from '../../utils/stores/aiAutoFiller';
import { useAIAutoFillerStore } from '../../utils/stores/aiAutoFiller';
import { usePromptModel } from '../../hooks/ai';
import { AIUnsupportedNotice, AIFirstUsePrompt, AIDownloadProgress } from './AI';
import { toast } from 'sonner';

const PROMPT_STATUS_STYLES: Record<
  'success' | 'info' | 'warning',
  { wrapper: string; label: string; description: string }
> = {
  success: {
    wrapper: 'bg-success/10 border-success/20',
    label: 'text-success',
    description: 'text-success/80 dark:text-success/70',
  },
  info: {
    wrapper: 'bg-primary/10 border-primary/20',
    label: 'text-primary',
    description: 'text-primary/80 dark:text-primary/70',
  },
  warning: {
    wrapper: 'bg-warning/10 border-warning/20',
    label: 'text-warning',
    description: 'text-warning/80 dark:text-warning/70',
  },
};
// ============================================================================
// AUTO-FILLER PANEL
// ============================================================================

export function AutoFillerPanel() {
  const [forms, setForms] = useState<ScannedForm[]>([]);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanKey, setScanKey] = useState(0); // Force re-render on rescan
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // AI Auto-Filler Store
  const {
    aiValues,
    formContexts,
    generatingInputs,
    generatingForms,
    errors: aiErrors,
    setAIValue,
    setFormContext,
    setMultipleAIValues,
    startGenerating,
    stopGenerating,
    startGeneratingForm,
    stopGeneratingForm,
    setError,
    clearFormAIValues,
  } = useAIAutoFillerStore();

  const {
    availability: aiAvailability,
    isAvailable: isPromptAvailable,
    isDownloading: isPromptDownloading,
    isDownloadRequired: promptNeedsDownload,
    downloadProgress,
    browserSupport,
    downloadModel: triggerPromptDownload,
    checkAvailability,
    analyzeFormContext,
    generateFieldValue,
    generateAllFieldValues,
  } = usePromptModel();

  const effectiveDownloadProgress = useMemo(
    () => Math.max(0, Math.min(100, downloadProgress)),
    [downloadProgress]
  );

  // Compute prompt status banner
  const promptStatus = useMemo(() => {
    if (!browserSupport.isSupported) return null;

    if (aiAvailability === 'downloading' || isPromptDownloading) {
      return {
        tone: 'info' as const,
        icon: <RefreshCw className="w-4 h-4 text-primary animate-spin" />,
        label: 'Downloading AI Model',
        description: 'Gemini Nano is being downloaded. This may take a few minutes.',
      };
    }

    if (aiAvailability === 'downloadable' || promptNeedsDownload) {
      return {
        tone: 'warning' as const,
        icon: <Sparkles className="w-4 h-4 text-warning" />,
        label: 'AI Model Required',
        description: 'Activate AI to enable intelligent form filling.',
      };
    }

    if (aiAvailability === 'available') {
      return {
        tone: 'success' as const,
        icon: <Brain className="w-4 h-4 text-success" />,
        label: 'AI Ready',
        description: 'Gemini Nano is active and ready for intelligent form filling.',
      };
    }

    return null;
  }, [aiAvailability, isPromptDownloading, promptNeedsDownload, browserSupport.isSupported]);



  // Auto-scan on mount
  useEffect(() => {
    handleScan();
  }, []);

  // AI Generation Handlers
  const handleAIFillForm = async (form: ScannedForm) => {
    console.log('🤖 AI Fill Form started for:', form.name);
    console.log('📋 Form has', form.inputs.length, 'total inputs,', form.fillableCount, 'fillable');
    console.log('Prompt availability:', aiAvailability);

    if (!isPromptAvailable) {
      const reason = promptNeedsDownload
        ? 'Prompt model needs to be downloaded. Try activating AI to fetch Gemini Nano.'
        : isPromptDownloading
          ? 'Prompt model is downloading. Please wait and try again.'
          : `Prompt model status: ${aiAvailability}`;

      toast.error('AI not available', {
        description: reason,
      });
      console.error('Prompt model not ready. Status:', aiAvailability);
      return;
    }

    try {
      startGeneratingForm(form.id);

      // Step 1: Analyze form context
      toast.info('Analyzing form...', {
        description: 'Understanding the form structure and purpose',
      });

      console.log('🔍 Starting form analysis...');
      const context = await analyzeFormContext(form);

      if (context) {
        setFormContext(context);
        console.log('✅ Form context analyzed:', context);
        console.log('📊 Dataset has', Object.keys(context.dataset || {}).length, 'entries');
        console.log('Dataset keys:', Object.keys(context.dataset || {}));
      } else {
        console.warn('⚠️ No context generated');
      }

      // Step 2: Generate values for all inputs
      toast.info('Generating test data...', {
        description: `Creating realistic values for ${form.fillableCount} fields`,
      });

      console.log('🎲 Starting value generation for', form.fillableCount, 'fillable inputs...');
      const values = await generateAllFieldValues(form, context);

      console.log('✅ Generated', values.length, 'values:', values);

      if (values.length > 0) {
        setMultipleAIValues(values);

        // Step 3: Fill the actual form inputs
        let filledCount = 0;
        for (const aiValue of values) {
          const input = form.inputs.find(inp => inp.id === aiValue.inputId);
          if (input && input.element) {
            try {
              // Set the value on the DOM element
              const element = input.element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
              element.value = aiValue.value;

              // Trigger change event for frameworks that listen to it
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));

              filledCount++;
              console.log(`✅ Filled ${input.name} = ${aiValue.value}`);
            } catch (error) {
              console.warn(`❌ Failed to fill input ${input.name}:`, error);
            }
          }
        }

        toast.success(`AI filled ${filledCount} of ${form.fillableCount} inputs`, {
          description: context ? `Form: ${context.purpose}` : form.name,
        });
      } else {
        toast.warning('No values generated', {
          description: 'The AI could not generate test data for this form',
        });
      }
    } catch (error) {
      console.error('AI Fill Form error:', error);
      toast.error('AI generation failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      stopGeneratingForm(form.id);
    }
  };

  const handleAIFillInput = async (form: ScannedForm, input: ScannedInput) => {
    if (!isPromptAvailable) {
      const reason = promptNeedsDownload
        ? 'Prompt model needs to be downloaded before filling fields.'
        : isPromptDownloading
          ? 'Prompt model is downloading. Please try again shortly.'
          : `Prompt model status: ${aiAvailability}`;

      toast.error('AI not available', {
        description: reason,
      });
      return;
    }

    try {
      startGenerating(input.id);

      // Get or create form context
      let context = formContexts[form.id];
      if (!context) {
        context = await analyzeFormContext(form);
        if (context) {
          setFormContext(context);
        }
      }

      // Generate value for this specific input
      const aiValue = await generateFieldValue({
        inputId: input.id,
        inputName: input.name,
        fieldType: input.fieldType,
        label: input.label,
        placeholder: input.placeholder,
        formContext: context ?? undefined,
        existingValue: typeof input.element.value === 'string' ? input.element.value : input.value,
      });

      setAIValue(aiValue);

      // Fill the actual input
      const element = input.element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      element.value = aiValue.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      toast.success('Input filled with AI', {
        description: `${input.label || input.name}: ${aiValue.value}`,
      });
    } catch (error) {
      console.error('AI Fill Input error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(input.id, errorMessage);

      toast.error('AI generation failed', {
        description: errorMessage,
      });
    } finally {
      stopGenerating(input.id);
    }
  };

  // Auto-scan on mount
  useEffect(() => {
    handleScan();
  }, []);

  // Auto-rescan when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        setCurrentPath(newPath);
        // Small delay to let the new page render
        setTimeout(() => {
          handleScan();
        }, 500);
      }
    };

    // Listen to popstate (back/forward buttons)
    window.addEventListener('popstate', handleRouteChange);

    // Create a MutationObserver to detect DOM changes (for SPA navigation)
    const observer = new MutationObserver(() => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        setCurrentPath(newPath);
        setTimeout(() => {
          handleScan();
        }, 500);
      }
    });

    // Observe URL changes in the document
    observer.observe(document.querySelector('title') || document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
    };
  }, [currentPath]);

  const handleScan = () => {
    setIsScanning(true);
    // Clear forms immediately to prevent rendering old data
    setForms([]);
    setExpandedForms(new Set()); // Reset expanded state
    setScanKey(prev => prev + 1); // Force complete re-render

    setTimeout(() => {
      try {
        const scannedForms = scanAllForms();
        setForms(scannedForms);
        setLastScanTime(new Date());

        if (scannedForms.length === 0) {
          toast.info('No forms found on this page', {
            description: 'Navigate to a page with forms to use Auto-Filler',
            duration: 2000,
          });
        } else {
          const totalInputs = scannedForms.reduce((sum, f) => sum + f.fillableCount, 0);
          toast.success(`Found ${scannedForms.length} form(s)`, {
            description: `${totalInputs} fillable inputs detected`,
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('Error scanning forms:', error);
        toast.error('Failed to scan forms', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsScanning(false);
      }
    }, 300); // Small delay for visual feedback
  };

  const toggleFormExpanded = (formId: string) => {
    setExpandedForms(prev => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  };

  const handleFillForm = (form: ScannedForm) => {
    const result = fillForm(form);

    toast.success(`Filled ${result.filledInputs} inputs`, {
      description: `${form.name}`,
    });
  };

  const handleFillInput = (input: ScannedInput) => {
    const result = fillInput(input);

    if (result.success) {
      toast.success('Input filled', {
        description: `${input.name}: ${result.value}`,
      });
    } else {
      toast.error('Failed to fill input', {
        description: result.error,
      });
    }
  };

  const handleClearForm = (form: ScannedForm) => {
    clearForm(form);
    clearFormAIValues(form.id, form.inputs.map((input) => input.id));
    toast.info('Form cleared', {
      description: form.name,
    });
  };

  const totalFillable = forms.reduce((sum, form) => sum + form.fillableCount, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Auto-Filler
                </h2>
                {aiAvailability === 'available' && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">AI Powered</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {aiAvailability === 'available'
                  ? 'AI-powered intelligent form filling with contextual data'
                  : 'Automatically fill forms with realistic test data'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type='button'
              onClick={handleScan}
              disabled={isScanning}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-all border border-gray-200 dark:border-gray-700",
                isScanning ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isScanning && "animate-spin")} />
              {isScanning ? 'Scanning...' : 'Rescan'}
            </button>
          </div>
        </div>

        {/* AI Status Banner */}
        {!browserSupport.isSupported && (
          <div className="mb-3">
            <AIUnsupportedNotice
              reason={browserSupport.reason || 'AI features not available'}
              browserName={browserSupport.browserName}
            />
          </div>
        )}

        {promptStatus && (
          <div
            className={cn(
              'mb-3 flex items-start gap-3 rounded-lg border px-3 py-2',
              PROMPT_STATUS_STYLES[promptStatus.tone].wrapper
            )}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">{promptStatus.icon}</div>
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    PROMPT_STATUS_STYLES[promptStatus.tone].label
                  )}
                >
                  {promptStatus.label}
                </p>
                {promptStatus.description && (
                  <p
                    className={cn(
                      'mt-0.5 text-xs',
                      PROMPT_STATUS_STYLES[promptStatus.tone].description
                    )}
                  >
                    {promptStatus.description}
                  </p>
                )}
              </div>
            </div>
            {isPromptDownloading && (
              <span className="ml-auto text-xs font-mono text-primary">
                {effectiveDownloadProgress}%
              </span>
            )}
          </div>
        )}

        {(aiAvailability === 'downloading' || isPromptDownloading) &&
          effectiveDownloadProgress >= 0 &&
          effectiveDownloadProgress < 100 && (
            <div className="mb-3">
              <AIDownloadProgress progress={effectiveDownloadProgress} modelName="Gemini Nano" />
            </div>
          )}

        {(aiAvailability === 'downloadable' || promptNeedsDownload) && (
          <div className="mb-3">
            <AIFirstUsePrompt
              onActivate={async () => {
                try {
                  await triggerPromptDownload();
                  await checkAvailability();
                } catch (error) {
                  console.error('Failed to start Prompt model download:', error);
                  toast.error('Failed to start Prompt model download', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                  });
                }
              }}
              loading={isPromptDownloading}
            />
          </div>
        )}

        {/* Stats */}
        {lastScanTime && (
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {forms.length} form{forms.length !== 1 ? 's' : ''} found
            </span>
            <span>•</span>
            <span>
              {totalFillable} fillable input{totalFillable !== 1 ? 's' : ''}
            </span>
            <span>•</span>
            <span>Last scan: {lastScanTime.toLocaleTimeString()}</span>
            {aiAvailability === 'available' && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <Sparkles className="w-3 h-3" />
                  AI Enhanced
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isScanning ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Scanning for forms...</p>
            </div>
          </div>
        ) : forms.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No forms detected
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Navigate to a page with forms or click "Rescan Forms" to check again.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4" key={scanKey}>
            {forms.map((form, index) => (
              <FormCard
                key={`${index}-${scanKey}`}
                form={form}
                isExpanded={expandedForms.has(form.id)}
                onToggleExpand={() => toggleFormExpanded(form.id)}
                onFillForm={() => handleFillForm(form)}
                onAIFillForm={() => handleAIFillForm(form)}
                onFillInput={handleFillInput}
                onAIFillInput={(input) => handleAIFillInput(form, input)}
                onClearForm={() => handleClearForm(form)}
                aiAvailable={aiAvailability === 'available'}
                isGenerating={generatingForms.includes(form.id)}
                formContext={formContexts[form.id] ?? null}
                aiValues={aiValues}
                generatingInputs={generatingInputs}
                aiErrors={aiErrors}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FORM CARD
// ============================================================================

interface FormCardProps {
  form: ScannedForm;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onFillForm: () => void;
  onAIFillForm?: () => void;
  onFillInput: (input: ScannedInput) => void;
  onAIFillInput?: (input: ScannedInput) => void;
  onClearForm: () => void;
  aiAvailable?: boolean;
  isGenerating?: boolean;
  formContext?: AIFormContext | null;
  aiValues?: Record<string, AIFieldValue>;
  generatingInputs?: string[];
  aiErrors?: Record<string, string>;
}

function FormCard({
  form,
  isExpanded,
  onToggleExpand,
  onFillForm,
  onAIFillForm,
  onFillInput,
  onAIFillInput,
  onClearForm,
  aiAvailable = false,
  isGenerating = false,
  formContext,
  aiValues = {},
  generatingInputs = [],
  aiErrors = {},
}: FormCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
    >
      {/* Form Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 flex-1 text-left group"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {form.name}
                </h3>
                {formContext && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary">
                    <Brain className="w-3 h-3" />
                    <span>{formContext.purpose}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {form.fillableCount} fillable input{form.fillableCount !== 1 ? 's' : ''}
                {form.action !== '(no action)' && ` • Action: ${form.action}`}
                {formContext?.industry && ` • ${formContext.industry}`}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearForm}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear form"
            >
              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {/* AI Fill Button */}
            {aiAvailable && onAIFillForm && (
              <button
                onClick={onAIFillForm}
                disabled={isGenerating}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                  isGenerating
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-700"
                    : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                )}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI Fill
                  </>
                )}
              </button>
            )}

            {/* Standard Fill Button */}
            <button
              onClick={onFillForm}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700"
            >
              <Sparkles className="w-4 h-4" />
              Quick Fill
            </button>
          </div>
        </div>
      </div>

      {/* Form Inputs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {form.inputs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No inputs found in this form
                </p>
              ) : (
                form.inputs.map(input => (
                  <InputRow
                    key={input.id}
                    input={input}
                    onFillInput={() => onFillInput(input)}
                    onAIFillInput={onAIFillInput ? () => onAIFillInput(input) : undefined}
                    aiAvailable={aiAvailable}
                    aiValue={aiValues?.[input.id]}
                    isGenerating={generatingInputs?.includes(input.id)}
                    error={aiErrors?.[input.id]}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// INPUT ROW
// ============================================================================

interface InputRowProps {
  input: ScannedInput;
  onFillInput: () => void;
  onAIFillInput?: () => void;
  aiAvailable?: boolean;
  aiValue?: AIFieldValue;
  isGenerating?: boolean;
  error?: string;
}

function InputRow({ input, onFillInput, onAIFillInput, aiAvailable = false, aiValue, isGenerating = false, error }: InputRowProps) {
  const getFieldTypeColor = (fieldType: string): string => {
    const colorMap: Record<string, string> = {
      email: 'text-blue-600 dark:text-blue-400',
      phone: 'text-green-600 dark:text-green-400',
      address: 'text-purple-600 dark:text-purple-400',
      date: 'text-orange-600 dark:text-orange-400',
      password: 'text-red-600 dark:text-red-400',
      number: 'text-cyan-600 dark:text-cyan-400',
    };

    return colorMap[fieldType] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        input.isFillable
          ? "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
          : "bg-gray-100/50 dark:bg-gray-900/50 opacity-60"
      )}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {!input.isFillable ? (
          <Lock className="w-4 h-4 text-gray-400" />
        ) : isGenerating ? (
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
        ) : aiValue ? (
          <div className="relative">
            <Check className="w-4 h-4 text-primary" />
            <Brain className="w-2 h-2 text-primary absolute -bottom-0.5 -right-0.5" />
          </div>
        ) : input.value ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <AlertCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        )}
      </div>

      {/* Input Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {input.label || input.name}
          </span>
          <span className={cn("text-xs font-mono", getFieldTypeColor(input.fieldType))}>
            {input.fieldType}
          </span>
          {aiValue && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary">
              <Sparkles className="w-3 h-3" />
              <span>AI</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {input.type}
          </span>
          {input.placeholder && (
            <>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {input.placeholder}
              </span>
            </>
          )}
          {aiValue && aiValue.reasoning && (
            <>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-primary/70 truncate max-w-[300px]" title={aiValue.reasoning}>
                💡 {aiValue.reasoning}
              </span>
            </>
          )}
          {input.value && !aiValue && (
            <>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-success truncate max-w-[200px]">
                Current: {input.value}
              </span>
            </>
          )}
          {aiValue && (
            <>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-primary truncate max-w-[200px]">
                Value: {aiValue.value}
              </span>
            </>
          )}
          {error && (
            <>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-destructive truncate max-w-[200px]">
                Error: {error}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Fill Buttons */}
      {input.isFillable && (
        <div className="flex items-center gap-1">
          {/* AI Fill Button */}
          {aiAvailable && onAIFillInput && (
            <button
              onClick={onAIFillInput}
              disabled={isGenerating}
              className={cn(
                "flex-shrink-0 p-2 rounded-lg transition-colors group",
                isGenerating
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-primary/10"
              )}
              title="AI Fill"
            >
              <Wand2 className={cn(
                "w-4 h-4 transition-colors",
                isGenerating ? "text-gray-400" : "text-gray-400 group-hover:text-primary"
              )} />
            </button>
          )}

          {/* Quick Fill Button */}
          <button
            onClick={onFillInput}
            className="flex-shrink-0 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            title="Quick fill"
          >
            <Zap className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </button>
        </div>
      )}
    </div>
  );
}
