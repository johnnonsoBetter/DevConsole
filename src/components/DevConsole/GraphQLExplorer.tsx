import { useMemo, useState, useEffect, lazy } from "react";
const GraphiQL = lazy(() => import('graphiql').then(module => ({ default: module.GraphiQL })));
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { ExternalLink, Zap, Settings as SettingsIcon } from "lucide-react";
import "graphiql/style.css";
import "./graphiql-custom.css";
import { cn } from "../../utils";
import { loadGraphQLSettings } from "../../lib/devConsole/graphqlSettings";
import { GraphQLSettingsPanel } from "./GraphQLSettingsPanel";

export function GraphQLExplorer() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                {graphqlEndpoint}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              GraphQL Docs
            </a>
          </div>
        </div>
      </div>
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
