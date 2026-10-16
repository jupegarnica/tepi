import * as fmt from "@std/fmt/colors";
import type { BlockState } from "../../../store/store.ts";
import { markerForBlock } from "../utils/dotsFormatters.ts";
import { rawWrite } from "../../../term.ts";

let prevCount = 0;

/** Call between watch re-runs so the stream starts from zero again. */
export function resetDotsStream(): void {
  prevCount = 0;
}

/**
 * Streaming progress without spinner animation: completed blocks are written
 * straight to the output as they finish (ink's old side-effect behavior).
 */
export function DotsProgressStream(
  { completed, phase }: { completed: BlockState[]; phase: string },
): string {
  const newBlocks = completed.slice(prevCount);
  const colors = fmt.getColorEnabled();
  for (const block of newBlocks) {
    const marker = markerForBlock(block);
    if (colors) {
      if (block.status === "failed") rawWrite(fmt.red(marker));
      else if (block.status === "ignored" || block.status === "empty") {
        rawWrite(fmt.yellow(marker));
      } else rawWrite(fmt.green(marker));
    } else {
      rawWrite(marker);
    }
  }
  prevCount = completed.length;
  if (phase === "done") rawWrite("\n");
  return "";
}
