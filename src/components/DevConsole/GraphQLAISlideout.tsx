/**
 * GraphQL AI Slideout Component
 * A conversational AI interface for GraphQL query generation
 * Uses MobileDetailsSlideout pattern for proper presentation
 * Features:
 * - Chat-like conversational interface for query generation
 * - Message history with user prompts and AI responses
 * - Quick actions for common operations
 * - Integration with VSCode Copilot for deeper assistance
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Bookmark,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  History,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { SavedTemplate, SearchResult } from "../../hooks/useGraphQLSmartMemoryV3";
import { GraphQLIcon, VSCodeIcon } from "../../icons";
import { cn } from "../../utils";
import { EmbeddedCopilotChat, type EmbeddedCopilotContext } from "./EmbeddedCopilotChat";
import { MobileDetailsSlideout, MobileDetailsSlideoutContent } from "./MobileDetailsSlideout";

// ============================================================================
// TYPES
// ============================================================================

export type AISlideoutTab = "generate" | "search" | "templates" | "history";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  query?: string;
  explanation?: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface GraphQLAISlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Schema state
  schemaIngested: boolean;
  schemaStats?: { queriesCount: number; mutationsCount: number; typesCount: number } | null;
  
  // AI actions
  onGenerate: (prompt: string) => Promise<{ query: string; explanation?: string } | null>;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSaveTemplate: (template: { name: string; query: string; description: string; endpoint: string }) => Promise<boolean>;
  onDeleteTemplate: (name: string) => Promise<boolean>;
  onListTemplates: () => Promise<SavedTemplate[]>;
  onIngestSchema: () => Promise<void>;
  
  // Editor integration
  onInsertQuery: (query: string) => void;
  onInsertAndRun: (query: string) => void;
  
  // State
  isLoading: boolean;
  isIngestingSchema: boolean;
  graphqlEndpoint: string;
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "list-all",
    label: "List All",
    icon: Database,
    prompt: "Show me a query to list all records from the main entity",
    color: "blue",
  },
  {
    id: "get-by-id",
    label: "Get by ID",
    icon: Search,
    prompt: "Generate a query to get a single record by ID with all its fields",
    color: "purple",
  },
  {
    id: "create",
    label: "Create",
    icon: Sparkles,
    prompt: "Generate a mutation to create a new record",
    color: "green",
  },
  {
    id: "update",
    label: "Update",
    icon: RefreshCw,
    prompt: "Generate a mutation to update an existing record by ID",
    color: "amber",
  },
];

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

interface MessageBubbleProps {
  message: ConversationMessage;
  onCopy: (text: string) => void;
  onInsert: (query: string) => void;
  onInsertAndRun: (query: string) => void;
  onSave: (query: string, description: string) => void;
  copied: boolean;
}

const MessageBubble = memo(({
  message,
  onCopy,
  onInsert,
  onInsertAndRun,
  onSave,
  copied,
}: MessageBubbleProps) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const handleSave = () => {
    if (templateName.trim() && message.query) {
      onSave(message.query, message.content);
      setTemplateName("");
      setShowSaveDialog(false);
    }
  };

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm shadow-md">
          {message.content}
        </div>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[95%] space-y-3">
        {/* Avatar and content */}
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E10098] to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <GraphQLIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            {message.isStreaming ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating query...
              </div>
            ) : (
              <>
                {message.explanation && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {message.explanation}
                  </p>
                )}
                
                {message.query && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                    {/* Query header */}
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Generated Query
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onCopy(message.query!)}
                          className="p-1.5 text-gray-400 hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Copy query"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setShowSaveDialog(true)}
                          className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Save as template"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Query code */}
                    <pre className="p-3 text-xs font-mono text-gray-100 bg-gray-900 overflow-x-auto max-h-[200px] overflow-y-auto">
                      <code>{message.query}</code>
                    </pre>
                    
                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => onInsert(message.query!)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                          "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
                          "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        )}
                      >
                        <Send className="w-3.5 h-3.5" />
                        Insert
                      </button>
                      <button
                        onClick={() => onInsertAndRun(message.query!)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                          "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
                          "text-white shadow-sm"
                        )}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Run
                      </button>
                    </div>
                    
                    {/* Save dialog */}
                    <AnimatePresence>
                      {showSaveDialog && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Template name..."
                                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-green-300 dark:border-green-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                                autoFocus
                              />
                              <button
                                onClick={handleSave}
                                disabled={!templateName.trim()}
                                className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setShowSaveDialog(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                {!message.query && message.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {message.content}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const GraphQLAISlideout = memo(({
  isOpen,
  onClose,
  schemaIngested,
  schemaStats,
  onGenerate,
  onSearch,
  onSaveTemplate,
  onDeleteTemplate,
  onListTemplates,
  onIngestSchema,
  onInsertQuery,
  onInsertAndRun,
  isLoading,
  isIngestingSchema,
  graphqlEndpoint,
}: GraphQLAISlideoutProps) => {
  // State
  const [activeTab, setActiveTab] = useState<AISlideoutTab>("generate");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Load templates when tab changes
  useEffect(() => {
    if (activeTab === "templates") {
      onListTemplates().then(setTemplates);
    }
  }, [activeTab, onListTemplates]);
  
  // Focus input when opening
  useEffect(() => {
    if (isOpen && activeTab === "generate") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // Handle generate
  const handleGenerate = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;
    
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    
    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      },
    ]);
    
    // Add streaming placeholder
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      },
    ]);
    
    setInputValue("");
    
    // Generate query
    const result = await onGenerate(prompt);
    
    // Update with result
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: result?.explanation || "Here's your query:",
              query: result?.query,
              explanation: result?.explanation,
              isStreaming: false,
            }
          : msg
      )
    );
  }, [isLoading, onGenerate]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const results = await onSearch(inputValue);
    setSearchResults(results);
  }, [inputValue, isLoading, onSearch]);

  // Handle quick action
  const handleQuickAction = useCallback((action: QuickAction) => {
    setInputValue(action.prompt);
    handleGenerate(action.prompt);
  }, [handleGenerate]);

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === "generate") {
        handleGenerate(inputValue);
      } else if (activeTab === "search") {
        handleSearch();
      }
    }
  }, [activeTab, handleGenerate, handleSearch, inputValue]);

  // Handle copy
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Handle save template
  const handleSaveTemplate = useCallback(async (query: string, description: string) => {
    const name = `Query ${new Date().toLocaleTimeString()}`;
    await onSaveTemplate({
      name,
      query,
      description,
      endpoint: graphqlEndpoint,
    });
    if (activeTab === "templates") {
      const updated = await onListTemplates();
      setTemplates(updated);
    }
  }, [activeTab, graphqlEndpoint, onListTemplates, onSaveTemplate]);

  // Handle delete template
  const handleDeleteTemplate = useCallback(async (name: string) => {
    await onDeleteTemplate(name);
    const updated = await onListTemplates();
    setTemplates(updated);
  }, [onDeleteTemplate, onListTemplates]);

  // Clear conversation
  const handleClearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  // Build copilot context for VSCode integration
  const buildCopilotContext = useCallback((): EmbeddedCopilotContext | null => {
    if (messages.length === 0) return null;
    
    const recentQueries = messages
      .filter((m) => m.role === "assistant" && m.query)
      .slice(-3)
      .map((m) => m.query)
      .join("\n\n");
    
    return {
      type: "custom",
      title: "GraphQL Query Context",
      preview: `GraphQL queries from ${graphqlEndpoint}`,
      fullContext: `GraphQL Endpoint: ${graphqlEndpoint}\n\nRecent Queries:\n${recentQueries}`,
      metadata: {
        source: "graphql-explorer",
      },
    };
  }, [graphqlEndpoint, messages]);

  // Render details content (Generate tab)
  const renderDetailsContent = () => (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 shrink-0">
        {([
          { id: "generate", label: "Generate", icon: WandSparkles },
          { id: "search", label: "Search", icon: Search },
          { id: "templates", label: "Templates", icon: Bookmark },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Schema warning */}
      {!schemaIngested && activeTab !== "templates" && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <Database className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Index your schema for better results
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              AI queries work best with schema context
            </p>
          </div>
          <button
            onClick={() => onIngestSchema()}
            disabled={isIngestingSchema}
            className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isIngestingSchema ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Index
          </button>
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E10098]/10 to-purple-500/10 dark:from-[#E10098]/20 dark:to-purple-500/20 flex items-center justify-center mb-4">
                  <GraphQLIcon className="w-7 h-7 text-[#E10098]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  GraphQL AI Assistant
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mb-6">
                  Describe what you need in natural language and I'll generate the query
                </p>
                
                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
                        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                        "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm",
                        "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <action.icon className={cn(
                        "w-4 h-4",
                        action.color === "blue" && "text-blue-500",
                        action.color === "purple" && "text-purple-500",
                        action.color === "green" && "text-green-500",
                        action.color === "amber" && "text-amber-500",
                      )} />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onCopy={handleCopy}
                    onInsert={onInsertQuery}
                    onInsertAndRun={onInsertAndRun}
                    onSave={handleSaveTemplate}
                    copied={copied}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
            {messages.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleClearConversation}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                >
                  <History className="w-3 h-3" />
                  Clear conversation
                </button>
              </div>
            )}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your query..."
                className={cn(
                  "w-full px-4 py-3 pr-12 text-sm rounded-xl",
                  "bg-gray-100 dark:bg-gray-800 border-0",
                  "focus:ring-2 focus:ring-cyan-500 focus:outline-none",
                  "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                )}
              />
              <button
                onClick={() => handleGenerate(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2",
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "transition-all hover:shadow-md"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && (
        <MobileDetailsSlideoutContent className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search types, fields, operations..."
              className={cn(
                "w-full px-4 py-3 pr-12 text-sm rounded-xl",
                "bg-gray-100 dark:bg-gray-800 border-0",
                "focus:ring-2 focus:ring-purple-500 focus:outline-none",
                "placeholder:text-gray-400 dark:placeholder:text-gray-500"
              )}
            />
            <button
              onClick={handleSearch}
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                "w-8 h-8 rounded-lg flex items-center justify-center",
                "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "transition-all hover:shadow-md"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {searchResults.length} results found
              </p>
              {searchResults.map((result, i) => {
                let doc: { name?: string; kind?: string; category?: string; docType?: string; signature?: string; description?: string } = {};
                try { doc = JSON.parse(result.text); } catch {}
                
                return (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {doc.name || "Unknown"}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] rounded",
                        doc.docType === "operation"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      )}>
                        {doc.kind || doc.category || doc.docType || "item"}
                      </span>
                    </div>
                    {doc.signature && (
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {doc.signature}
                      </p>
                    )}
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">
                      Score: {(result.score * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </MobileDetailsSlideoutContent>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <MobileDetailsSlideoutContent className="space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                No saved templates
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Generate queries and save them for later
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.name}
                className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {template.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(template.query)}
                      className="p-1.5 text-gray-400 hover:text-cyan-500 rounded-md transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onInsertQuery(template.query)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {template.description && (
                  <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                )}
                <pre className="p-2 rounded-lg bg-gray-900 text-gray-100 text-[10px] font-mono overflow-x-auto max-h-[80px]">
                  <code>{template.query}</code>
                </pre>
                <p className="text-[10px] text-gray-400 mt-2">
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </MobileDetailsSlideoutContent>
      )}
    </div>
  );

  // Render chat content (VSCode integration)
  const renderChatContent = () => {
    const context = buildCopilotContext();
    
    if (!context) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
            <VSCodeIcon size={24} className="text-blue-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Generate some queries first
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Then use VS Code Copilot for deeper assistance
          </p>
        </div>
      );
    }
    
    return (
      <EmbeddedCopilotChat
        context={context}
        onSuccess={(requestId) => {
          console.log("✅ Sent to Copilot:", requestId);
        }}
        onFallback={(prompt) => {
          console.log("📋 Copied to clipboard:", prompt.slice(0, 50) + "...");
        }}
      />
    );
  };

  return (
    <MobileDetailsSlideout
      isOpen={isOpen}
      onClose={onClose}
      title="GraphQL AI Assistant"
      subtitle={schemaStats ? `${schemaStats.queriesCount}Q, ${schemaStats.mutationsCount}M, ${schemaStats.typesCount}T indexed` : graphqlEndpoint}
      headerActions={
        schemaIngested && (
          <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">
            <CheckCircle2 className="w-3 h-3" />
            Indexed
          </span>
        )
      }
      chatContent={renderChatContent()}
      showViewTabs={true}
    >
      {renderDetailsContent()}
    </MobileDetailsSlideout>
  );
});

GraphQLAISlideout.displayName = "GraphQLAISlideout";
