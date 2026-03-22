import React from "react";
import { Box, Static } from "ink";
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
}: DisplayLayoutProps) {
  const doneFiles = fileOrder
    .map((id) => files[id])
    .filter((f): f is FileState => !!f && f.status === "done");

  const activeFiles = fileOrder
    .map((id) => files[id])
    .filter((f): f is FileState => !!f && f.status !== "done");

  const allBlocks = Object.values(blocks) as BlockState[];

  return (
    <>
      <MessagesPanel messages={messages} />

      <Static items={doneFiles}>
        {(file) => (
          <Box key={file.relativePath} flexDirection="column">
            {renderFileNode(file, blocks, noAnimation, fileSectionConfig)}
          </Box>
        )}
      </Static>

      {!noAnimation && activeFiles.map((file) => (
        <Box key={file.relativePath} flexDirection="column">
          {renderFileNode(file, blocks, noAnimation, fileSectionConfig)}
        </Box>
      ))}

      {phase === "done" && (
        <>
          <ErrorsSummary blocks={allBlocks} style={errorSummaryStyle} />
          <RunSummary
            successCount={successCount}
            failCount={failCount}
            ignoreCount={ignoreCount}
            startTime={startTime}
            endTime={endTime}
            actualThreadsUsed={actualThreadsUsed}
            exitCode={exitCode}
          />
        </>
      )}

      {isWatchMode && (
        <WatchStatus watchPaths={watchPaths} watchTriggerPaths={watchTriggerPaths} />
      )}
    </>
  );
}
