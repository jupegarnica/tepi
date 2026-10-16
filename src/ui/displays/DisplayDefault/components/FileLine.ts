import { Spinner } from "../../../BlockLine/spinner.ts";
import * as fmt from "@std/fmt/colors";
import type { BlockState, FileState } from "../../../store/store.ts";
import { ms } from "../../../utils/formatters.ts";
import { computeFileStats } from "../DisplayDefault.ts";

export function FileLine({
  file,
  blocks,
  noAnimation,
}: {
  file: FileState;
  blocks: Record<string, BlockState>;
  noAnimation?: boolean;
}): string {
  const colors = fmt.getColorEnabled();
  const stats = computeFileStats(file, blocks);

  if (file.status !== "done") {
    return ` ${colors ? fmt.blue(noAnimation ? "…" : Spinner()) : (noAnimation ? "…" : Spinner())} ${file.relativePath}`;
  }

  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;

  if (hasFailures) {
    return ` ${colors ? fmt.red("✗") : "✗"} ${file.relativePath} ${fmt.dim(`(${countStr})`)}${elapsedStr}`;
  }

  return ` ${colors ? fmt.green("✓") : "✓"} ${file.relativePath} ${fmt.dim(`(${countStr})`)}${elapsedStr}`;
}
