import React, { useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import type { BlockState } from "../../store/store.ts";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import { BlockLine } from "../../BlockLine/index.ts";
import { VitestSummary } from "../DisplayDefault/index.ts";
import { Scroll, SCROLL_ANCHOR_SENTINEL } from "../../shared/Scroll/index.ts";
import type { InteractiveProps } from "./DisplayInteractive.types.ts";
import { useNavigation } from "./hooks/useNavigation.hook.ts";
import { InteractiveFileLine } from "./components/InteractiveFileLine.tsx";
import { InteractiveBlockLine } from "./components/InteractiveBlockLine.tsx";
import { InteractiveDetailLine } from "./components/InteractiveDetailLine.tsx";

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

  const { selectedIndex, expandedFiles, navItems } = useNavigation({
    fileOrder,
    files,
    blocks,
    phase,
    onExit,
  });

  const doneTree = useMemo(() => {
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

  // Reserve room for the summary and help footer below the scrollable region.
  const terminalRows = stdout?.rows ?? 24;
  const viewportHeight = Math.max(5, terminalRows - 8);

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

      {/* After done: render the full line model and let Scroll own viewport slicing. */}
      {phase === "done" && (
        <Scroll height={viewportHeight}>
          {doneTree}
        </Scroll>
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
