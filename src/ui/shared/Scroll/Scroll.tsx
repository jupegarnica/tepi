import React from "react";
import { Text, useStdout } from "ink";
import type { ScrollProps } from "./Scroll.types.ts";
import { useScroll } from "./hooks/useScroll.hook.ts";

export function Scroll({ height, children }: ScrollProps) {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const { displayLines } = useScroll({ children, height, columns });

  if (displayLines.length === 0) {
    return null;
  }

  return <Text>{displayLines.join("\n")}</Text>;
}