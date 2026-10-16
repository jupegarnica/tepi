import * as fmt from "@std/fmt/colors";
import { formatDurationSummary } from "../../DisplayDefault/index.ts";
import type { VitestFormatResult } from "../../DisplayDefault/index.ts";

export function DotsSummary({ summary }: { summary: VitestFormatResult["summary"] }): string {
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

  const duration = colors
    ? fmt.dim(formatDurationSummary(summary.duration, summary.actualThreadsUsed))
    : formatDurationSummary(summary.duration, summary.actualThreadsUsed);

  return [
    "",
    " " + fmt.bold("Test Files") + "  " + filesLine,
    " " + fmt.bold("Tests      ") + "  " + testsLine,
    " " + fmt.bold("Duration   ") + "  " + duration,
  ].join("\n");
}
