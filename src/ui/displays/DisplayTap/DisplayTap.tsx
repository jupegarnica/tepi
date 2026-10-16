import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import type { BlockState } from "../../store/store.ts";
import type { TapFormatState } from "./DisplayTap.types.ts";
import { getTapTestBlocks, getTapDoneBlocks } from "./utils/tapFormatters.ts";

export function formatTapOutput(state: TapFormatState): string[] {
  const testBlocks = getTapTestBlocks(state.blockOrder, state.blocks);
  const doneBlocks = getTapDoneBlocks(testBlocks);
  const testNumberMap = new Map(testBlocks.map((b, i) => [b.id, i + 1]));

  const output: string[] = ["TAP version 14"];

  for (const b of doneBlocks) {
    const num = testNumberMap.get(b.id) ?? 0;
    const skip = b.status === "ignored" || b.status === "empty";
    const ok = b.status !== "failed";
    const directive = skip ? " # SKIP" : "";
    output.push(`${ok ? "ok" : "not ok"} ${num} - ${b.description}${directive}`);
    if (b.status === "failed" && b.error) {
      output.push(`  ---`);
      output.push(`  message: ${b.error.message}`);
      if (b.error.cause) output.push(`  cause: ${b.error.cause}`);
      output.push(`  ...`);
    }
  }

  if (state.phase === "done") {
    output.push(`1..${testBlocks.length}`);
  }

  return output;
}

function TapTestLine({ block, num }: { block: BlockState; num: number }): string {
  const colors = fmt.getColorEnabled();
  const skip = block.status === "ignored" || block.status === "empty";
  const ok = block.status !== "failed";
  const directive = skip ? " # SKIP" : "";
  const status = colors ? fmt.bold(ok ? fmt.green("ok") : fmt.red("not ok")) : (ok ? "ok" : "not ok");

  const lines: string[] = [
    `${status} ${num} - ${block.description}${colors ? fmt.italic(fmt.green(directive)) : directive}`.trimEnd(),
  ];

  if (block.status === "failed" && block.error) {
    lines.push(fmt.dim("  ---"));
    lines.push(fmt.dim(`  message: ${block.error.message}`));
    if (block.error.cause) lines.push(fmt.dim(`  cause: ${block.error.cause}`));
    lines.push(fmt.dim("  ..."));
  }

  return lines.join("\n");
}

export function DisplayTap(props: CommonDisplayProps): string {
  const state: TapFormatState = {
    blockOrder: (props.fileOrder ?? []).flatMap((id) => props.files[id]?.blockIds ?? []),
    blocks: props.blocks,
    phase: props.phase,
  };

  return formatTapOutput(state).map((l) => l).join("\n");
}
