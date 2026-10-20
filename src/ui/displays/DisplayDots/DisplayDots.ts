import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import type { BlockState } from "../../store/store.ts";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import { isCountedBlock } from "../../utils/blockFilters.ts";
import { formatVitestOutput } from "../DisplayDefault/index.ts";
import type { DotsFormatState } from "./DisplayDots.types.ts";
import { completedBlocks } from "./utils/dotsFormatters.ts";
import { DotsProgress } from "./components/DotsProgress.ts";
import { DotsProgressStream, resetDotsStream } from "./components/DotsProgressStream.ts";
import { DotsFailures } from "./components/DotsFailures.ts";
import { DotsSummary } from "./components/DotsSummary.ts";

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

export function DisplayDots(props: CommonDisplayProps): string {
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
  if (done.length === 0 && phase === "running") resetDotsStream();

  const parts: string[] = [];

  const messagesPart = MessagesPanel({ messages });
  if (messagesPart) parts.push(messagesPart);

  parts.push(
    noAnimation
      ? DotsProgressStream({ completed: done, phase })
      : DotsProgress({ fileOrder, files, blocks }),
  );

  if (phase === "done") {
    const failures = DotsFailures({ failures: vitestOutput.failures });
    if (failures) parts.push(failures);
    parts.push(DotsSummary({ summary: vitestOutput.summary }));
  }

  if (isWatchMode) {
    const watch = WatchStatus({ watchPaths, watchTriggerPaths });
    if (watch) parts.push(watch);
  }

  return parts.filter((s) => s !== "").join("\n");
}
