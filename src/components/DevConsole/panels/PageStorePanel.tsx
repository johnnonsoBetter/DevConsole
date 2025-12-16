/**
 * PageStorePanel Component
 * Manages page-specific autofill stores with AI-powered dataset generation.
 * Allows users to create, view, and manage form fill stores per URL.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  Clock,
  Database,
  Edit3,
  ExternalLink,
  FileJson,
  FolderOpen,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  PageStore,
  PageStoreDataset,
} from "../../../lib/autofill/pageStoreTypes";
import { cn } from "../../../utils";
import { usePageStoresStore } from "../../../utils/stores/pageStores";
import { usePageStoreAI } from "../../../hooks/usePageStoreAI";

// ============================================================================
// CONSTANTS
// ============================================================================

const PURPOSE_LABELS: Record<string, string> = {
  login: "Login Form",
  signup: "Sign Up Form",
  contact: "Contact Form",
  checkout: "Checkout",
  search: "Search",
  profile: "Profile",
  settings: "Settings",
  feedback: "Feedback",
  newsletter: "Newsletter",
  booking: "Booking",
  application: "Application",
  survey: "Survey",
  unknown: "Unknown",
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DatasetCardProps {
  dataset: PageStoreDataset;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DatasetCard({ dataset, isActive, onSelect, onEdit, onDelete }: DatasetCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "relative p-3 rounded-xl border transition-all cursor-pointer",
        isActive
          ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
          : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {dataset.name}
            </span>
            {dataset.isAIGenerated && (
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
            )}
          </div>
          {dataset.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {dataset.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-gray-400">
              {dataset.values.length} fields
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 z-20 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-500"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="absolute -left-px top-3 bottom-3 w-1 bg-primary rounded-full"
        />
      )}
    </motion.div>
  );
}

interface StoreItemProps {
  store: PageStore;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function StoreItem({ store, isSelected, onSelect, onDelete }: StoreItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-3 rounded-xl border transition-all cursor-pointer",
        isSelected
          ? "bg-primary/5 border-primary/30"
          : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {store.name}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">
            {store.hostname}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {store.datasets.length}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(store.lastUsedAt).toLocaleDateString()}
            </span>
            {store.hasAIDatasets && (
              <span className="flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete this page store?")) {
              onDelete();
            }
          }}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PageStorePanel() {
  const {
    stores,
    currentStore,
    isLoading,
    isGenerating,
    error,
    loadStores,
    setCurrentStore,
    createStore,
    deleteStore,
    deleteDataset,
    setActiveDataset,
    generateQuickDatasets,
    addDatasetsToStore,
    setIsGenerating,
    clearError,
    getStats,
  } = usePageStoresStore();

  // Use the AI hook for dataset generation
  const pageStoreAI = usePageStoreAI({
    onError: (err) => {
      console.error("AI generation error:", err);
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const [aiProgress, setAiProgress] = useState("");

  // Load stores on mount
  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Filter stores by search
  const filteredStores = useMemo(() => {
    if (!searchQuery) return stores;
    const q = searchQuery.toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.hostname.toLowerCase().includes(q) ||
        s.originalUrl.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  // Stats
  const stats = useMemo(() => getStats(), [stores, getStats]);

  const handleCreateStore = async () => {
    const store = await createStore({
      name: newStoreName || undefined,
    });
    if (store) {
      setShowCreateForm(false);
      setNewStoreName("");
    }
  };

  const handleGenerateAI = async () => {
    if (!currentStore) return;
    
    // Check if AI is configured
    if (!pageStoreAI.isConfigured) {
      alert("AI is not configured. Please set up your AI API key in the Settings panel.");
      return;
    }

    setIsGenerating(true);
    setAiProgress("Generating diverse datasets with AI...");

    try {
      // Generate 100 diverse persona-based datasets for extensive rotation
      const datasets = await pageStoreAI.generateDatasets(
        currentStore,
        { count: 100 }
      );

      // Add the generated datasets to the store
      if (datasets.length > 0) {
        await addDatasetsToStore(currentStore.id, datasets);
        console.log(`✅ Generated ${datasets.length} diverse datasets for rotation`);
        
        // Send message to content script to trigger autofill with the new datasets
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "AUTOFILL_WITH_PAGE_STORE",
              payload: { storeId: currentStore.id }
            });
          }
        } catch (err) {
          console.log("[PageStore] Could not notify content script:", err);
        }
      }

      setAiProgress("");
    } catch (error) {
      console.error("AI generation failed:", error);
      alert(`AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setAiProgress("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateQuick = async () => {
    if (!currentStore) return;
    await generateQuickDatasets(currentStore.id, 10);
  };

  const toggleDatasetExpanded = (datasetId: string) => {
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  };

  // Combined loading state
  const isAIGenerating = isGenerating || pageStoreAI.isGenerating;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Page Stores
            </h2>
            <p className="text-[11px] text-gray-500">
              {stats.totalStores} stores • {stats.totalDatasets} datasets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadStores()}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Store
          </button>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
              <button
                onClick={clearError}
                className="text-red-600 dark:text-red-400 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Store List */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-800/30">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Store List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && stores.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchQuery ? "No stores match your search" : "No page stores yet"}
              </div>
            ) : (
              <AnimatePresence>
                {filteredStores.map((store) => (
                  <StoreItem
                    key={store.id}
                    store={store}
                    isSelected={currentStore?.id === store.id}
                    onSelect={() => setCurrentStore(store)}
                    onDelete={() => deleteStore(store.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Main Panel - Store Details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentStore ? (
            <>
              {/* Store Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {currentStore.name}
                    </h3>
                    <a
                      href={currentStore.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 mt-0.5"
                    >
                      {currentStore.hostname}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                        {PURPOSE_LABELS[currentStore.pageMetadata.detectedPurpose]}
                      </span>
                      <span>{currentStore.forms.length} forms detected</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateQuick}
                      disabled={isAIGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Quick Generate
                    </button>
                    <button
                      onClick={handleGenerateAI}
                      disabled={isAIGenerating || !pageStoreAI.isConfigured}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity",
                        pageStoreAI.isConfigured
                          ? "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      )}
                      title={pageStoreAI.isConfigured ? "Generate datasets with AI" : "Configure AI in Settings first"}
                    >
                      {isAIGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Brain className="w-3.5 h-3.5" />
                      )}
                      AI Generate
                    </button>
                  </div>
                </div>
              </div>

              {/* Datasets */}
              <div className="flex-1 overflow-y-auto p-4">
                {currentStore.datasets.length === 0 ? (
                  <div className="text-center py-12">
                    <FileJson className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      No datasets yet
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Generate test data using AI or create datasets manually
                    </p>
                    {aiProgress && (
                      <p className="text-xs text-primary mb-4 animate-pulse">{aiProgress}</p>
                    )}
                    {!pageStoreAI.isConfigured && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                        ⚠️ Configure AI in Settings to use AI Generate
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleGenerateQuick}
                        disabled={isAIGenerating}
                        className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Wand2 className="w-4 h-4" />
                        Quick Generate
                      </button>
                      <button
                        onClick={handleGenerateAI}
                        disabled={isAIGenerating || !pageStoreAI.isConfigured}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
                          pageStoreAI.isConfigured
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        )}
                      >
                        {isAIGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4" />
                        )}
                        AI Generate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {currentStore.datasets.map((dataset) => (
                        <div key={dataset.id}>
                          <DatasetCard
                            dataset={dataset}
                            isActive={currentStore.activeDatasetId === dataset.id}
                            onSelect={() =>
                              setActiveDataset(currentStore.id, dataset.id)
                            }
                            onEdit={() => toggleDatasetExpanded(dataset.id)}
                            onDelete={() => {
                              if (confirm("Delete this dataset?")) {
                                deleteDataset(currentStore.id, dataset.id);
                              }
                            }}
                          />

                          {/* Expanded Field Values */}
                          <AnimatePresence>
                            {expandedDatasets.has(dataset.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 ml-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Field Values
                                </h5>
                                <div className="space-y-2">
                                  {dataset.values.map((value, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-2 text-xs"
                                    >
                                      <span className="font-medium text-gray-600 dark:text-gray-400 w-24 shrink-0">
                                        {value.fieldType}:
                                      </span>
                                      <span className="text-gray-900 dark:text-gray-100 break-all">
                                        {value.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select a Page Store
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Choose a page store from the sidebar or create a new one for the
                  current page
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Store
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Store Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create Page Store
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create a new autofill store for the current page. The store will
                analyze the forms and allow you to generate test datasets.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Store Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Login Form Tests"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to use the page title
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStore}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create Store
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PageStorePanel;
