import React, { useEffect, useRef } from "react";
import { useStdout } from "ink";
import * as fmt from "@std/fmt/colors";
import type { BlockState } from "../../../store/store.ts";
import { markerForBlock } from "../utils/dotsFormatters.ts";

export function DotsProgressStream({ completed, phase }: { completed: BlockState[]; phase: string }) {
  const { stdout } = useStdout();
  const prevRef = useRef(0);

  useEffect(() => {
    const newBlocks = completed.slice(prevRef.current);
    const colors = fmt.getColorEnabled();
    for (const block of newBlocks) {
      const marker = markerForBlock(block);
      if (colors) {
        if (block.status === "failed") stdout.write(fmt.red(marker));
        else if (block.status === "ignored" || block.status === "empty") stdout.write(fmt.yellow(marker));
        else stdout.write(fmt.green(marker));
      } else {
        stdout.write(marker);
      }
    }
    prevRef.current = completed.length;
    if (phase === "done") stdout.write("\n");
  }, [completed.length, phase]);

  return null;
}
