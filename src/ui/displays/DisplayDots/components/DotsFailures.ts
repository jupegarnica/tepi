import * as fmt from "@std/fmt/colors";
import { formatFailureDetailsText } from "../../../utils/failureDetails.ts";
import type { VitestFailureEntry } from "../../DisplayDefault/index.ts";

export function DotsFailures({ failures }: { failures: VitestFailureEntry[] }): string {
  const colors = fmt.getColorEnabled();

  if (!failures.length) return "";

  const parts: string[] = [""];
  for (const entry of failures) {
    parts.push(
      ` ${colors ? fmt.red(fmt.bold("FAIL ")) : "FAIL "}` +
        fmt.dim(entry.relativePath.replace(/^\.\//, "")) +
        " > " +
        fmt.bold(entry.description),
    );
    parts.push(formatFailureDetailsText(entry));
    parts.push("");
  }

  return parts.join("\n");
}
