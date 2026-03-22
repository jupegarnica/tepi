import { useMemo } from "react";
import type { BlockState, FileState } from "../../../store/store.ts";
import type { NavItem } from "../DisplayInteractive.types.ts";
import { getBlockDetailLines } from "../utils/interactiveFormatters.ts";

type UseNavItemsProps = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  expandedFiles: Set<string>;
  expandedBlocks: Set<string>;
};

export function useNavItems({
  fileOrder,
  files,
  blocks,
  expandedFiles,
  expandedBlocks,
}: UseNavItemsProps): NavItem[] {
  return useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];
    for (const fileId of fileOrder) {
      const file = files[fileId];
      if (!file) continue;
      items.push({ type: "file", id: fileId });
      if (expandedFiles.has(fileId)) {
        for (const blockId of file.blockIds) {
          const block = blocks[blockId];
          if (!block || block.isFirstBlock) continue;
          items.push({ type: "block", id: blockId, fileId });
          if (expandedBlocks.has(blockId)) {
            const detailLines = getBlockDetailLines(block);
            detailLines.forEach((text, lineIndex) => {
              items.push({ type: "detail", blockId, fileId, lineIndex, text });
            });
          }
        }
      }
    }
    return items;
  }, [fileOrder, files, blocks, expandedFiles, expandedBlocks]);
}
