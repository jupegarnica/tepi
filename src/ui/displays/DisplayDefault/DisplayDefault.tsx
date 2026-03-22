import React from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import type { BlockState, FileState } from "../../store/store.ts";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import { BlockLine } from "../../BlockLine/index.ts";
import { ms } from "../../utils/formatters.ts";
import { formatFailureDetailsText } from "../../utils/failureDetails.ts";
import { FileLine } from "./components/FileLine.tsx";
import { VitestFailures } from "./components/VitestFailures.tsx";
import type {
  FileStats,
  VitestFormatState,
  VitestFileStatEntry,
  VitestFailureEntry,
  VitestFormatResult,
} from "./DisplayDefault.types.ts";

export type {
  FileStats,
  VitestFormatState,
  VitestFileStatEntry,
  VitestFailureEntry,
  VitestFormatResult,
};

export function computeFileStats(
  file: FileState,
  blocks: Record<string, BlockState>,
): FileStats {
  const fileBlocks = file.blockIds
    .map((id) => blocks[id])
    .filter((b): b is BlockState => !!b && !b.isFirstBlock);

  let passed = 0, failed = 0, ignored = 0, elapsed = 0;
  for (const b of fileBlocks) {
    if (b.status === "passed") passed++;
    else if (b.status === "failed") failed++;
    else if (b.status === "ignored" || b.status === "empty") ignored++;
    elapsed += b.elapsedTime ?? 0;
  }
  return { passed, failed, ignored, total: passed + failed + ignored, elapsed, hasFailures: failed > 0 };
}

export function formatDurationSummary(duration: number, actualThreadsUsed: number): string {
  const label = actualThreadsUsed === 1 ? "thread" : "threads";
  return `${ms(duration)} (with ${actualThreadsUsed} ${label})`;
}

export function formatVitestOutput(state: VitestFormatState): VitestFormatResult {
  const orderedFiles = state.fileOrder
    .map((id) => state.files[id])
    .filter((f): f is FileState => !!f);

  const fileStats = orderedFiles.map((f) => ({
    relativePath: f.relativePath,
    status: f.status,
    stats: computeFileStats(f, state.blocks),
  }));

  const failures: VitestFailureEntry[] = [];
  for (const f of orderedFiles) {
    for (const id of f.blockIds) {
      const b = state.blocks[id];
      if (!b || b.isFirstBlock || b.status !== "failed" || !b.error) continue;
      failures.push({
        relativePath: f.relativePath,
        description: b.description,
        filePath: b.filePath,
        blockLink: b.blockLink,
        error: b.error,
        failureContext: b.failureContext,
        sourceText: b.sourceText,
        sourceStartLine: b.sourceStartLine,
        sourceEndLine: b.sourceEndLine,
      });
    }
  }

  const filesPassed = fileStats.filter((f) => f.status === "done" && !f.stats.hasFailures).length;
  const filesFailed = fileStats.filter((f) => f.stats.hasFailures).length;
  const duration = state.endTime ? state.endTime - state.startTime : 0;

  return {
    fileStats,
    failures,
    summary: {
      filesPassed,
      filesFailed,
      filesTotal: fileStats.length,
      testsPassed: fileStats.reduce((s, f) => s + f.stats.passed, 0),
      testsFailed: fileStats.reduce((s, f) => s + f.stats.failed, 0),
      testsIgnored: fileStats.reduce((s, f) => s + f.stats.ignored, 0),
      testsTotal: fileStats.reduce((s, f) => s + f.stats.total, 0),
      duration,
      actualThreadsUsed: state.actualThreadsUsed ?? 0,
    },
  };
}

export function VitestSummary({
  fileOrder,
  files,
  blocks,
  startTime,
  endTime,
  actualThreadsUsed,
  exitCode,
}: {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  startTime: number;
  endTime?: number;
  actualThreadsUsed: number;
  exitCode?: number;
}) {
  if (exitCode === undefined) return null;

  const colors = fmt.getColorEnabled();
  const allFiles = fileOrder.map((id) => files[id]).filter(Boolean) as FileState[];
  const allStats = allFiles.map((f) => computeFileStats(f, blocks));

  const filesPassed = allFiles.filter((_, i) => !allStats[i].hasFailures).length;
  const filesFailed = allFiles.filter((_, i) => allStats[i].hasFailures).length;
  const filesTotal = allFiles.length;
  const testsPassed = allStats.reduce((s, st) => s + st.passed, 0);
  const testsFailed = allStats.reduce((s, st) => s + st.failed, 0);
  const testsIgnored = allStats.reduce((s, st) => s + st.ignored, 0);
  const testsTotal = testsPassed + testsFailed + testsIgnored;
  const elapsed = endTime ? endTime - startTime : 0;

  const filesLine =
    (filesFailed > 0 ? fmt.red(`${filesFailed} failed`) + " | " : "") +
    fmt.green(`${filesPassed} passed`) +
    fmt.dim(` (${filesTotal})`);

  const testsLine =
    fmt.green(`${testsPassed} passed`) +
    (testsFailed > 0 ? " | " + fmt.red(`${testsFailed} failed`) : "") +
    (testsIgnored > 0 ? " | " + fmt.yellow(`${testsIgnored} ignored`) : "") +
    fmt.dim(` (${testsTotal})`);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>{" " + fmt.bold("Test Files") + "  " + filesLine}</Text>
      <Text>{" " + fmt.bold("Tests      ") + "  " + testsLine}</Text>
      <Text>{" " + fmt.bold("Duration   ") + "  " + (colors ? fmt.dim(formatDurationSummary(elapsed, actualThreadsUsed)) : formatDurationSummary(elapsed, actualThreadsUsed))}</Text>
    </Box>
  );
}

export function DisplayDefault(props: CommonDisplayProps) {
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
  } = props;

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />

      {fileOrder.map((id) => {
        const file = files[id];
        if (!file) return null;

        if (file.status === "done") {
          return <FileLine key={id} file={file} blocks={blocks} />;
        }

        if (noAnimation) return null;

        if (file.status === "running") {
          return (
            <Box key={id} flexDirection="column">
              <FileLine file={file} blocks={blocks} noAnimation={noAnimation} />
              <Box flexDirection="column" marginLeft={4}>
                {file.blockIds
                  .map((bid) => blocks[bid])
                  .filter((b): b is BlockState => !!b && !b.isFirstBlock)
                  .map((b) => (
                    <BlockLine key={b.id} block={b} noAnimation={noAnimation ?? false} />
                  ))}
              </Box>
            </Box>
          );
        }

        return (
          <Box key={id} flexDirection="column">
            <Text dimColor>{` · ${file.relativePath}`}</Text>
            <Box flexDirection="column" marginLeft={4}>
              {file.blockIds
                .map((bid) => blocks[bid])
                .filter((b): b is BlockState => !!b && !b.isFirstBlock)
                .map((b) => (
                  <BlockLine key={b.id} block={b} noAnimation={noAnimation ?? false} />
                ))}
            </Box>
          </Box>
        );
      })}

      {phase === "done" && (
        <>
          <VitestFailures fileOrder={fileOrder} files={files} blocks={blocks} />
          <VitestSummary
            fileOrder={fileOrder}
            files={files}
            blocks={blocks}
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
    </Box>
  );
}
