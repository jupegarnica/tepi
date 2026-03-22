import React from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { BlockState, FileState } from "../../../store/store.ts";
import { formatFailureDetailsText } from "../../../utils/failureDetails.ts";
import type { VitestFailureEntry } from "../DisplayDefault.types.ts";

export function VitestFailures({
  fileOrder,
  files,
  blocks,
}: {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
}) {
  const colors = fmt.getColorEnabled();
  const entries: VitestFailureEntry[] = [];

  for (const id of fileOrder) {
    const file = files[id];
    if (!file) continue;
    for (const bid of file.blockIds) {
      const b = blocks[bid];
      if (!b || b.isFirstBlock || b.status !== "failed" || !b.error) continue;
      entries.push({
        relativePath: file.relativePath,
        description: b.description,
        filePath: b.filePath,
        blockLink: b.blockLink,
        error: b.error,
        failureContext: b.failureContext,
        sourceText: b.sourceText,
        sourceStartLine: b.sourceStartLine,
        sourceEndLine: b.sourceEndLine,
      });
    }
  }

  if (!entries.length) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {entries.map((entry, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text>
            {" "}
            <Text bold color={colors ? "red" : undefined}>{"FAIL "}</Text>
            <Text dimColor>{entry.relativePath}</Text>
            {" > "}
            <Text bold>{entry.description}</Text>
          </Text>
          <Text>{formatFailureDetailsText(entry)}</Text>
        </Box>
      ))}
    </Box>
  );
}
