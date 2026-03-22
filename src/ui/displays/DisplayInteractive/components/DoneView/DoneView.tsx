import React, { useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import type { BlockState, FileState } from "../../../../store/store.ts";
import { VitestSummary } from "../../../DisplayDefault/index.ts";
import { Scroll, SCROLL_ANCHOR_SENTINEL } from "../../../../shared/Scroll/index.ts";
import type { NavItem } from "../../DisplayInteractive.types.ts";
import { InteractiveFileLine } from "../InteractiveFileLine.tsx";
import { InteractiveBlockLine } from "../InteractiveBlockLine.tsx";
import { InteractiveDetailLine } from "../InteractiveDetailLine.tsx";

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
}: Props) {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;
  const viewportHeight = Math.max(5, terminalRows - 8);

  const tree = useMemo(() => {
    const nodes: React.ReactNode[] = [];

    for (let idx = 0; idx < navItems.length; idx++) {
      const item = navItems[idx];
      if (!item) continue;
      const isItemSelected = idx === selectedIndex;
      const anchorPrefix = isItemSelected ? SCROLL_ANCHOR_SENTINEL : "";

      if (item.type === "file") {
        const file = files[item.id];
        if (!file) continue;
        nodes.push(
          <InteractiveFileLine
            key={`file:${item.id}`}
            file={file}
            blocks={blocks}
            isSelected={isItemSelected}
            isExpanded={expandedFiles.has(item.id)}
            noAnimation
            anchorPrefix={anchorPrefix}
          />,
        );
      } else if (item.type === "block") {
        const block = blocks[item.id];
        if (!block) continue;
        nodes.push(
          <InteractiveBlockLine
            key={`block:${item.id}`}
            block={block}
            isSelected={isItemSelected}
            anchorPrefix={anchorPrefix}
          />,
        );
      } else {
        nodes.push(
          <InteractiveDetailLine
            key={`detail:${item.blockId}:${item.lineIndex}`}
            text={item.text}
            isSelected={isItemSelected}
            anchorPrefix={anchorPrefix}
          />,
        );
      }
    }

    return <Box flexDirection="column">{nodes}</Box>;
  }, [navItems, selectedIndex, expandedFiles, files, blocks]);

  return (
    <>
      <Scroll height={viewportHeight}>{tree}</Scroll>
      <VitestSummary
        fileOrder={fileOrder}
        files={files}
        blocks={blocks}
        startTime={startTime}
        endTime={endTime}
        actualThreadsUsed={actualThreadsUsed}
        exitCode={exitCode}
      />
      <Text dimColor>{"  ↑↓ navigate  → open/focus child  ← close/back to parent  Enter/Space toggle  q/Esc exit"}</Text>
    </>
  );
}
