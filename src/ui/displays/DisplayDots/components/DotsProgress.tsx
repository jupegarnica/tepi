import React from "react";
import { Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { DotsFormatState } from "../DisplayDots.types.ts";
import { completedBlocks, markerForBlock, colorForBlock } from "../utils/dotsFormatters.ts";

export function DotsProgress(props: DotsFormatState) {
  const entries = completedBlocks(props);

  if (!entries.length) return null;

  const colors = fmt.getColorEnabled();

  return (
    <Text>
      {entries.map((block) => (
        <Text key={block.id} color={colors ? colorForBlock(block) : undefined}>
          {markerForBlock(block)}
        </Text>
      ))}
    </Text>
  );
}
