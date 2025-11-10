/**
 * CodeSandboxPanel Component
 * Provides an embedded CodeSandbox-like editor using Sandpack
 * Allows developers to quickly prototype and test code snippets
 */

const Sandpack = lazy(() => import('@codesandbox/sandpack-react').then(mod => ({ default: mod.Sandpack })   ));

import { Code, Copy, Download, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { lazy, useCallback, useState } from 'react';
import { useUnifiedTheme } from '../../hooks/useTheme';
import { cn } from '../../utils';

// ============================================================================
// TYPES
// ============================================================================

interface CodeTemplate {
  id: string;
  name: string;
  template: 'react' | 'react-ts' | 'vanilla' | 'vanilla-ts' | 'vue' | 'vue-ts' | 'angular' | 'svelte';
  files: Record<string, { code: string }>;
}

// ============================================================================
// PREDEFINED TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: CodeTemplate[] = [
  {
    id: 'react-basic',
    name: 'React Basic',
    template: 'react',
    files: {
      '/App.js': {
        code: `export default function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox 🚀</h1>
      <p>Start editing to see some magic happen!</p>
    </div>
  );
}`,
      },
      '/styles.css': {
        code: `.App {
  font-family: sans-serif;
  text-align: center;
  padding: 20px;
}

h1 {
  color: #333;
}`,
      },
    },
  },
  {
    id: 'react-hooks',
    name: 'React Hooks Demo',
    template: 'react',
    files: {
      '/App.js': {
        code: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  return (
    <div className="App">
      <h1>React Hooks Demo</h1>
      
      <div className="counter">
        <h2>Counter: {count}</h2>
        <button onClick={() => setCount(count + 1)}>Increment</button>
        <button onClick={() => setCount(count - 1)}>Decrement</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>

      <div className="input-demo">
        <h2>Input Value: {text}</h2>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something..."
        />
      </div>
    </div>
  );
}`,
      },
      '/styles.css': {
        code: `.App {
  font-family: sans-serif;
  text-align: center;
  padding: 20px;
}

.counter, .input-demo {
  margin: 30px 0;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

button {
  margin: 0 5px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}

input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}`,
      },
    },
  },
  {
    id: 'vanilla-js',
    name: 'Vanilla JavaScript',
    template: 'vanilla',
    files: {
      '/index.js': {
        code: `document.getElementById("app").innerHTML = \`
<h1>Vanilla JavaScript</h1>
<p>Pure JavaScript, no frameworks!</p>
<button id="clickBtn">Click me!</button>
<p id="output"></p>
\`;

let count = 0;
document.getElementById("clickBtn").addEventListener("click", () => {
  count++;
  document.getElementById("output").textContent = \`Clicked \${count} times\`;
});`,
      },
      '/styles.css': {
        code: `body {
  font-family: sans-serif;
  text-align: center;
  padding: 20px;
}

button {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #218838;
}`,
      },
    },
  },
];

// ============================================================================
// CODESANDBOX PANEL COMPONENT
// ============================================================================

export function CodeSandboxPanel() {
  const { isDarkMode } = useUnifiedTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate>(DEFAULT_TEMPLATES[0]);
  const [customFiles, setCustomFiles] = useState<Record<string, { code: string }> | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  /**
   * Get current files to display in editor
   * Uses custom files if available, otherwise uses template files
   */
  const currentFiles = customFiles || selectedTemplate.files;

  /**
   * Reset editor to selected template
   */
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset to the template? All changes will be lost.')) {
      setCustomFiles(null);
    }
  }, []);

  /**
   * Export current code as JSON
   */
  const handleExport = useCallback(() => {
    const exportData = {
      template: selectedTemplate.template,
      files: currentFiles,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandbox-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [currentFiles, selectedTemplate.template]);

  /**
   * Copy code to clipboard
   */
  const handleCopy = useCallback(async () => {
    try {
      const code = Object.entries(currentFiles)
        .map(([filename, content]) => `// ${filename}\n${content.code}`)
        .join('\n\n');

      await navigator.clipboard.writeText(code);
      alert('📋 Code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('❌ Failed to copy code');
    }
  }, [currentFiles]);

  /**
   * Clear all custom changes
   */
  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all changes?')) {
      setCustomFiles(null);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Code className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              CodeSandbox Editor
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedTemplate.name} • {selectedTemplate.template}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Template Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium transition-all hover:shadow-apple-sm"
              title="Change Template"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Template</span>
            </button>

            {/* Template Dropdown */}
            {showTemplateSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTemplateSelector(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-apple-lg z-20">
                  <div className="p-2 space-y-1">
                    {DEFAULT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setCustomFiles(null);
                          setShowTemplateSelector(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                          selectedTemplate.id === template.id
                            ? 'bg-primary text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                        )}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs opacity-70">{template.template}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleReset}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
            title="Reset to Template"
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary" />
          </button>

          <button
            onClick={handleCopy}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
            title="Copy Code"
          >
            <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary" />
          </button>

          <button
            onClick={handleExport}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
            title="Export as JSON"
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary" />
          </button>

          <button
            onClick={handleClear}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all hover:shadow-apple-sm active:scale-95"
            title="Clear Changes"
          >
            <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Sandpack Editor - Takes full remaining height */}
      <div className="flex-1 min-h-0">
        <Sandpack
          template={selectedTemplate.template}
          files={currentFiles}
          theme={isDarkMode ? 'dark' : 'light'}
          options={{
            showNavigator: true,
            showTabs: true,
            showLineNumbers: true,
            showInlineErrors: true,
            wrapContent: true,
            editorHeight: '100%',
            editorWidthPercentage: 60,
            autorun: true,
            autoReload: true,
            recompileMode: 'delayed',
            recompileDelay: 300,
          }}
          customSetup={{
            dependencies: {},
          }}
        />
      </div>
    </div>
  );
}
