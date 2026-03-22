import type { BlockState } from "../../../store/store.ts";
import { isCountedBlock } from "../../../utils/blockFilters.ts";
import type { DotsFormatState } from "../DisplayDots.types.ts";

export function completedBlocks(state: DotsFormatState): BlockState[] {
  return state.fileOrder
    .flatMap((id) => state.files[id]?.blockIds ?? [])
    .map((id) => state.blocks[id])
    .filter(
      (block): block is BlockState =>
        isCountedBlock(block) &&
        block.status !== "pending" &&
        block.status !== "running",
    );
}

export function markerForBlock(block: BlockState): string {
  if (block.status === "failed") return "x";
  if (block.status === "ignored" || block.status === "empty") return "s";
  return ".";
}

export function colorForBlock(block: BlockState): "green" | "red" | "yellow" {
  if (block.status === "failed") return "red";
  if (block.status === "ignored" || block.status === "empty") return "yellow";
  return "green";
}
