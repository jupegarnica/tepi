import type { BlockState, FileState } from "../../store/store.ts";

export type BlockDetailConfig = {
  truncateBody: boolean;
  truncateHeaders: boolean;
  showErrorDetail: boolean;
};

export type FileSectionProps = {
  file: FileState;
  blocks: Record<string, BlockState>;
  showHeader: boolean;
  showIgnored: boolean;
  noAnimation: boolean;
  blockDetail?: BlockDetailConfig;
  globalDisplayIndex: number;
};
