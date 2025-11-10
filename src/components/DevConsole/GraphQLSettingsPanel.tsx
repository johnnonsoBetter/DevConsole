import { useState, useEffect } from "react";
import { Settings, Save, TestTube, CheckCircle, XCircle, Loader, Zap } from "lucide-react";
import { cn } from "../../utils";
import {
  loadGraphQLSettings,
  saveGraphQLSettings,
  clearGraphQLSettings,
  validateGraphQLEndpoint,
  testGraphQLConnection,
  type GraphQLSettings,
} from "../../lib/devConsole/graphqlSettings";

// ============================================================================
// GRAPHQL SETTINGS PANEL
// ============================================================================

interface GraphQLSettingsPanelProps {
  onSave?: () => void;
}

export function GraphQLSettingsPanel({ onSave }: GraphQLSettingsPanelProps) {
  const [endpoint, setEndpoint] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [testStatus, setTestStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    loadGraphQLSettings().then((settings) => {
      if (settings) {
        setEndpoint(settings.endpoint);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaveStatus({ type: null, message: "" });
    setTestStatus({ type: null, message: "" });

    const validation = validateGraphQLEndpoint(endpoint);

    if (!validation.valid) {
      setSaveStatus({
        type: "error",
        message: validation.errors.join(", "),
      });
      return;
    }

    setIsSaving(true);

    try {
      const settings: GraphQLSettings = {
        endpoint: endpoint.trim(),
      };

      await saveGraphQLSettings(settings);

      setSaveStatus({
        type: "success",
        message: "GraphQL endpoint saved successfully!",
      });

      // Auto-clear success message after 3s
      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 3000);

      // Notify parent component
      onSave?.();
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestStatus({ type: null, message: "" });

    const validation = validateGraphQLEndpoint(endpoint);

    if (!validation.valid) {
      setTestStatus({
        type: "error",
        message: validation.errors.join(", "),
      });
      return;
    }

    setIsTesting(true);

    try {
      const result = await testGraphQLConnection(endpoint.trim());

      if (result.valid) {
        setTestStatus({
          type: "success",
          message: "Connection successful! GraphQL endpoint is accessible.",
        });
      } else {
        setTestStatus({
          type: "error",
          message: result.error || "Connection failed",
        });
      }
    } catch (error) {
      setTestStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear the GraphQL endpoint?")) {
      await clearGraphQLSettings();
      setEndpoint("");
      setSaveStatus({ type: null, message: "" });
      setTestStatus({ type: null, message: "" });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                GraphQL Explorer Settings
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your GraphQL endpoint to use the interactive GraphQL Explorer.
            </p>
          </div>

          {/* Settings Form */}
          <div className="space-y-4">
            {/* Endpoint URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GraphQL Endpoint URL <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.example.com/graphql or /graphql"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono text-sm"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  You can use either:
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside ml-2 space-y-0.5">
                  <li>
                    <strong>Absolute URL:</strong>{" "}
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      https://api.example.com/graphql
                    </code>
                  </li>
                  <li>
                    <strong>Relative path:</strong>{" "}
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      /graphql
                    </code>{" "}
                    (uses current domain)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-6 space-y-2">
            {saveStatus.type && (
              <div
                className={cn(
                  "p-3 rounded-lg flex items-start gap-2 text-sm",
                  saveStatus.type === "success"
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                {saveStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <p>{saveStatus.message}</p>
              </div>
            )}

            {testStatus.type && (
              <div
                className={cn(
                  "p-3 rounded-lg flex items-start gap-2 text-sm",
                  testStatus.type === "success"
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                {testStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <p>{testStatus.message}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>

            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 px-6 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>

            <button
              onClick={handleClear}
              className="px-6 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-colors border border-destructive/20"
            >
              Clear
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-info/10 border border-info/20 rounded-lg">
            <h4 className="text-sm font-semibold text-info mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              How to Use
            </h4>
            <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
              <li>Enter your GraphQL endpoint URL (absolute or relative path)</li>
              <li>Click "Test Connection" to verify the endpoint is accessible</li>
              <li>Click "Save Settings" to store your configuration</li>
              <li>The GraphQL Explorer will use this endpoint for queries</li>
            </ol>
          </div>

          {/* Examples Section */}
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
              📝 Example Endpoints
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Public GitHub API:</span>
                <code className="block mt-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-800/30 font-mono">
                  https://api.github.com/graphql
                </code>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Local development:</span>
                <code className="block mt-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-800/30 font-mono">
                  http://localhost:4000/graphql
                </code>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Relative path (same domain):</span>
                <code className="block mt-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-800/30 font-mono">
                  /api/graphql
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
