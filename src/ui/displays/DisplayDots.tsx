import React from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import type { BlockState, FileState } from "../store.ts";
import { MessagesPanel } from "../MessagesPanel.tsx";
import { WatchStatus } from "../WatchStatus.tsx";
import { formatFailureDetailsText } from "../failureDetails.ts";
import { ms } from "../formatters.ts";
import {
  formatVitestOutput,
  type VitestFailureEntry,
  type VitestFormatResult,
} from "./DisplayDefault.tsx";

type DotsFormatState = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
};

export function formatDotsProgress(state: DotsFormatState): string {
  return state.fileOrder
    .flatMap((id) => state.files[id]?.blockIds ?? [])
    .map((id) => state.blocks[id])
    .filter(
      (block): block is BlockState =>
        !!block &&
        !block.isFirstBlock &&
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

function completedBlocks(state: DotsFormatState): BlockState[] {
  return state.fileOrder
    .flatMap((id) => state.files[id]?.blockIds ?? [])
    .map((id) => state.blocks[id])
    .filter(
      (block): block is BlockState =>
        !!block &&
        !block.isFirstBlock &&
        block.status !== "pending" &&
        block.status !== "running",
    );
}

function markerForBlock(block: BlockState): string {
  if (block.status === "failed") return "x";
  if (block.status === "ignored" || block.status === "empty") return "s";
  return ".";
}

function colorForBlock(block: BlockState): "green" | "red" | "yellow" {
  if (block.status === "failed") return "red";
  if (block.status === "ignored" || block.status === "empty") return "yellow";
  return "green";
}

function DotsProgress(props: DotsFormatState) {
  const entries = completedBlocks(props);

  if (!entries.length) return null;

  const colors = fmt.getColorEnabled();

  return (
    <Text>
      {entries.map((block) => (
        <Text key={block.id} color={colors ? colorForBlock(block) : undefined}>
          {markerForBlock(block)}
        </Text>
      ))}
    </Text>
  );
}

function DotsFailures({ failures }: { failures: VitestFailureEntry[] }) {
  const colors = fmt.getColorEnabled();

  if (!failures.length) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {failures.map((entry, index) => (
        <Box key={`${entry.blockLink}-${index}`} flexDirection="column" marginBottom={1}>
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

function DotsSummary({ summary }: { summary: VitestFormatResult["summary"] }) {
  const colors = fmt.getColorEnabled();

  const filesLine =
    (summary.filesFailed > 0 ? fmt.red(`${summary.filesFailed} failed`) + " | " : "") +
    fmt.green(`${summary.filesPassed} passed`) +
    fmt.dim(` (${summary.filesTotal})`);

  const testsLine =
    fmt.green(`${summary.testsPassed} passed`) +
    (summary.testsFailed > 0 ? " | " + fmt.red(`${summary.testsFailed} failed`) : "") +
    (summary.testsIgnored > 0 ? " | " + fmt.yellow(`${summary.testsIgnored} ignored`) : "") +
    fmt.dim(` (${summary.testsTotal})`);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>{" " + fmt.bold("Test Files") + "  " + filesLine}</Text>
      <Text>{" " + fmt.bold("Tests      ") + "  " + testsLine}</Text>
      <Text>{" " + fmt.bold("Duration   ") + "  " + (colors ? fmt.dim(ms(summary.duration)) : ms(summary.duration))}</Text>
    </Box>
  );
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
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
  } = props;

  const vitestOutput = formatVitestOutput({
    fileOrder,
    files,
    blocks,
    phase,
    startTime,
    endTime,
  });

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />
      <DotsProgress fileOrder={fileOrder} files={files} blocks={blocks} />
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