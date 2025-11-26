/**
 * GraphQL Explorer V2 - Full SmartMemory Integration
 * 
 * Features:
 * 1. Schema ingestion into semantic memory (searchable types/operations)
 * 2. AI query generation with real schema context
 * 3. Semantic search to find operations
 * 4. Template saving for successful queries
 * 5. Query explanation and optimization
 * 6. Session context tracking
 */

import { createGraphiQLFetcher } from "@graphiql/toolkit";
import "graphiql/style.css";
import {
    AlertCircle,
    Bookmark,
    Brain,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    Database,
    Loader2,
    MessageSquare,
    Save,
    Search,
    Settings as SettingsIcon,
    Sparkles,
    Wand2,
    WandSparkles,
    X,
    Zap
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphQLSmartMemoryV2, type GeneratedQuery, type QueryTemplate, type SemanticSearchResult } from "../../hooks/useGraphQLSmartMemoryV2";
import { loadGraphQLSettings } from "../../lib/devConsole/graphqlSettings";
import { cn } from "../../utils";
import "./graphiql-custom.css";
import { GraphQLSettingsPanel } from "./GraphQLSettingsPanel";
const GraphiQL = lazy(() => import('graphiql').then(module => ({ default: module.GraphiQL })));

// ============================================================================
// TYPES
// ============================================================================

type AIMode = "generate" | "explain" | "optimize" | "search" | "templates";

interface IntrospectionResult {
  __schema: {
    queryType?: { name: string };
    mutationType?: { name: string };
    subscriptionType?: { name: string };
    types: Array<{
      name: string;
      kind: string;
      description?: string;
      fields?: Array<{
        name: string;
        description?: string;
        type: { name?: string; kind: string; ofType?: unknown };
        args?: Array<{ name: string; type: unknown }>;
      }>;
      enumValues?: Array<{ name: string; description?: string }>;
      inputFields?: Array<{ name: string; type: unknown }>;
      interfaces?: Array<{ name: string }>;
      possibleTypes?: Array<{ name: string }>;
    }>;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GraphQLExplorerV2() {
  // Core state
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Panel state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>("generate");
  const [inputText, setInputText] = useState("");
  const [queryToAnalyze, setQueryToAnalyze] = useState("");
  
  // Results state
  const [generatedResult, setGeneratedResult] = useState<GeneratedQuery | null>(null);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [optimization, setOptimization] = useState<{ query: string; suggestions: string[] } | null>(null);
  
  // Schema state
  const [schemaIngested, setSchemaIngested] = useState(false);
  const [isIngestingSchema, setIsIngestingSchema] = useState(false);
  
  // UI state
  const [copied, setCopied] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // SmartMemory hook
  const {
    isLoading: isAILoading,
    error: aiError,
    isConfigured,
    schemaStats,
    indexingProgress,
    ingestSchema,
    searchSchema,
    generateQuery,
    explainQuery,
    optimizeQuery,
    saveTemplate,
    listTemplates,
    deleteTemplate,
    trackExploration,
    checkConfigured,
  } = useGraphQLSmartMemoryV2();

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  // Check configuration and load endpoint
  useEffect(() => {
    Promise.all([
      checkConfigured(),
      loadGraphQLSettings()
    ]).then(([_, settings]) => {
      if (settings?.endpoint) {
        setEndpoint(settings.endpoint);
      }
      setIsLoading(false);
    });
  }, [checkConfigured]);

  // Load templates when panel opens
  useEffect(() => {
    if (showAIPanel && aiMode === "templates" && isConfigured) {
      listTemplates().then(setTemplates);
    }
  }, [showAIPanel, aiMode, isConfigured, listTemplates]);

  // Check if schema is ingested
  useEffect(() => {
    if (schemaStats && schemaStats.typesCount > 0) {
      setSchemaIngested(true);
    }
  }, [schemaStats]);

  // --------------------------------------------------------------------------
  // GRAPHQL SETUP
  // --------------------------------------------------------------------------

  const graphqlEndpoint = useMemo(() => {
    if (!endpoint) return '';
    if (endpoint.startsWith('/')) {
      return `${window.location.origin}${endpoint}`;
    }
    return endpoint;
  }, [endpoint]);

  const fetcher = useMemo(() => {
    if (!graphqlEndpoint) return undefined;
    return createGraphiQLFetcher({
      url: graphqlEndpoint,
      fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
    });
  }, [graphqlEndpoint]);

  // --------------------------------------------------------------------------
  // SCHEMA INGESTION
  // --------------------------------------------------------------------------

  const handleIngestSchema = useCallback(async () => {
    if (!graphqlEndpoint) return;
    
    setIsIngestingSchema(true);
    
    try {
      // Introspection query
      const response = await fetch(graphqlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: `
            query IntrospectionQuery {
              __schema {
                queryType { name }
                mutationType { name }
                subscriptionType { name }
                types {
                  name
                  kind
                  description
                  fields(includeDeprecated: true) {
                    name
                    description
                    type { name kind ofType { name kind ofType { name kind ofType { name kind } } } }
                    args { name type { name kind ofType { name kind ofType { name kind } } } }
                  }
                  enumValues { name description }
                  inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
                  interfaces { name }
                  possibleTypes { name }
                }
              }
            }
          `,
        }),
      });
      
      const json = await response.json();
      
      if (json.errors) {
        throw new Error(json.errors[0]?.message || "Introspection failed");
      }
      
      const result = await ingestSchema(json.data as IntrospectionResult, graphqlEndpoint);
      
      if (result.success) {
        setSchemaIngested(true);
      }
    } catch (err) {
      console.error("Schema ingestion failed:", err);
    } finally {
      setIsIngestingSchema(false);
    }
  }, [graphqlEndpoint, ingestSchema]);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setGeneratedResult(null);
    const result = await generateQuery(inputText);
    if (result) {
      setGeneratedResult(result);
      trackExploration("generate_query", { intent: inputText });
    }
  }, [inputText, generateQuery, trackExploration]);

  const handleSearch = useCallback(async () => {
    if (!inputText.trim()) return;
    
    const results = await searchSchema(inputText, { limit: 10 });
    setSearchResults(results);
    trackExploration("search", { query: inputText });
  }, [inputText, searchSchema, trackExploration]);

  const handleExplain = useCallback(async () => {
    if (!queryToAnalyze.trim()) return;
    
    setExplanation(null);
    const result = await explainQuery(queryToAnalyze);
    setExplanation(result);
  }, [queryToAnalyze, explainQuery]);

  const handleOptimize = useCallback(async () => {
    if (!queryToAnalyze.trim()) return;
    
    setOptimization(null);
    const result = await optimizeQuery(queryToAnalyze);
    setOptimization({ query: result.optimizedQuery, suggestions: result.suggestions });
  }, [queryToAnalyze, optimizeQuery]);

  const handleSaveTemplate = useCallback(async () => {
    if (!saveTemplateName.trim() || !generatedResult?.query) return;
    
    const success = await saveTemplate({
      name: saveTemplateName,
      query: generatedResult.query,
      description: inputText,
      endpoint: graphqlEndpoint,
    });
    
    if (success) {
      setShowSaveDialog(false);
      setSaveTemplateName("");
      listTemplates().then(setTemplates);
    }
  }, [saveTemplateName, generatedResult, inputText, graphqlEndpoint, saveTemplate, listTemplates]);

  const handleDeleteTemplate = useCallback(async (name: string) => {
    const success = await deleteTemplate(name);
    if (success) {
      listTemplates().then(setTemplates);
    }
  }, [deleteTemplate, listTemplates]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (aiMode === "generate") handleGenerate();
      else if (aiMode === "search") handleSearch();
    }
  }, [aiMode, handleGenerate, handleSearch]);

  const handleSettingsSaved = useCallback(async () => {
    const settings = await loadGraphQLSettings();
    if (settings?.endpoint) {
      setEndpoint(settings.endpoint);
      setShowSettings(false);
      setSchemaIngested(false); // Reset schema state for new endpoint
    }
  }, []);

  // --------------------------------------------------------------------------
  // RENDER: Loading
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // RENDER: Settings
  // --------------------------------------------------------------------------

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
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  GraphQL Explorer
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure your GraphQL endpoint
                </p>
              </div>
            </div>
            {endpoint && (
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-500"
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

  // --------------------------------------------------------------------------
  // RENDER: Main Explorer
  // --------------------------------------------------------------------------

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
                {schemaIngested && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Schema Indexed
                  </span>
                )}
                {isConfigured && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    AI
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate max-w-md">
                {graphqlEndpoint}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Indexing Progress Display */}
            {indexingProgress && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg",
                indexingProgress.phase === "error" 
                  ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                  : indexingProgress.phase === "done"
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              )}>
                {indexingProgress.phase === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : indexingProgress.phase === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span className="max-w-xs truncate">{indexingProgress.message}</span>
                {indexingProgress.current !== undefined && indexingProgress.total !== undefined && (
                  <span className="text-[10px] opacity-75">
                    ({indexingProgress.current}/{indexingProgress.total})
                  </span>
                )}
              </div>
            )}
            
            {/* Ingest Schema Button */}
            {isConfigured && !schemaIngested && !indexingProgress && (
              <button
                onClick={handleIngestSchema}
                disabled={isIngestingSchema}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                  "hover:from-green-600 hover:to-emerald-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isIngestingSchema ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                Index Schema
              </button>
            )}
            
            {/* AI Assistant Toggle */}
            {isConfigured && (
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  showAIPanel
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                    : "text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Assistant
                {showAIPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      {showAIPanel && isConfigured && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-cyan-50/50 via-blue-50/50 to-purple-50/50 dark:from-cyan-900/10 dark:via-blue-900/10 dark:to-purple-900/10">
          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
            {([
              { id: "generate", label: "Generate", icon: WandSparkles },
              { id: "search", label: "Search Schema", icon: Search },
              { id: "explain", label: "Explain", icon: MessageSquare },
              { id: "optimize", label: "Optimize", icon: Wand2 },
              { id: "templates", label: "Templates", icon: Bookmark },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAiMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px",
                  aiMode === id
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Not indexed warning */}
            {!schemaIngested && aiMode !== "templates" && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-300">
                  Index your schema first for better AI results.
                </span>
                <button
                  onClick={handleIngestSchema}
                  disabled={isIngestingSchema}
                  className="ml-auto px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                >
                  {isIngestingSchema ? "Indexing..." : "Index Now"}
                </button>
              </div>
            )}

            {/* GENERATE MODE */}
            {aiMode === "generate" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your query... (e.g., 'get all users with their posts')"
                    className={cn(
                      "flex-1 px-4 py-2.5 text-sm rounded-lg border",
                      "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700",
                      "focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                    )}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isAILoading || !inputText.trim()}
                    className={cn(
                      "px-4 py-2.5 rounded-lg font-medium text-sm",
                      "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
                      "hover:from-cyan-600 hover:to-blue-600",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-center gap-2"
                    )}
                  >
                    {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    Generate
                  </button>
                </div>

                {generatedResult && (
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Generated Query
                          {generatedResult.relevantTypes && generatedResult.relevantTypes.length > 0 && (
                            <span className="text-gray-400">
                              (using: {generatedResult.relevantTypes.slice(0, 3).join(", ")})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowSaveDialog(true)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-green-600"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={() => handleCopy(generatedResult.query)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-cyan-600"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied!" : "Copy"}
                          </button>
                          <button onClick={() => setGeneratedResult(null)} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <pre className="p-3 rounded-lg bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto border border-gray-700">
                        <code>{generatedResult.query}</code>
                      </pre>
                    </div>
                    
                    {generatedResult.explanation && (
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        {generatedResult.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Save Template Dialog */}
                {showSaveDialog && (
                  <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Save as Template</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saveTemplateName}
                        onChange={(e) => setSaveTemplateName(e.target.value)}
                        placeholder="Template name..."
                        className="flex-1 px-3 py-1.5 text-xs rounded border border-green-300 dark:border-green-700 bg-white dark:bg-gray-900"
                      />
                      <button
                        onClick={handleSaveTemplate}
                        className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEARCH MODE */}
            {aiMode === "search" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search schema... (e.g., 'user authentication' or 'order mutations')"
                    className={cn(
                      "flex-1 px-4 py-2.5 text-sm rounded-lg border",
                      "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700",
                      "focus:ring-2 focus:ring-cyan-500/50"
                    )}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isAILoading || !inputText.trim()}
                    className={cn(
                      "px-4 py-2.5 rounded-lg font-medium text-sm",
                      "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      "disabled:opacity-50 flex items-center gap-2"
                    )}
                  >
                    {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">{searchResults.length} results found</p>
                    {searchResults.map((result, i) => {
                      let doc: { name?: string; kind?: string; category?: string; docType?: string; signature?: string; description?: string } = {};
                      try { doc = JSON.parse(result.text); } catch {}
                      
                      return (
                        <div key={i} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {doc.name || "Unknown"}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] rounded",
                              doc.docType === "operation" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                              "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            )}>
                              {doc.kind || doc.category || doc.docType || "item"}
                            </span>
                          </div>
                          {doc.signature && (
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{doc.signature}</p>
                          )}
                          {doc.description && (
                            <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">Score: {(result.score * 100).toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EXPLAIN MODE */}
            {aiMode === "explain" && (
              <div className="space-y-4">
                <textarea
                  ref={textareaRef}
                  value={queryToAnalyze}
                  onChange={(e) => setQueryToAnalyze(e.target.value)}
                  placeholder="Paste a GraphQL query to explain..."
                  className={cn(
                    "w-full px-4 py-3 text-sm rounded-lg border font-mono",
                    "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700",
                    "focus:ring-2 focus:ring-cyan-500/50",
                    "h-32 resize-none"
                  )}
                />
                <button
                  onClick={handleExplain}
                  disabled={isAILoading || !queryToAnalyze.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm",
                    "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
                    "disabled:opacity-50 flex items-center gap-2"
                  )}
                >
                  {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Explain Query
                </button>

                {explanation && (
                  <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {explanation}
                  </div>
                )}
              </div>
            )}

            {/* OPTIMIZE MODE */}
            {aiMode === "optimize" && (
              <div className="space-y-4">
                <textarea
                  value={queryToAnalyze}
                  onChange={(e) => setQueryToAnalyze(e.target.value)}
                  placeholder="Paste a GraphQL query to optimize..."
                  className={cn(
                    "w-full px-4 py-3 text-sm rounded-lg border font-mono",
                    "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700",
                    "h-32 resize-none"
                  )}
                />
                <button
                  onClick={handleOptimize}
                  disabled={isAILoading || !queryToAnalyze.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm",
                    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
                    "disabled:opacity-50 flex items-center gap-2"
                  )}
                >
                  {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Optimize
                </button>

                {optimization && (
                  <div className="space-y-3">
                    {optimization.suggestions.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">Suggestions:</p>
                        <ul className="list-disc list-inside text-xs text-amber-600 dark:text-amber-400 space-y-1">
                          {optimization.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Optimized Query:</p>
                      <pre className="p-3 rounded-lg bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
                        <code>{optimization.query}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATES MODE */}
            {aiMode === "templates" && (
              <div className="space-y-3">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved templates yet.</p>
                    <p className="text-xs mt-1">Generate queries and save them as templates!</p>
                  </div>
                ) : (
                  templates.map((template) => (
                    <div key={template.name} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{template.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(template.query)}
                            className="p-1 text-gray-400 hover:text-cyan-500"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.name)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                      )}
                      <pre className="p-2 rounded bg-gray-100 dark:bg-gray-900 text-xs font-mono overflow-x-auto">
                        <code>{template.query}</code>
                      </pre>
                      <p className="text-[10px] text-gray-400 mt-2">
                        Created: {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Error Display */}
            {aiError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {aiError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GraphiQL Editor */}
      <div className={cn(
        "flex-1 overflow-hidden graphiql-container",
        "[&_.graphiql-container]:bg-white dark:[&_.graphiql-container]:bg-gray-950"
      )}>
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        }>
          {fetcher && <GraphiQL fetcher={fetcher} defaultEditorToolsVisibility="variables" shouldPersistHeaders />}
        </Suspense>
      </div>
    </div>
  );
}
