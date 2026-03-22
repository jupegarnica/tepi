import React from "react";
import { Text } from "ink";
import Spinner from "ink-spinner";
import * as fmt from "@std/fmt/colors";
import type { BlockState, FileState } from "../../../store/store.ts";
import { ms } from "../../../utils/formatters.ts";
import { computeFileStats } from "../DisplayDefault.tsx";

export function FileLine({
  file,
  blocks,
  noAnimation,
}: {
  file: FileState;
  blocks: Record<string, BlockState>;
  noAnimation?: boolean;
}) {
  const colors = fmt.getColorEnabled();
  const stats = computeFileStats(file, blocks);

  if (file.status !== "done") {
    return (
      <Text>
        {" "}
        {noAnimation
          ? <Text color={colors ? "blue" : undefined}>{"…"}</Text>
          : <Text color={colors ? "blue" : undefined}><Spinner type="dots4" /></Text>}
        {` ${file.relativePath}`}
      </Text>
    );
  }

  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;

  if (hasFailures) {
    return (
      <Text>
        {" "}
        <Text color={colors ? "red" : undefined}>{"✗"}</Text>
        {` ${file.relativePath} `}
        <Text dimColor>{`(${countStr})`}</Text>
        {elapsedStr}
      </Text>
    );
  }

  return (
    <Text>
      {" "}
      <Text color={colors ? "green" : undefined}>{"✓"}</Text>
      {` ${file.relativePath} `}
      <Text dimColor>{`(${countStr})`}</Text>
      {elapsedStr}
    </Text>
  );
}
