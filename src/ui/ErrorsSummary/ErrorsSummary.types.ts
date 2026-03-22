import type { BlockState } from "../store/store.ts";

export type ErrorsSummaryProps = {
  blocks: BlockState[];
  style: "compact" | "expanded";
};
