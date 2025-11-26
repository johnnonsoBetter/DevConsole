import { useMemo, useState, useEffect, lazy, useCallback, useRef } from "react";
const GraphiQL = lazy(() => import('graphiql').then(module => ({ default: module.GraphiQL })));
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { 
  ExternalLink, 
  Zap, 
  Settings as SettingsIcon, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Copy,
  Check,
  Brain,
  Lightbulb,
  BookOpen,
  WandSparkles,
  X
} from "lucide-react";
import "graphiql/style.css";
import "./graphiql-custom.css";
import { cn } from "../../utils";
import { loadGraphQLSettings } from "../../lib/devConsole/graphqlSettings";
import { GraphQLSettingsPanel } from "./GraphQLSettingsPanel";
import { useGraphQLSmartMemory, type GeneratedQuery, type QuerySuggestion } from "../../hooks/useGraphQLSmartMemory";

export function GraphQLExplorer() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Assistant State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [generatedResult, setGeneratedResult] = useState<GeneratedQuery | null>(null);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [copied, setCopied] = useState(false);
  const [isRaindropConfigured, setIsRaindropConfigured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // GraphQL SmartMemory Hook - simplified, no complex init
  const {
    isLoading: isAILoading,
    error: aiError,
    generateQuery,
    checkConfigured,
  } = useGraphQLSmartMemory();

  // Check if Raindrop is configured on mount
  useEffect(() => {
    checkConfigured().then(setIsRaindropConfigured);
  }, [checkConfigured]);

  // Load endpoint from settings
  useEffect(() => {
    loadGraphQLSettings().then((settings) => {
      if (settings?.endpoint) {
        setEndpoint(settings.endpoint);
      }
      setIsLoading(false);
    });
  }, []);

  // Reload endpoint when settings are saved
  const handleSettingsSaved = async () => {
    const settings = await loadGraphQLSettings();
    if (settings?.endpoint) {
      setEndpoint(settings.endpoint);
      setShowSettings(false);
    }
  };

  const graphqlEndpoint = useMemo(() => {
    if (!endpoint) return '';
    
    // If it's a relative path, prepend the current origin
    if (endpoint.startsWith('/')) {
      return `${window.location.origin}${endpoint}`;
    }
    
    return endpoint;
  }, [endpoint]);

  const fetcher = useMemo(() => {
    if (!graphqlEndpoint) return undefined;
    
    return createGraphiQLFetcher({
      url: graphqlEndpoint,
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          credentials: "include",
        });
      },
    });
  }, [graphqlEndpoint]);

  // Handle AI query generation
  const handleGenerateQuery = useCallback(async () => {
    if (!aiQuery.trim()) return;
    
    setGeneratedResult(null);
    const result = await generateQuery(aiQuery);
    if (result) {
      setGeneratedResult(result);
    }
  }, [aiQuery, generateQuery]);

  // Handle input change (suggestions disabled for simplicity)
  const handleInputChange = useCallback((value: string) => {
    setAiQuery(value);
    // Clear any old suggestions
    setSuggestions([]);
  }, []);

  // Copy generated query to clipboard
  const handleCopyQuery = useCallback(() => {
    if (generatedResult?.query) {
      navigator.clipboard.writeText(generatedResult.query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedResult]);

  // Handle keyboard submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateQuery();
    }
  }, [handleGenerateQuery]);

  // Show settings panel if no endpoint configured or user clicks settings
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <Zap className="w-12 h-12 text-purple-500 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading GraphQL settings...</p>
        </div>
      </div>
    );
  }

  if (!endpoint || showSettings) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-500/5 via-purple-500/5 to-purple-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  GraphQL Explorer
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                    Configuration
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure your GraphQL endpoint to get started
                </p>
              </div>
            </div>
            {endpoint && (
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        <GraphQLSettingsPanel onSave={handleSettingsSaved} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-primary/5 via-purple-500/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                GraphQL Explorer
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                  GraphiQL
                </span>
                {isRaindropConfigured && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    AI
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                {graphqlEndpoint}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Assistant Toggle */}
            {isRaindropConfigured && (
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  showAIPanel
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                    : "text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                )}
                title="AI Query Assistant"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Assistant
                {showAIPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Configure Endpoint"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Settings
            </button>
            <a
              href="https://graphql.org/learn/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Docs
            </a>
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {showAIPanel && isRaindropConfigured && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-cyan-50/50 via-blue-50/50 to-purple-50/50 dark:from-cyan-900/10 dark:via-blue-900/10 dark:to-purple-900/10">
          <div className="p-4">
            {/* Input Area */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={aiQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to query... (e.g., 'get all users with their posts')"
                  className={cn(
                    "w-full px-4 py-2.5 pr-10 text-sm rounded-lg border",
                    "bg-white dark:bg-gray-900",
                    "border-gray-300 dark:border-gray-700",
                    "text-gray-900 dark:text-gray-100",
                    "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  )}
                />
                <Lightbulb className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button
                onClick={handleGenerateQuery}
                disabled={isAILoading || !aiQuery.trim()}
                className={cn(
                  "px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                  "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600",
                  "text-white shadow-md hover:shadow-lg",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                  "flex items-center gap-2"
                )}
              >
                {isAILoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <WandSparkles className="w-4 h-4" />
                )}
                Generate
              </button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && !generatedResult && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Matching operations:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAiQuery(`${s.type} ${s.name}`);
                        handleGenerateQuery();
                      }}
                      className={cn(
                        "px-2.5 py-1.5 text-xs rounded-lg border transition-all",
                        "bg-white dark:bg-gray-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20",
                        "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700",
                        "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <span className={cn(
                        "font-medium",
                        s.type === "query" ? "text-green-600 dark:text-green-400" :
                        s.type === "mutation" ? "text-orange-600 dark:text-orange-400" :
                        "text-purple-600 dark:text-purple-400"
                      )}>
                        {s.type}
                      </span>
                      <span className="mx-1">·</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {aiError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {aiError}
              </div>
            )}

            {/* Generated Result */}
            {generatedResult && (
              <div className="mt-4 space-y-3">
                {/* Query */}
                {generatedResult.query && (
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Generated Query
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyQuery}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => setGeneratedResult(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 rounded-lg bg-gray-900 dark:bg-gray-950 text-gray-100 text-xs font-mono overflow-x-auto border border-gray-700">
                      <code>{generatedResult.query}</code>
                    </pre>
                  </div>
                )}

                {/* Explanation */}
                {generatedResult.explanation && (
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {generatedResult.explanation}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* Not Configured Warning */}
            {!isRaindropConfigured && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                <p className="text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Configure Raindrop SmartMemory in Settings to enable AI features.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GraphiQL Editor */}
      <div className={cn(
        "flex-1 overflow-hidden graphiql-container",
        "[&_.graphiql-container]:bg-white dark:[&_.graphiql-container]:bg-gray-950",
        "[&_.graphiql-sidebar]:bg-gray-50 dark:[&_.graphiql-sidebar]:bg-gray-900",
        "[&_.graphiql-editor]:bg-white dark:[&_.graphiql-editor]:bg-gray-950",
        "[&_.CodeMirror]:bg-white dark:[&_.CodeMirror]:bg-gray-950",
        "[&_.CodeMirror]:text-gray-900 dark:[&_.CodeMirror]:text-gray-100",
        "[&_.graphiql-toolbar]:bg-gray-50 dark:[&_.graphiql-toolbar]:bg-gray-900"
      )}>
        {fetcher && (
          <GraphiQL
            fetcher={fetcher}
            defaultEditorToolsVisibility="variables"
            shouldPersistHeaders
         />
        )}
      </div>
    </div>
  );
}
