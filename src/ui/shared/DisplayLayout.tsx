import React from "react";
import { Box, Static, Text } from "ink";
import type { BlockState, FileState, Message } from "../store.ts";
import { ErrorsSummary } from "../ErrorsSummary.tsx";
import { RunSummary } from "../RunSummary.tsx";
import { WatchStatus } from "../WatchStatus.tsx";
import { MessagesPanel } from "../MessagesPanel.tsx";
import { FileSection } from "./FileSection.tsx";
import type { BlockDetailConfig } from "./FileSection.tsx";
import * as fmt from "@std/fmt/colors";

export type FileSectionConfig = {
  showHeader: boolean;
  showIgnored: boolean;
  globalDisplayIndex: number;
  blockDetail?: BlockDetailConfig;
};

export type CommonDisplayProps = {
  files: Record<string, FileState>;
  fileOrder: string[];
  blocks: Record<string, BlockState>;
  phase: string;
  messages: Message[];
  successCount: number;
  failCount: number;
  ignoreCount: number;
  startTime: number;
  endTime?: number;
  actualThreadsUsed: number;
  exitCode?: number;
  isWatchMode: boolean;
  watchPaths: string[];
  watchTriggerPaths: string[];
  noAnimation: boolean;
};

type Props = CommonDisplayProps & {
  fileSectionConfig?: FileSectionConfig;
  errorSummaryStyle: "compact" | "expanded";
};

function renderFileNode(
  file: FileState,
  blocks: Record<string, BlockState>,
  noAnimation: boolean,
  fileSectionConfig: FileSectionConfig | undefined,
): React.ReactNode {
  if (fileSectionConfig == null) {
    if (file.status === "running") {
      return <Text>{fmt.gray(`running ${file.relativePath} `)}</Text>;
    }
    return null;
  }
  return (
    <FileSection
      file={file}
      blocks={blocks}
      showHeader={fileSectionConfig.showHeader}
      showIgnored={fileSectionConfig.showIgnored}
      noAnimation={noAnimation}
      globalDisplayIndex={fileSectionConfig.globalDisplayIndex}
      blockDetail={fileSectionConfig.blockDetail}
    />
  );
}

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
}: Props) {
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
