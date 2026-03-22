import React from "react";
import { Box, Text, useStdout } from "ink";
import { ScrollBar } from "@byteland/ink-scroll-bar";
import type { ScrollProps } from "./Scroll.types.ts";
import { useScroll } from "./hooks/useScroll.hook.ts";

export function Scroll({ height, children }: ScrollProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const { visibleLines, aboveCount, totalLines } = useScroll({ children, height, columns });

  if (visibleLines.length === 0) {
    return null;
  }

  const needsScrollbar = totalLines > height;

  return (
    <Box flexDirection="row">
      <Text>{visibleLines.join("\n")}</Text>
      {needsScrollbar && (
        <ScrollBar
          placement="inset"
          style="line"
          contentHeight={totalLines}
          viewportHeight={height}
          scrollOffset={aboveCount}
        />
      )}
    </Box>
  );
}
