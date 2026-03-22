import type { BlockState, FileState, Message } from "../../store/store.ts";
import type { BlockDetailConfig } from "../FileSection/FileSection.types.ts";

export type FileSectionConfig = {
  showHeader: boolean;
  showIgnored: boolean;
  globalDisplayIndex: number;
  blockDetail?: BlockDetailConfig;
};

export type CommonDisplayProps = {
  files: Record<string, FileState>;
  fileOrder: string[];
  blocks: Record<string, BlockState>;
  phase: string;
  messages: Message[];
  successCount: number;
  failCount: number;
  ignoreCount: number;
  startTime: number;
  endTime?: number;
  actualThreadsUsed: number;
  exitCode?: number;
  isWatchMode: boolean;
  watchPaths: string[];
  watchTriggerPaths: string[];
  noAnimation: boolean;
};

export type DisplayLayoutProps = CommonDisplayProps & {
  fileSectionConfig?: FileSectionConfig;
  errorSummaryStyle: "compact" | "expanded";
};
