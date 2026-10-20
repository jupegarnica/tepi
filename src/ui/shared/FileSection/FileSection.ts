import type { BlockState, FileState } from "../../store/store.ts";
import { BlockLine } from "../../BlockLine/index.ts";
import { BlockDetail } from "../../BlockDetail/index.ts";
import { getDisplayIndex, DISPLAY_INDEX_VERBOSE, DISPLAY_INDEX_TRUNCATE } from "../../utils/formatters.ts";
import type { BlockDetailConfig } from "./FileSection.types.ts";

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
}: Props): string {
  const fileBlocks = file.blockIds
    .map((id) => blocks[id])
    .filter(Boolean) as BlockState[];

  const lines: string[] = [];
  if (showHeader) {
    lines.push(fmt.gray(`running ${file.relativePath} `));
  }

  for (const block of fileBlocks) {
    const effectiveDisplayIndex = block.displayMode
      ? getDisplayIndex(block.displayMode)
      : globalDisplayIndex;

    if (
      (block.status === "ignored" || block.status === "empty") &&
      !showIgnored &&
      effectiveDisplayIndex < DISPLAY_INDEX_VERBOSE
    ) {
      continue;
    }

    if (
      block.status === "empty" &&
      block.isFirstBlock &&
      effectiveDisplayIndex < DISPLAY_INDEX_VERBOSE
    ) {
      continue;
    }

    const isDone = block.status !== "running" && block.status !== "pending";
    const canShowDetail =
      isDone && block.status !== "empty" && block.status !== "ignored";

    const showDetail =
      canShowDetail &&
      blockDetail != null &&
      effectiveDisplayIndex >= DISPLAY_INDEX_TRUNCATE;

    lines.push(BlockLine({ block, noAnimation }));
    if (showDetail) {
      lines.push(BlockDetail({
        block,
        truncateBody: blockDetail!.truncateBody,
        truncateHeaders: blockDetail!.truncateHeaders,
        showErrorDetail: blockDetail!.showErrorDetail,
      }));
    }
  }

  return lines.filter((s) => s !== "").join("\n");
}

import * as fmt from "@std/fmt/colors";
