import React from "react";
import { Text } from "ink";
import Spinner from "ink-spinner";
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
}: {
  file: FileState;
  blocks: Record<string, BlockState>;
  isSelected: boolean;
  isExpanded: boolean;
  noAnimation?: boolean;
}) {
  const colors = fmt.getColorEnabled();
  const sel = selector(isSelected);
  const expandIcon = isExpanded ? "▼" : " ";

  if (file.status !== "done") {
    return (
      <Text>
        {`${sel} ${expandIcon} `}
        {noAnimation
          ? <Text color={colors ? "blue" : undefined}>{"…"}</Text>
          : <Text color={colors ? "blue" : undefined}><Spinner type="dots4" /></Text>}
        {` ${file.relativePath}`}
      </Text>
    );
  }

  const stats = computeFileStats(file, blocks);
  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;

  if (hasFailures) {
    return (
      <Text>
        {`${sel} ${expandIcon} `}
        <Text color={colors ? "red" : undefined}>{"✗"}</Text>
        {` ${file.relativePath} `}
        <Text dimColor>{`(${countStr})`}</Text>
        {elapsedStr}
      </Text>
    );
  }

  return (
    <Text>
      {`${sel} ${expandIcon} `}
      <Text color={colors ? "green" : undefined}>{"✓"}</Text>
      {` ${file.relativePath} `}
      <Text dimColor>{`(${countStr})`}</Text>
      {elapsedStr}
    </Text>
  );
}
