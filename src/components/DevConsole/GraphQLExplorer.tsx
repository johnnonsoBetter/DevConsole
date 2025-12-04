import { createGraphiQLFetcher } from "@graphiql/toolkit";
import "graphiql/style.css";
import {
    BookOpen,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    ExternalLink,
    Lightbulb,
    Loader2,
    Play,
    Send,
    Settings as SettingsIcon,
    Sparkles,
    WandSparkles,
    X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphQLSmartMemoryV2, type GeneratedQuery } from "../../hooks/useGraphQLSmartMemoryV2";
import { GraphQLIcon, RaindropIcon } from "../../icons";
import { loadGraphQLSettings } from "../../lib/devConsole/graphqlSettings";
import { fetchSchemaIntrospection } from "../../lib/graphql/introspection";
import { cn } from "../../utils";
import "./graphiql-custom.css";
import { GraphQLSettingsPanel } from "./GraphQLSettingsPanel";
const GraphiQL = lazy(() => import('graphiql').then(module => ({ default: module.GraphiQL })));

export function GraphQLExplorer() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Assistant State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [generatedResult, setGeneratedResult] = useState<GeneratedQuery | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRaindropConfigured, setIsRaindropConfigured] = useState(false);
  const [schemaIndexed, setSchemaIndexed] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // GraphiQL Controlled State - for inserting generated queries
  const [editorQuery, setEditorQuery] = useState<string | undefined>(undefined);
  const [editorVariables, setEditorVariables] = useState<string | undefined>(undefined);
  const [shouldExecute, setShouldExecute] = useState(false);

  // GraphQL SmartMemory Hook - V2 with schema ingestion
  const {
    isLoading: isAILoading,
    error: aiError,
    generateQuery,
    checkConfigured,
    ingestSchema,
    checkIndexedSchema,
    schemaStats,
    indexingProgress,
  } = useGraphQLSmartMemoryV2();

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

  // Compute the full graphql endpoint URL
  const graphqlEndpoint = useMemo(() => {
    if (!endpoint) return '';
    
    // If it's a relative path, prepend the current origin
    if (endpoint.startsWith('/')) {
      return `${window.location.origin}${endpoint}`;
    }
    
    return endpoint;
  }, [endpoint]);

  // Check if Raindrop is configured on mount
  useEffect(() => {
    checkConfigured().then(setIsRaindropConfigured);
  }, [checkConfigured]);

  // Check if schema is already indexed
  useEffect(() => {
    if (isRaindropConfigured && endpoint) {
      checkIndexedSchema().then((stats) => {
        if (stats && stats.endpoint === endpoint) {
          setSchemaIndexed(true);
        } else {
          setSchemaIndexed(false);
        }
      });
    }
  }, [isRaindropConfigured, endpoint, checkIndexedSchema]);

  // Index schema into SmartMemory for AI-powered query generation
  const handleIndexSchema = useCallback(async () => {
    if (!endpoint || !graphqlEndpoint || !isRaindropConfigured || isIndexing) return;
    
    setIsIndexing(true);
    try {
      // Fetch schema via introspection
      const introspectionResult = await fetchSchemaIntrospection({ endpoint: graphqlEndpoint });
      
      if (introspectionResult.success && introspectionResult.data) {
        // Cast to the expected format - the structure is compatible
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schemaData = introspectionResult.data as any;
        
        // Ingest into SmartMemory
        const result = await ingestSchema(schemaData, endpoint);
        if (result.success) {
          setSchemaIndexed(true);
        }
      }
    } catch (err) {
      console.error('Failed to index schema:', err);
    } finally {
      setIsIndexing(false);
    }
  }, [endpoint, graphqlEndpoint, isRaindropConfigured, isIndexing, ingestSchema]);

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

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setAiQuery(value);
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

  // Insert generated query into GraphiQL editor
  const handleInsertToEditor = useCallback(() => {
    if (generatedResult?.query) {
      setEditorQuery(generatedResult.query);
      if (generatedResult.variables) {
        setEditorVariables(JSON.stringify(generatedResult.variables, null, 2));
      }
      // Close the AI panel after inserting
      setGeneratedResult(null);
      setAiQuery("");
    }
  }, [generatedResult]);

  // Insert and immediately run the query
  const handleInsertAndRun = useCallback(() => {
    if (generatedResult?.query) {
      setEditorQuery(generatedResult.query);
      if (generatedResult.variables) {
        setEditorVariables(JSON.stringify(generatedResult.variables, null, 2));
      }
      setShouldExecute(true);
      // Close the AI panel after inserting
      setGeneratedResult(null);
      setAiQuery("");
    }
  }, [generatedResult]);

  // Effect to trigger execution after query is set
  useEffect(() => {
    if (shouldExecute && editorQuery) {
      // Small delay to ensure the editor has updated
      const timer = setTimeout(() => {
        // Trigger the execute button click via DOM
        const executeButton = document.querySelector('.graphiql-execute-button') as HTMLButtonElement;
        if (executeButton) {
          executeButton.click();
        }
        setShouldExecute(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldExecute, editorQuery]);

  // Show settings panel if no endpoint configured or user clicks settings
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <GraphQLIcon className="w-12 h-12 text-[#E10098] mx-auto mb-3 animate-pulse" />
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E10098] to-primary flex items-center justify-center">
                <GraphQLIcon className="w-4 h-4 text-white" />
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E10098] to-primary flex items-center justify-center">
              <GraphQLIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                GraphQL Explorer
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                  GraphiQL
                </span>
                {isRaindropConfigured && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded flex items-center gap-1">
                    <RaindropIcon className="w-3 h-3" />
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

            {/* Schema Indexing Status */}
            {!schemaIndexed && !isIndexing && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <RaindropIcon className="w-4 h-4" />
                    Schema not indexed. Index it for better query generation.
                  </p>
                  <button
                    onClick={handleIndexSchema}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  >
                    Index Schema
                  </button>
                </div>
              </div>
            )}

            {/* Indexing Progress */}
            {(isIndexing || indexingProgress) && (
              <div className="mt-3 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                <p className="text-sm text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {indexingProgress?.message || 'Indexing schema...'}
                </p>
              </div>
            )}

            {/* Schema Stats */}
            {schemaIndexed && schemaStats && !generatedResult && (
              <div className="mt-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Check className="w-3 h-3" />
                  Schema indexed: {schemaStats.queriesCount} queries, {schemaStats.mutationsCount} mutations, {schemaStats.typesCount} types
                </p>
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
                    
                    {/* Action Buttons - Grid layout for consistent visibility */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={handleInsertToEditor}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all",
                          "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                          "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                        )}
                      >
                        <Send className="w-4 h-4 flex-shrink-0" />
                        <span>Insert to Editor</span>
                      </button>
                      <button
                        onClick={handleInsertAndRun}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all",
                          "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
                          "text-white shadow-lg hover:shadow-xl"
                        )}
                      >
                        <Play className="w-4 h-4 flex-shrink-0" />
                        <span>Run Query</span>
                      </button>
                    </div>
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
          <Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          }>
            <GraphiQL
              fetcher={fetcher}
              query={editorQuery}
              variables={editorVariables}
              onEditQuery={(newQuery) => setEditorQuery(newQuery)}
              onEditVariables={(newVariables) => setEditorVariables(newVariables)}
              defaultEditorToolsVisibility="variables"
              shouldPersistHeaders
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
