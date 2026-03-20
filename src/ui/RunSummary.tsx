import React from "npm:react";
import { Text } from "npm:ink";
import { ms } from "./formatters.ts";
import * as fmt from "jsr:@std/fmt@0.225.1/colors";

type Props = {
  successCount: number;
  failCount: number;
  ignoreCount: number;
  startTime: number;
  endTime?: number;
  exitCode?: number;
};

export function RunSummary({
  successCount,
  failCount,
  ignoreCount,
  startTime,
  endTime,
  exitCode,
}: Props) {
  if (exitCode === undefined) return null;

  const totalBlocks = successCount + failCount + ignoreCount;
  const elapsed = endTime ? endTime - startTime : 0;
  const statusText =
    exitCode > 0 ? fmt.bgRed(" FAIL ") : fmt.bgBrightGreen(" PASS ");
  const prettyTime = fmt.dim(`(${ms(elapsed)})`);

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
