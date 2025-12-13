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
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useGraphQLSmartMemoryV3 } from "../../hooks/useGraphQLSmartMemoryV3";
import { GraphQLIcon, RaindropIcon } from "../../icons";
import { loadGraphQLSettings } from "../../lib/devConsole/graphqlSettings";
import { buildRichSchemaTree, schemaTreeToJSON, type RichSchemaTree } from "../../lib/graphql/schemaTree";
import { cn } from "../../utils";
import "./graphiql-custom.css";
import { GraphQLAISlideout } from "./GraphQLAISlideout";
import { GraphQLSettingsPanel } from "./GraphQLSettingsPanel";
const GraphiQL = lazy(() => import('graphiql').then(module => ({ default: module.GraphiQL })));

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
  
  // AI Slideout state (replaces old inline panel)
  const [showAISlideout, setShowAISlideout] = useState(false);
  
  // Schema state
  const [schemaIngested, setSchemaIngested] = useState(false);
  const [isIngestingSchema, setIsIngestingSchema] = useState(false);
  const [introspectionData, setIntrospectionData] = useState<IntrospectionQuery | null>(null);
  const [richSchemaTree, setRichSchemaTree] = useState<RichSchemaTree | null>(null);
  
  // GraphiQL Controlled State - for inserting generated queries
  const [editorQuery, setEditorQuery] = useState<string | undefined>(undefined);
  const [editorVariables, setEditorVariables] = useState<string | undefined>(undefined);
  const [shouldExecute, setShouldExecute] = useState(false);

  // SmartMemory hook - V3 with cleaner API
  const {
    isLoading: isAILoading,
    isConfigured,
    schemaStats,
    indexProgress,
    indexSchema,
    searchSchema,
    generateQuery,
    saveTemplate,
    listTemplates,
    deleteTemplate,
    trackExploration,
    storeQueryPattern,
    checkConfigured,
    checkSchemaIndexed,
    clearSchemaIndex,
  } = useGraphQLSmartMemoryV3();

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

  // Insert query into GraphiQL editor (used by slideout)
  const handleInsertToEditor = useCallback((query: string) => {
    setEditorQuery(query);
  }, []);

  // Insert and immediately run the query (used by slideout)
  const handleInsertAndRun = useCallback((query: string) => {
    setEditorQuery(query);
    setShouldExecute(true);
  }, []);

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

  // Check if schema is already indexed when endpoint changes
  useEffect(() => {
    if (!graphqlEndpoint || !isConfigured) return;
    
    checkSchemaIndexed(graphqlEndpoint).then((indexedInfo) => {
      if (indexedInfo) {
        // Schema is already indexed!
        setSchemaIngested(true);
        console.log(`[GraphQL] Schema already indexed for ${graphqlEndpoint}`, indexedInfo);
      }
    });
  }, [graphqlEndpoint, isConfigured, checkSchemaIndexed]);

  // --------------------------------------------------------------------------
  // SCHEMA INGESTION
  // --------------------------------------------------------------------------

  const handleIngestSchema = useCallback(async (forceReindex = false) => {
    if (!graphqlEndpoint) return;
    
    setIsIngestingSchema(true);
    
    try {
      // Introspection query
      const response = await fetch(graphqlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: getIntrospectionQuery(),
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
      
      // Index schema into SmartMemory V3
      // This will automatically skip if already indexed (unless forceReindex=true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await indexSchema(schemaData as any, graphqlEndpoint, { forceReindex });
      
      // Only store pattern if we actually indexed (not skipped)
      if (!result.wasSkipped) {
        await storeQueryPattern(
          `Introspected schema: ${result.stats.queriesCount} queries, ${result.stats.mutationsCount} mutations, ${result.stats.typesCount} types`,
          `Full schema introspection from ${graphqlEndpoint}`
        );
      }
      
      if (result.stats.queriesCount > 0 || result.stats.mutationsCount > 0) {
        setSchemaIngested(true);
      }
    } catch (err) {
      console.error("Schema ingestion failed:", err);
    } finally {
      setIsIngestingSchema(false);
    }
  }, [graphqlEndpoint, indexSchema, storeQueryPattern]);
  
  // Force re-index schema (clears cache first)
  const handleForceReindex = useCallback(async () => {
    if (!graphqlEndpoint) return;
    await clearSchemaIndex(graphqlEndpoint);
    await handleIngestSchema(true);
  }, [graphqlEndpoint, clearSchemaIndex, handleIngestSchema]);

  // --------------------------------------------------------------------------
  // ACTIONS FOR AI SLIDEOUT
  // --------------------------------------------------------------------------

  // Generate query (called by slideout)
  const handleGenerateQuery = useCallback(async (prompt: string) => {
    const result = await generateQuery(prompt);
    if (result) {
      trackExploration("generate", { intent: prompt });
    }
    return result;
  }, [generateQuery, trackExploration]);

  // Search schema (called by slideout)
  const handleSearchSchema = useCallback(async (query: string) => {
    const results = await searchSchema(query, 10);
    trackExploration("search", { query });
    return results;
  }, [searchSchema, trackExploration]);

  // Save template (called by slideout)
  const handleSaveTemplate = useCallback(async (template: { name: string; query: string; description: string; endpoint: string }) => {
    return await saveTemplate(template);
  }, [saveTemplate]);

  // Delete template (called by slideout)
  const handleDeleteTemplate = useCallback(async (name: string) => {
    return await deleteTemplate(name);
  }, [deleteTemplate]);

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
          <GraphQLIcon className="w-12 h-12 text-[#E10098] mx-auto mb-3 animate-pulse" />
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E10098] to-primary flex items-center justify-center">
                <GraphQLIcon className="w-4 h-4 text-white" />
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E10098] to-primary flex items-center justify-center">
              <GraphQLIcon className="w-4 h-4 text-white" />
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
                    <RaindropIcon className="w-3 h-3" />
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
            {indexProgress && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg",
                indexProgress.phase === "error" 
                  ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                  : indexProgress.phase === "done"
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              )}>
                {indexProgress.phase === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : indexProgress.phase === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span className="max-w-xs truncate">{indexProgress.message}</span>
                {indexProgress.current !== undefined && indexProgress.total !== undefined && (
                  <span className="text-[10px] opacity-75">
                    ({indexProgress.current}/{indexProgress.total})
                  </span>
                )}
              </div>
            )}
            
            {/* Ingest Schema Button - Show different states */}
            {isConfigured && !indexProgress && (
              <>
                {!schemaIngested ? (
                  <button
                    onClick={() => handleIngestSchema()}
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
                ) : (
                  <div className="flex items-center gap-1.5">
                    {/* Schema indexed indicator */}
                    <span className="flex items-center gap-1.5 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Schema Indexed
                      {schemaStats && (
                        <span className="text-gray-500 dark:text-gray-400">
                          ({schemaStats.queriesCount}Q, {schemaStats.mutationsCount}M, {schemaStats.typesCount}T)
                        </span>
                      )}
                    </span>
                    {/* Re-index button */}
                    <button
                      onClick={handleForceReindex}
                      disabled={isIngestingSchema}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all",
                        "text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      title="Force re-index schema"
                    >
                      {isIngestingSchema ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Re-index
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* AI Assistant Toggle */}
            {isConfigured && (
              <button
                onClick={() => setShowAISlideout(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-blue-600"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Assistant
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

      {/* GraphQL AI Slideout */}
      <GraphQLAISlideout
        isOpen={showAISlideout}
        onClose={() => setShowAISlideout(false)}
        schemaIngested={schemaIngested}
        schemaStats={schemaStats}
        onGenerate={handleGenerateQuery}
        onSearch={handleSearchSchema}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onListTemplates={listTemplates}
        onIngestSchema={handleIngestSchema}
        onInsertQuery={handleInsertToEditor}
        onInsertAndRun={handleInsertAndRun}
        isLoading={isAILoading}
        isIngestingSchema={isIngestingSchema}
        graphqlEndpoint={graphqlEndpoint}
      />

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
