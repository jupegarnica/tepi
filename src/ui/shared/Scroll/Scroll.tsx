import React from "react";
import { Box, Text } from "ink";
import { ScrollBar } from "@byteland/ink-scroll-bar";
import type { ScrollProps } from "./Scroll.types.ts";
import { useScroll } from "./hooks/useScroll.hook.ts";

export function Scroll({ height, children }: ScrollProps) {
  const safeHeight = Math.floor(height);
  const { visibleLines, aboveCount, totalLines } = useScroll({ children, height: safeHeight });

  if (visibleLines.length === 0) {
    return null;
  }

  const needsScrollbar = totalLines > safeHeight;

  return (
    <Box flexDirection="row">
      <Text>{visibleLines.join("\n")}</Text>
      {needsScrollbar && (
        <ScrollBar
          placement="inset"
          style="line"
          contentHeight={totalLines}
          viewportHeight={safeHeight}
          scrollOffset={aboveCount}
        />
      )}
    </Box>
  );
}
