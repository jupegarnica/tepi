import type { BlockState, FileState } from "../../store/store.ts";
import { ErrorsSummary } from "../../ErrorsSummary/index.ts";
import { RunSummary } from "../../RunSummary/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import type { DisplayLayoutProps } from "./DisplayLayout.types.ts";
import { renderFileNode } from "./utils/renderFileNode.tsx";

export function DisplayLayout({
  files,
  fileOrder,
  blocks,
  phase,
  messages,
  successCount,
  failCount,
  ignoreCount,
  startTime,
  endTime,
  actualThreadsUsed,
  exitCode,
  isWatchMode,
  watchPaths,
  watchTriggerPaths,
  noAnimation,
  fileSectionConfig,
  errorSummaryStyle,
}: DisplayLayoutProps): string {
  const doneFiles = fileOrder
    .map((id) => files[id])
    .filter((f): f is FileState => !!f && f.status === "done");

  const activeFiles = fileOrder
    .map((id) => files[id])
    .filter((f): f is FileState => !!f && f.status !== "done");

  const allBlocks = Object.values(blocks) as BlockState[];

  const parts: string[] = [];

  const messagesPart = MessagesPanel({ messages });
  if (messagesPart) parts.push(messagesPart);

  for (const file of doneFiles) {
    const node = renderFileNode(file, blocks, noAnimation, fileSectionConfig);
    if (node) parts.push(node);
  }

  if (!noAnimation) {
    for (const file of activeFiles) {
      const node = renderFileNode(file, blocks, noAnimation, fileSectionConfig);
      if (node) parts.push(node);
    }
  }

  if (phase === "done") {
    const errors = ErrorsSummary({ blocks: allBlocks, style: errorSummaryStyle });
    if (errors) parts.push(errors);
    const summary = RunSummary({
      successCount,
      failCount,
      ignoreCount,
      startTime,
      endTime,
      actualThreadsUsed,
      exitCode,
    });
    if (summary) parts.push(summary);
  }

  if (isWatchMode) {
    const watch = WatchStatus({ watchPaths, watchTriggerPaths });
    if (watch) parts.push(watch);
  }

  return parts.join("\n");
}
