import { useEffect, useState } from "react";
import { useInput } from "ink";
import type { BlockState, FileState } from "../../../store/store.ts";
import { isCountedBlock } from "../../../utils/blockFilters.ts";
import type { NavItem } from "../DisplayInteractive.types.ts";
import { findParentIndex } from "../utils/navigationHelpers.ts";
import type { UseExpandStateResult } from "./useExpandState.hook.ts";

type UseKeyboardNavProps = {
  navItems: NavItem[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  onExit: () => void;
  expandState: UseExpandStateResult;
};

export function useKeyboardNav({
  navItems,
  files,
  blocks,
  onExit,
  expandState,
}: UseKeyboardNavProps): { selectedIndex: number } {
  const {
    toggleFile,
    expandFile,
    collapseFile,
    toggleBlock,
    expandBlock,
    collapseBlock,
  } = expandState;

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp selectedIndex when nav list shrinks
  useEffect(() => {
    if (navItems.length > 0 && selectedIndex >= navItems.length) {
      setSelectedIndex(navItems.length - 1);
    }
  }, [navItems.length, selectedIndex]);

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        onExit();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(navItems.length - 1, i + 1));
        return;
      }
      if (key.return || input === " ") {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          toggleFile(item.id);
        } else if (item.type === "block") {
          toggleBlock(item.id);
        } else {
          // detail: collapse parent block and jump to it
          collapseBlock(item.blockId);
          setSelectedIndex(findParentIndex(navItems, selectedIndex, "block", item.blockId));
        }
        return;
      }
      if (key.rightArrow) {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          expandFile(item.id);
          const file = files[item.id];
          const hasChildren = file?.blockIds.some((bid) => {
            const b = blocks[bid];
            return isCountedBlock(b);
          }) ?? false;
          if (hasChildren) setSelectedIndex(selectedIndex + 1);
        } else if (item.type === "block") {
          expandBlock(item.id);
        }
        // detail: no-op
        return;
      }
      if (key.leftArrow) {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          collapseFile(item.id);
        } else if (item.type === "block") {
          collapseBlock(item.id);
          setSelectedIndex(findParentIndex(navItems, selectedIndex, "file", item.fileId));
        } else {
          // detail: collapse parent block and jump to it
          collapseBlock(item.blockId);
          setSelectedIndex(findParentIndex(navItems, selectedIndex, "block", item.blockId));
        }
        return;
      }
    },
    { isActive: true },
  );

  return { selectedIndex };
}
