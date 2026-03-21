import React from "react";
import { Text } from "ink";
import { ms } from "./formatters.ts";
import * as fmt from "@std/fmt/colors";

type Props = {
  successCount: number;
  failCount: number;
  ignoreCount: number;
  startTime: number;
  endTime?: number;
  actualThreadsUsed: number;
  exitCode?: number;
};

function formatThreadsUsed(actualThreadsUsed: number): string {
  const label = actualThreadsUsed === 1 ? "thread" : "threads";
  return `with ${actualThreadsUsed} ${label}`;
}

export function RunSummary({
  successCount,
  failCount,
  ignoreCount,
  startTime,
  endTime,
  actualThreadsUsed,
  exitCode,
}: Props) {
  if (exitCode === undefined) return null;

  const totalBlocks = successCount + failCount + ignoreCount;
  const elapsed = endTime ? endTime - startTime : 0;
  const statusText =
    exitCode > 0 ? fmt.bgRed(" FAIL ") : fmt.bgBrightGreen(" PASS ");
  const prettyTime = fmt.dim(`(${ms(elapsed)}, ${formatThreadsUsed(actualThreadsUsed)})`);

  const summary =
    `${fmt.white(String(totalBlocks))} tests, ` +
    `${fmt.green(String(successCount))} passed, ` +
    `${fmt.red(String(failCount))} failed, ` +
    `${fmt.yellow(String(ignoreCount))} ignored ` +
    prettyTime;

  return (
    <Text>
      {"\n"}
      {fmt.bold(statusText)} {summary}
    </Text>
  );
}
