import React from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import { formatFailureDetailsText } from "../../../utils/failureDetails.ts";
import type { VitestFailureEntry } from "../../DisplayDefault/index.ts";

export function DotsFailures({ failures }: { failures: VitestFailureEntry[] }) {
  const colors = fmt.getColorEnabled();

  if (!failures.length) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {failures.map((entry, index) => (
        <Box key={`${entry.blockLink}-${index}`} flexDirection="column" marginBottom={1}>
          <Text>
            {" "}
            <Text bold color={colors ? "red" : undefined}>{"FAIL "}</Text>
            <Text dimColor>{entry.relativePath.replace(/^\.\//, "")}</Text>
            {" > "}
            <Text bold>{entry.description}</Text>
          </Text>
          <Text>{formatFailureDetailsText(entry)}</Text>
        </Box>
      ))}
    </Box>
  );
}
