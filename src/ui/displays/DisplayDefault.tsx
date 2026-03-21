import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import type { BlockState, FileState } from "../store.ts";
import { MessagesPanel } from "../MessagesPanel.tsx";
import { WatchStatus } from "../WatchStatus.tsx";
import { BlockLine } from "../BlockLine.tsx";
import { ms } from "../formatters.ts";
import { formatFailureDetailsText } from "../failureDetails.ts";

type FileStats = {
  passed: number;
  failed: number;
  ignored: number;
  total: number;
  elapsed: number;
  hasFailures: boolean;
};

function computeFileStats(
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

export type VitestFormatState = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  phase: string;
  startTime: number;
  endTime?: number;
};

export type VitestFileStatEntry = {
  relativePath: string;
  status: string;
  stats: FileStats;
};

export type VitestFailureEntry = {
  relativePath: string;
  description: string;
  filePath: string;
  blockLink: string;
  error: { name: string; message: string; cause?: string };
  failureContext?: BlockState["failureContext"];
  sourceText?: string;
  sourceStartLine?: number;
  sourceEndLine?: number;
};

export type VitestFormatResult = {
  fileStats: VitestFileStatEntry[];
  failures: VitestFailureEntry[];
  summary: {
    filesPassed: number;
    filesFailed: number;
    filesTotal: number;
    testsPassed: number;
    testsFailed: number;
    testsIgnored: number;
    testsTotal: number;
    duration: number;
  };
};

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
    },
  };
}

function FileLine({
  file,
  blocks,
  noAnimation,
}: {
  file: FileState;
  blocks: Record<string, BlockState>;
  noAnimation?: boolean;
}) {
  const colors = fmt.getColorEnabled();
  const stats = computeFileStats(file, blocks);

  if (file.status !== "done") {
    return (
      <Text>
        {" "}
        {noAnimation
          ? <Text color={colors ? "blue" : undefined}>{"…"}</Text>
          : <Text color={colors ? "blue" : undefined}><Spinner type="dots4" /></Text>}
        {` ${file.relativePath}`}
      </Text>
    );
  }

  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;

  if (hasFailures) {
    return (
      <Text>
        {" "}
        <Text color={colors ? "red" : undefined}>{"✗"}</Text>
        {` ${file.relativePath} `}
        <Text dimColor>{`(${countStr})`}</Text>
        {elapsedStr}
      </Text>
    );
  }

  return (
    <Text>
      {" "}
      <Text color={colors ? "green" : undefined}>{"✓"}</Text>
      {` ${file.relativePath} `}
      <Text dimColor>{`(${countStr})`}</Text>
      {elapsedStr}
    </Text>
  );
}

function VitestFailures({
  fileOrder,
  files,
  blocks,
}: {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
}) {
  const colors = fmt.getColorEnabled();
  const entries: VitestFailureEntry[] = [];

  for (const id of fileOrder) {
    const file = files[id];
    if (!file) continue;
    for (const bid of file.blockIds) {
      const b = blocks[bid];
      if (!b || b.isFirstBlock || b.status !== "failed" || !b.error) continue;
      entries.push({
        relativePath: file.relativePath,
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

  if (!entries.length) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {entries.map((entry, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text>
            {" "}
            <Text bold color={colors ? "red" : undefined}>{"FAIL "}</Text>
            <Text dimColor>{entry.relativePath}</Text>
            {" > "}
            <Text bold>{entry.description}</Text>
          </Text>
          <Text>{formatFailureDetailsText(entry)}</Text>
        </Box>
      ))}
    </Box>
  );
}

function VitestSummary({
  fileOrder,
  files,
  blocks,
  startTime,
  endTime,
  exitCode,
}: {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  startTime: number;
  endTime?: number;
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
      <Text>{" " + fmt.bold("Duration   ") + "  " + (colors ? fmt.dim(ms(elapsed)) : ms(elapsed))}</Text>
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
