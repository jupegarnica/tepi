import React from "react";
import { Box, Text } from "ink";
import type { BlockState, FileState } from "../../store/store.ts";
import { BlockLine } from "../../BlockLine/index.ts";
import { BlockDetail } from "../../BlockDetail/index.ts";
import { getDisplayIndex, DISPLAY_INDEX_VERBOSE, DISPLAY_INDEX_TRUNCATE } from "../../utils/formatters.ts";
import type { BlockDetailConfig } from "./FileSection.types.ts";
import * as fmt from "@std/fmt/colors";

type Props = {
  file: FileState;
  blocks: Record<string, BlockState>;
  showHeader: boolean;
  showIgnored: boolean;
  noAnimation: boolean;
  blockDetail?: BlockDetailConfig;
  globalDisplayIndex: number;
};

export function FileSection({
  file,
  blocks,
  showHeader,
  showIgnored,
  noAnimation,
  blockDetail,
  globalDisplayIndex,
}: Props) {
  const fileBlocks = file.blockIds
    .map((id) => blocks[id])
    .filter(Boolean) as BlockState[];

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Text>{fmt.gray(`running ${file.relativePath} `)}</Text>
      )}
      {fileBlocks.map((block) => {
        const effectiveDisplayIndex = block.displayMode
          ? getDisplayIndex(block.displayMode)
          : globalDisplayIndex;

        if (
          (block.status === "ignored" || block.status === "empty") &&
          !showIgnored &&
          effectiveDisplayIndex < DISPLAY_INDEX_VERBOSE
        ) {
          return null;
        }

        if (
          block.status === "empty" &&
          block.isFirstBlock &&
          effectiveDisplayIndex < DISPLAY_INDEX_VERBOSE
        ) {
          return null;
        }

        const isDone = block.status !== "running" && block.status !== "pending";
        const canShowDetail =
          isDone && block.status !== "empty" && block.status !== "ignored";

        const showDetail =
          canShowDetail &&
          blockDetail != null &&
          effectiveDisplayIndex >= DISPLAY_INDEX_TRUNCATE;

        return (
          <Box key={block.id} flexDirection="column">
            <BlockLine block={block} noAnimation={noAnimation} />
            {showDetail && (
              <BlockDetail
                block={block}
                truncateBody={blockDetail!.truncateBody}
                truncateHeaders={blockDetail!.truncateHeaders}
                showErrorDetail={blockDetail!.showErrorDetail}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
