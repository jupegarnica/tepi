import React from "npm:react";
import { Box, Text } from "npm:ink";
import type { BlockState, FileState } from "./store.ts";
import { BlockLine } from "./BlockLine.tsx";
import { BlockDetail } from "./BlockDetail.tsx";
import {
  DISPLAY_INDEX_DEFAULT,
  DISPLAY_INDEX_FULL,
  DISPLAY_INDEX_MINIMAL,
  DISPLAY_INDEX_TRUNCATE,
  DISPLAY_INDEX_VERBOSE,
  getDisplayIndex,
} from "./formatters.ts";
import * as fmt from "jsr:@std/fmt@0.225.1/colors";

type Props = {
  file: FileState;
  blocks: Record<string, BlockState>;
  displayMode: string;
  noAnimation: boolean;
};

export function FileRunner({ file, blocks, displayMode, noAnimation }: Props) {
  const displayIndex = getDisplayIndex(displayMode);
  const fileBlocks = file.blockIds
    .map((id) => blocks[id])
    .filter(Boolean) as BlockState[];

  if (displayIndex <= 0) return null;

  const showFileHeader = displayIndex >= DISPLAY_INDEX_DEFAULT;
  const showBlocks = displayIndex >= DISPLAY_INDEX_DEFAULT;
  const showDetails = displayIndex >= DISPLAY_INDEX_TRUNCATE;

  // For minimal mode, show a file-level spinner while running
  const isRunning = file.status === "running";
  if (displayIndex === DISPLAY_INDEX_MINIMAL) {
    const path = fmt.gray(`running ${file.relativePath} `);
    if (isRunning) {
      return <Text>{path}</Text>;
    }
    return null;
  }

  return (
    <Box flexDirection="column">
      {showFileHeader && (
        <Text>{fmt.gray(`running ${file.relativePath} `)}</Text>
      )}
      {showBlocks && fileBlocks.map((block) => {
        const blockDisplayIndex = block.displayMode
          ? getDisplayIndex(block.displayMode)
          : displayIndex;

        // In verbose mode, show ignored/empty blocks
        if (
          (block.status === "ignored" || block.status === "empty") &&
          blockDisplayIndex < DISPLAY_INDEX_VERBOSE
        ) {
          return null;
        }
        // Skip empty first blocks (global meta blocks) unless verbose
        if (block.status === "empty" && block.isFirstBlock && blockDisplayIndex < DISPLAY_INDEX_VERBOSE) {
          return null;
        }

        const isDone = block.status !== "running" && block.status !== "pending";
        const showDetail = showDetails && isDone && block.status !== "empty" && block.status !== "ignored";

        return (
          <Box key={block.id} flexDirection="column">
            <BlockLine block={block} noAnimation={noAnimation} />
            {showDetail && (
              <BlockDetail block={block} globalDisplayMode={displayMode} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
