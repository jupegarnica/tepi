import type { BlockState, FileState } from "../../../../store/store.ts";
import { VitestSummary } from "../../../DisplayDefault/index.ts";
import { Scroll, SCROLL_ANCHOR_SENTINEL } from "../../../../shared/Scroll/index.ts";
import type { NavItem } from "../../DisplayInteractive.types.ts";
import { InteractiveFileLine } from "../InteractiveFileLine.tsx";
import { InteractiveBlockLine } from "../InteractiveBlockLine.tsx";
import { InteractiveDetailLine } from "../InteractiveDetailLine.tsx";
import { getViewportRows } from "../../../../viewport.ts";


type Props = {
  navItems: NavItem[];
  selectedIndex: number;
  expandedFiles: Set<string>;
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  fileOrder: string[];
  startTime: number;
  endTime?: number;
  actualThreadsUsed: number;
  exitCode?: number;
};

export function DoneView({
  navItems,
  selectedIndex,
  expandedFiles,
  files,
  blocks,
  fileOrder,
  startTime,
  endTime,
  actualThreadsUsed,
  exitCode,
}: Props): string {
  const terminalRows = getViewportRows();
  const viewportHeight = Math.max(5, terminalRows - 8);

  const lines: string[] = [];

  for (let idx = 0; idx < navItems.length; idx++) {
    const item = navItems[idx];
    if (!item) continue;
    const isItemSelected = idx === selectedIndex;
    const anchorPrefix = isItemSelected ? SCROLL_ANCHOR_SENTINEL : "";

    if (item.type === "file") {
      const file = files[item.id];
      if (!file) continue;
      lines.push(InteractiveFileLine({
        file,
        blocks,
        isSelected: isItemSelected,
        isExpanded: expandedFiles.has(item.id),
        noAnimation: true,
        anchorPrefix,
      }));
    } else if (item.type === "block") {
      const block = blocks[item.id];
      if (!block) continue;
      lines.push(InteractiveBlockLine({
        block,
        isSelected: isItemSelected,
        anchorPrefix,
      }));
    } else {
      lines.push(InteractiveDetailLine({
        text: item.text,
        isSelected: isItemSelected,
        anchorPrefix,
      }));
    }
  }

  const scrolled = Scroll({ height: viewportHeight, children: lines.join("\n") });

  const summary = VitestSummary({
    fileOrder,
    files,
    blocks,
    startTime,
    endTime,
    actualThreadsUsed,
    exitCode,
  });

  return [
    scrolled,
    summary,
    "  ↑↓ navigate  → open/focus child  ← close/back to parent  Enter/Space toggle  q/Esc exit",
  ].filter((s) => s !== "").join("\n");
}
