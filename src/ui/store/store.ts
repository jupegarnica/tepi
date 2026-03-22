import { createStore as _createStore } from "zustand/vanilla";
import type { FailureContext } from "../../failureContext.ts";

export type BlockStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "ignored"
  | "empty";

export type SerializedHeaders = [string, string][];

export type SerializedRequest = {
  method: string;
  url: string;
  headers: SerializedHeaders;
  body?: string;
};

export type SerializedResponse = {
  status: number;
  statusText: string;
  headers: SerializedHeaders;
  body?: string;
  contentType?: string;
};

export type BlockState = {
  id: string; // "relativePath:startLine"
  description: string;
  blockLink: string;
  filePath: string;
  status: BlockStatus;
  startTime: number;
  elapsedTime: number;
  completedAt?: number;
  httpStatus?: number;
  error?: { name: string; message: string; cause?: string };
  failureContext?: FailureContext;
  errorDisplayed: boolean;
  neededFrom?: string;
  displayMode?: string;
  meta: Record<string, unknown>;
  sourceText?: string;
  sourceStartLine?: number;
  sourceEndLine?: number;
  request?: SerializedRequest;
  actualResponse?: SerializedResponse;
  expectedResponse?: SerializedResponse;
  isFirstBlock: boolean;
};

export type FileState = {
  path: string;
  relativePath: string;
  status: "pending" | "running" | "done";
  blockIds: string[];
};

export type MessageLevel = "info" | "error" | "warn";

export type Message = {
  level: MessageLevel;
  text: string;
};

export type RunPhase = "idle" | "parsing" | "running" | "done";

export type TepiState = {
  // Global run state
  phase: RunPhase;
  displayMode: string;
  noAnimation: boolean;
  noColor: boolean;
  startTime: number;
  endTime?: number;
  runningBlockCount: number;
  maxRunningBlockCount: number;

  // Counters
  successCount: number;
  failCount: number;
  ignoreCount: number;

  // Files and blocks
  files: Record<string, FileState>;
  fileOrder: string[];
  blocks: Record<string, BlockState>;
  blockOrder: string[];

  // Messages
  messages: Message[];

  // Final result
  exitCode?: number;
  onlyMode: string[];

  // Watch mode
  isWatchMode: boolean;
  watchPaths: string[];
  watchTriggerPaths: string[];

  // Interactive mode exit signaling
  _exitResolver?: () => void;
};

export type TepiActions = {
  reset: () => void;
  setPhase: (phase: RunPhase) => void;
  setDisplayMode: (mode: string) => void;
  setNoAnimation: (value: boolean) => void;
  setNoColor: (value: boolean) => void;
  addMessage: (level: MessageLevel, text: string) => void;

  addFile: (path: string, relativePath: string) => void;
  setFileStatus: (relativePath: string, status: FileState["status"]) => void;
  addFileBlockId: (relativePath: string, blockId: string) => void;

  addBlock: (id: string, init: Partial<BlockState>) => void;
  updateBlock: (id: string, patch: Partial<BlockState>) => void;

  incrementSuccess: () => void;
  incrementFail: () => void;
  incrementIgnore: () => void;

  setResult: (exitCode: number, onlyMode: string[]) => void;
  setWatchMode: (
    paths: string[],
    triggerPaths: string[],
  ) => void;

  setExitResolver: (resolver: () => void) => void;
  requestExit: () => void;
};

export type TepiStore = TepiState & TepiActions;

const initialState: TepiState = {
  phase: "idle",
  displayMode: "default",
  noAnimation: false,
  noColor: false,
  startTime: Date.now(),
  endTime: undefined,
  runningBlockCount: 0,
  maxRunningBlockCount: 0,

  successCount: 0,
  failCount: 0,
  ignoreCount: 0,

  files: {},
  fileOrder: [],
  blocks: {},
  blockOrder: [],

  messages: [],

  exitCode: undefined,
  onlyMode: [],

  isWatchMode: false,
  watchPaths: [],
  watchTriggerPaths: [],
};

export function createStore() {
  return _createStore<TepiStore>((set, get) => ({
    ...initialState,

    reset: () =>
      set({
        ...initialState,
        // Preserve config across resets (watch mode)
        displayMode: get().displayMode,
        noAnimation: get().noAnimation,
        noColor: get().noColor,
        isWatchMode: get().isWatchMode,
        watchPaths: get().watchPaths,
        watchTriggerPaths: get().watchTriggerPaths,
        startTime: Date.now(),
      }),

    setPhase: (phase) => {
      const patch: Partial<TepiState> = { phase };
      if (phase === "done") {
        patch.endTime = Date.now();
      }
      set(patch);
    },

    setDisplayMode: (mode) => set({ displayMode: mode }),
    setNoAnimation: (value) => set({ noAnimation: value }),
    setNoColor: (value) => set({ noColor: value }),

    addMessage: (level, text) =>
      set((state) => ({
        messages: [...state.messages, { level, text }],
      })),

    addFile: (path, relativePath) =>
      set((state) => ({
        files: {
          ...state.files,
          [relativePath]: {
            path,
            relativePath,
            status: "pending",
            blockIds: [],
          },
        },
        fileOrder: state.fileOrder.includes(relativePath)
          ? state.fileOrder
          : [...state.fileOrder, relativePath],
      })),

    setFileStatus: (relativePath, status) =>
      set((state) => ({
        files: {
          ...state.files,
          [relativePath]: {
            ...state.files[relativePath],
            status,
          },
        },
      })),

    addFileBlockId: (relativePath, blockId) =>
      set((state) => {
        const file = state.files[relativePath];
        if (!file || file.blockIds.includes(blockId)) return state;
        return {
          files: {
            ...state.files,
            [relativePath]: {
              ...file,
              blockIds: [...file.blockIds, blockId],
            },
          },
        };
      }),

    addBlock: (id, init) =>
      set((state) => ({
        blocks: {
          ...state.blocks,
          [id]: {
            id,
            description: "",
            blockLink: "",
            filePath: "",
            status: "pending",
            startTime: Date.now(),
            elapsedTime: 0,
            errorDisplayed: false,
            isFirstBlock: false,
            meta: {},
            ...init,
          },
        },
        blockOrder: state.blockOrder.includes(id)
          ? state.blockOrder
          : [...state.blockOrder, id],
      })),

    updateBlock: (id, patch) =>
      set((state) => {
        const existing = state.blocks[id];
        if (!existing) return state;
        const next = { ...existing, ...patch };
        const wasRunning = existing.status === "running";
        const isRunning = next.status === "running";
        let runningBlockCount = state.runningBlockCount;

        if (!wasRunning && isRunning) {
          runningBlockCount += 1;
        } else if (wasRunning && !isRunning) {
          runningBlockCount = Math.max(0, runningBlockCount - 1);
        }

        return {
          runningBlockCount,
          maxRunningBlockCount: Math.max(state.maxRunningBlockCount, runningBlockCount),
          blocks: {
            ...state.blocks,
            [id]: next,
          },
        };
      }),

    incrementSuccess: () =>
      set((state) => ({ successCount: state.successCount + 1 })),
    incrementFail: () =>
      set((state) => ({ failCount: state.failCount + 1 })),
    incrementIgnore: () =>
      set((state) => ({ ignoreCount: state.ignoreCount + 1 })),

    setResult: (exitCode, onlyMode) =>
      set({ exitCode, onlyMode, phase: "done", endTime: Date.now() }),

    setWatchMode: (paths, triggerPaths) =>
      set({
        isWatchMode: true,
        watchPaths: paths,
        watchTriggerPaths: triggerPaths,
      }),

    setExitResolver: (resolver) => set({ _exitResolver: resolver }),
    requestExit: () => get()._exitResolver?.(),
  }));
}

export type StoreApi = ReturnType<typeof createStore>;

// No-op store for when display is "none" or for tests
export function createNoopStore(): StoreApi {
  return createStore();
}
