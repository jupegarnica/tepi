import React from "react";
import { Box, Static, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import type { BlockState } from "../store.ts";

type TapFormatState = {
  blockOrder: string[];
  blocks: Record<string, BlockState>;
  phase: string;
};

export function formatTapOutput(state: TapFormatState): string[] {
  const testBlocks = state.blockOrder
    .map((id) => state.blocks[id])
    .filter((b): b is BlockState => !!b && !b.isFirstBlock);

  const output: string[] = ["TAP version 14"];

  for (let i = 0; i < testBlocks.length; i++) {
    const b = testBlocks[i];
    if (b.status === "pending" || b.status === "running") continue;
    const num = i + 1;
    const skip = b.status === "ignored" || b.status === "empty";
    const ok = b.status !== "failed";
    const directive = skip ? " # SKIP" : "";
    output.push(`${ok ? "ok" : "not ok"} ${num} - ${b.description}${directive}`);
    if (b.status === "failed" && b.error) {
      output.push(`  ---`);
      output.push(`  message: ${b.error.message}`);
      if (b.error.cause) output.push(`  cause: ${b.error.cause}`);
      output.push(`  ...`);
    }
  }

  if (state.phase === "done") {
    output.push(`1..${testBlocks.length}`);
  }

  return output;
}

function TapTestLine({ block, num }: { block: BlockState; num: number }) {
  const colors = fmt.getColorEnabled();
  const skip = block.status === "ignored" || block.status === "empty";
  const ok = block.status !== "failed";
  const directive = skip ? " # SKIP" : "";

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold color={colors ? (ok ? "green" : "red") : undefined}>
          {ok ? "ok" : "not ok"}
        </Text>
        {` ${num} - ${block.description}`}
        {directive && (
          <Text italic color={colors ? "green" : undefined}>
            {directive}
          </Text>
        )}
      </Text>
      {block.status === "failed" && block.error && (
        <Box flexDirection="column">
          <Text dimColor>{"  ---"}</Text>
          <Text dimColor>{`  message: ${block.error.message}`}</Text>
          {block.error.cause && (
            <Text dimColor>{`  cause: ${block.error.cause}`}</Text>
          )}
          <Text dimColor>{"  ..."}</Text>
        </Box>
      )}
    </Box>
  );
}

export function DisplayTap(props: CommonDisplayProps) {
  const { blocks, phase, fileOrder, files } = props;
  const colors = fmt.getColorEnabled();

  const blockOrder = fileOrder.flatMap((id) => files[id]?.blockIds ?? []);

  const testBlocks = blockOrder
    .map((id) => blocks[id])
    .filter((b): b is BlockState => !!b && !b.isFirstBlock);

  const testNumberMap = new Map(testBlocks.map((b, i) => [b.id, i + 1]));

  const doneBlocks = testBlocks.filter(
    (b) => b.status !== "pending" && b.status !== "running"
  );

  return (
    <Box flexDirection="column">
      <Text>TAP version 14</Text>
      <Static items={doneBlocks}>
        {(block) => {
          const num = testNumberMap.get(block.id) ?? 0;
          return (
            <TapTestLine key={block.id} block={block} num={num} />
          );
        }}
      </Static>
      {phase === "done" && (
        <Text bold color={colors ? "green" : undefined}>
          {`1..${testBlocks.length}`}
        </Text>
      )}
    </Box>
  );
}
