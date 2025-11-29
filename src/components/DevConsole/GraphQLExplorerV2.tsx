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
import { getIntrospectionQuery, type IntrospectionQuery } from "graphql";
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
  Download,
  Loader2,
  MessageSquare,
  Play,
  Save,
  Search,
  Send,
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
import { buildRichSchemaTree, schemaTreeToJSON, type RichSchemaTree } from "../../lib/graphql/schemaTree";
import { cn } from "../../utils";
import "./graphiql-custom.css";
import { GraphQLSettingsPanel } from "./GraphQLSettingsPanel";
const GraphiQL = lazy(() => import('graphiql').then(module => ({ default: module.GraphiQL })));

// ============================================================================
// TYPES
// ============================================================================

type AIMode = "generate" | "explain" | "optimize" | "search" | "templates";

// Using IntrospectionQuery from 'graphql' package for full structured data
// This captures the complete schema as structured in GraphQL Playground

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
  const [introspectionData, setIntrospectionData] = useState<IntrospectionQuery | null>(null);
  const [richSchemaTree, setRichSchemaTree] = useState<RichSchemaTree | null>(null);
  
  // UI state
  const [copied, setCopied] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // GraphiQL Controlled State - for inserting generated queries
  const [editorQuery, setEditorQuery] = useState<string | undefined>(undefined);
  const [editorVariables, setEditorVariables] = useState<string | undefined>(undefined);
  const [shouldExecute, setShouldExecute] = useState(false);
  
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

  // Insert generated query into GraphiQL editor
  const handleInsertToEditor = useCallback(() => {
    if (generatedResult?.query) {
      setEditorQuery(generatedResult.query);
      if (generatedResult.variables) {
        setEditorVariables(JSON.stringify(generatedResult.variables, null, 2));
      }
      // Close the result after inserting
      setGeneratedResult(null);
      setInputText("");
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
      // Close the result after inserting
      setGeneratedResult(null);
      setInputText("");
    }
  }, [generatedResult]);

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
          query: await getIntrospectionQuery(),
        }),
      });
      
      const json = await response.json();
      
      if (json.errors) {
        throw new Error(json.errors[0]?.message || "Introspection failed");
      }
      
      // Store introspection data for download - full structured data as in GraphQL Playground
      const schemaData = json.data as IntrospectionQuery;
      setIntrospectionData(schemaData);
      
      // Build rich schema tree for enhanced download
      const richTree = buildRichSchemaTree(schemaData, graphqlEndpoint);
      setRichSchemaTree(richTree);
      
      // Convert to a mutable format compatible with ingestSchema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await ingestSchema(schemaData as any, graphqlEndpoint);
      
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
      setIntrospectionData(null); // Reset introspection data for new endpoint
      setRichSchemaTree(null); // Reset rich schema tree for new endpoint
    }
  }, []);

  // Download rich schema tree as JSON (deeply nested structure)
  const handleDownloadSchema = useCallback(() => {
    if (!richSchemaTree) return;
    
    const dataStr = schemaTreeToJSON(richSchemaTree);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const endpointName = graphqlEndpoint
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    link.download = `graphql-schema-tree-${endpointName}-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [richSchemaTree, graphqlEndpoint]);

  // Download raw introspection data
  const handleDownloadRawIntrospection = useCallback(() => {
    if (!introspectionData) return;
    
    const dataStr = JSON.stringify(introspectionData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const endpointName = graphqlEndpoint
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    link.download = `graphql-introspection-${endpointName}-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [introspectionData, graphqlEndpoint]);

  // Download SDL
  const handleDownloadSDL = useCallback(() => {
    if (!richSchemaTree?.sdl) return;
    
    const blob = new Blob([richSchemaTree.sdl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const endpointName = graphqlEndpoint
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    link.download = `schema-${endpointName}-${new Date().toISOString().split('T')[0]}.graphql`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [richSchemaTree, graphqlEndpoint]);

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
                {richSchemaTree && (
                  <div className="relative group">
                    <button
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                      title="Download schema"
                    >
                      <Download className="w-3 h-3" />
                      Download
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {/* Dropdown menu */}
                    <div className="absolute left-0 top-full mt-1 w-48 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <button
                        onClick={handleDownloadSchema}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-500" />
                        <div>
                          <div className="font-medium">Rich Schema Tree</div>
                          <div className="text-[10px] text-gray-400">Deeply nested JSON structure</div>
                        </div>
                      </button>
                      <button
                        onClick={handleDownloadRawIntrospection}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-500" />
                        <div>
                          <div className="font-medium">Raw Introspection</div>
                          <div className="text-[10px] text-gray-400">Standard GraphQL format</div>
                        </div>
                      </button>
                      <button
                        onClick={handleDownloadSDL}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5 text-green-500" />
                        <div>
                          <div className="font-medium">SDL (.graphql)</div>
                          <div className="text-[10px] text-gray-400">Schema Definition Language</div>
                        </div>
                      </button>
                    </div>
                  </div>
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
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-cyan-50/50 via-blue-50/50 to-purple-50/50 dark:from-cyan-900/10 dark:via-blue-900/10 dark:to-purple-900/10 flex flex-col max-h-[60vh]">
          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
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

          <div className="p-4 overflow-y-auto flex-1 min-h-0">
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
                {/* Input Section */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WandSparkles className="w-4 h-4 text-cyan-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Describe Your Query</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Press Enter to generate</span>
                  </div>
                  <div className="flex items-center gap-2 p-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., 'get all users with their posts' or 'create a new project mutation'"
                      className={cn(
                        "flex-1 px-3 py-2.5 text-sm rounded-lg",
                        "bg-transparent border-0",
                        "focus:ring-0 focus:outline-none",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      )}
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isAILoading || !inputText.trim()}
                      className={cn(
                        "px-4 py-2.5 rounded-lg font-medium text-sm flex-shrink-0",
                        "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
                        "hover:from-cyan-600 hover:to-blue-600",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "flex items-center gap-2",
                        "shadow-md hover:shadow-lg transition-all"
                      )}
                    >
                      {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                      {isAILoading ? "..." : "Generate"}
                    </button>
                  </div>
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
                      
                      {/* Action Buttons - Insert to Editor and Run Query */}
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
                {/* Input Section */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Search Schema</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Find types, fields, and operations</span>
                  </div>
                  <div className="flex items-center gap-2 p-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., 'user authentication' or 'order mutations' or 'payment fields'"
                      className={cn(
                        "flex-1 px-3 py-2.5 text-sm rounded-lg",
                        "bg-transparent border-0",
                        "focus:ring-0 focus:outline-none",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      )}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isAILoading || !inputText.trim()}
                      className={cn(
                        "px-4 py-2.5 rounded-lg font-medium text-sm flex-shrink-0",
                        "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                        "hover:from-purple-600 hover:to-pink-600",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "flex items-center gap-2",
                        "shadow-md hover:shadow-lg transition-all"
                      )}
                    >
                      {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {isAILoading ? "..." : "Search"}
                    </button>
                  </div>
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
                {/* Input Section */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Query to Explain</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Paste your GraphQL query</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={queryToAnalyze}
                    onChange={(e) => setQueryToAnalyze(e.target.value)}
                    placeholder={`Example:\nquery GetUsers {\n  users {\n    id\n    name\n    email\n  }\n}`}
                    className={cn(
                      "w-full px-4 py-3 text-sm font-mono",
                      "bg-transparent border-0",
                      "focus:ring-0 focus:outline-none",
                      "min-h-[120px] max-h-[200px] resize-y",
                      "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    )}
                  />
                </div>
                
                <button
                  onClick={handleExplain}
                  disabled={isAILoading || !queryToAnalyze.trim()}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl font-medium text-sm",
                    "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
                    "hover:from-orange-600 hover:to-amber-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2",
                    "shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30",
                    "transition-all duration-200"
                  )}
                >
                  {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  {isAILoading ? "Analyzing..." : "Explain Query"}
                </button>

                {/* Explanation Result */}
                {explanation && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 overflow-hidden">
                    <div className="px-4 py-2.5 bg-blue-100/50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800/50">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5" />
                        Explanation
                      </p>
                    </div>
                    <div className="p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed">
                      {explanation}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPTIMIZE MODE */}
            {aiMode === "optimize" && (
              <div className="space-y-4">
                {/* Input Section */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Query to Optimize</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Paste your query or describe the issue</span>
                  </div>
                  <textarea
                    value={queryToAnalyze}
                    onChange={(e) => setQueryToAnalyze(e.target.value)}
                    placeholder={`Example:\nnetworks(where: { members: 3 }) { is having error\n\nOr paste your full GraphQL query here...`}
                    className={cn(
                      "w-full px-4 py-3 text-sm font-mono",
                      "bg-transparent border-0",
                      "focus:ring-0 focus:outline-none",
                      "min-h-[120px] max-h-[200px] resize-y",
                      "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    )}
                  />
                </div>
                
                <button
                  onClick={handleOptimize}
                  disabled={isAILoading || !queryToAnalyze.trim()}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl font-medium text-sm",
                    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
                    "hover:from-emerald-600 hover:to-teal-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2",
                    "shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30",
                    "transition-all duration-200"
                  )}
                >
                  {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {isAILoading ? "Analyzing..." : "Optimize Query"}
                </button>

                {/* Results Section */}
                {optimization && (
                  <div className="space-y-4 pt-2">
                    {/* Suggestions Card */}
                    {optimization.suggestions.length > 0 && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 overflow-hidden">
                        <div className="px-4 py-2.5 bg-amber-100/50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/50">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Suggestions
                          </p>
                        </div>
                        <ul className="p-4 space-y-2">
                          {optimization.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Optimized Query Card */}
                    <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 overflow-hidden">
                      <div className="px-4 py-2.5 bg-green-100/50 dark:bg-green-900/30 border-b border-green-200 dark:border-green-800/50 flex items-center justify-between">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Optimized Query
                        </p>
                        <button
                          onClick={() => handleCopy(optimization.query)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-200/50 dark:hover:bg-green-800/30 rounded-md transition-colors"
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="p-4">
                        <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
                          <code>{optimization.query}</code>
                        </pre>
                        
                        {/* Action Buttons for Optimized Query */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <button
                            onClick={() => {
                              setEditorQuery(optimization.query);
                              setOptimization(null);
                              setQueryToAnalyze("");
                            }}
                            className={cn(
                              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                              "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
                              "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                            )}
                          >
                            <Send className="w-4 h-4 flex-shrink-0" />
                            <span>Insert to Editor</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditorQuery(optimization.query);
                              setShouldExecute(true);
                              setOptimization(null);
                              setQueryToAnalyze("");
                            }}
                            className={cn(
                              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                              "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
                              "text-white shadow-md hover:shadow-lg"
                            )}
                          >
                            <Play className="w-4 h-4 flex-shrink-0" />
                            <span>Run Query</span>
                          </button>
                        </div>
                      </div>
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
          {fetcher && (
            <GraphiQL
              fetcher={fetcher}
              query={editorQuery}
              variables={editorVariables}
              onEditQuery={(newQuery) => setEditorQuery(newQuery)}
              onEditVariables={(newVariables) => setEditorVariables(newVariables)}
              defaultEditorToolsVisibility="variables"
              shouldPersistHeaders
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
