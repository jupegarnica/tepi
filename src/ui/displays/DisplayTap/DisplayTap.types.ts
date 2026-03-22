import type { BlockState } from "../../store/store.ts";

export type TapFormatState = {
  blockOrder: string[];
  blocks: Record<string, BlockState>;
  phase: string;
};

export type TapStreamItem =
  | { key: string; type: "header" }
  | { key: string; type: "test"; block: BlockState; num: number }
  | { key: string; type: "plan"; total: number };
