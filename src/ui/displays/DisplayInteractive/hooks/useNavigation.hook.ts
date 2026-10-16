import type { BlockState, FileState } from "../../../store/store.ts";
import { isCountedBlock } from "../../../utils/blockFilters.ts";
import type { NavItem } from "../DisplayInteractive.types.ts";
import { findParentIndex } from "../utils/navigationHelpers.ts";
import type { UseExpandStateResult } from "./useExpandState.hook.ts";
import { createExpandState } from "./useExpandState.hook.ts";
import { getNavItems } from "./useNavItems.hook.ts";

export type NavigationKeyContext = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  onExit: () => void;
};

export type Navigation = {
  expandState: UseExpandStateResult;
  getSelectedIndex: () => number;
  handleKey: (keyboardKey: string, ctx: NavigationKeyContext) => void;
};

type KeyNames = "up" | "down" | "left" | "right" | "enter" | "space" | "escape" | "q" | string;

function normalizeKeyboardKey(keyboardKey: string): KeyNames {
  switch (keyboardKey) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "Enter":
      return "enter";
    case " ":
      return "space";
    case "Escape":
      return "escape";
    case "q":
      return "q";
    default:
      return keyboardKey;
  }
}

/**
 * Stateful keyboard navigation controller for the interactive display
 * (replaces the ink useInput hook). Lives outside the render pass; the app
 * calls handleKey with terminal KeyboardEvent.key values and re-renders.
 */
export function createNavigation(): Navigation {
  const expandState = createExpandState();
  let selectedIndex = 0;

  return {
    expandState,
    getSelectedIndex() {
      return selectedIndex;
    },
    handleKey(KeyboardEventKey: string, ctx: NavigationKeyContext) {
      const key = normalizeKeyboardKey(KeyboardEventKey);
      const items = getNavItems({
        fileOrder: ctx.fileOrder,
        files: ctx.files,
        blocks: ctx.blocks,
        expandedFiles: expandState.expandedFiles,
        expandedBlocks: expandState.expandedBlocks,
      });

      if (key === "q" || key === "escape") {
        ctx.onExit();
        return;
      }

      if (key === "up") {
        selectedIndex = Math.max(0, selectedIndex - 1);
        return;
      }

      if (key === "down") {
        selectedIndex = items.length === 0 ? 0 : Math.min(items.length - 1, selectedIndex + 1);
        return;
      }

      if (key === "enter" || key === "space") {
        const item = items[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          expandState.toggleFile(item.id);
        } else if (item.type === "block") {
          expandState.toggleBlock(item.id);
        } else {
          expandState.collapseBlock(item.blockId);
          selectedIndex = findParentIndex(items, selectedIndex, "block", item.blockId);
        }
        return;
      }

      if (key === "right") {
        const item = items[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          expandState.expandFile(item.id);
          const refreshed = getNavItems({
            fileOrder: ctx.fileOrder,
            files: ctx.files,
            blocks: ctx.blocks,
            expandedFiles: expandState.expandedFiles,
            expandedBlocks: expandState.expandedBlocks,
          });
          const file = ctx.files[item.id];
          const hasChildren = file?.blockIds.some((bid) => {
            const b = ctx.blocks[bid];
            return isCountedBlock(b);
          }) ?? false;
          if (hasChildren) {
            const nextIdx = refreshed.findIndex(
              (n) => n.type === "block" && n.fileId === item.id,
            );
            if (nextIdx >= 0) selectedIndex = nextIdx;
          }
        } else if (item.type === "block") {
          expandState.expandBlock(item.id);
        }
        return;
      }

      if (key === "left") {
        const item = items[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          expandState.collapseFile(item.id);
        } else if (item.type === "block") {
          expandState.collapseBlock(item.id);
          selectedIndex = findParentIndex(items, selectedIndex, "file", item.fileId);
        } else {
          expandState.collapseBlock(item.blockId);
          selectedIndex = findParentIndex(items, selectedIndex, "block", item.blockId);
        }
        return;
      }
    },
  };
}
