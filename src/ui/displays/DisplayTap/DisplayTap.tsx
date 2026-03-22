import React from "react";
import { Box, Static, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import type { BlockState } from "../../store/store.ts";
import type { TapFormatState } from "./DisplayTap.types.ts";
import { getTapTestBlocks, getTapDoneBlocks, getTapStreamItems } from "./utils/tapFormatters.ts";

export function formatTapOutput(state: TapFormatState): string[] {
  const testBlocks = getTapTestBlocks(state.blockOrder, state.blocks);
  const doneBlocks = getTapDoneBlocks(testBlocks);
  const testNumberMap = new Map(testBlocks.map((b, i) => [b.id, i + 1]));

  const output: string[] = ["TAP version 14"];

  for (const b of doneBlocks) {
    const num = testNumberMap.get(b.id) ?? 0;
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

  const testBlocks = getTapTestBlocks(blockOrder, blocks);
  const streamItems = getTapStreamItems(testBlocks, phase);

  return (
    <Box flexDirection="column">
      <Static items={streamItems}>
        {(item) => {
          if (item.type === "header") {
            return <Text key={item.key}>TAP version 14</Text>;
          }

          if (item.type === "plan") {
            return (
              <Text key={item.key} bold color={colors ? "green" : undefined}>
                {`1..${item.total}`}
              </Text>
            );
          }

          return (
            <TapTestLine key={item.key} block={item.block} num={item.num} />
          );
        }}
      </Static>
    </Box>
  );
}
