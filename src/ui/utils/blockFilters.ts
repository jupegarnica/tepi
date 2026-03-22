import type { BlockState } from "../store/store.ts";

export function isGlobalMetaBlock(block: BlockState | undefined): boolean {
  return !!block && block.isFirstBlock && block.status === "empty";
}

export function isCountedBlock(block: BlockState | undefined): block is BlockState {
  return !!block && !isGlobalMetaBlock(block);
}