import * as fmt from "@std/fmt/colors";
import type { DotsFormatState } from "../DisplayDots.types.ts";
import { completedBlocks, markerForBlock, colorForBlock } from "../utils/dotsFormatters.ts";
import { colorNameToCode } from "../../../utils/ansi.ts";

export function DotsProgress(props: DotsFormatState): string {
  const entries = completedBlocks(props);

  if (!entries.length) return "";

  const colors = fmt.getColorEnabled();

  return entries
    .map((block) => {
      const marker = markerForBlock(block);
      return colors ? colorNameToCode(colorForBlock(block), marker) : marker;
    })
    .join("");
}
