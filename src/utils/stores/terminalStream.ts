import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ConnectionStatus,
  CreateTerminalOptions,
  TerminalInfo,
  TerminalOutput,
  terminalStream,
} from "../../lib/webhookCopilot/terminalStreamService";

// ============================================================================
// TYPES
// ============================================================================

export interface TerminalOutputLine {
  id: string;
  terminalId: string;
  terminalName: string;
  data: string;
  timestamp: number;
}

export interface TerminalState {
  terminalId: string;
  terminalName: string;
  outputLines: TerminalOutputLine[];
  isSubscribed: boolean;
  isManaged: boolean; // true for managed terminals created via create_terminal
}

// ============================================================================
// STORE
// ============================================================================

interface TerminalStreamState {
  // Connection state
  connectionStatus: ConnectionStatus;
  lastError: string | null;

  // Terminals
  terminals: TerminalInfo[];
  terminalStates: Record<string, TerminalState>;
  activeTerminalId: string | null;

  // Subscription
  isSubscribedToAll: boolean;

  // Settings
  maxLinesPerTerminal: number;
  stripAnsiCodes: boolean;
  autoSubscribeOnConnect: boolean;
  autoConnectOnMount: boolean;

  // Stats
  totalMessagesReceived: number;
  lastMessageTime: number | null;

  // Actions - Connection
  connect: () => void;
  disconnect: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;

  // Actions - Terminals
  setTerminals: (terminals: TerminalInfo[]) => void;
  addTerminal: (terminal: TerminalInfo) => void;
  removeTerminal: (terminalId: string) => void;
  setActiveTerminal: (terminalId: string | null) => void;
  createTerminal: (options?: CreateTerminalOptions) => void;
  sendInput: (terminalId: string, data: string) => void;

  // Actions - Subscription
  subscribe: (terminalId: string) => void;
  subscribeAll: () => void;
  unsubscribe: (terminalId: string) => void;
  setSubscribed: (terminalId: string, subscribed: boolean) => void;
  setSubscribedToAll: (subscribed: boolean) => void;

  // Actions - Output
  addOutput: (output: TerminalOutput) => void;
  clearTerminalOutput: (terminalId: string) => void;
  clearAllOutput: () => void;

  // Actions - Settings
  setMaxLinesPerTerminal: (max: number) => void;
  setStripAnsiCodes: (strip: boolean) => void;
  setAutoSubscribeOnConnect: (auto: boolean) => void;
  setAutoConnectOnMount: (auto: boolean) => void;

  // Queries
  getTerminalOutput: (terminalId: string) => TerminalOutputLine[];
  getActiveTerminalOutput: () => TerminalOutputLine[];
}

// ============================================================================
// ANSI CODE STRIPPER
// ============================================================================

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useTerminalStreamStore = create<TerminalStreamState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectionStatus: "disconnected",
      lastError: null,
      terminals: [],
      terminalStates: {},
      activeTerminalId: null,
      isSubscribedToAll: false,
      maxLinesPerTerminal: 1000,
      stripAnsiCodes: false,
      autoSubscribeOnConnect: true,
      autoConnectOnMount: false,
      totalMessagesReceived: 0,
      lastMessageTime: null,

      // Connection actions
      connect: () => {
        const state = get();
        if (state.connectionStatus === "connected") return;

        set({ connectionStatus: "connecting", lastError: null });

        // Set up event handlers before connecting
        terminalStream.on("onConnect", () => {
          set({ connectionStatus: "connected", lastError: null });

          // Request terminal list explicitly
          terminalStream.listTerminals();

          // Auto-subscribe to all terminals if enabled
          if (get().autoSubscribeOnConnect) {
            terminalStream.subscribeAll();
          }
        });

        terminalStream.on("onDisconnect", (reason) => {
          set({
            connectionStatus: "disconnected",
            lastError: reason || null,
            isSubscribedToAll: false,
          });
        });

        terminalStream.on("onTerminals", (terminals) => {
          get().setTerminals(terminals);
        });

        terminalStream.on("onOutput", (output) => {
          get().addOutput(output);
        });

        terminalStream.on("onTerminalOpened", (terminal) => {
          get().addTerminal(terminal);
        });

        terminalStream.on("onTerminalClosed", (terminalId) => {
          get().removeTerminal(terminalId);
        });

        terminalStream.on("onTerminalCreated", (terminal) => {
          // Add managed terminal and auto-select it
          get().addTerminal(terminal);
          get().setActiveTerminal(terminal.id);
        });

        terminalStream.on("onSubscribed", (terminalId) => {
          if (terminalId === "*") {
            set({ isSubscribedToAll: true });
          } else {
            get().setSubscribed(terminalId, true);
          }
        });

        terminalStream.on("onUnsubscribed", (terminalId) => {
          get().setSubscribed(terminalId, false);
        });

        terminalStream.on("onError", (error) => {
          set({ lastError: error });
        });

        terminalStream.connect();
      },

      disconnect: () => {
        terminalStream.disconnect();
        set({
          connectionStatus: "disconnected",
          isSubscribedToAll: false,
        });
      },

      setConnectionStatus: (status) => {
        set({ connectionStatus: status });
      },

      setError: (error) => {
        set({ lastError: error });
      },

      // Terminal actions
      setTerminals: (terminals) => {
        set((state) => {
          const terminalStates = { ...state.terminalStates };

          // Add new terminals
          terminals.forEach((terminal) => {
            if (!terminalStates[terminal.id]) {
              terminalStates[terminal.id] = {
                terminalId: terminal.id,
                terminalName: terminal.name,
                outputLines: [],
                isSubscribed: state.isSubscribedToAll,
                isManaged: terminal.isManaged || false,
              };
            }
          });

          // Set active terminal if none selected
          const activeTerminalId =
            state.activeTerminalId && terminalStates[state.activeTerminalId]
              ? state.activeTerminalId
              : terminals.length > 0
                ? terminals[0].id
                : null;

          return { terminals, terminalStates, activeTerminalId };
        });
      },

      addTerminal: (terminal) => {
        set((state) => {
          if (state.terminals.some((t) => t.id === terminal.id)) {
            return state;
          }

          const terminals = [...state.terminals, terminal];
          const terminalStates: Record<string, TerminalState> = {
            ...state.terminalStates,
            [terminal.id]: {
              terminalId: terminal.id,
              terminalName: terminal.name,
              outputLines: [],
              isSubscribed:
                state.isSubscribedToAll || terminal.isManaged || false,
              isManaged: terminal.isManaged || false,
            },
          };

          return { terminals, terminalStates };
        });
      },

      removeTerminal: (terminalId) => {
        set((state) => {
          const terminals = state.terminals.filter((t) => t.id !== terminalId);
          const terminalStates = { ...state.terminalStates };
          delete terminalStates[terminalId];

          // Select new active terminal if current was removed
          const activeTerminalId =
            state.activeTerminalId === terminalId
              ? terminals.length > 0
                ? terminals[0].id
                : null
              : state.activeTerminalId;

          return { terminals, terminalStates, activeTerminalId };
        });
      },

      setActiveTerminal: (terminalId) => {
        set({ activeTerminalId: terminalId });
      },

      createTerminal: (options) => {
        terminalStream.createTerminal(options);
      },

      sendInput: (terminalId, data) => {
        terminalStream.sendInput(terminalId, data);
      },

      // Subscription actions
      subscribe: (terminalId) => {
        terminalStream.subscribe(terminalId);
      },

      subscribeAll: () => {
        terminalStream.subscribeAll();
      },

      unsubscribe: (terminalId) => {
        terminalStream.unsubscribe(terminalId);
      },

      setSubscribed: (terminalId, subscribed) => {
        set((state) => {
          if (!state.terminalStates[terminalId]) return state;

          return {
            terminalStates: {
              ...state.terminalStates,
              [terminalId]: {
                ...state.terminalStates[terminalId],
                isSubscribed: subscribed,
              },
            },
          };
        });
      },

      setSubscribedToAll: (subscribed) => {
        set({ isSubscribedToAll: subscribed });
      },

      // Output actions
      addOutput: (output) => {
        set((state) => {
          const terminalState = state.terminalStates[output.terminalId];

          // Create terminal state if it doesn't exist
          const currentState = terminalState || {
            terminalId: output.terminalId,
            terminalName: output.terminalName,
            outputLines: [],
            isSubscribed: true,
          };

          // Process the output data
          const processedData = state.stripAnsiCodes
            ? stripAnsi(output.data)
            : output.data;

          // Create new line entry
          const newLine: TerminalOutputLine = {
            id: `${output.terminalId}-${output.timestamp}-${Math.random().toString(36).slice(2, 9)}`,
            terminalId: output.terminalId,
            terminalName: output.terminalName,
            data: processedData,
            timestamp: output.timestamp,
          };

          // Add line and trim to max
          let outputLines = [...currentState.outputLines, newLine];
          if (outputLines.length > state.maxLinesPerTerminal) {
            outputLines = outputLines.slice(-state.maxLinesPerTerminal);
          }

          return {
            terminalStates: {
              ...state.terminalStates,
              [output.terminalId]: {
                ...currentState,
                outputLines,
              },
            },
            totalMessagesReceived: state.totalMessagesReceived + 1,
            lastMessageTime: output.timestamp,
          };
        });
      },

      clearTerminalOutput: (terminalId) => {
        set((state) => {
          if (!state.terminalStates[terminalId]) return state;

          return {
            terminalStates: {
              ...state.terminalStates,
              [terminalId]: {
                ...state.terminalStates[terminalId],
                outputLines: [],
              },
            },
          };
        });
      },

      clearAllOutput: () => {
        set((state) => {
          const terminalStates = { ...state.terminalStates };
          Object.keys(terminalStates).forEach((id) => {
            terminalStates[id] = {
              ...terminalStates[id],
              outputLines: [],
            };
          });
          return { terminalStates, totalMessagesReceived: 0 };
        });
      },

      // Settings actions
      setMaxLinesPerTerminal: (max) => {
        set({ maxLinesPerTerminal: max });
      },

      setStripAnsiCodes: (strip) => {
        set({ stripAnsiCodes: strip });
      },

      setAutoSubscribeOnConnect: (auto) => {
        set({ autoSubscribeOnConnect: auto });
      },

      setAutoConnectOnMount: (auto) => {
        set({ autoConnectOnMount: auto });
      },

      // Queries
      getTerminalOutput: (terminalId) => {
        const state = get();
        return state.terminalStates[terminalId]?.outputLines || [];
      },

      getActiveTerminalOutput: () => {
        const state = get();
        if (!state.activeTerminalId) return [];
        return state.terminalStates[state.activeTerminalId]?.outputLines || [];
      },
    }),
    {
      name: "terminal-stream-storage",
      partialize: (state) => ({
        maxLinesPerTerminal: state.maxLinesPerTerminal,
        stripAnsiCodes: state.stripAnsiCodes,
        autoSubscribeOnConnect: state.autoSubscribeOnConnect,
        autoConnectOnMount: state.autoConnectOnMount,
      }),
    }
  )
);
