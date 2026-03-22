import type { BlockState, FileState } from "../../store/store.ts";

export type DotsFormatState = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
};
