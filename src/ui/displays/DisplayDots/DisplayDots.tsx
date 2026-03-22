import React from "react";
import { Box } from "ink";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import type { BlockState } from "../../store/store.ts";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import { isCountedBlock } from "../../utils/blockFilters.ts";
import { formatVitestOutput } from "../DisplayDefault/index.ts";
import type { DotsFormatState } from "./DisplayDots.types.ts";
import { completedBlocks } from "./utils/dotsFormatters.ts";
import { DotsProgress } from "./components/DotsProgress.tsx";
import { DotsProgressStream } from "./components/DotsProgressStream.tsx";
import { DotsFailures } from "./components/DotsFailures.tsx";
import { DotsSummary } from "./components/DotsSummary.tsx";

export function formatDotsProgress(state: DotsFormatState): string {
  return state.fileOrder
    .flatMap((id) => state.files[id]?.blockIds ?? [])
    .map((id) => state.blocks[id])
    .filter(
      (block): block is BlockState =>
        isCountedBlock(block) &&
        block.status !== "pending" &&
        block.status !== "running",
    )
    .map((block) => {
      if (block.status === "failed") return "x";
      if (block.status === "ignored" || block.status === "empty") return "s";
      return ".";
    })
    .join("");
}

export function DisplayDots(props: CommonDisplayProps) {
  const {
    files,
    fileOrder,
    blocks,
    phase,
    messages,
    startTime,
    endTime,
    actualThreadsUsed,
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
    noAnimation,
  } = props;

  const vitestOutput = formatVitestOutput({
    fileOrder,
    files,
    blocks,
    phase,
    startTime,
    endTime,
    actualThreadsUsed,
  });

  const done = completedBlocks({ fileOrder, files, blocks });

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />
      {noAnimation
        ? <DotsProgressStream completed={done} phase={phase} />
        : <DotsProgress fileOrder={fileOrder} files={files} blocks={blocks} />}
      {phase === "done" && (
        <>
          <DotsFailures failures={vitestOutput.failures} />
          <DotsSummary summary={vitestOutput.summary} />
        </>
      )}
      {isWatchMode && (
        <WatchStatus watchPaths={watchPaths} watchTriggerPaths={watchTriggerPaths} />
      )}
    </Box>
  );
}
