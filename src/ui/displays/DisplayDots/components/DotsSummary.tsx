import React from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import { formatDurationSummary } from "../../DisplayDefault/index.ts";
import type { VitestFormatResult } from "../../DisplayDefault/index.ts";

export function DotsSummary({ summary }: { summary: VitestFormatResult["summary"] }) {
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
      <Text>{" " + fmt.bold("Duration   ") + "  " + (colors ? fmt.dim(formatDurationSummary(summary.duration, summary.actualThreadsUsed)) : formatDurationSummary(summary.duration, summary.actualThreadsUsed))}</Text>
    </Box>
  );
}
