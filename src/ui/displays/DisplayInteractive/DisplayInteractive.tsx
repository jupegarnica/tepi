import React, { useMemo } from "react";
import { Box, Text, Transform, useStdout } from "ink";
import type { BlockState } from "../../store/store.ts";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import { BlockLine } from "../../BlockLine/index.ts";
import { VitestSummary } from "../DisplayDefault/index.ts";
import type { InteractiveProps } from "./DisplayInteractive.types.ts";
import { useNavigation } from "./hooks/useNavigation.hook.ts";
import { InteractiveFileLine } from "./components/InteractiveFileLine.tsx";
import {
  formatFileLineText,
  formatBlockLineText,
  formatDetailLineText,
} from "./utils/interactiveFormatters.ts";

export function DisplayInteractive(props: InteractiveProps) {
  const {
    files,
    fileOrder,
    blocks,
    phase,
    messages,
    startTime,
    endTime,
    actualThreadsUsed,
    exitCode,
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
    noAnimation,
    onExit,
  } = props;

  const { stdout } = useStdout();

  const { selectedIndex, expandedFiles, expandedBlocks, navItems } = useNavigation({
    fileOrder,
    files,
    blocks,
    phase,
    onExit,
  });

  // Pre-render all nav items to a flat string-line array.
  // Tracks which output line the selected item starts on so the viewport
  // can be centered on it regardless of how tall expanded items are.
  const { allLines, selectedLineStart } = useMemo(() => {
    const lines: string[] = [];
    let selLine = 0;

    for (let idx = 0; idx < navItems.length; idx++) {
      const item = navItems[idx];
      if (!item) continue;
      const isItemSelected = idx === selectedIndex;

      if (idx === selectedIndex) selLine = lines.length;

      if (item.type === "file") {
        const file = files[item.id];
        if (!file) continue;
        lines.push(formatFileLineText(file, blocks, isItemSelected, expandedFiles.has(item.id)));
      } else if (item.type === "block") {
        const block = blocks[item.id];
        if (!block) continue;
        lines.push(formatBlockLineText(block, isItemSelected));
      } else {
        lines.push(formatDetailLineText(item.text, isItemSelected));
      }
    }

    return { allLines: lines, selectedLineStart: selLine };
  }, [navItems, selectedIndex, expandedFiles, files, blocks]);

  // Line-based viewport: always keep selected line centered
  const terminalRows = stdout?.rows ?? 24;
  const viewportHeight = Math.max(5, terminalRows - 8);
  const viewportStart = Math.max(
    0,
    Math.min(
      selectedLineStart - Math.floor(viewportHeight / 2),
      Math.max(0, allLines.length - viewportHeight),
    ),
  );
  const visibleLines = allLines.slice(viewportStart, viewportStart + viewportHeight);
  const aboveCount = viewportStart;
  const belowCount = Math.max(0, allLines.length - viewportStart - viewportHeight);

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />

      {/* During run: React-component rendering (same as default display) */}
      {phase !== "done" && fileOrder.map((id) => {
        const file = files[id];
        if (!file) return null;

        if (file.status === "done") {
          return (
            <InteractiveFileLine
              key={id}
              file={file}
              blocks={blocks}
              isSelected={false}
              isExpanded={false}
              noAnimation={noAnimation}
            />
          );
        }

        if (noAnimation) return null;

        if (file.status === "running") {
          return (
            <Box key={id} flexDirection="column">
              <InteractiveFileLine
                file={file}
                blocks={blocks}
                isSelected={false}
                isExpanded={false}
                noAnimation={noAnimation}
              />
              <Box flexDirection="column" marginLeft={6}>
                {file.blockIds
                  .map((bid) => blocks[bid])
                  .filter((b): b is BlockState => !!b && !b.isFirstBlock)
                  .map((b) => (
                    <BlockLine key={b.id} block={b} noAnimation={false} />
                  ))}
              </Box>
            </Box>
          );
        }

        return (
          <Box key={id} flexDirection="column">
            <Text dimColor>{`  · ${file.relativePath}`}</Text>
            <Box flexDirection="column" marginLeft={6}>
              {file.blockIds
                .map((bid) => blocks[bid])
                .filter((b): b is BlockState => !!b && !b.isFirstBlock)
                .map((b) => (
                  <BlockLine key={b.id} block={b} noAnimation={false} />
                ))}
            </Box>
          </Box>
        );
      })}

      {/* After done: line-based viewport via pre-rendered strings + Transform */}
      {phase === "done" && (
        <>
          {aboveCount > 0 && (
            <Text dimColor>{`  ↑ ${aboveCount} more`}</Text>
          )}
          <Transform transform={(line) => line}>
            <Text>{visibleLines.join("\n")}</Text>
          </Transform>
          {belowCount > 0 && (
            <Text dimColor>{`  ↓ ${belowCount} more`}</Text>
          )}
        </>
      )}

      {phase === "done" && (
        <>
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
      )}

      {isWatchMode && (
        <WatchStatus watchPaths={watchPaths} watchTriggerPaths={watchTriggerPaths} />
      )}
    </Box>
  );
}
