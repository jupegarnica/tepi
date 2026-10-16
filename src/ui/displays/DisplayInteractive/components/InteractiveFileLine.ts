import { Spinner } from "../../../BlockLine/spinner.ts";
import * as fmt from "@std/fmt/colors";
import type { BlockState, FileState } from "../../../store/store.ts";
import { ms } from "../../../utils/formatters.ts";
import { computeFileStats } from "../../DisplayDefault/index.ts";
import { selector } from "../utils/interactiveFormatters.ts";

export function InteractiveFileLine({
  file,
  blocks,
  isSelected,
  isExpanded,
  noAnimation,
  anchorPrefix = "",
}: {
  file: FileState;
  blocks: Record<string, BlockState>;
  isSelected: boolean;
  isExpanded: boolean;
  noAnimation?: boolean;
  anchorPrefix?: string;
}): string {
  const colors = fmt.getColorEnabled();
  const sel = selector(isSelected);
  const expandIcon = isExpanded ? "▼" : " ";
  const icon = noAnimation ? "…" : Spinner();

  if (file.status !== "done") {
    return `${anchorPrefix}${sel} ${expandIcon} ${colors ? fmt.blue(icon) : icon} ${file.relativePath}`;
  }

  const stats = computeFileStats(file, blocks);
  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;

  if (hasFailures) {
    return `${anchorPrefix}${sel} ${expandIcon} ${colors ? fmt.red("✗") : "✗"} ${file.relativePath} ${fmt.dim(`(${countStr})`)}${elapsedStr}`;
  }

  return `${anchorPrefix}${sel} ${expandIcon} ${colors ? fmt.green("✓") : "✓"} ${file.relativePath} ${fmt.dim(`(${countStr})`)}${elapsedStr}`;
}
