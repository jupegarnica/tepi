import type { BlockState } from "../../store/store.ts";

export type FileStats = {
  passed: number;
  failed: number;
  ignored: number;
  total: number;
  elapsed: number;
  hasFailures: boolean;
};

export type VitestFormatState = {
  fileOrder: string[];
  files: Record<string, import("../../store/store.ts").FileState>;
  blocks: Record<string, BlockState>;
  phase: string;
  startTime: number;
  endTime?: number;
  actualThreadsUsed?: number;
};

export type VitestFileStatEntry = {
  relativePath: string;
  status: string;
  stats: FileStats;
};

export type VitestFailureEntry = {
  relativePath: string;
  description: string;
  filePath: string;
  blockLink: string;
  error: { name: string; message: string; cause?: string };
  failureContext?: BlockState["failureContext"];
  sourceText?: string;
  sourceStartLine?: number;
  sourceEndLine?: number;
};

export type VitestFormatResult = {
  fileStats: VitestFileStatEntry[];
  failures: VitestFailureEntry[];
  summary: {
    filesPassed: number;
    filesFailed: number;
    filesTotal: number;
    testsPassed: number;
    testsFailed: number;
    testsIgnored: number;
    testsTotal: number;
    duration: number;
    actualThreadsUsed: number;
  };
};
