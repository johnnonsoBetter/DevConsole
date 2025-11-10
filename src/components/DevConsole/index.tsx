import { useEffect } from "react";
import { useDevConsoleStore } from "../../utils/stores/devConsole";
import {
  installConsoleInterceptor,
  uninstallConsoleInterceptor,
} from "../../lib/devConsole/consoleInterceptor";
import {
  installNetworkInterceptor,
  uninstallNetworkInterceptor,
} from "../../lib/devConsole/networkInterceptor";
import { DevConsolePanel, type GitHubConfig } from "./DevConsolePanel";

// ============================================================================
// MAIN DEVELOPER CONSOLE
// Root component that manages all DevConsole functionality
// ============================================================================

export interface DevConsoleProps {
  githubConfig?: GitHubConfig;
}

export function DevConsole({ githubConfig }: DevConsoleProps = {}) {
  const { toggleConsole, toggleCommandPalette } = useDevConsoleStore();

  // Install interceptors on mount
  useEffect(() => {

    // Install console and network interceptors
    installConsoleInterceptor();
    installNetworkInterceptor();

    console.info(
      "%c🚀 DevConsole Initialized",
      "color: #9E7AFF; font-weight: bold; font-size: 16px; padding: 8px; background: linear-gradient(to right, #9E7AFF, #6366F1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
      "\n\n🔧 Features:\n" +
      "  • Console Logging\n" +
      "  • Network Inspection\n" +
      "  • Error Boundary\n" +
      "  • Command Palette\n\n" +
      "⌨️  Keyboard Shortcuts:\n" +
      "  • Ctrl + ~ : Toggle Console\n" +
      "  • Cmd/Ctrl + K : Command Palette\n" +
      "  • ESC : Close\n\n" +
      "📚 Custom Loggers:\n" +
      "  • console.ui() - UI events\n" +
      "  • console.api() - API calls\n" +
      "  • console.db() - Database operations\n"
    );

    // Cleanup on unmount
    return () => {
      uninstallConsoleInterceptor();
      uninstallNetworkInterceptor();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + ~ to toggle console
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleConsole();
      }

      // Cmd/Ctrl + K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleConsole, toggleCommandPalette]);

  return (
    <>
      <DevConsolePanel githubConfig={githubConfig} />
    
    </>
  );
}

// Export components individually for flexibility
