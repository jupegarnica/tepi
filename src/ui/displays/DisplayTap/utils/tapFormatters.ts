import type { BlockState } from "../../../store/store.ts";
import type { TapStreamItem } from "../DisplayTap.types.ts";

export function getTapTestBlocks(
  blockOrder: string[],
  blocks: Record<string, BlockState>,
): BlockState[] {
  return blockOrder
    .map((id) => blocks[id])
    .filter((b): b is BlockState => !!b && !b.isFirstBlock);
}

export function getTapDoneBlocks(testBlocks: BlockState[]): BlockState[] {
  const testNumberMap = new Map(testBlocks.map((b, i) => [b.id, i + 1]));

  return testBlocks
    .filter((b) => b.status !== "pending" && b.status !== "running")
    .sort((left, right) => {
      const leftCompletedAt = left.completedAt ?? Number.MAX_SAFE_INTEGER;
      const rightCompletedAt = right.completedAt ?? Number.MAX_SAFE_INTEGER;

      if (leftCompletedAt !== rightCompletedAt) {
        return leftCompletedAt - rightCompletedAt;
      }

      return (testNumberMap.get(left.id) ?? 0) - (testNumberMap.get(right.id) ?? 0);
    });
}

export function getTapStreamItems(
  testBlocks: BlockState[],
  phase: string,
): TapStreamItem[] {
  const testNumberMap = new Map(testBlocks.map((b, i) => [b.id, i + 1]));
  const items: TapStreamItem[] = [{ key: "header", type: "header" }];

  for (const block of getTapDoneBlocks(testBlocks)) {
    items.push({
      key: `test:${block.id}`,
      type: "test",
      block,
      num: testNumberMap.get(block.id) ?? 0,
    });
  }

  if (phase === "done") {
    items.push({ key: "plan", type: "plan", total: testBlocks.length });
  }

  return items;
}
