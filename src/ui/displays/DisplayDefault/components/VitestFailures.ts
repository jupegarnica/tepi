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
}): string {
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

  if (!entries.length) return "";

  const parts: string[] = [];
  for (const entry of entries) {
    const header =
      ` ${colors ? fmt.red(fmt.bold("FAIL ")) : "FAIL "}` +
      `${fmt.dim(entry.relativePath)} > ` +
      `${fmt.bold(entry.description)}`;
    parts.push(header);
    parts.push(formatFailureDetailsText(entry));
    parts.push("");
  }
  return "\n" + parts.slice(0, -1).join("\n");
}
