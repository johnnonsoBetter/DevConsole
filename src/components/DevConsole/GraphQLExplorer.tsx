import { useMemo } from "react";
import { GraphiQL } from "graphiql";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { ExternalLink, Zap } from "lucide-react";
import "graphiql/style.css";
import "./graphiql-custom.css";
import { cn } from "src/utils";

export function GraphQLExplorer() {
  const graphqlEndpoint = useMemo(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/graphql`;
  }, []);

  const fetcher = useMemo(() => {
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
        <GraphiQL
          fetcher={fetcher}
          defaultEditorToolsVisibility="variables"
          shouldPersistHeaders
        />
      </div>
    </div>
  );
}
